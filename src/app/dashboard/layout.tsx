import { getCachedUser } from '@/utils/supabase/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SidebarNav } from './components/SidebarNav'
import { DashboardHeader } from './components/DashboardHeader'
import { MobileAppNavigation } from './components/MobileAppNavigation'
import { logout } from '@/app/login/actions'
import { NotificationProvider } from './components/NotificationProvider'
import { PWAHead } from './components/PWAHead'
import { Toaster } from 'sonner'
import { ActiveStatusTracker } from './components/ActiveStatusTracker'
import { getUserProfile } from '@/app/utils/actions/profiles'
import { getSystemSettings } from '@/app/utils/actions/settings'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCachedUser()

  if (!user) {
    redirect('/login')
  }

  // Perfil y ajustes en paralelo (antes era una cascada secuencial).
  // getUserProfile reutiliza getCachedUser, así que no repite el round-trip de auth.
  const [userProfile, settings] = await Promise.all([
    getUserProfile(),
    getSystemSettings(),
  ])

  const menuItems = [
    { name: 'Inicio', href: '/dashboard' },
    { name: 'Leads Kanban', href: '/dashboard/leads' },
    { name: 'Chats WhatsApp', href: '/dashboard/chats' },
    { name: 'Catálogo Flota', href: '/dashboard/catalog' },
    { name: 'Proveedores', href: '/dashboard/providers' },
    { name: 'Reportes', href: '/dashboard/reports' },
    { name: 'Mensajes', href: '/dashboard/messages' },
    { name: 'Tareas', href: '/dashboard/tasks' },
    { name: 'Automatizaciones', href: '/dashboard/automations' },
  ]

  return (
    <NotificationProvider>
      <PWAHead />
      <div className="flex h-screen bg-slate-50 selection:bg-primary-fixed selection:text-on-primary-container overflow-hidden font-body">
        <MobileAppNavigation menuItems={menuItems} />

        {/* Dark Navy Sidebar */}
        <aside className="hidden lg:flex flex-col h-screen w-64 sticky left-0 top-0 bg-[#1c2537] py-8 px-5 justify-between shrink-0 z-50 overflow-y-auto">
          {/* Top: Logo + Nav */}
          <div className="flex flex-col gap-8">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-3 px-2 hover:opacity-90 transition-opacity">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt={settings.crm_name || 'CRM'} className="h-9 w-auto" />
              ) : (
                <>
                  <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-white font-black text-base leading-none">
                      {(settings?.crm_name || 'G')[0]}
                    </span>
                  </div>
                  <div>
                    <div className="text-white font-black text-sm leading-tight">
                      {settings?.crm_name || 'Go Easy CRM'}
                    </div>
                    <div className="text-slate-400 text-[10px] font-medium mt-0.5">
                      {settings?.crm_tagline || 'Premium Car Rental CRM'}
                    </div>
                  </div>
                </>
              )}
            </Link>

            {/* Nav section */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 px-3 mb-1">
                Operación
              </span>
              <SidebarNav menuItems={menuItems} />
            </div>
          </div>

          {/* Bottom: Sales Tip + Settings */}
          <div className="flex flex-col gap-5">
            {/* Sales Tip */}
            <div className="bg-white/5 rounded-2xl p-5 flex flex-col gap-2 border border-white/5">
              <div className="text-[10px] font-black uppercase tracking-wider text-primary">Sales Tip</div>
              <p className="text-sm font-bold text-white leading-snug">Responde en menos de 5 min</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Los leads contactados rápido cierran 3.2× más. Activa respuestas automáticas.
              </p>
            </div>

            {/* Settings + Logout */}
            <nav className="flex items-center justify-between px-1">
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2.5 text-slate-400 hover:text-white transition-colors py-2 px-2 rounded-lg hover:bg-white/5"
              >
                <span className="material-symbols-outlined text-[20px]">settings</span>
                <span className="font-bold text-xs">Ajustes</span>
              </Link>
              <form action={logout}>
                <button className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                </button>
              </form>
            </nav>
          </div>
        </aside>

        {/* Main Content Canvas */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <DashboardHeader userProfile={userProfile} />

          {/* Dynamic Content Surface */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#f8fafc] relative">
            <div className="relative z-10 h-full">
              {children}
            </div>
          </div>
        </main>
        <Toaster richColors position="top-right" closeButton />
      </div>
      <ActiveStatusTracker />
    </NotificationProvider>
  )
}
