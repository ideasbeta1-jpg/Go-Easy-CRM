'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Calendar, Car, Clock, Mail, CheckCircle2,
  MessageCircle, Zap, ChevronDown, ChevronRight, X, AlertTriangle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useKanbanFilter } from './KanbanFilterContext'
import { isToday, isThisWeek, isThisMonth, differenceInHours } from 'date-fns'
import { updateLeadStatus } from '../actions'

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

const VALID_TRANSITIONS: Record<string, string[]> = {
  lead_nuevo:         ['en_cotizacion', 'cerrado'],
  en_cotizacion:      ['reserva_confirmada', 'lead_nuevo', 'cerrado'],
  reserva_confirmada: ['voucher_enviado', 'cerrado'],
  voucher_enviado:    ['cerrado'],
  cerrado:            [],
}

const STAGE_AUTOMATION_NOTE: Record<string, string> = {
  en_cotizacion:      'Enviará cotización por WhatsApp y email al cliente.',
  reserva_confirmada: 'Enviará confirmación de reserva por WhatsApp y email.',
  voucher_enviado:    'Enviará el voucher oficial por WhatsApp y email.',
  cerrado:            'Enviará mensaje de cierre y finalizará el seguimiento.',
}

// Stages that warrant a confirmation dialog before triggering automations
const CONFIRM_STAGES = new Set(['voucher_enviado', 'cerrado'])

export function KanbanBoard({ initialLeads, statuses, statusConfig, unreadByLead = {} }: KanbanBoardProps) {
  const [leads, setLeads] = useState(initialLeads)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragSourceStatus, setDragSourceStatus] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [closedCollapsed, setClosedCollapsed] = useState(false)
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

  const executeMove = async (leadId: string, targetStatus: string) => {
    const oldLeads = [...leads]
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: targetStatus } : l))
    setIsUpdating(true)
    try {
      await updateLeadStatus(leadId, targetStatus)
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
    let days = 1
    if (lead.pickup_date && lead.return_date) {
      const p = new Date(lead.pickup_date)
      const r = new Date(lead.return_date)
      if (r >= p) days = Math.max(1, Math.ceil((r.getTime() - p.getTime()) / 86400000))
    }
    const rate = lead.agreed_daily_price != null
      ? parseFloat(lead.agreed_daily_price)
      : parseFloat(lead.category?.daily_price || 0)
    return rate * days
  }

  // Urgency badge based on pickup proximity
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

  // Left accent border: unread > unassigned > new > none
  const getCardAccent = (lead: any, unread: number) => {
    if (unread > 0) return 'border-l-[3px] border-l-blue-400'
    if (!lead.assigned_to) return 'border-l-[3px] border-l-orange-400'
    if (isNewLead(lead.created_at)) return 'border-l-[3px] border-l-emerald-400'
    return ''
  }

  // Column drop zone highlight when dragging
  const getColumnDropClass = (status: string) => {
    if (!dragSourceStatus || dragSourceStatus === status) return ''
    const valid = VALID_TRANSITIONS[dragSourceStatus] ?? []
    if (valid.includes(status)) return 'ring-2 ring-primary/30 ring-inset'
    return 'opacity-40 pointer-events-none'
  }

  return (
    <>
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden pb-4 snap-x snap-mandatory scroll-smooth scrollbar-hide">
        <div className="flex gap-4 md:gap-8 h-full min-w-max pr-8 px-4 md:px-0">
          {statuses.map((status) => {
            const stageLeads = getGroupedLeads(status)
            const totalRva = stageLeads.reduce((acc, l) => acc + getReservationAmount(l), 0)
            const isClosed = status === 'cerrado'
            const dropClass = getColumnDropClass(status)

            return (
              <div
                key={status}
                className={`w-[85vw] sm:w-80 flex flex-col gap-4 md:gap-6 snap-center transition-all duration-200 rounded-[2.5rem] ${dropClass}`}
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
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-tight bg-emerald-50 px-2 py-0.5 rounded-full">
                      ${Math.floor(totalRva).toLocaleString()}
                    </span>
                    {isClosed && (
                      <button
                        onClick={() => setClosedCollapsed(v => !v)}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                        title={closedCollapsed ? 'Expandir' : 'Colapsar'}
                      >
                        {closedCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsed state for cerrado */}
                {isClosed && closedCollapsed ? (
                  <button
                    onClick={() => setClosedCollapsed(false)}
                    className="flex items-center justify-center gap-2 py-5 px-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors text-xs font-bold"
                  >
                    <ChevronRight className="w-4 h-4" />
                    Ver {stageLeads.length} leads cerrados
                  </button>
                ) : (
                  /* Column Surface */
                  <div
                    data-drop-surface
                    className="flex-1 flex flex-col gap-4 overflow-y-auto px-1 pb-10 scrollbar-hide rounded-[2.5rem] transition-colors duration-200"
                  >
                    {stageLeads.map((lead) => {
                      const unread = unreadByLead[lead.id] || 0
                      const urgency = getUrgency(lead.pickup_date)
                      const showNew = isNewLead(lead.created_at)
                      const cardAccent = getCardAccent(lead, unread)

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id, lead.status)}
                          onDragEnd={handleDragEnd}
                          className={`bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] shadow-[0_10px_40px_rgba(30,41,59,0.04)] border border-slate-100/50 hover:shadow-[0_20px_60px_rgba(64,82,182,0.12)] hover:scale-[1.02] transition-all duration-500 cursor-grab active:cursor-grabbing relative overflow-hidden ${cardAccent}`}
                        >
                          <Link href={`/dashboard/leads/${lead.id}`} draggable={false}>
                            {/* Top row: ID + badges + amount */}
                            <div className="flex justify-between items-start mb-3 md:mb-4">
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[9px] md:text-[10px] font-bold text-slate-400 bg-slate-100/50 px-2 md:px-2.5 py-1 rounded-full tracking-wider self-start">
                                  #{lead.id.slice(0, 4)}
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {showNew && (
                                    <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                                      🆕 Nuevo
                                    </span>
                                  )}
                                  {urgency && (
                                    <span className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${urgency.cls}`}>
                                      <Zap className="w-2.5 h-2.5" />
                                      {urgency.label}
                                    </span>
                                  )}
                                  {unread > 0 && (
                                    <span className="flex items-center gap-1 text-[8px] font-black bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full border border-blue-100">
                                      <MessageCircle className="w-2.5 h-2.5" />
                                      {unread}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-lg md:text-xl font-sans font-black text-primary tracking-tight leading-none">
                                  <span className="text-xs md:text-sm opacity-50 mr-0.5">$</span>
                                  {Math.floor(lead.total_amount || 0).toLocaleString()}
                                </span>
                                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1">
                                  Rva: ${Math.floor(getReservationAmount(lead)).toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-3 md:space-y-4">
                              <h3 className="text-base md:text-lg font-sans font-black text-slate-900 leading-tight uppercase tracking-tight">
                                {lead.first_name} {lead.last_name}
                              </h3>

                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-slate-400">
                                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                                  <span className="text-[10px] font-bold uppercase tracking-wide truncate">
                                    {lead.pickup_date
                                      ? new Date(lead.pickup_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
                                      : 'Sin fecha'} · {lead.pickup_location?.split(' ')[0] || 'Florida'}
                                  </span>
                                </div>
                                {lead.category?.name && (
                                  <div className="flex items-center gap-2 text-slate-400">
                                    <Car className="w-3.5 h-3.5 shrink-0" />
                                    <span className="text-[10px] font-bold uppercase tracking-wide truncate">
                                      {lead.category.name}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
                              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100 shrink-0">
                                <img
                                  src={lead.assigned_to_profile?.avatar_url || `https://ui-avatars.com/api/?name=${lead.assigned_to_profile?.full_name || 'Agente'}&background=f1f5f9&color=64748b`}
                                  className="w-full h-full object-cover"
                                  alt="Agent"
                                />
                              </div>

                              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                status === 'lead_nuevo'         ? 'bg-slate-100 text-slate-600' :
                                status === 'en_cotizacion'      ? 'bg-indigo-50 text-indigo-600' :
                                status === 'reserva_confirmada' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' :
                                status === 'voucher_enviado'    ? 'bg-amber-50 text-amber-600' :
                                'text-slate-400'
                              }`}>
                                {status === 'lead_nuevo'         && <Clock className="w-3 h-3" />}
                                {status === 'en_cotizacion'      && <Mail className="w-3 h-3" />}
                                {status === 'reserva_confirmada' && <CheckCircle2 className="w-3 h-3" />}
                                {status === 'voucher_enviado'    && <Mail className="w-3 h-3" />}
                                <span>
                                  {status === 'lead_nuevo'         ? '24h' :
                                   status === 'en_cotizacion'      ? 'Enviado' :
                                   status === 'reserva_confirmada' ? 'Confirmado' :
                                   status === 'voucher_enviado'    ? 'Voucher' :
                                   'Cerrado'}
                                </span>
                              </div>
                            </div>
                          </Link>
                        </div>
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
