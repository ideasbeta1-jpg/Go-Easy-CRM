'use client'

import { useState } from 'react'
import { Plus, X, Check, Loader2 } from 'lucide-react'
import { createWABATemplateAction } from '@/app/utils/actions/waba'

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

function VariableItem({ label, id }: { label: string, id: string }) {
  return (
    <li className="flex items-center justify-between text-[10px] font-bold text-slate-600 group">
      <span className="group-hover:text-blue-600 transition-colors uppercase tracking-tighter">{label}</span>
      <code className="bg-white px-2 py-0.5 rounded border border-blue-100 text-blue-600 shadow-sm">{'{{'}{id}{'}}'}</code>
    </li>
  )
}

export default function WhatsAppTemplateForm({ onSuccess, onCancel }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'UTILITY' as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION',
    language: 'es',
    bodyText: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Format for Meta API
    const metaData = {
      name: formData.name.toLowerCase().replace(/\s+/g, '_'),
      category: formData.category,
      language: formData.language,
      components: [
        {
          type: 'BODY',
          text: formData.bodyText
        }
      ]
    }

    const result = await createWABATemplateAction(metaData)
    if (result.success) {
      onSuccess()
    } else {
      setError(result.error || 'Error al crear la plantilla. Revisa los permisos de tu token.')
    }
    setLoading(false)
  }

  return (
    <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Nueva Plantilla</h3>
        <button onClick={onCancel} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre de la Plantilla</label>
          <input 
             type="text" 
             placeholder="Ej: bienvenida_cliente"
             required
             value={formData.name}
             onChange={(e) => setFormData({...formData, name: e.target.value})}
             className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-500 transition-all outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Categoría</label>
            <select 
               value={formData.category}
               onChange={(e) => setFormData({...formData, category: e.target.value as any})}
               className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            >
              <option value="UTILITY">Utilidad (Utility)</option>
              <option value="MARKETING">Marketing</option>
              <option value="AUTHENTICATION">Autenticación</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Idioma</label>
            <select 
               value={formData.language}
               onChange={(e) => setFormData({...formData, language: e.target.value})}
               className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            >
              <option value="es">Español (es)</option>
              <option value="en">Inglés (en)</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cuerpo del Mensaje</label>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-2">
              <textarea 
                 placeholder="Hola {{1}}, tu reserva para el {{2}} está confirmada."
                 required
                 rows={6}
                 value={formData.bodyText}
                 onChange={(e) => setFormData({...formData, bodyText: e.target.value})}
                 className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-500 transition-all outline-none resize-none"
              />
              <p className="text-[10px] text-slate-400 italic">Usa {'{{n}}'} para insertar variables dinámicas que el CRM completará automáticamente.</p>
            </div>
            
            <div className="bg-blue-50/50 border border-blue-100 p-8 rounded-[2rem] space-y-6">
               <div className="space-y-4">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600">Guía de Variables</h4>
                 <div className="space-y-4 text-[11px] font-bold text-slate-500 leading-relaxed">
                   <p>1. Escribe tu mensaje usando <code className="text-blue-600">{'{{1}}'}</code> hasta <code className="text-blue-600">{'{{9}}'}</code>.</p>
                   <p>2. Meta solo permite un máximo de 9 variables numeradas.</p>
                   <p>3. Una vez aprobada por Meta, podrás entrar a <span className="text-blue-600">Configurar</span> para elegir qué dato del CRM rellena cada número.</p>
                 </div>
               </div>

               <div className="pt-6 border-t border-blue-100/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ejemplo Correcto</span>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">"Hola {'{{1}}'}, tu reserva para el dia {'{{2}}'} está lista."</p>
               </div>
            </div>

          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-4">
           <button 
             type="button"
             onClick={onCancel}
             className="flex-1 px-5 py-4 bg-slate-100 text-slate-600 rounded-2xl text-sm font-black hover:bg-slate-200 transition-all active:scale-95"
           >
             Cancelar
           </button>
           <button 
             type="submit"
             disabled={loading}
             className="flex-[2] px-5 py-4 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
           >
             {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
             Solicitar Aprobación
           </button>
        </div>
      </form>
    </div>
  )
}
