'use client'

import { usePathname } from 'next/navigation'
import { Bell, HelpCircle } from 'lucide-react'

export function DashboardHeader({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();
  const isLeadsPage = pathname === '/dashboard/leads';

  if (isLeadsPage) return null;

  return (
    <header className="w-full h-24 shrink-0 flex justify-between items-center px-12 bg-white/50 backdrop-blur-md z-40 border-b border-slate-100/30">
      <div className="flex flex-col">
          <h1 className="font-sans text-2xl font-black text-slate-900 tracking-tight uppercase">
            ¡Bienvenido de nuevo! <span className="text-primary">Florida</span> 🌴
          </h1>
      </div>

      <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <button className="material-symbols-outlined p-2 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-2xl transition-all">notifications</button>
            <button className="material-symbols-outlined p-2 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-2xl transition-all font-variation-fill">help</button>
          </div>
          
          <div className="h-10 w-[1px] bg-slate-200 hidden md:block"></div>

          <div className="flex items-center gap-4 px-3 py-1.5 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer group">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-primary uppercase tracking-wider">Admin Panel</span>
              <span className="text-[10px] font-bold text-slate-400 truncate max-w-[120px]">{userEmail}</span>
            </div>
            <div className="w-11 h-11 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
              <img src={`https://ui-avatars.com/api/?name=${userEmail?.split('@')[0]}&background=4052b6&color=fff`} className="w-full h-full object-cover" alt="Profile" />
            </div>
          </div>
      </div>
    </header>
  );
}
