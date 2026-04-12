'use client'

import { usePathname } from 'next/navigation'
import { Radio } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getProfileStatus, updateProfileStatus } from '@/app/utils/actions/profiles'
import { toast } from 'sonner'
import { NotificationBell } from './NotificationBell'

export function DashboardHeader({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();
  const isLeadsPage = pathname === '/dashboard/leads';
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStatus() {
      const { isActive } = await getProfileStatus()
      setIsActive(isActive)
      setLoading(false)
    }
    fetchStatus()
  }, [])

  const handleToggle = async () => {
    const newStatus = !isActive
    setIsActive(newStatus)
    const result = await updateProfileStatus(newStatus)
    if (result.error) {
      toast.error('Error al actualizar estado')
      setIsActive(!newStatus)
    } else {
      toast.success(newStatus ? '¡Ahora estás Online! Recibirás leads.' : 'Estado: Offline. No recibirás leads.')
    }
  }

  if (isLeadsPage) return null;

  return (
    <header className="w-full h-24 shrink-0 flex justify-between items-center px-12 bg-white/50 backdrop-blur-md z-40 border-b border-slate-100/30">
      <div className="flex flex-col">
          <h1 className="font-sans text-2xl font-black text-slate-900 tracking-tight uppercase">
            ¡Bienvenido de nuevo! <span className="text-primary">Florida</span> 🌴
          </h1>
          <div className="flex items-center gap-2 mt-1">
             <div className={`w-2 h-2 rounded-full animate-pulse ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
               Sistema de Asignación: {isActive ? 'Activo' : 'Pausado'}
             </span>
          </div>
      </div>

      <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            {/* Availability Toggle */}
            <button 
              onClick={handleToggle}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all border font-bold text-xs uppercase tracking-wider ${
                isActive 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100' 
                : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'
              }`}
            >
              <Radio size={14} className={isActive ? 'animate-pulse' : ''} />
              {isActive ? 'Online' : 'Offline'}
            </button>

            <div className="h-6 w-[1px] bg-slate-100 mx-2"></div>
            
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button className="material-symbols-outlined p-2 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-2xl transition-all font-variation-fill">help</button>
            </div>
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
