'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Calendar, X, AlertTriangle, Zap, XCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useKanbanFilter } from './KanbanFilterContext'
import { isToday, isThisWeek, isThisMonth, differenceInHours, differenceInDays } from 'date-fns'
import { updateLeadStatus, loadMoreLeads } from '../actions'
import { VALID_TRANSITIONS, STAGE_AUTOMATION_NOTE, CONFIRM_STAGES, LOST_STAGE, LOST_REASONS } from '@/lib/leads/transitions'
import { calcRentalDays, calcReservationAmount } from '@/lib/leads/calculations'
import { NewLeadButton } from './NewLeadButton'

interface AddLeadProps {
  categories: any[]
  locations: any[]
  currentUserId: string
}

interface KanbanBoardProps {
  initialLeads: any[]
  statuses: string[]
  statusConfig: Record<string, { label: string; color: string }>
  unreadByLead?: Record<string, number>
  tasksByLead?: Record<string, { count: number; overdue: number }>
  addLeadProps?: AddLeadProps
  /** Total real de leads por etapa (para etapas cerradas que se cargan paginadas). */
  statusTotals?: Record<string, number>
}

interface PendingMove {
  leadId: string
  leadName: string
  toStatus: string
  toLabel: string
  automationNote: string
}

interface LostMovePending {
  leadId: string
  leadName: string
}

function formatPickupDate(dateStr: string | null): string {
  if (!dateStr) return 'Sin fecha'
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    .replace(/\bene\b/i, 'Ene').replace(/\bfeb\b/i, 'Feb').replace(/\bmar\b/i, 'Mar')
    .replace(/\babr\b/i, 'Abr').replace(/\bmay\b/i, 'May').replace(/\bjun\b/i, 'Jun')
    .replace(/\bjul\b/i, 'Jul').replace(/\bago\b/i, 'Ago').replace(/\bsep\b/i, 'Sep')
    .replace(/\boct\b/i, 'Oct').replace(/\bnov\b/i, 'Nov').replace(/\bdic\b/i, 'Dic')
    .replace(/\./g, '')
}

function shortLocation(loc: string | null): string {
  if (!loc) return ''
  const words = loc.trim().split(' ')
  return words.slice(0, 2).join(' ')
}

function shortId(uuid: string): string {
  return 'GE-' + uuid.slice(-4).toUpperCase()
}

// Avatar de agente con iniciales en CSS. Evita un request HTTP por tarjeta a
// ui-avatars.com (con 150 tarjetas eran ~150 peticiones externas que el navegador
// serializa de a 6, bloqueando la carga del tablero).
const AVATAR_PALETTE = ['bg-blue-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-500', 'bg-cyan-500']
function avatarColor(seed: string): string {
  const code = (seed || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length]
}
function initialsOf(name: string | null): string {
  if (!name) return 'SA'
  return name.trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export function KanbanBoard({ initialLeads, statuses, statusConfig, unreadByLead = {}, tasksByLead = {}, addLeadProps, statusTotals = {} }: KanbanBoardProps) {
  const [leads, setLeads] = useState(initialLeads)
  const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({})
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragSourceStatus, setDragSourceStatus] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [lostMovePending, setLostMovePending] = useState<LostMovePending | null>(null)
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [otherReason, setOtherReason] = useState('')
  const [collapsedStages, setCollapsedStages] = useState<Record<string, boolean>>({
    cerrado_ganado: true,
    cerrado_perdido: true,
  })
  const [mobileMoveLead, setMobileMoveLead] = useState<{ id: string; status: string } | null>(null)
  const router = useRouter()
  const { searchTerm, sortBy, agentFilter, dateFilter, tasksOnly } = useKanbanFilter()

  // Render progresivo de columnas ACTIVAS: se muestran COLUMN_PAGE tarjetas por
  // columna y se renderizan más al hacer scroll. Evita montar todas las tarjetas
  // de golpe (el costo real al entrar). No afecta a búsqueda/filtros (operan sobre
  // la lista completa en memoria) ni a las columnas cerradas (paginación de servidor).
  const COLUMN_PAGE = 15
  const [visibleCount, setVisibleCount] = useState<Record<string, number>>({})
  const sentinelRefs = useRef<Map<string, HTMLElement>>(new Map())

  // Al cambiar filtros/búsqueda/orden, volver a la primera página de render.
  useEffect(() => {
    setVisibleCount({})
  }, [searchTerm, agentFilter, dateFilter, sortBy, tasksOnly])

  // Observa los centinelas de cada columna; al entrar en viewport, muestra más.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const status = (entry.target as HTMLElement).dataset.status
            if (status) setVisibleCount(prev => ({ ...prev, [status]: (prev[status] ?? COLUMN_PAGE) + COLUMN_PAGE }))
          }
        }
      },
      { rootMargin: '300px' }
    )
    sentinelRefs.current.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [leads, searchTerm, agentFilter, dateFilter, sortBy, tasksOnly, visibleCount])

  const handleDragStart = (e: React.DragEvent, leadId: string, currentStatus: string) => {
    e.dataTransfer.setData('leadId', leadId)
    setDraggingId(leadId)
    setDragSourceStatus(currentStatus)
    setTimeout(() => { (e.target as HTMLElement).classList.add('opacity-40') }, 0)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggingId(null)
    setDragSourceStatus(null)
    ;(e.target as HTMLElement).classList.remove('opacity-40')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    const surface = (e.currentTarget as HTMLElement).querySelector<HTMLElement>('[data-drop-surface]')
    if (surface) surface.classList.add('bg-slate-50/80')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    const surface = (e.currentTarget as HTMLElement).querySelector<HTMLElement>('[data-drop-surface]')
    if (surface) surface.classList.remove('bg-slate-50/80')
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    const surface = (e.currentTarget as HTMLElement).querySelector<HTMLElement>('[data-drop-surface]')
    if (surface) surface.classList.remove('bg-slate-50/80')

    const leadId = e.dataTransfer.getData('leadId')
    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.status === targetStatus) return

    if (targetStatus === LOST_STAGE) {
      setSelectedReason(null)
      setOtherReason('')
      setLostMovePending({ leadId, leadName: `${lead.first_name} ${lead.last_name}`.trim() })
      return
    }

    if (CONFIRM_STAGES.has(targetStatus)) {
      setPendingMove({
        leadId,
        leadName: `${lead.first_name} ${lead.last_name}`.trim(),
        toStatus: targetStatus,
        toLabel: statusConfig[targetStatus]?.label || targetStatus,
        automationNote: STAGE_AUTOMATION_NOTE[targetStatus] || 'Se disparará una automatización.',
      })
      return
    }

    await executeMove(leadId, targetStatus)
  }

  const executeMove = async (leadId: string, targetStatus: string, lostReason?: string) => {
    const oldLeads = [...leads]
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: targetStatus } : l))
    setIsUpdating(true)
    try {
      await updateLeadStatus(leadId, targetStatus, lostReason)
    } catch (error: any) {
      setLeads(oldLeads)
      alert('Error al mover el lead: ' + error.message)
    }
    router.refresh()
    setIsUpdating(false)
  }

  // Nº de leads de una etapa ya cargados en memoria (sin filtros de búsqueda).
  const loadedCount = (status: string) => leads.filter(l => l.status === status).length

  const handleLoadMore = async (status: string) => {
    if (loadingMore[status]) return
    setLoadingMore(prev => ({ ...prev, [status]: true }))
    try {
      const { leads: more } = await loadMoreLeads(status, loadedCount(status))
      if (more && more.length > 0) {
        setLeads(prev => {
          const existing = new Set(prev.map(l => l.id))
          const fresh = more.filter((l: any) => !existing.has(l.id))
          return [...prev, ...fresh]
        })
      }
    } catch (e: any) {
      alert('Error al cargar más leads: ' + e.message)
    } finally {
      setLoadingMore(prev => ({ ...prev, [status]: false }))
    }
  }

  const getGroupedLeads = (status: string) => {
    let filtered = [...leads]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(l => {
        const name = `${l.first_name || ''} ${l.last_name || ''}`.toLowerCase()
        return name.includes(term) || (l.email || '').toLowerCase().includes(term) || (l.phone || '').toLowerCase().includes(term)
      })
    }

    if (agentFilter) filtered = filtered.filter(l => l.assigned_to === agentFilter)

    if (tasksOnly) filtered = filtered.filter(l => (tasksByLead[l.id]?.count || 0) > 0)

    if (dateFilter !== 'all') {
      filtered = filtered.filter(l => {
        if (!l.created_at) return false
        const d = new Date(l.created_at)
        if (dateFilter === 'today') return isToday(d)
        if (dateFilter === 'this_week') return isThisWeek(d, { weekStartsOn: 1 })
        if (dateFilter === 'this_month') return isThisMonth(d)
        return true
      })
    }

    filtered.sort((a, b) => {
      const vA = parseFloat(a.total_amount || 0)
      const vB = parseFloat(b.total_amount || 0)
      const dA = new Date(a.created_at || 0).getTime()
      const dB = new Date(b.created_at || 0).getTime()
      if (sortBy === 'highest_value') return vB - vA
      if (sortBy === 'lowest_value') return vA - vB
      if (sortBy === 'oldest') return dA - dB
      return dB - dA
    })

    return filtered.filter(l => l.status?.trim().toLowerCase() === status.toLowerCase())
  }

  const getReservationAmount = (lead: any) => {
    const days = calcRentalDays(lead.pickup_date, lead.return_date)
    return calcReservationAmount(lead.agreed_daily_price, lead.category?.daily_price, days)
  }

  const getUrgency = (pickupDate: string | null) => {
    if (!pickupDate) return null
    const hours = differenceInHours(new Date(pickupDate), new Date())
    if (hours < 0) return null
    if (hours <= 72) return { label: 'Urgente', cls: 'bg-rose-50 text-rose-500 border-rose-100' }
    if (hours <= 168) return { label: 'Próximo', cls: 'bg-amber-50 text-amber-500 border-amber-100' }
    return null
  }

  const isNewLead = (createdAt: string | null) =>
    !!createdAt && differenceInHours(new Date(), new Date(createdAt)) < 2

  const getStageAge = (lead: any) => {
    const dateStr = lead.status_changed_at || lead.updated_at
    if (!dateStr) return null
    const hours = differenceInHours(new Date(), new Date(dateStr))
    const days = differenceInDays(new Date(), new Date(dateStr))
    if (hours < 24) return { label: '< 24h', dotCls: 'bg-emerald-500', cls: 'text-emerald-600' }
    if (days < 4) return { label: `${days}d`, dotCls: 'bg-emerald-500', cls: 'text-emerald-600' }
    if (days < 7) return { label: `${days}d`, dotCls: 'bg-amber-400', cls: 'text-amber-500' }
    return { label: `${days}+d`, dotCls: 'bg-rose-500', cls: 'text-rose-500' }
  }

  const getColumnDropClass = (status: string) => {
    if (!dragSourceStatus || dragSourceStatus === status) return ''
    const valid = VALID_TRANSITIONS[dragSourceStatus] ?? []
    if (valid.includes(status)) return 'ring-2 ring-primary/30 ring-inset'
    return 'opacity-40 pointer-events-none'
  }

  const toggleStageCollapse = (status: string) => {
    setCollapsedStages(prev => ({ ...prev, [status]: !prev[status] }))
  }

  const TERMINAL = new Set(['cerrado_ganado', 'cerrado_perdido'])

  return (
    <>
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden pb-3 snap-x snap-mandatory scroll-smooth scrollbar-hide">
        <div className="flex gap-4 h-full min-w-max pr-6">
          {statuses.map((status) => {
            const stageLeads = getGroupedLeads(status)
            const isTerminal = TERMINAL.has(status)
            const isCollapsed = !!collapsedStages[status]
            const dropClass = getColumnDropClass(status)
            // En etapas cerradas el total real viene del servidor (carga paginada).
            const stageTotal = isTerminal ? (statusTotals[status] ?? stageLeads.length) : stageLeads.length
            const hasMore = isTerminal && loadedCount(status) < (statusTotals[status] ?? 0)
            const noActiveFilters = !searchTerm && !agentFilter && dateFilter === 'all'
            // Columnas activas: render progresivo. Las cerradas se muestran completas
            // (su volumen ya lo limita la paginación de servidor).
            const colVisible = visibleCount[status] ?? COLUMN_PAGE
            const renderLeads = isTerminal ? stageLeads : stageLeads.slice(0, colVisible)
            const hasMoreClient = !isTerminal && stageLeads.length > renderLeads.length

            return (
              <div
                key={status}
                className={`w-[320px] h-full flex flex-col gap-3 snap-center transition-all duration-200 ${dropClass}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${statusConfig[status]?.color || 'bg-slate-300'}`} />
                    <span className="font-bold text-slate-800 text-sm">
                      {statusConfig[status]?.label || status}
                    </span>
                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[11px] font-black">
                      {isTerminal && noActiveFilters ? stageTotal : stageLeads.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isTerminal && (
                      <button
                        onClick={() => toggleStageCollapse(status)}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                      >
                        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsed state */}
                {isTerminal && isCollapsed ? (
                  <button
                    onClick={() => toggleStageCollapse(status)}
                    className={`flex items-center justify-center gap-2 py-4 px-3 rounded-2xl border-2 border-dashed transition-colors text-xs font-bold ${
                      status === 'cerrado_ganado'
                        ? 'border-emerald-200 text-emerald-400 hover:text-emerald-600'
                        : 'border-rose-200 text-rose-400 hover:text-rose-600'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                    Ver {stageTotal} leads {status === 'cerrado_ganado' ? 'ganados' : 'perdidos'}
                  </button>
                ) : (
                  <div
                    data-drop-surface
                    className="flex flex-col gap-2.5 overflow-y-auto pb-4 scrollbar-hide transition-colors duration-200 max-h-[calc(100vh-20rem)]"
                  >
                    {renderLeads.map((lead) => {
                      const unread = unreadByLead[lead.id] || 0
                      const urgency = getUrgency(lead.pickup_date)
                      const showNew = isNewLead(lead.created_at)
                      const agentName = lead.assigned_to_profile?.full_name || null
                      const stageAge = getStageAge(lead)
                      const reserveAmt = getReservationAmount(lead)

                      const taskInfo = tasksByLead[lead.id]

                      return (
                        <Link
                          key={lead.id}
                          href={`/dashboard/leads/${lead.id}`}
                          draggable={false}
                        >
                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, lead.id, lead.status)}
                            onDragEnd={handleDragEnd}
                            className={`bg-white rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-grab active:cursor-grabbing ${
                              taskInfo?.overdue ? 'border-red-200' : 'border-slate-100'
                            }`}
                          >
                            <div className="p-4">
                              {/* Row 1: ID + badges + unread + mobile move */}
                              <div className="flex items-center gap-1.5 mb-2.5">
                                <span className="text-[10px] font-bold text-slate-400">
                                  {shortId(lead.id)}
                                </span>
                                {showNew && (
                                  <span className="text-[9px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                                    Nuevo
                                  </span>
                                )}
                                {urgency && (
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 ${urgency.cls}`}>
                                    🔥 {urgency.label}
                                  </span>
                                )}
                                {taskInfo && taskInfo.count > 0 && (
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${
                                    taskInfo.overdue > 0
                                      ? 'bg-red-50 text-red-600 border-red-200'
                                      : 'bg-amber-50 text-amber-600 border-amber-200'
                                  }`}>
                                    📋 {taskInfo.overdue > 0
                                      ? `${taskInfo.overdue} vencida${taskInfo.overdue > 1 ? 's' : ''}`
                                      : `${taskInfo.count} tarea${taskInfo.count > 1 ? 's' : ''}`}
                                  </span>
                                )}
                                <div className="ml-auto flex items-center gap-1 shrink-0">
                                  {unread > 0 && (
                                    <span className="bg-blue-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                                      {unread > 9 ? '9+' : unread}
                                    </span>
                                  )}
                                  {(VALID_TRANSITIONS[lead.status] ?? []).length > 0 && (
                                    <button
                                      className="lg:hidden p-1 text-slate-300 hover:text-primary active:text-primary transition-colors rounded-lg"
                                      onClick={e => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setMobileMoveLead({ id: lead.id, status: lead.status })
                                      }}
                                    >
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Row 2: Name + total amount */}
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="font-black text-slate-900 text-sm leading-tight">
                                  {lead.first_name} {lead.last_name}
                                </p>
                                <p className={`text-sm font-black shrink-0 leading-none ${status === 'cerrado_perdido' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                  ${Math.floor(lead.total_amount || 0).toLocaleString()}
                                </p>
                              </div>

                              {/* Row 3: Date + location */}
                              <div className="flex items-center gap-1.5 text-slate-400 mb-2">
                                <Calendar className="w-3 h-3 shrink-0" />
                                <span className="text-[10px] font-semibold truncate">
                                  {formatPickupDate(lead.pickup_date)}
                                  {lead.pickup_location ? ` · ${shortLocation(lead.pickup_location)}` : ''}
                                </span>
                              </div>

                              {/* Row 4: Category chip + stage age */}
                              <div className="flex items-center justify-between mb-3">
                                {lead.category?.name ? (
                                  <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg">
                                    {lead.category.name}
                                  </span>
                                ) : <span />}
                                {stageAge && (
                                  <span className="flex items-center gap-1.5 text-[10px] font-bold shrink-0">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${stageAge.dotCls}`} />
                                    <span className={stageAge.cls}>{stageAge.label}</span>
                                  </span>
                                )}
                              </div>

                              {/* Lost reason */}
                              {status === 'cerrado_perdido' && lead.lost_reason && (
                                <div className="mb-2.5">
                                  <span className="text-[9px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                                    {lead.lost_reason}
                                  </span>
                                </div>
                              )}

                              {/* Row 5: Agent + reservation amount */}
                              <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                                <div className="flex items-center gap-2 min-w-0">
                                  {lead.assigned_to_profile?.avatar_url ? (
                                    <img
                                      src={lead.assigned_to_profile.avatar_url}
                                      className="w-6 h-6 rounded-full object-cover border border-slate-100 shrink-0"
                                      alt={agentName || 'Sin asignar'}
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0 ${agentName ? avatarColor(agentName) : 'bg-slate-300'}`}>
                                      {initialsOf(agentName)}
                                    </div>
                                  )}
                                  <span className={`text-[10px] font-bold truncate ${agentName ? 'text-slate-600' : 'text-orange-400'}`}>
                                    {agentName || 'Sin asignar'}
                                  </span>
                                </div>
                                {reserveAmt > 0 && (
                                  <span className="text-[10px] font-bold text-emerald-600 shrink-0">
                                    $Reserv ${Math.floor(reserveAmt).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      )
                    })}

                    {/* Centinela de render progresivo (columnas activas) */}
                    {hasMoreClient && (
                      <div
                        ref={(el) => {
                          if (el) sentinelRefs.current.set(status, el)
                          else sentinelRefs.current.delete(status)
                        }}
                        data-status={status}
                        className="flex items-center justify-center py-2"
                      >
                        <span className="w-4 h-4 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
                      </div>
                    )}

                    {/* Add lead button at bottom of non-terminal columns */}
                    {!isTerminal && addLeadProps && (
                      <div className="mt-1">
                        <NewLeadButton
                          categories={addLeadProps.categories}
                          locations={addLeadProps.locations}
                          currentUserId={addLeadProps.currentUserId}
                          variant="inline"
                        />
                      </div>
                    )}

                    {stageLeads.length === 0 && isTerminal && (
                      <div className="h-32 flex flex-col items-center justify-center text-slate-200 gap-2 select-none">
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Sin registros</span>
                      </div>
                    )}

                    {/* Carga incremental para etapas cerradas (crecen sin límite) */}
                    {hasMore && noActiveFilters && (
                      <button
                        onClick={() => handleLoadMore(status)}
                        disabled={!!loadingMore[status]}
                        className="mt-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-slate-200 text-[11px] font-bold text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors disabled:opacity-50"
                      >
                        {loadingMore[status] ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                            Cargando...
                          </>
                        ) : (
                          <>Cargar más ({loadedCount(status)}/{stageTotal})</>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Automation Confirmation Modal */}
      {pendingMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setPendingMove(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setPendingMove(null)} className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Confirmar movimiento</p>
                <h3 className="font-black text-slate-900 text-lg leading-tight">→ {pendingMove.toLabel}</h3>
              </div>
            </div>
            <p className="text-sm font-bold text-slate-700 mb-3 leading-relaxed">
              Estás moviendo a <strong>{pendingMove.leadName}</strong> a esta etapa.
            </p>
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 mb-6">
              <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-amber-700 leading-relaxed">{pendingMove.automationNote}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPendingMove(null)} className="flex-1 py-3 px-4 rounded-xl bg-slate-100 text-slate-600 text-sm font-black hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
              <button
                onClick={async () => { const move = pendingMove; setPendingMove(null); await executeMove(move.leadId, move.toStatus) }}
                className="flex-1 py-3 px-4 rounded-xl bg-primary text-white text-sm font-black hover:bg-primary/90 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lost Reason Modal */}
      {lostMovePending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setLostMovePending(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setLostMovePending(null)} className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Cerrar como perdido</p>
                <h3 className="font-black text-slate-900 text-lg leading-tight">{lostMovePending.leadName}</h3>
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">¿Por qué se perdió?</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {LOST_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`text-left text-xs font-bold px-3 py-2.5 rounded-xl border transition-all ${
                    selectedReason === reason ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            {selectedReason === 'Otro' && (
              <input
                type="text"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Describe el motivo..."
                autoFocus
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            )}
            <div className="flex gap-3 mt-2">
              <button onClick={() => setLostMovePending(null)} className="flex-1 py-3 px-4 rounded-xl bg-slate-100 text-slate-600 text-sm font-black hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
              <button
                disabled={!selectedReason || (selectedReason === 'Otro' && !otherReason.trim())}
                onClick={async () => {
                  const move = lostMovePending
                  const reason = selectedReason === 'Otro' ? otherReason.trim() : selectedReason!
                  setLostMovePending(null)
                  await executeMove(move.leadId, LOST_STAGE, reason)
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-500 text-white text-sm font-black hover:bg-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Move Lead bottom sheet */}
      {mobileMoveLead && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMoveLead(null)}
          />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Mover a etapa</p>
            {(VALID_TRANSITIONS[mobileMoveLead.status] ?? []).length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-4">No hay etapas disponibles</p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {statuses
                  .filter(s => (VALID_TRANSITIONS[mobileMoveLead.status] ?? []).includes(s))
                  .map(s => (
                    <button
                      key={s}
                      onClick={async () => {
                        const lead = leads.find(l => l.id === mobileMoveLead.id)
                        if (!lead) return
                        setMobileMoveLead(null)
                        if (s === LOST_STAGE) {
                          setSelectedReason(null)
                          setOtherReason('')
                          setLostMovePending({ leadId: mobileMoveLead.id, leadName: `${lead.first_name} ${lead.last_name}`.trim() })
                        } else if (CONFIRM_STAGES.has(s)) {
                          setPendingMove({
                            leadId: mobileMoveLead.id,
                            leadName: `${lead.first_name} ${lead.last_name}`.trim(),
                            toStatus: s,
                            toLabel: statusConfig[s]?.label || s,
                            automationNote: STAGE_AUTOMATION_NOTE[s] || 'Se disparará una automatización.',
                          })
                        } else {
                          await executeMove(mobileMoveLead.id, s)
                        }
                      }}
                      className={`py-3.5 px-4 rounded-2xl text-sm font-bold border text-left transition-all active:scale-95 ${
                        s === 'cerrado_perdido'
                          ? 'bg-rose-50 border-rose-100 text-rose-600'
                          : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-primary/5 hover:border-primary/20 hover:text-primary'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full mb-2 ${statusConfig[s]?.color || 'bg-slate-300'}`} />
                      {statusConfig[s]?.label || s}
                    </button>
                  ))
                }
              </div>
            )}
            <button
              onClick={() => setMobileMoveLead(null)}
              className="mt-5 w-full py-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Updating indicator */}
      {isUpdating && (
        <div className="fixed bottom-20 sm:bottom-8 right-4 sm:right-8 bg-white px-5 py-3 rounded-full shadow-2xl border border-slate-100 flex items-center gap-3 animate-in slide-in-from-right-12">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-900">Actualizando...</span>
        </div>
      )}
    </>
  )
}
