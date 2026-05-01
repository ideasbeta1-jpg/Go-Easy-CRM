'use client'

import { useEffect, useState } from 'react'
import { getProfileStatus, updateProfileStatus } from '@/app/utils/actions/profiles'
import { toast } from 'sonner'
import { NotificationBell } from './NotificationBell'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return '¡Buen día!'
  if (hour >= 12 && hour < 19) return '¡Buenas tardes!'
  return '¡Buenas noches!'
}

export function DashboardHeader({ userProfile }: { userProfile: any }) {
  const [isActive, setIsActive] = useState(userProfile?.is_active ?? false)
  const [loading, setLoading] = useState(userProfile ? false : true)

  useEffect(() => {
    if (userProfile) {
      setIsActive(userProfile.is_active)
      setLoading(false)
      return
    }
    async function fetchStatus() {
      const { isActive } = await getProfileStatus()
      setIsActive(isActive)
      setLoading(false)
    }
    fetchStatus()
  }, [userProfile])

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

  const firstName = userProfile?.first_name || userProfile?.full_name?.split(' ')[0] || 'Usuario'
  const lastName = userProfile?.last_name || userProfile?.full_name?.split(' ')[1] || ''
  const fullName = userProfile?.first_name && userProfile?.last_name
    ? `${userProfile.first_name} ${userProfile.last_name}`
    : userProfile?.full_name || 'Cargando...'
  const roleLabel = userProfile?.role === 'admin' ? 'Gerente de Ventas' : 'Agente de Ventas'
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=4052b6&color=fff&bold=true`

  return (
    <header className="w-full h-[72px] shrink-0 flex items-center justify-between px-8 bg-white z-40 border-b border-slate-100">
      {/* Left: Greeting + Name */}
      <div>
        <p className="text-xs text-slate-400 font-medium leading-none">{getGreeting()}</p>
        <h2 className="text-lg font-black text-slate-900 leading-tight mt-0.5">{firstName} {lastName}</h2>
      </div>

      {/* Center: Status toggle + Search */}
      <div className="flex items-center gap-5 flex-1 mx-8 max-w-xl">
        {/* Online Toggle */}
        <button
          onClick={handleToggle}
          disabled={loading}
          className="flex items-center gap-2 shrink-0"
          title={isActive ? 'Cambiar a Offline' : 'Cambiar a Online'}
        >
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          <span className={`text-sm font-bold ${isActive ? 'text-slate-700' : 'text-slate-400'}`}>
            {isActive ? 'En línea' : 'Desconectado'}
          </span>
          <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${isActive ? 'translate-x-4' : 'translate-x-1'}`} />
          </div>
        </button>

        {/* Search Bar */}
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-300">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar leads, vehículos..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-100 rounded-xl text-slate-600 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
          />
        </div>
      </div>

      {/* Right: Bell + User */}
      <div className="flex items-center gap-4">
        <NotificationBell />

        <div className="h-8 w-px bg-slate-100" />

        <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" title={userProfile?.email}>
          <div className="flex flex-col items-end">
            <span className="text-sm font-black text-slate-900 leading-tight">{fullName}</span>
            <span className="text-[10px] font-medium text-slate-400 leading-tight">{roleLabel}</span>
          </div>
          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border-2 border-white shadow-sm shrink-0">
            <img
              src={avatarUrl}
              className="w-full h-full object-cover"
              alt="Profile"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
