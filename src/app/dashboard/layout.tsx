import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SidebarNav } from './components/SidebarNav'
import { DashboardHeader } from './components/DashboardHeader'
import { MobileAppNavigation } from './components/MobileAppNavigation'
import { logout } from '@/app/login/actions'
import { NotificationProvider } from './components/NotificationProvider'
import { Toaster } from 'sonner'
import { ActiveStatusTracker } from './components/ActiveStatusTracker'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Sidebar navigation items data
  const menuItems = [
    { name: 'Inicio', href: '/dashboard' },
    { name: 'Leads (Kanban)', href: '/dashboard/leads' },
    { name: 'Chats WhatsApp', href: '/dashboard/chats' },
    { name: 'Catálogo Flota', href: '/dashboard/catalog' },
    { name: 'Proveedores', href: '/dashboard/providers' },
    { name: 'Reportes', href: '/dashboard/reports' },
    { name: 'Automa n8n', href: '/dashboard/automations' },
  ]

  return (
    <NotificationProvider>
      <div className="flex h-screen bg-slate-50 selection:bg-primary-fixed selection:text-on-primary-container overflow-hidden font-body">
        <MobileAppNavigation menuItems={menuItems} />

        {/* SideNavBar - Premium Coastal Sidebar */}
        <aside className="hidden lg:flex flex-col h-screen w-72 rounded-r-[3rem] sticky left-0 top-0 bg-white py-12 px-8 justify-between shrink-0 z-50 overflow-y-auto border-r border-slate-100/50 shadow-xl shadow-slate-200/20">
          <div className="flex flex-col gap-12">
            <div className="px-2">
              <Link href="/dashboard" className="text-2xl font-black text-primary font-sans leading-none tracking-tight block hover:opacity-80 transition-opacity">Go Easy Florida</Link>
              <div className="text-[0.625rem] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Premium Car Rental CRM</div>
            </div>
            
            <SidebarNav menuItems={menuItems} />
          </div>

          <div className="flex flex-col gap-8">
            <div className="bg-slate-50 rounded-[2.5rem] p-8 flex flex-col gap-4 relative overflow-hidden group border border-slate-100/50">
              <span className="material-symbols-outlined text-primary text-2xl relative z-10 font-black">lightbulb</span>
               <div className="flex flex-col gap-1 relative z-10">
                 <div className="text-[10px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-200/50 pb-1 mb-1">Sales Tips</div>
                 <p className="text-[10px] font-bold leading-relaxed text-slate-500">Intenta contactar nuevos leads en menos de 5 minutos.</p>
               </div>
            </div>
            
            <nav className="flex flex-col gap-1">
               <Link href="/dashboard/settings" className="flex items-center gap-4 px-6 py-3.5 text-slate-500 hover:text-primary transition-all group">
                 <span className="material-symbols-outlined text-[20px] group-hover:rotate-45 transition-transform">settings</span>
                 <span className="font-sans font-bold text-xs uppercase tracking-widest">Configuración</span>
               </Link>
               <form action={logout}>
                 <button className="w-full flex items-center gap-4 px-6 py-3.5 text-slate-500 hover:text-error transition-all group">
                   <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform">logout</span>
                   <span className="font-sans font-bold text-xs uppercase tracking-widest tracking-tight">Cerrar Sesión</span>
                 </button>
               </form>
            </nav>
          </div>
        </aside>

        {/* Main Content Canvas */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <DashboardHeader userEmail={user?.email} />

          {/* Dynamic Content Surface */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 bg-[#f8fafc] relative">
            <div className="absolute inset-0 bg-dots opacity-[0.2] pointer-events-none" />
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
