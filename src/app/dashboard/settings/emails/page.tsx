'use client'

import { useState, useEffect } from 'react'
import { Mail, Save, ChevronLeft, Info, Variable } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { toast } from 'sonner'

interface EmailTemplate {
  id: string
  stage: string
  subject: string
  body: string
}

const STAGE_LABELS: Record<string, string> = {
  lead_nuevo: 'Nuevo Lead',
  en_cotizacion: 'En Cotización',
  reserva_confirmada: 'Reserva Confirmada',
  voucher_enviado: 'Voucher Enviado',
  cerrado: 'Cerrado'
}

const VARIABLES = [
  { name: 'name', description: 'Primer nombre del cliente' },
  { name: 'full_name', description: 'Nombre completo' },
  { name: 'pickup_date', description: 'Fecha de recogida' },
  { name: 'pickup_time', description: 'Hora de recogida' },
  { name: 'return_date', description: 'Fecha de devolución' },
  { name: 'return_time', description: 'Hora de devolución' },
  { name: 'pickup_location', description: 'Lugar de entrega' },
  { name: 'return_location', description: 'Lugar de devolución' },
  { name: 'agent_name', description: 'Nombre del vendedor asignado' },
  { name: 'stripe_link', description: 'Enlace de pago (Stripe)' },
  { name: 'voucher_url', description: 'Enlace al PDF del voucher' },
  { name: 'category', description: 'Categoría del vehículo' }
]

export default function EmailSettingsPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedStage, setSelectedStage] = useState('lead_nuevo')
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor')
  const supabase = createClient()

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
      
      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('No se pudieron cargar las plantillas')
    } finally {
      setLoading(false)
    }
  }

  const currentTemplate = templates.find(t => t.stage === selectedStage) || {
    stage: selectedStage,
    subject: '',
    body: ''
  }

  // Generar HTML final para previsualización
  const getPreviewHtml = () => {
    const baseStyle = `
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #1e293b;
      line-height: 1.6;
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    `;

    const headerStyle = `
      text-align: center;
      margin-bottom: 40px;
    `;

    const footerStyle = `
      text-align: center;
      margin-top: 60px;
      font-size: 12px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 30px;
    `;

    const dummyData: Record<string, string> = {
      name: 'Juan',
      full_name: 'Juan Pérez',
      pickup_date: '15 de Mayo de 2026',
      pickup_time: '10:00 AM',
      return_date: '20 de Mayo de 2026',
      return_time: '04:00 PM',
      pickup_location: 'Miami International Airport (MIA)',
      return_location: 'Miami International Airport (MIA)',
      agent_name: 'Carlos Rodríguez',
      stripe_link: 'https://checkout.stripe.com/pay/test',
      voucher_url: 'https://goeasyflorida.com/voucher/test.pdf',
      category: 'SUV Familiar',
    };

    let body = currentTemplate.body;
    body = body.replace(/{{(\w+)}}/g, (match, key) => dummyData[key] || match);

    return `
      <div style="${baseStyle}">
        <div style="${headerStyle}">
          <img src="https://go-easy-crm.vercel.app/logo.png" alt="Go Easy Florida" style="height: 50px;">
        </div>
        ${body}
        <div style="${footerStyle}">
          <p>Atentamente,<br><strong>${dummyData.agent_name}</strong></p>
          <p><strong>Go Easy Florida</strong> - Luxury Car Rental & Management</p>
          <p>Florida, USA | <a href="https://goeasyflorida.com" style="color: #4052b6; text-decoration: none;">www.goeasyflorida.com</a></p>
        </div>
      </div>
    `;
  };

  async function handleSave() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('email_templates')
        .upsert({
          stage: selectedStage,
          subject: currentTemplate.subject,
          body: currentTemplate.body,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      toast.success('Plantilla guardada correctamente')
      fetchTemplates()
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Error al guardar la plantilla')
    } finally {
      setSaving(false)
    }
  }

  const updateCurrentTemplate = (updates: Partial<EmailTemplate>) => {
    setTemplates(prev => {
      const exists = prev.some(t => t.stage === selectedStage)
      if (exists) {
        return prev.map(t => t.stage === selectedStage ? { ...t, ...updates } : t)
      } else {
        return [...prev, { id: 'temp', stage: selectedStage, subject: '', body: '', ...updates } as EmailTemplate]
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <Link 
            href="/dashboard/settings"
            className="group flex items-center gap-2 text-slate-400 hover:text-primary transition-colors text-xs font-black uppercase tracking-widest mb-4"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Volver a Configuración
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center border border-purple-100 shadow-sm">
              <Mail className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Personalización de Emails</h1>
          </div>
          <p className="text-sm font-medium text-slate-400">Edita el contenido y asunto de los correos automáticos.</p>
        </div>

        <div className="flex items-center gap-3">
           <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200 shadow-inner">
             <button 
               onClick={() => setViewMode('editor')}
               className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${viewMode === 'editor' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >
               Editor
             </button>
             <button 
               onClick={() => setViewMode('preview')}
               className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${viewMode === 'preview' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >
               Previsualización
             </button>
           </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 bg-primary text-white px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? 'Guardando...' : (
              <>
                <Save className="w-4 h-4" />
                Guardar
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar - Stages */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4 mb-4">Etapas del Lead</h3>
          {Object.entries(STAGE_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedStage(key)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl text-left transition-all font-bold ${
                selectedStage === key 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' 
                  : 'bg-white/50 text-slate-600 hover:bg-white hover:text-primary'
              }`}
            >
              <span>{label}</span>
              {selectedStage === key && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
            </button>
          ))}
        </div>

        {/* Editor Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 min-h-[600px]">
            {viewMode === 'editor' ? (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Subject */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Asunto del Email</label>
                  <input
                    type="text"
                    value={currentTemplate.subject}
                    onChange={(e) => updateCurrentTemplate({ subject: e.target.value })}
                    placeholder="Ej: ¡Tu reserva está confirmada! 🎉"
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all shadow-inner"
                  />
                </div>

                {/* Body Editor - Simple textarea for now (HTML) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cuerpo del Email (HTML)</label>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-full uppercase tracking-widest">
                      <Info className="w-3 h-3" />
                      Soporta HTML
                    </div>
                  </div>
                  <textarea
                    value={currentTemplate.body}
                    onChange={(e) => updateCurrentTemplate({ body: e.target.value })}
                    placeholder="Ingresa el contenido en HTML..."
                    className="w-full h-80 bg-slate-50/50 border border-slate-100 rounded-[2rem] px-6 py-6 font-mono text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all shadow-inner resize-none"
                  />
                </div>

                {/* Variables Legend */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Variable className="w-4 h-4 text-primary" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Variables Disponibles</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {VARIABLES.map(variable => (
                      <div key={variable.name} className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm hover:border-primary/30 transition-colors group cursor-default">
                        <p className="text-[10px] font-black text-primary mb-1">{"{{"}{variable.name}{"}}"}</p>
                        <p className="text-[10px] font-bold text-slate-400 italic leading-tight">{variable.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in zoom-in-95 duration-500 h-full">
                <div className="bg-slate-50 border border-slate-100 rounded-[2rem] overflow-hidden shadow-inner h-full">
                   <div className="bg-white border-b border-slate-100 p-4 px-8 flex items-center justify-between">
                     <div className="flex flex-col">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Asunto:</p>
                       <p className="text-sm font-black text-slate-900">{currentTemplate.subject || '(Sin asunto)'}</p>
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                     </div>
                   </div>
                   <div className="p-8 h-full bg-white overflow-auto max-h-[700px]">
                     <div 
                       dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                       className="preview-container"
                     />
                   </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-6 flex gap-4 items-start">
            <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Nota Importante</p>
              <p className="text-xs font-semibold text-amber-700 leading-relaxed italic">
                El diseño base (header con logo y footer) se aplica automáticamente. Solo necesitas encargarte del contenido principal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
