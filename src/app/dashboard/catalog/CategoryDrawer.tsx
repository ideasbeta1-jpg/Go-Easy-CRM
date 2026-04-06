'use client'

import { useState, useEffect } from 'react'
import { X, Save, DollarSign, Type, FileText, Image as ImageIcon, Loader2, PlusCircle } from 'lucide-react'
import { updateCategory, createCategory } from '@/app/utils/actions/catalog'
import { createClient } from '@/utils/supabase/client'

interface Category {
  id: string
  name: string
  daily_price: number
  base_daily_cost: number | null
  description: string | null
  image_url: string | null
}

interface CategoryDrawerProps {
  category: Category | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedCategory: Category) => void
}

export default function CategoryDrawer({ category, isOpen, onClose, onSuccess }: CategoryDrawerProps) {
  const isEdit = !!category
  
  const [formData, setFormData] = useState({
    name: '',
    daily_price: 0,
    base_daily_cost: 0,
    description: '',
    image_url: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const supabase = createClient()

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 1200
        const MAX_HEIGHT = 1200
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width))
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round(width * (MAX_HEIGHT / height))
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(async (blob) => {
          if (!blob) {
            setError('Error al procesar la imagen.')
            setIsUploading(false)
            return
          }

          const fileName = `car-${Date.now()}.webp`
          
          const { data, error } = await supabase.storage
            .from('vehicles')
            .upload(fileName, blob, {
              contentType: 'image/webp'
            })

          if (error) {
            setError(error.message)
          } else {
            const { data: publicUrlData } = supabase.storage
              .from('vehicles')
              .getPublicUrl(data.path)
            
            setFormData(prev => ({ ...prev, image_url: publicUrlData.publicUrl }))
          }
          setIsUploading(false)
        }, 'image/webp', 0.8)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        daily_price: category.daily_price,
        base_daily_cost: category.base_daily_cost || 0,
        description: category.description || '',
        image_url: category.image_url || ''
      })
    } else {
      setFormData({
        name: '',
        daily_price: 0,
        base_daily_cost: 0,
        description: '',
        image_url: ''
      })
    }
  }, [category, isOpen])

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    
    try {
      let result
      if (isEdit && category) {
        result = await updateCategory(category.id, {
          name: formData.name,
          daily_price: Number(formData.daily_price),
          base_daily_cost: Number(formData.base_daily_cost),
          description: formData.description,
          image_url: formData.image_url
        })
      } else {
        result = await createCategory({
          name: formData.name,
          daily_price: Number(formData.daily_price),
          base_daily_cost: Number(formData.base_daily_cost),
          description: formData.description,
          image_url: formData.image_url
        })
      }
      
      onSuccess(result as Category)
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
              {isEdit ? 'Editar Categoría' : 'Nueva Categoría'}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {isEdit ? 'Ajustar configuración de flota' : 'Crea un nuevo segmento de flota'}
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
          
          {/* Card Preview (Minimal) */}
          <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 flex items-center gap-6 group">
             <div className="w-24 h-24 rounded-2xl bg-white overflow-hidden border border-slate-100 shadow-sm shrink-0">
               {formData.image_url ? (
                 <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-slate-200">
                   <ImageIcon className="w-10 h-10" />
                 </div>
               )}
             </div>
             <div>
               <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-1 italic">Vista Previa</div>
               <h3 className="text-xl font-black text-slate-800">{formData.name || 'Sin nombre'}</h3>
               <p className="text-primary font-black text-lg">${formData.daily_price || 0} / Día</p>
             </div>
          </div>

          <div className="space-y-8">
            {/* Name Field */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                <Type className="w-3.5 h-3.5 text-primary" />
                Nombre de la Categoría
              </label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.25rem] px-6 py-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300"
                placeholder="Ej: SUV Premium Plus"
              />
            </div>

            {/* Price Fields - Grid */}
            <div className="grid grid-cols-2 gap-4">
               {/* Proveedor Base Cost */}
               <div className="space-y-3">
                 <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                   <DollarSign className="w-3.5 h-3.5 text-rose-500" />
                   Costo Base (Proveedor)
                 </label>
                 <div className="relative">
                   <input 
                     type="number" 
                     step="0.01"
                     required
                     value={formData.base_daily_cost}
                     onChange={e => setFormData({ ...formData, base_daily_cost: parseFloat(e.target.value) })}
                     className="w-full bg-rose-50/50 border-2 border-transparent focus:border-rose-500/10 focus:bg-white focus:ring-4 focus:ring-rose-500/5 rounded-[1.25rem] px-6 py-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300"
                     placeholder="0.00"
                   />
                 </div>
               </div>

               {/* Tienda Daily Price */}
               <div className="space-y-3">
                 <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                   <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                   Precio de Venta (Público)
                 </label>
                 <div className="relative">
                   <input 
                     type="number" 
                     step="0.01"
                     required
                     value={formData.daily_price}
                     onChange={e => setFormData({ ...formData, daily_price: parseFloat(e.target.value) })}
                     className="w-full bg-emerald-50/50 border-2 border-transparent focus:border-emerald-500/10 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 rounded-[1.25rem] px-6 py-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300"
                     placeholder="0.00"
                   />
                 </div>
               </div>
            </div>

            {/* Description Field */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                <FileText className="w-3.5 h-3.5 text-primary" />
                Descripción Detallada
              </label>
              <textarea 
                rows={4}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.25rem] px-6 py-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300 resize-none"
                placeholder="Describe la capacidad, confort y extras..."
              />
            </div>

            {/* Image URL Field */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                <ImageIcon className="w-3.5 h-3.5 text-primary" />
                Imagen de Portada (Sube o ingresa URL)
              </label>
              <div className="flex gap-4 items-center">
                <button 
                  type="button" 
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="flex items-center justify-center gap-2 text-xs font-bold bg-primary/10 text-primary px-6 py-4 rounded-[1.25rem] hover:bg-primary/20 transition-all border-2 border-transparent active:scale-95 whitespace-nowrap"
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  {isUploading ? 'Procesando...' : 'Subir Imagen'}
                </button>
                <input 
                  type="file" 
                  id="image-upload" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload}
                />
                <input 
                  type="text" 
                  value={formData.image_url}
                  onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                  className="flex-1 bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.25rem] px-6 py-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300"
                  placeholder="URL (o se autocompletará al subir)"
                />
              </div>
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
            <span>{isEdit ? 'Guardar Cambios' : 'Crear Categoría'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
