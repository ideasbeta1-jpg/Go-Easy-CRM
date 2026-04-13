'use client'

import { useState } from 'react'
import { Plus, UserPlus, Users, Search, ShieldCheck, Mail, ShieldAlert, Shield, ShieldHalf, Trash2, Loader2, User as UserIcon } from 'lucide-react'
import { createSystemUser, deleteSystemUser } from '../actions'
import { Toaster, toast } from 'sonner'
import Image from 'next/image'

type UserData = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  first_name: string
  last_name: string
  role: string
  avatar_url: string | null
  is_active: boolean
}

export default function UserManagementClient({ users }: { users: UserData[] }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'agente'
  })

  const filteredUsers = users.filter(u => 
    u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Quick validation
    if (!formData.email || !formData.password || formData.password.length < 6) {
        toast.error('Por favor, ingresa una contraseña válida de al menos 6 caracteres')
        setIsSubmitting(false)
        return
    }

    const payload = new FormData()
    payload.append('firstName', formData.firstName)
    payload.append('lastName', formData.lastName)
    payload.append('email', formData.email)
    payload.append('password', formData.password)
    payload.append('role', formData.role)

    const res = await createSystemUser(payload)
    if (res.error) {
        toast.error(res.error)
    } else {
        toast.success(`Usuario ${formData.firstName} creado correctamente`)
        setIsModalOpen(false)
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            role: 'agente'
        })
    }
    
    setIsSubmitting(false)
  }

  const handleDelete = async (userId: string, userName: string) => {
      if(confirm(`¿Estás seguro que deseas eliminar el usuario ${userName}? Esta acción no se puede deshacer.`)) {
         const res = await deleteSystemUser(userId)
         if (res.error) toast.error(res.error)
         else toast.success(`Usuario ${userName} eliminado exitosamente.`)
      }
  }

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100/50">
               <ShieldCheck className="w-6 h-6 text-indigo-600" />
             </div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight">Usuarios y Roles</h1>
          </div>
          <p className="text-sm font-semibold text-slate-400">Gestiona al equipo de Go Easy CRM. Añade agentes o nuevos administradores.</p>
        </div>

        <button 
           onClick={() => setIsModalOpen(true)}
           className="bg-primary text-white px-8 py-4 flex items-center justify-center gap-3 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/30 hover:scale-[1.02] hover:shadow-2xl hover:bg-primary-fixed transition-all group shrink-0"
        >
            <UserPlus className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            Nuevo Usuario
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2rem] md:rounded-[3rem] shadow-xl shadow-slate-200/50 p-4 md:p-8 space-y-8 relative overflow-hidden">
        
        {/* Decorative Background */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="relative w-full max-w-sm">
                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                     <Search className="h-4 w-4 text-slate-400" />
                 </div>
                 <input 
                    type="text" 
                    placeholder="Buscar agente por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50/50 border-2 border-slate-100 focus:border-primary/20 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-2xl pl-12 pr-4 py-3.5 transition-all text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
                 />
             </div>

             <div className="flex items-center gap-2 px-6 py-3 bg-slate-50/80 rounded-2xl border border-slate-100 shrink-0 w-full md:w-auto justify-center">
                 <Users className="w-4 h-4 text-primary" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Total: {users.length} Usuarios</span>
             </div>
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 relative z-10">
          {filteredUsers.map((user) => (
             <div key={user.id} className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all group flex flex-col justify-between overflow-hidden">
               
               <div className="flex items-start justify-between mb-6">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden relative shrink-0">
                       {user.avatar_url ? (
                         <img src={user.avatar_url} alt={user.first_name} className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300">
                            <UserIcon className="w-6 h-6" />
                         </div>
                       )}
                    </div>
                    <div className="min-w-0">
                       <h3 className="font-black text-slate-800 text-lg tracking-tight truncate max-w-[150px]">{user.first_name} {user.last_name}</h3>
                       <p className="text-xs font-semibold text-slate-400 truncate max-w-[150px]">{user.email}</p>
                    </div>
                 </div>

                 {/* Role Badge */}
                 <div className={`px-3 py-1 flex items-center gap-1.5 rounded-full border shadow-sm shrink-0 ${
                     user.role === 'admin' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                 }`}>
                    {user.role === 'admin' ? <ShieldAlert className="w-3 h-3" /> : <ShieldHalf className="w-3 h-3" />}
                    <span className="text-[9px] font-black uppercase tracking-widest leading-none mt-0.5">{user.role}</span>
                 </div>
               </div>

               <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-2">
                 <div className="flex flex-col gap-1">
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Último Ingreso</span>
                   <span className="text-xs font-bold text-slate-600 tracking-tight">
                      {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric'}) : 'Nunca ingresó'}
                   </span>
                 </div>

                 <button 
                   onClick={() => handleDelete(user.id, `${user.first_name} ${user.last_name}`)}
                   title="Eliminar usuario"
                   className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                 >
                   <Trash2 className="w-3.5 h-3.5" />
                 </button>
               </div>

             </div>
          ))}
          {filteredUsers.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                      <Search className="w-6 h-6 text-slate-300" />
                  </div>
                  <div className="space-y-1">
                      <h4 className="text-lg font-black text-slate-800">No hay resultados</h4>
                      <p className="text-sm font-semibold text-slate-400">Prueba buscar con otro nombre o correo.</p>
                  </div>
              </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           {/* Backdrop */}
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsModalOpen(false)} />
           
           <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 md:p-10 relative z-10 shadow-2xl flex flex-col gap-8 animate-in zoom-in-95 duration-300">
               <div className="flex flex-col gap-2">
                  <div className="w-12 h-12 bg-primary/10 text-primary flex items-center justify-center rounded-2xl mb-2">
                      <UserPlus className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Nuevo Usuario</h2>
                  <p className="text-sm font-bold text-slate-400">Completa los datos para dar acceso a un nuevo miembro del equipo.</p>
               </div>

               <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nombre</label>
                          <input required name="firstName" value={formData.firstName} onChange={handleInputChange} type="text" className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.25rem] px-5 py-3.5 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300" placeholder="Ej: John" />
                      </div>
                      <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Apellido</label>
                          <input required name="lastName" value={formData.lastName} onChange={handleInputChange} type="text" className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.25rem] px-5 py-3.5 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300" placeholder="Ej: Doe" />
                      </div>
                  </div>

                  <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Correo Electrónico</label>
                      <input required name="email" value={formData.email} onChange={handleInputChange} type="email" className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.25rem] px-5 py-3.5 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300" placeholder="correo@ejemplo.com" />
                  </div>

                  <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2 flex items-center justify-between">
                          Contraseña
                          <span className="text-[8px] text-slate-300 opacity-60">Mín. 6 caracteres</span>
                      </label>
                      <input required minLength={6} name="password" value={formData.password} onChange={handleInputChange} type="password" className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.25rem] px-5 py-3.5 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300" placeholder="••••••••" />
                  </div>

                  <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Rol del Usuario</label>
                      <select required name="role" value={formData.role} onChange={handleInputChange} className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.25rem] px-5 py-3.5 transition-all font-bold text-slate-700 outline-none appearance-none cursor-pointer">
                          <option value="agente">Agente (Limitado a Gestión de Leads)</option>
                          <option value="admin">Administrador (Acceso Completo)</option>
                      </select>
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                      <button 
                         type="button" 
                         onClick={() => setIsModalOpen(false)}
                         disabled={isSubmitting}
                         className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-[1.5rem] py-4 font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
                      >
                         Cancelar
                      </button>
                      <button 
                         type="submit"
                         disabled={isSubmitting}
                         className="flex-1 bg-primary text-white rounded-[1.5rem] py-4 font-black text-xs uppercase tracking-widest hover:bg-primary-fixed shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                         {isSubmitting ? (
                             <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</>
                         ) : 'Crear Usuario'}
                      </button>
                  </div>
               </form>

           </div>
        </div>
      )}
    </div>
  )
}
