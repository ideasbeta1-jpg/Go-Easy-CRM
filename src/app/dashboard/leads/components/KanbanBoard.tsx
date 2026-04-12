'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, Car, Clock, Mail, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useKanbanFilter } from './KanbanFilterContext'
import { isToday, isThisWeek, isThisMonth } from 'date-fns'
import { updateLeadStatus } from '../actions'

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
  const router = useRouter()
  const { searchTerm, sortBy, agentFilter, dateFilter } = useKanbanFilter()

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

    // DB Update (Using Server Action to trigger automations)
    setIsUpdating(true)
    try {
      await updateLeadStatus(leadId, targetStatus)
    } catch (error: any) {
      console.error('Error updating lead status:', error)
      setLeads(oldLeads) // Rollback
      alert('Error al mover el lead: ' + error.message)
    }
    
    router.refresh()
    setIsUpdating(false)
  }

  const getGroupedLeads = (status: string) => {
    let filteredLeads = [...leads];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredLeads = filteredLeads.filter(l => {
        const fullName = `${l.first_name || ''} ${l.last_name || ''}`.toLowerCase();
        const email = (l.email || '').toLowerCase();
        const phone = (l.phone || '').toLowerCase();
        return fullName.includes(term) || email.includes(term) || phone.includes(term);
      });
    }

    if (agentFilter) {
      filteredLeads = filteredLeads.filter(l => l.assigned_to === agentFilter);
    }

    if (dateFilter !== 'all') {
      filteredLeads = filteredLeads.filter(l => {
        if (!l.created_at) return false;
        const date = new Date(l.created_at);
        switch (dateFilter) {
          case 'today': return isToday(date);
          case 'this_week': return isThisWeek(date, { weekStartsOn: 1 }); // Starts on Monday
          case 'this_month': return isThisMonth(date);
          default: return true;
        }
      });
    }

    // Apply sorting
    filteredLeads.sort((a, b) => {
      const valA = parseFloat(a.total_amount || 0);
      const valB = parseFloat(b.total_amount || 0);
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();

      switch (sortBy) {
        case 'highest_value': return valB - valA;
        case 'lowest_value': return valA - valB;
        case 'oldest': return dateA - dateB;
        case 'newest': 
        default: return dateB - dateA;
      }
    });

    return filteredLeads.filter(l => l.status?.trim().toLowerCase() === status.toLowerCase())
  }

  const getReservationAmount = (lead: any) => {
    let rentalDays = 1;
    if (lead.pickup_date && lead.return_date) {
      const p = new Date(lead.pickup_date);
      const r = new Date(lead.return_date);
      if (r >= p) {
         rentalDays = Math.max(1, Math.ceil((r.getTime() - p.getTime()) / (1000 * 60 * 60 * 24)));
      }
    }
    const margin = lead.agreed_daily_price !== null && lead.agreed_daily_price !== undefined
      ? parseFloat(lead.agreed_daily_price) 
      : parseFloat(lead.category?.daily_price || 0);
    return margin * rentalDays;
  }

  return (
    <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden pb-4 snap-x snap-mandatory scroll-smooth scrollbar-hide">
      <div className="flex gap-4 md:gap-8 h-full min-w-max pr-8 px-4 md:px-0">
        {statuses.map((status) => {
          const stageLeads = getGroupedLeads(status);
          const totalRva = stageLeads.reduce((acc, lead) => acc + getReservationAmount(lead), 0);
          
          return (
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
                  {stageLeads.length}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block leading-tight bg-emerald-50 px-2 py-0.5 rounded-full">
                  Rva: ${Math.floor(totalRva).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Column Surface */}
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto px-1 pb-10 scrollbar-hide rounded-[2.5rem] transition-colors duration-300">
              {stageLeads.map((lead) => (
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
                      <div className="flex flex-col items-end">
                        <span className="text-lg md:text-xl font-sans font-black text-primary tracking-tight leading-none">
                          <span className="text-xs md:text-sm opacity-50 mr-0.5">$</span>{Math.floor(lead.total_amount || 0).toLocaleString()}
                        </span>
                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1">
                          Rva: ${Math.floor(getReservationAmount(lead)).toLocaleString()}
                        </span>
                      </div>
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
        )})}
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
