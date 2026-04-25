import { createClient } from '@/utils/supabase/server'
import { HelpCircle } from 'lucide-react'

import { KanbanBoard } from './components/KanbanBoard'
import { NewLeadButton } from './components/NewLeadButton'
import { NotificationBell } from '../components/NotificationBell'
import { KanbanFilterProvider } from './components/KanbanFilterContext'
import { KanbanSearchControls, KanbanFilterChips } from './components/KanbanSearchControls'

// Map of status to friendly names and colors for the columns
const statusConfig: Record<string, { label: string; color: string }> = {
  lead_nuevo: { label: 'Lead Nuevo', color: 'bg-blue-500' },
  en_cotizacion: { label: 'En Cotización', color: 'bg-indigo-500' },
  reserva_confirmada: { label: 'Reserva Confirmada', color: 'bg-emerald-500' },
  voucher_enviado: { label: 'Voucher Enviado', color: 'bg-amber-500' },
  cerrado: { label: 'Cerrado', color: 'bg-slate-500' },
}

export default async function LeadsPage() {
  const supabase = await createClient()
  
  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 2. Get user profile and role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, first_name, last_name, avatar_url')
    .eq('id', user.id)
    .single()

  // Default to admin for now if profile is not found, to ensure visibility during setup
  const isAdmin = !profile || profile?.role === 'admin'

  // 3. Query leads
  let leadsQuery = supabase
    .from('leads')
    .select(`
      *,
      category:categories(name, image_url, daily_price)
    `)
    .order('created_at', { ascending: false })

  if (!isAdmin) {
    leadsQuery = leadsQuery.eq('assigned_to', user.id)
  }

  const { data: leads, error } = await leadsQuery

  if (error) {
    return (
      <div className="p-12 text-rose-600 bg-rose-50 rounded-[3rem] border border-rose-100 font-bold font-sans">
         Error al cargar los leads: {error.message}
      </div>
    )
  }

  // 4. Fetch profiles for assignment if we have leads
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

  // 5. Fetch categories and locations for the new lead modal
  const { data: categories } = await supabase.from('categories').select('*').order('name')
  const { data: locations } = await supabase.from('locations').select('*').order('name')

  // 6. Fetch unread inbound messages to show indicators on cards
  const { data: unreadMessages } = await supabase
    .from('messages')
    .select('lead_id')
    .eq('direction', 'inbound')
    .eq('is_read', false)

  const unreadByLead: Record<string, number> = {}
  ;(unreadMessages || []).forEach(m => {
    if (m.lead_id) unreadByLead[m.lead_id] = (unreadByLead[m.lead_id] || 0) + 1
  })

  // KPI calculations
  const activeLeads = (leads || []).filter(l => l.status !== 'cerrado')
  const activePipelineValue = activeLeads.reduce((sum, l) => sum + parseFloat(l.total_amount || 0), 0)
  const unassignedCount = activeLeads.filter(l => !l.assigned_to).length
  const now = Date.now()
  const urgentCount = activeLeads.filter(l => {
    if (!l.pickup_date) return false
    const hrs = (new Date(l.pickup_date).getTime() - now) / 3600000
    return hrs > 0 && hrs <= 72
  }).length
  const totalUnread = Object.values(unreadByLead).reduce((a, b) => a + b, 0)

  // 7. Build lookup map and group
  const statuses = ['lead_nuevo', 'en_cotizacion', 'reserva_confirmada', 'voucher_enviado', 'cerrado']
  const processedLeads = (leads || []).map(l => {
    const profile = profileMap[l.assigned_to]
    return {
      ...l,
      assigned_to_profile: profile
        ? {
            ...profile,
            full_name: profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Agente'
          }
        : null
    }
  })

  return (
    <KanbanFilterProvider>
      <div className="flex flex-col h-full gap-5 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">

        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shrink-0 relative z-10">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-sans font-black text-slate-900 tracking-tighter leading-none uppercase">
              Pipeline de <span className="text-primary">Ventas</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">
              {leads?.length || 0} leads en total
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-4 bg-white/40 p-1.5 md:p-2 rounded-[1.5rem] md:rounded-[2rem] border border-white/60 shadow-sm backdrop-blur-sm w-full lg:w-auto">
            <KanbanSearchControls agents={profiles} />

            <div className="hidden sm:flex items-center gap-1 border-l border-slate-200 pl-3">
              <NotificationBell />
              <button className="p-2 text-slate-400 hover:text-primary hover:bg-white rounded-full transition-all">
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>

            <NewLeadButton
              categories={categories || []}
              locations={locations || []}
              currentUserId={user.id}
            />

            <div className="flex items-center gap-3 pl-3 pr-2 md:pr-4 border-l border-slate-200 shrink-0" title={user?.email || ''}>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[9px] font-black text-primary uppercase leading-none mb-1">
                  {profile?.first_name && profile?.last_name
                    ? `${profile.first_name} ${profile.last_name}`
                    : profile?.full_name || 'Cargando...'}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  {profile?.role === 'admin' ? 'Administrador' : 'Agente'}
                </span>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100">
                <img
                  src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    (profile?.first_name && profile?.last_name)
                      ? `${profile.first_name} ${profile.last_name}`
                      : profile?.full_name || 'U'
                  )}&background=4052b6&color=fff&bold=true`}
                  className="w-full h-full object-cover"
                  alt="Profile"
                />
              </div>
            </div>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 shrink-0">
          <div className="bg-white rounded-2xl md:rounded-3xl px-5 py-4 border border-slate-100/60 shadow-[0_4px_20px_rgba(30,41,59,0.04)]">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pipeline Activo</p>
            <p className="text-xl font-black text-primary tracking-tight">
              <span className="text-sm opacity-50 mr-0.5">$</span>
              {Math.floor(activePipelineValue).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-2xl md:rounded-3xl px-5 py-4 border border-slate-100/60 shadow-[0_4px_20px_rgba(30,41,59,0.04)]">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sin Asignar</p>
            <p className={`text-xl font-black tracking-tight ${unassignedCount > 0 ? 'text-orange-500' : 'text-slate-900'}`}>
              {unassignedCount}
              <span className="text-xs font-bold text-slate-400 ml-1.5">leads</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl md:rounded-3xl px-5 py-4 border border-slate-100/60 shadow-[0_4px_20px_rgba(30,41,59,0.04)]">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">⚡ Urgentes</p>
            <p className={`text-xl font-black tracking-tight ${urgentCount > 0 ? 'text-rose-500' : 'text-slate-900'}`}>
              {urgentCount}
              <span className="text-xs font-bold text-slate-400 ml-1.5">en 72h</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl md:rounded-3xl px-5 py-4 border border-slate-100/60 shadow-[0_4px_20px_rgba(30,41,59,0.04)]">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mensajes</p>
            <p className={`text-xl font-black tracking-tight ${totalUnread > 0 ? 'text-blue-500' : 'text-slate-900'}`}>
              {totalUnread}
              <span className="text-xs font-bold text-slate-400 ml-1.5">sin leer</span>
            </p>
          </div>
        </div>

        {/* Active filter chips */}
        <KanbanFilterChips agents={profiles} />

        <KanbanBoard
          initialLeads={processedLeads}
          statuses={statuses}
          statusConfig={statusConfig}
          unreadByLead={unreadByLead}
        />
      </div>
    </KanbanFilterProvider>
  )
}
