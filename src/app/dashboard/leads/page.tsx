import { createClient } from '@/utils/supabase/server'
import { getCachedUser } from '@/utils/supabase/auth'
import { getCachedCategories, getCachedLocations } from '@/app/utils/actions/cached-data'

import { KanbanBoard } from './components/KanbanBoard'
import { NewLeadButton } from './components/NewLeadButton'

// Debe coincidir con TERMINAL_PAGE_SIZE en ./actions (carga inicial de cerrados).
const TERMINAL_PAGE_SIZE = 30
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

  const user = await getCachedUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, first_name, last_name, avatar_url')
    .eq('id', user.id)
    .single()

  const isAdmin = !profile || profile?.role === 'admin'

  const ACTIVE_STATUSES = ['lead_nuevo', 'en_cotizacion', 'reserva_confirmada', 'voucher_enviado']
  const withScope = (q: any) => (isAdmin ? q : q.eq('assigned_to', user.id))

  // Pipeline activo: se carga completo (acotado por naturaleza, necesario para
  // drag-drop/búsqueda/orden). Columnas cerradas (crecen sin límite): solo los
  // más recientes + "Cargar más". KPIs de cerrados vía agregados ligeros para
  // que el cap no distorsione las métricas.
  const [
    { data: activeLeadsRaw, error },
    { data: wonRecent },
    { data: lostRecent },
    { data: wonAmounts },
    { count: lostTotal },
    categories,
    locations,
    { data: unreadMessages },
  ] = await Promise.all([
    withScope(supabase.from('leads')
      .select(`*, category:categories(name, image_url, daily_price)`)
      .is('deleted_at', null)
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: false })),
    withScope(supabase.from('leads')
      .select(`*, category:categories(name, image_url, daily_price)`)
      .is('deleted_at', null)
      .eq('status', 'cerrado_ganado')
      .order('created_at', { ascending: false })
      .range(0, TERMINAL_PAGE_SIZE - 1)),
    withScope(supabase.from('leads')
      .select(`*, category:categories(name, image_url, daily_price)`)
      .is('deleted_at', null)
      .eq('status', 'cerrado_perdido')
      .order('created_at', { ascending: false })
      .range(0, TERMINAL_PAGE_SIZE - 1)),
    withScope(supabase.from('leads')
      .select('total_amount')
      .is('deleted_at', null)
      .eq('status', 'cerrado_ganado')),
    withScope(supabase.from('leads')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'cerrado_perdido')),
    getCachedCategories(),
    getCachedLocations(),
    supabase.from('messages').select('lead_id').eq('direction', 'inbound').eq('is_read', false),
  ])

  if (error) {
    return (
      <div className="p-8 text-rose-600 bg-rose-50 rounded-2xl border border-rose-100 font-bold">
        Error al cargar los leads: {error.message}
      </div>
    )
  }

  const leads = [...(activeLeadsRaw || []), ...(wonRecent || []), ...(lostRecent || [])]

  const assignedToIds = Array.from(new Set(leads.map(l => l.assigned_to).filter(Boolean)))
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

  const unreadByLead: Record<string, number> = {}
  ;(unreadMessages || []).forEach(m => {
    if (m.lead_id) unreadByLead[m.lead_id] = (unreadByLead[m.lead_id] || 0) + 1
  })

  const activeLeads: any[] = activeLeadsRaw || []
  const activePipelineValue = activeLeads.reduce((sum: number, l: any) => sum + parseFloat(l.total_amount || 0), 0)
  const wonCount = (wonAmounts || []).length
  const wonValue = (wonAmounts || []).reduce((sum: number, l: any) => sum + parseFloat(l.total_amount || 0), 0)
  const lostCount = lostTotal || 0
  const closedTotal = wonCount + lostCount
  const winRate = closedTotal > 0 ? ((wonCount / closedTotal) * 100).toFixed(1) : null
  const unassignedCount = activeLeads.filter((l: any) => !l.assigned_to).length
  const totalLeads = activeLeads.length + closedTotal

  // Totales reales por etapa terminal (para el contador de columna y "Cargar más").
  const statusTotals: Record<string, number> = {
    cerrado_ganado: wonCount,
    cerrado_perdido: lostCount,
  }

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
              {totalLeads} leads · actualizado hace 2 min <span className="text-amber-400">⚡</span>
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
          statusTotals={statusTotals}
        />
      </div>
    </KanbanFilterProvider>
  )
}
