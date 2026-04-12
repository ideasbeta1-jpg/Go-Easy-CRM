import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal,
  Calendar,
  MapPin,
  Car,
  Bell,
  HelpCircle,
  Mail,
  CheckCircle2,
  Clock
} from 'lucide-react'

import { KanbanBoard } from './components/KanbanBoard'
import { NewLeadButton } from './components/NewLeadButton'
import { NotificationBell } from '../components/NotificationBell'
import { KanbanFilterProvider } from './components/KanbanFilterContext'
import { KanbanSearchControls } from './components/KanbanSearchControls'

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
    .select('role, full_name, avatar_url')
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
      .select('id, full_name, avatar_url')
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

  // 6. Build lookup map and group
  const statuses = ['lead_nuevo', 'en_cotizacion', 'reserva_confirmada', 'voucher_enviado', 'cerrado']
  const processedLeads = (leads || []).map(l => ({
    ...l,
    assigned_to_profile: profileMap[l.assigned_to]
  }))

  return (
    <KanbanFilterProvider>
      <div className="flex flex-col h-full gap-5 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shrink-0 relative z-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-sans font-black text-slate-900 tracking-tighter leading-none uppercase">
            Pipeline de <span className="text-primary">Ventas</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">
            Total Leads: {leads?.length || 0} found in DB
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

          <div className="flex items-center gap-3 pl-3 pr-2 md:pr-4 border-l border-slate-200 shrink-0">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-900 uppercase leading-none mb-1">{isAdmin ? 'Admin' : 'Agente'}</span>
              <span className="text-[9px] font-bold text-slate-400 truncate max-w-[80px]">{profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}</span>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100">
               <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || user?.email?.split('@')[0] || 'User'}&background=4052b6&color=fff`} className="w-full h-full object-cover" alt="Profile" />
            </div>
          </div>
        </div>
      </div>

      <KanbanBoard 
        initialLeads={processedLeads}
        statuses={statuses}
        statusConfig={statusConfig}
      />
    </div>
    </KanbanFilterProvider>
  )
}
