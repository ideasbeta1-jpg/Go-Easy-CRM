'use client'

import { useState, useEffect } from 'react'
import { 
  MessageSquare, 
  RefreshCw, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Settings2
} from 'lucide-react'
import { getWABATemplatesAction } from '@/app/utils/actions/waba'

interface Template {
  name: string;
  status: string;
  category: string;
  language: string;
  id: string;
}

export default function WhatsAppSettingsClient() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = async () => {
    setLoading(true)
    setError(null)
    const result = await getWABATemplatesAction()
    if (result.success) {
      setTemplates(result.data || [])
    } else {
      setError(result.error || 'No se pudieron cargar las plantillas. Revisa tus credenciales en el archivo .env.')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
               <ShieldCheck className="w-7 h-7 text-white" />
             </div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight">WhatsApp Business API</h1>
          </div>
          <p className="text-sm font-medium text-slate-400 max-w-xl">
            Gestiona tu conexión oficial con Meta, monitorea tus plantillas de mensajes y automatiza lanzamientos directamente desde tu CRM.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
             onClick={fetchTemplates}
             disabled={loading}
             className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-700 flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
          
          <a 
             href="https://business.facebook.com/"
             target="_blank"
             className="px-5 py-3 bg-slate-900 text-white rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
          >
            Meta Manager
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Stats / Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/70 backdrop-blur-xl border border-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Estado Conexión</p>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${templates.length > 0 ? 'bg-emerald-500 shadow-emerald-200' : 'bg-amber-500 shadow-amber-200'}`} />
            <span className="text-xl font-black text-slate-900">{templates.length > 0 ? 'Conectado' : 'Configurando'}</span>
          </div>
        </div>
        
        <div className="bg-white/70 backdrop-blur-xl border border-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Plantillas Totales</p>
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <span className="text-xl font-black text-slate-900">{templates.length}</span>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl border border-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Crédito / Uso</p>
          <div className="flex items-center gap-3 text-emerald-600">
             <span className="text-xl font-black italic">Conversaciones Ilimitadas</span>
          </div>
        </div>
      </div>

      {/* Templates Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Biblioteca de Plantillas
            <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-full text-slate-500 uppercase tracking-widest font-black">Meta Approved</span>
          </h2>
          <button className="text-sm font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
            Crear nueva
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-start gap-4">
             <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
             <div className="space-y-1">
               <h4 className="font-black text-amber-900">Configuración requerida</h4>
               <p className="text-sm text-amber-700 leading-relaxed font-medium">
                 Para habilitar la sincronización con Meta, asegúrate de completar las variables <code>WABA_ID</code> y <code>WABA_ACCESS_TOKEN</code> en tu archivo de entorno.
               </p>
             </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-48 bg-slate-50 rounded-[2.5rem] animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : templates.length === 0 && !error ? (
          <div className="text-center py-20 bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <MessageSquare className="w-7 h-7 text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">No se encontraron plantillas</h3>
            <p className="text-sm font-medium text-slate-500">Comienza creando tu primera plantilla en el administrador de Meta.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div 
                key={template.id}
                className="group bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-lg shadow-slate-200/40 hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-6">
                   <div className="px-3 py-1 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 rounded-full border border-slate-100">
                     {template.category}
                   </div>
                   {template.status === 'APPROVED' ? (
                     <div className="flex items-center gap-1.5 text-emerald-600">
                       <CheckCircle2 className="w-4 h-4 shrink-0" />
                       <span className="text-[10px] font-black uppercase tracking-tighter">Aprobada</span>
                     </div>
                   ) : (
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-tighter italic">En Revisión</span>
                      </div>
                   )}
                </div>

                <div className="space-y-2 mb-6">
                  <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight truncate">
                    {template.name.replace(/_/g, ' ')}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 capitalize">
                    Idioma: <span className="text-slate-600">{template.language}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Meta ID: {template.id.slice(0, 8)}...</span>
                   <button className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                      <ChevronRight className="w-4 h-4" />
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
