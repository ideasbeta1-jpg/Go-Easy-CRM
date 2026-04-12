'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { saveTemplateMappingAction, getTemplateMappingByNameAction } from '@/app/utils/actions/waba'

interface Props {
  template: {
    name: string;
    language: string;
    components: any[];
  };
  onClose: () => void;
  onSuccess: () => void;
}

const LEAD_FIELDS = [
  { id: 'first_name', label: 'Nombre Cliente' },
  { id: 'last_name', label: 'Apellido Cliente' },
  { id: 'category_name', label: 'Categoría Auto' },
  { id: 'pickup_date', label: 'Fecha Entrega (Día)' },
  { id: 'pickup_time', label: 'Hora Entrega' },
  { id: 'pickup_location', label: 'Lugar Entrega' },
  { id: 'return_date', label: 'Fecha Devolución (Día)' },
  { id: 'return_time', label: 'Hora Devolución' },
  { id: 'return_location', label: 'Lugar Devolución' },
  { id: 'agreed_daily_price', label: 'Precio por Día' },
  { id: 'total_amount', label: 'Monto Total' },
  { id: 'deposit_amount', label: 'Monto Depósito (30%)' },
  { id: 'stripe_link', label: 'Link de Pago' },
  { id: 'agent_name', label: 'Nombre Agente' },
  { id: 'agent_phone', label: 'Teléfono Agente' },
  { id: 'voucher_url', label: 'Link de Voucher' },
  { id: 'voucher_number', label: 'Número de Voucher (Interno)' },
  { id: 'provider_confirmation', label: 'Confirmación Proveedor (Externo)' }
];

const STAGES = [
  { id: 'lead_nuevo', label: 'Lead Nuevo' },
  { id: 'en_cotizacion', label: 'En Cotización' },
  { id: 'reserva_confirmada', label: 'Reserva Confirmada' },
  { id: 'voucher_enviado', label: 'Voucher Enviado' },
  { id: 'cerrado', label: 'Cerrado' }
];

export default function TemplateVariableMapper({ template, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [stage, setStage] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  // Detect variables in template body
  const bodyComponent = template.components?.find(c => c.type === 'BODY');
  const bodyText = bodyComponent?.text || '';
  const variables = (Array.from(bodyText.matchAll(/\{\{(\d+)\}\}/g)) as RegExpMatchArray[]).map(m => m[1]);
  const uniqueVariables = Array.from(new Set(variables)).sort((a, b) => parseInt(a) - parseInt(b));

  useEffect(() => {
    async function loadMapping() {
      setLoading(true)
      const result = await getTemplateMappingByNameAction(template.name)
      if (result.success && result.data) {
        setMappings(result.data.mappings || {})
        setStage(result.data.stage || '')
      }
      setLoading(false)
    }
    loadMapping()
  }, [template.name])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const result = await saveTemplateMappingAction(template.name, mappings, stage, template.language)
    if (result.success) {
      onSuccess()
    } else {
      setError(result.error || 'Error al guardar el mapeo')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in-95 duration-300 max-w-lg w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Mapear Variables</h3>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">{template.name}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Etapa de Automatización</label>
          <select 
             value={stage}
             onChange={(e) => setStage(e.target.value)}
             className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-500 transition-all outline-none"
          >
            <option value="">Selecciona una etapa (Opcional)</option>
            {STAGES.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400 italic">Dispara esta plantilla automáticamente al entrar en esta etapa.</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Variables Detectadas (Meta)</h4>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          {uniqueVariables.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-2xl text-center">
              <p className="text-xs font-bold text-slate-400">Esta plantilla no tiene variables numeradas.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {uniqueVariables.map(vNum => (
                <div key={vNum} className="flex items-center gap-4 group">
                  <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-blue-600 font-black shadow-sm group-hover:border-blue-200 transition-all">
                    {'{'}{vNum}{'}'}
                  </div>
                  <div className="flex-1">
                    <select 
                       value={mappings[vNum] || ''}
                       onChange={(e) => setMappings({...mappings, [vNum]: e.target.value})}
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    >
                      <option value="">Seleccionar campo...</option>
                      {LEAD_FIELDS.map(f => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
            Asegúrate de que el orden de las variables coincida con el que pusiste en el administrador de Meta para que los mensajes tengan sentido.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-4">
           <button 
             onClick={onClose}
             className="flex-1 px-5 py-4 bg-slate-100 text-slate-600 rounded-2xl text-sm font-black hover:bg-slate-200 transition-all active:scale-95"
           >
             Cancelar
           </button>
           <button 
             onClick={handleSave}
             disabled={saving}
             className="flex-[2] px-5 py-4 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
           >
             {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
             Guardar Mapeo
           </button>
        </div>
      </div>
    </div>
  )
}
