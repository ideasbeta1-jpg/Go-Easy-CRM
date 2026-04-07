'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, Car, Clock, Mail, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface KanbanBoardProps {
  initialLeads: any[];
  statuses: string[];
  statusConfig: Record<string, { label: string; color: string }>;
}

const statusIcons: Record<string, any> = {
  lead_nuevo: Clock,
  en_cotizacion: Mail,
  reserva_confirmada: CheckCircle2,
  voucher_enviado: Mail,
  cerrado: CheckCircle2,
  unknown: Clock
}

export function KanbanBoard({ initialLeads, statuses, statusConfig }: KanbanBoardProps) {
  const [leads, setLeads] = useState(initialLeads)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Handle Drag Start
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId)
    setDraggingId(leadId)
    // Add a ghost image opacity effect
    setTimeout(() => {
      (e.target as HTMLElement).classList.add('opacity-40')
    }, 0)
  }

  // Handle Drag End
  const handleDragEnd = (e: React.DragEvent) => {
    setDraggingId(null)
    const card = e.target as HTMLElement
    card.classList.remove('opacity-40')
  }

  // Handle Drag Over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault() // Required for drop to work
    const column = e.currentTarget as HTMLElement
    column.classList.add('bg-slate-100/50')
  }

  // Handle Drag Leave
  const handleDragLeave = (e: React.DragEvent) => {
    const column = e.currentTarget as HTMLElement
    column.classList.remove('bg-slate-100/50')
  }

  // Handle Drop
  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    const column = e.currentTarget as HTMLElement
    column.classList.remove('bg-slate-100/50')
    
    const leadId = e.dataTransfer.getData('leadId')
    const lead = leads.find(l => l.id === leadId)
    
    if (!lead || lead.status === targetStatus) return

    // Optimistic Update
    const oldLeads = [...leads]
    const updatedLeads = leads.map(l => 
      l.id === leadId ? { ...l, status: targetStatus } : l
    )
    setLeads(updatedLeads)

    // DB Update
    setIsUpdating(true)
    const { error } = await supabase
      .from('leads')
      .update({ status: targetStatus })
      .eq('id', leadId)

    if (error) {
      console.error('Error updating lead status:', error)
      setLeads(oldLeads) // Rollback
      alert('Error al mover el lead: ' + error.message)
    } else {
        router.refresh() // Refresh the page to ensure server state matches
    }
    setIsUpdating(false)
  }

  const getGroupedLeads = (status: string) => {
    return leads.filter(l => l.status?.trim().toLowerCase() === status.toLowerCase())
  }

  return (
    <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden pb-4 snap-x snap-mandatory scroll-smooth scrollbar-hide">
      <div className="flex gap-4 md:gap-8 h-full min-w-max pr-8 px-4 md:px-0">
        {statuses.map((status) => (
          <div 
            key={status} 
            className="w-[85vw] sm:w-80 flex flex-col gap-4 md:gap-6 snap-center"
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
                  {getGroupedLeads(status).length}
                </span>
              </div>
            </div>

            {/* Column Surface */}
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto px-1 pb-10 scrollbar-hide rounded-[2.5rem] transition-colors duration-300">
              {getGroupedLeads(status).map((lead) => (
                <div 
                  key={lead.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  onDragEnd={handleDragEnd}
                  className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] shadow-[0_10px_40px_rgba(30,41,59,0.04)] border border-slate-100/50 hover:shadow-[0_20px_60px_rgba(64,82,182,0.12)] hover:scale-[1.02] transition-all duration-500 group cursor-grab active:cursor-grabbing relative overflow-hidden"
                >
                  <Link href={`/dashboard/leads/${lead.id}`} draggable={false}>
                    <div className="flex justify-between items-start mb-4 md:mb-6">
                      <span className="text-[9px] md:text-[10px] font-bold text-slate-400 bg-slate-100/50 px-2 md:px-2.5 py-1 rounded-full tracking-wider">
                        #{lead.id.slice(0, 4)}
                      </span>
                      <span className="text-lg md:text-xl font-sans font-black text-primary tracking-tight">
                        <span className="text-xs md:text-sm opacity-50 mr-0.5">$</span>{Math.floor(lead.total_amount || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-base md:text-lg font-sans font-black text-slate-900 leading-tight uppercase tracking-tight">
                        {lead.first_name} {lead.last_name}
                      </h3>
                      
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-wide truncate">
                            {lead.pickup_date ? new Date(lead.pickup_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : 'Sin fecha'} · {lead.pickup_location?.split(' ')[0] || 'Florida'}
                          </span>
                        </div>
                        {lead.category?.name && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Car className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wide truncate">
                              {lead.category.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                      <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100 shrink-0">
                        <img 
                          src={lead.assigned_to_profile?.avatar_url || `https://ui-avatars.com/api/?name=${lead.assigned_to_profile?.full_name || 'Agente'}&background=f1f5f9&color=64748b`} 
                          className="w-full h-full object-cover" 
                          alt="Agent" 
                        />
                      </div>
                      
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        status === 'lead_nuevo' ? 'bg-slate-100 text-slate-600' :
                        status === 'en_cotizacion' ? 'bg-indigo-50 text-indigo-600' :
                        status === 'reserva_confirmada' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' :
                        status === 'voucher_enviado' ? 'bg-amber-50 text-amber-600' :
                        'text-slate-400'
                      }`}>
                        {status === 'lead_nuevo' && <Clock className="w-3 h-3" />}
                        {status === 'en_cotizacion' && <Mail className="w-3 h-3" />}
                        {status === 'reserva_confirmada' && <CheckCircle2 className="w-3 h-3" />}
                        {status === 'voucher_enviado' && <Mail className="w-3 h-3" />}
                        <span>
                           {status === 'lead_nuevo' ? '24h' : 
                            status === 'en_cotizacion' ? 'Enviado' : 
                            status === 'reserva_confirmada' ? 'Confirmado' :
                            status === 'voucher_enviado' ? 'Voucher' : 
                            'Cerrado'}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
              
              {getGroupedLeads(status).length === 0 && (
                 <div className="h-40 flex flex-col items-center justify-center text-slate-200 gap-3 select-none">
                    <Clock className="w-8 h-8 opacity-[0.2]" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Radar Limpio</span>
                 </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {isUpdating && (
        <div className="fixed bottom-12 right-12 bg-white px-6 py-3 rounded-full shadow-2xl border border-slate-100 flex items-center gap-3 animate-in slide-in-from-right-12">
           <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
           <span className="text-xs font-black uppercase tracking-widest text-slate-900">Actualizando Pipeline...</span>
        </div>
      )}
    </div>
  )
}
