'use client'

import { useState, useRef } from 'react'
import { 
  User, 
  Mail, 
  Phone, 
  MessageSquare, 
  FileText, 
  Camera, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { updateProfile } from './actions'
import Image from 'next/image'

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  role: string
  phone: string | null
  whatsapp_number: string | null
  bio: string | null
  avatar_url: string | null
  email: string | null
}

export default function ProfileClient({ initialProfile }: { initialProfile: Profile }) {
  const [profile, setProfile] = useState(initialProfile)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProfile(prev => ({ ...prev, [name]: value }))
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setMessage(null)

    try {
      // 1. Process image (optional resizing could be done here as in Categories)
      // For now, direct upload to 'avatars' bucket
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`

      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true
        })

      if (uploadError) throw uploadError

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path)

      // 3. Update local state
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }))
      
      // 4. Update DB immediately or via main save
      // Let's keep it for main save or update fast
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setMessage({ type: 'success', text: 'Imagen de perfil actualizada correctamente' })
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      setMessage({ type: 'error', text: error.message || 'Error al subir la imagen' })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('firstName', profile.first_name || '')
    formData.append('lastName', profile.last_name || '')
    formData.append('phone', profile.phone || '')
    formData.append('whatsapp', profile.whatsapp_number || '')
    formData.append('bio', profile.bio || '')
    formData.append('avatarUrl', profile.avatar_url || '')

    try {
      const result = await updateProfile(formData)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Perfil actualizado con éxito' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error inesperado al guardar' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mi Perfil</h1>
        <p className="text-sm font-medium text-slate-400">Gestiona tu información personal y de contacto.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Left Column: Avatar & Basic Info */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white/70 backdrop-blur-xl border border-white p-8 rounded-[3rem] shadow-xl shadow-slate-200/50 flex flex-col items-center gap-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4">
              <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/10">
                {profile.role === 'admin' ? 'Administrador' : 'Agente'}
              </span>
            </div>

            <div className="relative group/avatar">
              <div className="w-32 h-32 rounded-[2.5rem] bg-slate-100 overflow-hidden border-4 border-white shadow-inner flex items-center justify-center relative">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-slate-300" />
                )}
                
                {isUploading && (
                  <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all group-hover/avatar:rotate-12"
                disabled={isUploading}
              >
                <Camera className="w-5 h-5" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">
                {profile.first_name || ''} {profile.last_name || ''}
              </h3>
              <p className="text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5 uppercase tracking-wider">
                <Mail className="w-3 h-3" />
                {profile.email}
              </p>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-xl shadow-slate-200/50 space-y-4">
             <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Estado de Cuenta</div>
             <p className="text-xs font-medium text-slate-400 leading-relaxed italic opacity-80">
               Tu cuenta está activa y tienes permisos de {profile.role === 'admin' ? 'administración total' : 'gestión de leads'}.
             </p>
          </div>
        </div>

        {/* Right Column: Detailed Form */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white/70 backdrop-blur-xl border border-white p-10 rounded-[3.5rem] shadow-xl shadow-slate-200/50 space-y-10">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* First Name */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  <User className="w-3.5 h-3.5 text-primary" />
                  Nombre
                </label>
                <input 
                  type="text" 
                  name="first_name"
                  value={profile.first_name || ''}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.25rem] px-6 py-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300"
                  placeholder="Tu nombre"
                />
              </div>

              {/* Last Name */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  <User className="w-3.5 h-3.5 text-primary" />
                  Apellido
                </label>
                <input 
                  type="text" 
                  name="last_name"
                  value={profile.last_name || ''}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.25rem] px-6 py-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300"
                  placeholder="Tu apellido"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Phone */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  Teléfono
                </label>
                <input 
                  type="tel" 
                  name="phone"
                  value={profile.phone || ''}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.25rem] px-6 py-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300"
                  placeholder="+1 234 567 890"
                />
              </div>

              {/* WhatsApp */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                  WhatsApp CRM
                </label>
                <input 
                  type="text" 
                  name="whatsapp_number"
                  value={profile.whatsapp_number || ''}
                  onChange={handleInputChange}
                  className="w-full bg-emerald-50/30 border-2 border-transparent focus:border-emerald-500/10 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 rounded-[1.25rem] px-6 py-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300"
                  placeholder="ID de contacto WhatsApp"
                />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                <FileText className="w-3.5 h-3.5 text-primary" />
                Biografía / Notas
              </label>
              <textarea 
                rows={4}
                name="bio"
                value={profile.bio || ''}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.25rem] px-6 py-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300 resize-none"
                placeholder="Cuéntanos un poco sobre ti o añade notas internas..."
              />
            </div>

            {message && (
              <div className={`p-6 rounded-[1.5rem] flex items-center gap-4 animate-in fade-in zoom-in duration-300 border ${
                message.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                  : 'bg-rose-50 border-rose-100 text-rose-700'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 shrink-0" />
                )}
                <p className="text-sm font-black">{message.text}</p>
              </div>
            )}

            <button 
              type="submit"
              disabled={isSaving || isUploading}
              className="w-full py-5 bg-primary text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-3 group"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              )}
              <span>Guardar Cambios</span>
            </button>

          </div>
        </div>
      </form>
    </div>
  )
}
