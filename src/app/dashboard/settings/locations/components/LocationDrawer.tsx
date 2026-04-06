'use client'

import { useState, useEffect } from 'react'
import { X, Save, MapPin, Tag, Globe, Plane, Building, Bus, PlusCircle, Loader2 } from 'lucide-react'
import { createLocation, updateLocation, Location } from '@/app/utils/actions/locations'

interface LocationDrawerProps {
  location: Location | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedLocation: Location) => void
}

const LOCATION_TYPES = [
  { id: 'aeropuerto', name: 'Aeropuerto', icon: Plane },
  { id: 'ciudad', name: 'Ciudad / Centro', icon: Building },
  { id: 'terminal', name: 'Terminal / Otros', icon: Bus }
]

export default function LocationDrawer({ location, isOpen, onClose, onSuccess }: LocationDrawerProps) {
  const isEdit = !!location
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'aeropuerto'
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name,
        code: location.code || '',
        type: location.type || 'aeropuerto'
      })
    } else {
      setFormData({
        name: '',
        code: '',
        type: 'aeropuerto'
      })
    }
    setError(null)
  }, [location, isOpen])

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    
    try {
      let result: Location
      if (isEdit && location) {
        result = await updateLocation(location.id, formData) as Location
      } else {
        result = await createLocation(formData) as Location
      }
      onSuccess(result)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-500 ease-in-out"
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 rounded-l-[3.5rem] border-l border-white/20">
        
        {/* Header */}
        <div className="p-10 flex items-center justify-between border-b border-slate-50">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {isEdit ? 'Editar Sitio' : 'Nuevo Sitio'}
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
              {isEdit ? 'Actualiza la ubicación del partner.' : 'Registra un nuevo punto estratégico.'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-95 group"
          >
            <X className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          <div className="space-y-10">
            
            {/* Visual Header Decoration */}
            <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 flex items-center justify-center relative overflow-hidden group">
               <div className="absolute inset-0 bg-dots opacity-[0.2]" />
               <div className="relative z-10 w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-slate-200 border border-slate-50 group-hover:scale-110 transition-transform duration-500">
                  <MapPin className="w-10 h-10 text-primary" />
               </div>
            </div>

            <div className="space-y-8">
              {/* Type Selection */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  Tipo de Ubicación
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {LOCATION_TYPES.map((type) => {
                    const isActive = formData.type === type.id
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type.id })}
                        className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 ${
                          isActive 
                          ? 'bg-primary/5 border-primary text-primary shadow-lg shadow-primary/5' 
                          : 'bg-slate-50/50 border-transparent text-slate-400 hover:bg-slate-50 hover:border-slate-100'
                        }`}
                      >
                        <type.icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{type.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Name Field */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  Nombre de la Ubicación
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-2xl px-6 py-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300 text-sm"
                  placeholder="Ej: Aeropuerto de Miami (MIA)"
                />
              </div>

              {/* Code Field */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  <Tag className="w-3.5 h-3.5 text-primary" />
                  Código Identificador (Opcional)
                </label>
                <input 
                  type="text" 
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-2xl px-6 py-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300 text-sm"
                  placeholder="Ej: MIA, Orlando Int, HQ"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-5 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-[11px] font-bold animate-in zoom-in-95 duration-200">
              {error}
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="p-10 border-t border-slate-50 flex items-center gap-4 bg-slate-50/50">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-4 px-8 border-2 border-slate-200 rounded-2xl text-slate-500 font-black text-xs uppercase tracking-widest hover:border-slate-300 hover:bg-white transition-all active:scale-95"
          >
            Descartar
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-[2] py-4 px-8 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-3 group"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isEdit ? (
              <Save className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            ) : (
              <PlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
            )}
            <span>{isEdit ? 'Guardar Cambios' : 'Crear Sitio'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
