import { createClient } from '@/utils/supabase/server'

import { KanbanBoard } from './components/KanbanBoard'
import { NewLeadButton } from './components/NewLeadButton'
import { KanbanFilterProvider } from './components/KanbanFilterContext'
import { KanbanSearchControls, KanbanFilterChips } from './components/KanbanSearchControls'

const statusConfig: Record<string, { label: string; color: string }> = {
  lead_nuevo:          { label: 'Lead Nuevo',         color: 'bg-blue-500' },
  en_cotizacion:       { label: 'En Cotización',       color: 'bg-indigo-500' },
  reserva_confirmada:  { label: 'Reserva Confirmada',  color: 'bg-emerald-500' },
  voucher_enviado:     { label: 'Voucher Enviado',     color: 'bg-amber-500' },
  cerrado_ganado:      { label: 'Cerrado Ganado',      color: 'bg-emerald-600' },
  cerrado_perdido:     { label: 'Cerrado Perdido',     color: 'bg-rose-400' },
}

export default async function LeadsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, first_name, last_name, avatar_url')
    .eq('id', user.id)
    .single()

  const isAdmin = !profile || profile?.role === 'admin'

  let leadsQuery = supabase
    .from('leads')
    .select(`*, category:categories(name, image_url, daily_price)`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (!isAdmin) {
    leadsQuery = leadsQuery.eq('assigned_to', user.id)
  }

  const { data: leads, error } = await leadsQuery

  if (error) {
    return (
      <div className="p-8 text-rose-600 bg-rose-50 rounded-2xl border border-rose-100 font-bold">
        Error al cargar los leads: {error.message}
      </div>
    )
  }

  const assignedToIds = Array.from(new Set(leads?.map(l => l.assigned_to).filter(Boolean)))
  let profiles: any[] = []
  if (assignedToIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, first_name, last_name, avatar_url')
      .in('id', (assignedToIds as string[]))
    profiles = profilesData || []
  }

  const profileMap = profiles.reduce((acc, p) => {
    acc[p.id] = p
    return acc
  }, {} as Record<string, any>)

  const { data: categories } = await supabase.from('categories').select('*').order('name')
  const { data: locations } = await supabase.from('locations').select('*').order('name')

  const { data: unreadMessages } = await supabase
    .from('messages')
    .select('lead_id')
    .eq('direction', 'inbound')
    .eq('is_read', false)

  const unreadByLead: Record<string, number> = {}
  ;(unreadMessages || []).forEach(m => {
    if (m.lead_id) unreadByLead[m.lead_id] = (unreadByLead[m.lead_id] || 0) + 1
  })

  const TERMINAL_STATUSES = ['cerrado_ganado', 'cerrado_perdido']
  const activeLeads = (leads || []).filter(l => !TERMINAL_STATUSES.includes(l.status))
  const wonLeads = (leads || []).filter(l => l.status === 'cerrado_ganado')
  const lostLeads = (leads || []).filter(l => l.status === 'cerrado_perdido')
  const activePipelineValue = activeLeads.reduce((sum, l) => sum + parseFloat(l.total_amount || 0), 0)
  const wonValue = wonLeads.reduce((sum, l) => sum + parseFloat(l.total_amount || 0), 0)
  const closedTotal = wonLeads.length + lostLeads.length
  const winRate = closedTotal > 0 ? ((wonLeads.length / closedTotal) * 100).toFixed(1) : null
  const unassignedCount = activeLeads.filter(l => !l.assigned_to).length

  const statuses = ['lead_nuevo', 'en_cotizacion', 'reserva_confirmada', 'voucher_enviado', 'cerrado_ganado', 'cerrado_perdido']
  const processedLeads = (leads || []).map(l => {
    const profile = profileMap[l.assigned_to]
    return {
      ...l,
      assigned_to_profile: profile
        ? { ...profile, full_name: profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Agente' }
        : null
    }
  })

  const addLeadProps = {
    categories: categories || [],
    locations: locations || [],
    currentUserId: user.id,
  }

  return (
    <KanbanFilterProvider>
      <div className="flex flex-col h-full gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">

        {/* Page Header */}
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Pipeline de Ventas
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {leads?.length || 0} leads · actualizado hace 2 min <span className="text-amber-400">⚡</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-1 justify-end max-w-xl">
            <KanbanSearchControls agents={profiles} />
            <NewLeadButton
              categories={categories || []}
              locations={locations || []}
              currentUserId={user.id}
            />
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          <div className="bg-white rounded-2xl px-5 py-4 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pipeline Activo</p>
            <p className="text-2xl font-black text-primary tracking-tight">
              ${Math.floor(activePipelineValue).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-2xl px-5 py-4 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cerrado Ganado</p>
            <p className="text-2xl font-black text-emerald-600 tracking-tight">
              ${Math.floor(wonValue).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-2xl px-5 py-4 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sin Asignar</p>
            <p className={`text-2xl font-black tracking-tight ${unassignedCount > 0 ? 'text-orange-500' : 'text-slate-900'}`}>
              {unassignedCount}
            </p>
          </div>
          <div className="bg-white rounded-2xl px-5 py-4 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tasa de Cierre</p>
            {winRate !== null ? (
              <p className={`text-2xl font-black tracking-tight ${Number(winRate) >= 50 ? 'text-emerald-600' : Number(winRate) >= 25 ? 'text-amber-500' : 'text-rose-500'}`}>
                {winRate}%
              </p>
            ) : (
              <p className="text-2xl font-black text-slate-300 tracking-tight">—</p>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        <KanbanFilterChips agents={profiles} />

        <KanbanBoard
          initialLeads={processedLeads}
          statuses={statuses}
          statusConfig={statusConfig}
          unreadByLead={unreadByLead}
          addLeadProps={addLeadProps}
        />
      </div>
    </KanbanFilterProvider>
  )
}
