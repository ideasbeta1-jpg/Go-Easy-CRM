'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarNav } from './SidebarNav'

interface MenuItem {
  name: string;
  href: string;
}

export function MobileAppNavigation({ menuItems }: { menuItems: MenuItem[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Cerrar el menú automáticamente al cambiar de ruta
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  const isChatsPage = pathname.startsWith('/dashboard/chats')

  return (
    <div className="lg:hidden">
      {/* Hamburger Button for Mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed right-6 z-[60] w-14 h-14 bg-primary text-white rounded-full shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all ${isChatsPage ? 'bottom-28' : 'bottom-6'}`}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/20 backdrop-blur-sm flex justify-end">
          <div className="w-4/5 max-w-[320px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-8 flex justify-between items-center border-b border-slate-50 shrink-0">
               <div>
                 <Link href="/dashboard" className="text-xl font-black text-primary font-sans leading-none tracking-tight block">Go Easy</Link>
                 <div className="text-[0.625rem] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Florida CRM</div>
               </div>
               <button 
                 onClick={() => setIsOpen(false)} 
                 className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 hover:text-slate-700 transition-colors"
               >
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-6">
               <SidebarNav menuItems={menuItems} />
            </div>
            
            <div className="p-6 border-t border-slate-50 bg-slate-50/50 mt-auto shrink-0">
               <form action="/auth/logout" method="POST">
                 <button className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border border-slate-100 text-slate-500 hover:text-red-500 transition-all rounded-2xl shadow-sm">
                   <span className="material-symbols-outlined text-[18px]">logout</span>
                   <span className="font-sans font-bold text-xs uppercase tracking-widest tracking-tight">Cerrar Sesión</span>
                 </button>
               </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
