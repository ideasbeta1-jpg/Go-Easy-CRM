'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Calendar, Car, Clock, Mail, CheckCircle2,
  MessageCircle, Zap, ChevronDown, ChevronRight, X, AlertTriangle,
  Trophy, XCircle, Timer
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useKanbanFilter } from './KanbanFilterContext'
import { isToday, isThisWeek, isThisMonth, differenceInHours, differenceInDays } from 'date-fns'
import { updateLeadStatus } from '../actions'
import {
  VALID_TRANSITIONS, STAGE_AUTOMATION_NOTE, CONFIRM_STAGES,
  LOST_STAGE, LOST_REASONS
} from '@/lib/leads/transitions'
import { calcRentalDays, calcReservationAmount } from '@/lib/leads/calculations'

interface KanbanBoardProps {
  initialLeads: any[]
  statuses: string[]
  statusConfig: Record<string, { label: string; color: string }>
  unreadByLead?: Record<string, number>
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

export function KanbanBoard({ initialLeads, statuses, statusConfig, unreadByLead = {} }: KanbanBoardProps) {
  const [leads, setLeads] = useState(initialLeads)
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
  const router = useRouter()
  const { searchTerm, sortBy, agentFilter, dateFilter } = useKanbanFilter()

  const handleDragStart = (e: React.DragEvent, leadId: string, currentStatus: string) => {
    e.dataTransfer.setData('leadId', leadId)
    setDraggingId(leadId)
    setDragSourceStatus(currentStatus)
    setTimeout(() => {
      (e.target as HTMLElement).classList.add('opacity-40')
    }, 0)
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
      console.error('Error updating lead status:', error)
      setLeads(oldLeads)
      alert('Error al mover el lead: ' + error.message)
    }
    router.refresh()
    setIsUpdating(false)
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

  const getCardAccent = (lead: any, unread: number) => {
    if (unread > 0) return 'border-l-[3px] border-l-blue-400'
    if (!lead.assigned_to) return 'border-l-[3px] border-l-orange-400'
    if (isNewLead(lead.created_at)) return 'border-l-[3px] border-l-emerald-400'
    return ''
  }

  const getStageAge = (lead: any) => {
    const dateStr = lead.status_changed_at || lead.updated_at
    if (!dateStr) return null
    const days = differenceInDays(new Date(), new Date(dateStr))
    const hours = differenceInHours(new Date(), new Date(dateStr))
    if (days === 0) return { label: `${hours}h`, cls: 'text-emerald-500' }
    if (days < 3) return { label: `${days}d`, cls: 'text-emerald-500' }
    if (days < 7) return { label: `${days}d`, cls: 'text-amber-500' }
    return { label: `${days}d`, cls: 'text-rose-500' }
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

  return (
    <>
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden pb-4 snap-x snap-mandatory scroll-smooth scrollbar-hide">
        <div className="flex gap-4 md:gap-8 h-full min-w-max pr-8 px-4 md:px-0">
          {statuses.map((status) => {
            const stageLeads = getGroupedLeads(status)
            const totalRva = stageLeads.reduce((acc, l) => acc + getReservationAmount(l), 0)
            const isTerminal = status === 'cerrado_ganado' || status === 'cerrado_perdido'
            const isCollapsed = !!collapsedStages[status]
            const dropClass = getColumnDropClass(status)

            return (
              <div
                key={status}
                className={`w-[85vw] sm:w-80 h-full flex flex-col gap-4 md:gap-6 snap-center transition-all duration-200 rounded-[2.5rem] ${dropClass}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-2 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${statusConfig[status]?.color || 'bg-slate-300'}`} />
                    <span className="font-sans font-black text-slate-900 uppercase tracking-tighter text-sm md:text-base">
                      {statusConfig[status]?.label || status}
                    </span>
                    <span className="bg-slate-200 text-slate-500 px-2 md:px-2.5 py-0.5 rounded-full text-[10px] md:text-[11px] font-black">
                      {stageLeads.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest leading-tight px-2 py-0.5 rounded-full ${
                      status === 'cerrado_ganado'  ? 'text-emerald-700 bg-emerald-100' :
                      status === 'cerrado_perdido' ? 'text-rose-500 bg-rose-50' :
                      'text-emerald-500 bg-emerald-50'
                    }`}>
                      ${Math.floor(totalRva).toLocaleString()}
                    </span>
                    {isTerminal && (
                      <button
                        onClick={() => toggleStageCollapse(status)}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                        title={isCollapsed ? 'Expandir' : 'Colapsar'}
                      >
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsed state */}
                {isTerminal && isCollapsed ? (
                  <button
                    onClick={() => toggleStageCollapse(status)}
                    className={`flex items-center justify-center gap-2 py-5 px-3 rounded-2xl border-2 border-dashed transition-colors text-xs font-bold ${
                      status === 'cerrado_ganado'
                        ? 'border-emerald-200 text-emerald-400 hover:text-emerald-600 hover:border-emerald-300'
                        : 'border-rose-200 text-rose-400 hover:text-rose-600 hover:border-rose-300'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                    Ver {stageLeads.length} leads {status === 'cerrado_ganado' ? 'ganados' : 'perdidos'}
                  </button>
                ) : (
                  /* Column Surface */
                  <div
                    data-drop-surface
                    className="flex flex-col gap-4 overflow-y-auto px-1 pb-10 scrollbar-hide rounded-[2.5rem] transition-colors duration-200 max-h-[calc(100vh-22rem)] md:max-h-[calc(100vh-24rem)] lg:max-h-[calc(100vh-26rem)]"
                  >
                    {stageLeads.map((lead) => {
                      const unread = unreadByLead[lead.id] || 0
                      const urgency = getUrgency(lead.pickup_date)
                      const showNew = isNewLead(lead.created_at)
                      const cardAccent = getCardAccent(lead, unread)
                      const agentName = lead.assigned_to_profile?.full_name || null
                      const stageAge = getStageAge(lead)

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
                            className={`bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-grab active:cursor-grabbing ${cardAccent}`}
                          >
                            <div className="p-4">

                              {/* Fila 1: ID + badges + monto */}
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full tracking-wide">
                                    #{lead.id.slice(0, 6)}
                                  </span>
                                  {showNew && (
                                    <span className="text-[9px] font-black uppercase bg-emerald-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                                      Nuevo
                                    </span>
                                  )}
                                  {urgency && (
                                    <span className={`flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${urgency.cls}`}>
                                      <Zap className="w-2.5 h-2.5" />
                                      {urgency.label}
                                    </span>
                                  )}
                                  {unread > 0 && (
                                    <span className="flex items-center gap-1 text-[9px] font-black bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full border border-blue-100">
                                      <MessageCircle className="w-2.5 h-2.5" />
                                      {unread}
                                    </span>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className={`text-base font-black leading-none ${status === 'cerrado_perdido' ? 'text-slate-400 line-through' : 'text-primary'}`}>
                                    <span className="text-xs opacity-40 mr-0.5">$</span>
                                    {Math.floor(lead.total_amount || 0).toLocaleString()}
                                  </p>
                                  <p className="text-[9px] font-bold text-emerald-500 mt-0.5">
                                    Rva ${Math.floor(getReservationAmount(lead)).toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              {/* Fila 2: Nombre */}
                              <p className="font-black text-slate-900 text-sm leading-tight mb-3">
                                {lead.first_name} {lead.last_name}
                              </p>

                              {/* Fila 3: Fecha + ubicación */}
                              <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
                                <Calendar className="w-3 h-3 shrink-0" />
                                <span className="text-[10px] font-semibold truncate">
                                  {lead.pickup_date
                                    ? lead.pickup_date.slice(0, 10).split('-').reverse().join('/')
                                    : 'Sin fecha'}
                                  {lead.pickup_location ? ` · ${lead.pickup_location.split(' ').slice(0, 2).join(' ')}` : ''}
                                </span>
                              </div>

                              {/* Fila 4: Categoría */}
                              {lead.category?.name && (
                                <div className="flex items-center gap-1.5 text-slate-400 mb-3">
                                  <Car className="w-3 h-3 shrink-0" />
                                  <span className="text-[10px] font-semibold truncate">{lead.category.name}</span>
                                </div>
                              )}

                              {/* Fila 5: Razón de pérdida (solo en cerrado_perdido) */}
                              {status === 'cerrado_perdido' && lead.lost_reason && (
                                <div className="mb-3">
                                  <span className="text-[9px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                                    {lead.lost_reason}
                                  </span>
                                </div>
                              )}

                              {/* Fila 6: Agente + estado + tiempo en etapa */}
                              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={lead.assigned_to_profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(agentName || 'SA')}&background=f1f5f9&color=94a3b8&size=32&bold=true`}
                                    className="w-6 h-6 rounded-full object-cover border border-slate-100 shrink-0"
                                    alt={agentName || 'Sin asignar'}
                                  />
                                  <span className={`text-[10px] font-bold truncate ${agentName ? 'text-slate-600' : 'text-orange-400'}`}>
                                    {agentName || 'Sin asignar'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {stageAge && (
                                    <span className={`flex items-center gap-0.5 text-[9px] font-black ${stageAge.cls}`}>
                                      <Timer className="w-2.5 h-2.5" />
                                      {stageAge.label}
                                    </span>
                                  )}

                                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                    status === 'lead_nuevo'         ? 'bg-slate-100 text-slate-500' :
                                    status === 'en_cotizacion'      ? 'bg-indigo-50 text-indigo-600' :
                                    status === 'reserva_confirmada' ? 'bg-emerald-50 text-emerald-600' :
                                    status === 'voucher_enviado'    ? 'bg-amber-50 text-amber-600' :
                                    status === 'cerrado_ganado'     ? 'bg-emerald-100 text-emerald-700' :
                                    status === 'cerrado_perdido'    ? 'bg-rose-50 text-rose-500' :
                                    'bg-slate-50 text-slate-400'
                                  }`}>
                                    {status === 'lead_nuevo'         && <Clock className="w-3 h-3" />}
                                    {status === 'en_cotizacion'      && <Mail className="w-3 h-3" />}
                                    {status === 'reserva_confirmada' && <CheckCircle2 className="w-3 h-3" />}
                                    {status === 'voucher_enviado'    && <Mail className="w-3 h-3" />}
                                    {status === 'cerrado_ganado'     && <Trophy className="w-3 h-3" />}
                                    {status === 'cerrado_perdido'    && <XCircle className="w-3 h-3" />}
                                    <span>
                                      {status === 'lead_nuevo'         ? 'Nuevo' :
                                       status === 'en_cotizacion'      ? 'Cotización' :
                                       status === 'reserva_confirmada' ? 'Confirmado' :
                                       status === 'voucher_enviado'    ? 'Voucher' :
                                       status === 'cerrado_ganado'     ? 'Ganado' :
                                       status === 'cerrado_perdido'    ? 'Perdido' :
                                       'Cerrado'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                            </div>
                          </div>
                        </Link>
                      )
                    })}

                    {stageLeads.length === 0 && (
                      <div className="h-40 flex flex-col items-center justify-center text-slate-200 gap-3 select-none">
                        <Clock className="w-8 h-8 opacity-[0.2]" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em]">
                          {searchTerm || agentFilter || dateFilter !== 'all' ? 'Sin resultados' : 'Radar Limpio'}
                        </span>
                      </div>
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
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setPendingMove(null)}
          />
          <div className="relative bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setPendingMove(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
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
              <p className="text-xs font-bold text-amber-700 leading-relaxed">
                {pendingMove.automationNote}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPendingMove(null)}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 text-slate-600 text-sm font-black hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const move = pendingMove
                  setPendingMove(null)
                  await executeMove(move.leadId, move.toStatus)
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-primary text-white text-sm font-black hover:bg-primary/90 transition-colors"
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
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setLostMovePending(null)}
          />
          <div className="relative bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setLostMovePending(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
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
                    selectedReason === reason
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
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
              <button
                onClick={() => setLostMovePending(null)}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 text-slate-600 text-sm font-black hover:bg-slate-200 transition-colors"
              >
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
                className="flex-1 py-3 px-4 rounded-2xl bg-rose-500 text-white text-sm font-black hover:bg-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Updating indicator */}
      {isUpdating && (
        <div className="fixed bottom-12 right-12 bg-white px-6 py-3 rounded-full shadow-2xl border border-slate-100 flex items-center gap-3 animate-in slide-in-from-right-12">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-900">Actualizando Pipeline...</span>
        </div>
      )}
    </>
  )
}
