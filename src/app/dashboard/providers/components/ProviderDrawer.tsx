'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Save, User, Mail, Phone, Loader2, PlusCircle, Building2, ImageIcon, Upload, Trash2, MapPin, Clock, Plus, Edit2, Info } from 'lucide-react'
import { createProvider, updateProvider, ensureProviderBucket, getProviderOffices, upsertProviderOffice, deleteProviderOffice } from '@/app/utils/actions/providers'
import { getLocations } from '@/app/utils/actions/locations'
import { createClient } from '@/utils/supabase/client'

interface Provider {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  whatsapp_group_id: string | null
  logo_url: string | null
}

interface Location {
  id: string
  name: string
}

interface ProviderOffice {
  id?: string
  provider_id: string
  location_id: string
  address: string
  phone: string
  hours: string
  notes: string
  locations?: Location // For the join
}

interface ProviderDrawerProps {
  provider: Provider | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedProvider: Provider) => void
}

export default function ProviderDrawer({ provider, isOpen, onClose, onSuccess }: ProviderDrawerProps) {
  const isEdit = !!provider
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    email: '',
    whatsapp_group_id: '',
    logo_url: ''
  })
  
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // Office Management State
  const [locations, setLocations] = useState<Location[]>([])
  const [offices, setOffices] = useState<ProviderOffice[]>([])
  const [isAddingOffice, setIsAddingOffice] = useState(false)
  const [editingOfficeIndex, setEditingOfficeIndex] = useState<number | null>(null)
  const [newOffice, setNewOffice] = useState<Partial<ProviderOffice>>({
    location_id: '',
    address: '',
    phone: '',
    hours: '',
    notes: ''
  })

  useEffect(() => {
    const loadData = async () => {
      const locs = await getLocations()
      setLocations(locs)
      
      if (provider) {
        setFormData({
          name: provider.name,
          contact_name: provider.contact_name || '',
          email: provider.email || '',
          whatsapp_group_id: provider.whatsapp_group_id || '',
          logo_url: provider.logo_url || ''
        })
        const providerOffices = await getProviderOffices(provider.id)
        setOffices(providerOffices as ProviderOffice[])
      } else {
        setFormData({
          name: '',
          contact_name: '',
          email: '',
          whatsapp_group_id: '',
          logo_url: ''
        })
        setOffices([])
      }
    }
    
    if (isOpen) {
      loadData()
    }
    
    setError(null)
    setUploadProgress(0)
    setIsAddingOffice(false)
  }, [provider, isOpen])

  if (!isOpen) return null

  const convertToWebP = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_SIZE = 800
          let width = img.width
          let height = img.height
          
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width
              width = MAX_SIZE
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height
              height = MAX_SIZE
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) return reject(new Error('Could not get canvas context'))
          
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob((blob) => {
            if (blob) resolve(blob)
            else reject(new Error('WebP conversion failed'))
          }, 'image/webp', 0.8)
        }
        img.onerror = () => reject(new Error('Image load error'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('File read error'))
      reader.readAsDataURL(file)
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)
    setUploadProgress(10)

    try {
      // 0. Ensure bucket exists
      await ensureProviderBucket()
      
      // 1. Convert to WebP
      setUploadProgress(30)
      const webpBlob = await convertToWebP(file)
      
      // 2. Upload to Supabase Storage
      const fileName = `${Date.now()}-${file.name.split('.')[0]}.webp`
      const filePath = `logos/${fileName}`
      
      setUploadProgress(50)
      const { data, error: uploadError } = await supabase.storage
        .from('provider-logos')
        .upload(filePath, webpBlob, {
          contentType: 'image/webp',
          upsert: true
        })

      if (uploadError) throw uploadError

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('provider-logos')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, logo_url: publicUrl }))
      setUploadProgress(100)
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(`Error al subir imagen: ${err.message}`)
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logo_url: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleAddOffice = () => {
    if (!newOffice.location_id) return
    
    // Check if location already added (excluding the one we're editing)
    if (offices.some((o, i) => o.location_id === newOffice.location_id && i !== editingOfficeIndex)) {
      setError('Esta oficina ya ha sido agregada para este partner')
      return
    }

    const loc = locations.find(l => l.id === newOffice.location_id)
    const officeToAdd = {
      ...newOffice,
      provider_id: provider?.id || 'temp',
      locations: loc
    } as ProviderOffice

    if (editingOfficeIndex !== null) {
      const updatedOffices = [...offices]
      updatedOffices[editingOfficeIndex] = {
        ...offices[editingOfficeIndex],
        ...officeToAdd
      }
      setOffices(updatedOffices)
    } else {
      setOffices([...offices, officeToAdd])
    }

    setNewOffice({
      location_id: '',
      address: '',
      phone: '',
      hours: '',
      notes: ''
    })
    setIsAddingOffice(false)
    setEditingOfficeIndex(null)
  }

  const handleEditOffice = (idx: number) => {
    const office = offices[idx]
    setNewOffice({
      location_id: office.location_id,
      address: office.address,
      phone: office.phone,
      hours: office.hours,
      notes: office.notes || ''
    })
    setEditingOfficeIndex(idx)
    setIsAddingOffice(true)
  }

  const handleCancelOffice = () => {
    setIsAddingOffice(false)
    setEditingOfficeIndex(null)
    setNewOffice({
      location_id: '',
      address: '',
      phone: '',
      hours: '',
      notes: ''
    })
  }

  const handleRemoveOffice = async (idx: number, officeId?: string) => {
    if (officeId) {
      try {
        await deleteProviderOffice(officeId)
      } catch (err: any) {
        setError(`Error al eliminar oficina: ${err.message}`)
        return
      }
    }
    setOffices(offices.filter((_, i) => i !== idx))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    
    try {
      let result: Provider
      if (isEdit && provider) {
        result = await updateProvider(provider.id, formData) as Provider
      } else {
        result = await createProvider(formData) as Provider
      }
      
      // Save Offices
      for (const office of offices) {
        await upsertProviderOffice({
          ...office,
          provider_id: result.id,
          locations: undefined // Strip the join data
        } as any)
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
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 rounded-l-[3.5rem] border-l border-white/20">
        
        {/* Header */}
        <div className="p-10 flex items-center justify-between border-b border-slate-50">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {isEdit ? 'Editar Partner' : 'Nuevo Partner'}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {isEdit ? 'Actualiza la información del aliado' : 'Registra un nuevo colaborador estratégico'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-95"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          
          {/* Logo Upload Section */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block">Logo del Partner</label>
            <div className="flex items-center gap-8">
              <div className="relative group">
                <div className="w-32 h-32 rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/30 group-hover:bg-primary/5">
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center space-y-2">
                       <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Sin Logo</span>
                    </div>
                  )}
                  
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                      <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
                
                {formData.logo_url && !isUploading && (
                  <button 
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-all active:scale-90"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-3 flex-1">
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  Sube una imagen cuadrada (PNG, JPG). El sistema la convertirá automáticamente a <span className="text-primary font-bold">WebP optimizado</span> para máximo rendimiento.
                </p>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {formData.logo_url ? 'Cambiar Logo' : 'Subir Logo'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Name Field */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                Nombre de la Empresa / Partner
              </label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.25rem] px-6 py-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300"
                placeholder="Ej: Hertz Florida"
              />
            </div>

            {/* Contact Person Field */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                <User className="w-3.5 h-3.5 text-primary" />
                Persona de Contacto
              </label>
              <input 
                type="text" 
                value={formData.contact_name}
                onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.25rem] px-6 py-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300"
                placeholder="Ej: John Doe"
              />
            </div>

            {/* Email Field */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                <Mail className="w-3.5 h-3.5 text-primary" />
                Email Corporativo
              </label>
              <input 
                type="email" 
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.25rem] px-6 py-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300"
                placeholder="partner@empresa.com"
              />
            </div>

            {/* WhatsApp Group ID Field */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                <Phone className="w-3.5 h-3.5 text-primary" />
                WhatsApp Group ID (n8n Integration)
              </label>
              <input 
                type="text" 
                value={formData.whatsapp_group_id}
                onChange={e => setFormData({ ...formData, whatsapp_group_id: e.target.value })}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.25rem] px-6 py-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300"
                placeholder="123456789@g.us"
              />
              <p className="text-[10px] text-slate-400 ml-2 italic">Este ID permite la comunicación automatizada de vouchers.</p>
            </div>

            {/* Offices Section */}
            <div className="pt-8 border-t border-slate-50 space-y-6">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> Sedes / Oficinas
                </label>
                {!isAddingOffice && (
                  <button 
                    type="button" 
                    onClick={() => setIsAddingOffice(true)}
                    className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest hover:bg-primary/5 px-4 py-2 rounded-xl transition-all"
                  >
                    <Plus className="w-4 h-4" /> Agregar Sede
                  </button>
                )}
              </div>

              {/* Office List */}
              <div className="space-y-4">
                {offices.map((office, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-2xl p-6 border border-transparent hover:border-slate-100 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900">{office.locations?.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">{office.address || 'Sin dirección'}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          type="button" 
                          onClick={() => handleEditOffice(idx)}
                          className="p-2 text-slate-300 hover:text-primary transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveOffice(idx, office.id)}
                          className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {office.notes && (
                      <div className="flex items-start gap-2 text-[9px] text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <Info className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                        <p className="italic leading-relaxed">{office.notes}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        <Phone className="w-3 h-3" /> {office.phone || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        <Clock className="w-3 h-3" /> {office.hours || 'N/A'}
                      </div>
                    </div>
                  </div>
                ))}

                {offices.length === 0 && !isAddingOffice && (
                  <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-[2rem] space-y-2">
                    <MapPin className="w-8 h-8 text-slate-200 mx-auto" />
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No hay sedes asignadas</p>
                  </div>
                )}
              </div>

              {/* Add Office Form */}
              {isAddingOffice && (
                <div className="bg-white border-2 border-primary/20 rounded-[2.5rem] p-8 space-y-6 animate-in zoom-in-95 duration-200">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Ubicación / Ciudad</label>
                      <select 
                        value={newOffice.location_id}
                        onChange={e => setNewOffice({ ...newOffice, location_id: e.target.value })}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 rounded-xl px-4 py-3 font-bold text-sm outline-none"
                      >
                        <option value="">Selecciona una ubicación</option>
                        {locations.map(loc => (
                          <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Dirección Exacta</label>
                      <input 
                        type="text" 
                        value={newOffice.address}
                        onChange={e => setNewOffice({ ...newOffice, address: e.target.value })}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 rounded-xl px-4 py-3 font-bold text-sm outline-none"
                        placeholder="Ej: 7777 Airport Blvd, Miami, FL 33126"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Teléfono Directo</label>
                        <input 
                          type="text" 
                          value={newOffice.phone}
                          onChange={e => setNewOffice({ ...newOffice, phone: e.target.value })}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 rounded-xl px-4 py-3 font-bold text-sm outline-none"
                          placeholder="+1 305-XXX-XXXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Horarios</label>
                        <input 
                          type="text" 
                          value={newOffice.hours}
                          onChange={e => setNewOffice({ ...newOffice, hours: e.target.value })}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 rounded-xl px-4 py-3 font-bold text-sm outline-none"
                          placeholder="8am - 10pm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                        Notas / Indicaciones para el Voucher
                        <Info className="w-3.5 h-3.5 text-primary" />
                      </label>
                      <textarea 
                        value={newOffice.notes}
                        onChange={e => setNewOffice({ ...newOffice, notes: e.target.value })}
                        rows={3}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 rounded-2xl px-6 py-4 font-bold text-sm outline-none resize-none"
                        placeholder="Ej: Al llegar al aeropuerto, baje a la zona de carritos de renta. Nuestra van es blanca con logo azul..."
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button 
                      type="button" 
                      onClick={handleCancelOffice}
                      className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-200"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="button" 
                      onClick={handleAddOffice}
                      className="flex-[2] py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {editingOfficeIndex !== null ? 'Actualizar Sede' : 'Añadir Sede'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold animate-in fade-in zoom-in">
              {error}
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="p-10 border-t border-slate-50 flex items-center gap-4 bg-slate-50/50">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-4 px-8 border-2 border-slate-200 rounded-[1.25rem] text-slate-500 font-black text-xs uppercase tracking-widest hover:border-slate-300 hover:bg-white transition-all active:scale-95"
          >
            Descartar
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || isUploading}
            className="flex-[2] py-4 px-8 bg-primary text-white rounded-[1.25rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-3 group"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isEdit ? (
              <Save className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            ) : (
              <PlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
            )}
            <span>{isEdit ? 'Guardar Cambios' : 'Crear Partner'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
