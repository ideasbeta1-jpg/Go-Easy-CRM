'use client'

import { useState, useEffect } from 'react'
import { 
  Settings2, 
  Save, 
  Loader2, 
  Globe, 
  Image as ImageIcon, 
  Type, 
  Search, 
  Chrome,
  Share2,
  Cpu,
  Layout,
  Upload,
  ExternalLink
} from 'lucide-react'
import { getSystemSettings, updateSystemSettings } from '@/app/utils/actions/settings'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState<{ [key: string]: boolean }>({})
  const [activeTab, setActiveTab] = useState('branding')
  const supabase = createClient()

  useEffect(() => {
    async function loadSettings() {
      const data = await getSystemSettings()
      if (data) setSettings(data)
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateSystemSettings(settings)
      toast.success('Configuración guardada correctamente')
    } catch (err: any) {
      toast.error('Error al guardar: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'favicon_url') => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(prev => ({ ...prev, [field]: true }))
    
    try {
      const fileName = `${field}-${Date.now()}-${file.name}`
      const { data, error } = await supabase.storage
        .from('branding')
        .upload(fileName, file)

      if (error) throw error

      const { data: publicUrlData } = supabase.storage
        .from('branding')
        .getPublicUrl(data.path)
      
      setSettings((prev: any) => ({ ...prev, [field]: publicUrlData.publicUrl }))
      toast.success(`${field === 'logo_url' ? 'Logo' : 'Favicon'} subido correctamente`)
    } catch (err: any) {
      toast.error('Error al subir imagen: ' + err.message)
    } finally {
      setIsUploading(prev => ({ ...prev, [field]: false }))
    }
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
      </div>
    )
  }

  const TABS = [
    { id: 'branding', label: 'Marca e Identidad', icon: Image },
    { id: 'seo', label: 'SEO y Metadatos', icon: Globe },
    { id: 'integrations', label: 'Integraciones', icon: Layout }
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center border border-rose-100 shadow-sm">
              <Settings2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configuración General</h1>
              <p className="text-sm font-medium text-slate-400 italic">Personaliza el ADN visual y técnico de tu CRM.</p>
            </div>
          </div>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-primary text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          <span>Guardar Cambios</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-[2rem] w-fit">
        {['branding', 'seo', 'integrations'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-8 py-3.5 rounded-full text-xs font-black uppercase tracking-widest transition-all
              ${activeTab === tab 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-slate-400 hover:text-slate-600'}
            `}
          >
            {tab === 'branding' && 'Identidad'}
            {tab === 'seo' && 'SEO'}
            {tab === 'integrations' && 'Integraciones'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          
          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 space-y-12 shadow-sm">
              <div className="space-y-10">
                {/* CRM Name & Tagline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      <Type className="w-3.5 h-3.5 text-primary" />
                      Nombre del CRM
                    </label>
                    <input 
                      type="text" 
                      value={settings.crm_name}
                      onChange={e => setSettings({ ...settings, crm_name: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.25rem] px-6 py-4 transition-all font-bold text-slate-700 outline-none"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      <Chrome className="w-3.5 h-3.5 text-primary" />
                      Tagline / Eslogan
                    </label>
                    <input 
                      type="text" 
                      value={settings.crm_tagline}
                      onChange={e => setSettings({ ...settings, crm_tagline: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.25rem] px-6 py-4 transition-all font-bold text-slate-700 outline-none"
                    />
                  </div>
                </div>

                {/* Logo Upload */}
                <div className="space-y-6">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    <ImageIcon className="w-3.5 h-3.5 text-primary" />
                    Logo Principal de la Empresa
                  </label>
                  <div className="flex flex-col md:flex-row gap-8 items-start md:items-center p-8 bg-slate-50 rounded-[2rem] border border-slate-100 group">
                    <div className="w-32 h-32 flex items-center justify-center bg-white rounded-3xl border-2 border-dashed border-slate-200 overflow-hidden relative group-hover:border-primary/20 transition-colors">
                      {settings.logo_url ? (
                        <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain p-4" />
                      ) : (
                        <ImageIcon className="w-10 h-10 text-slate-200" />
                      )}
                      {isUploading.logo_url && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-4 w-full">
                      <div className="flex gap-3">
                        <button 
                          onClick={() => document.getElementById('logo-upload')?.click()}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-slate-600 font-black text-[10px] uppercase tracking-widest px-8 py-4 rounded-xl border-2 border-slate-100 hover:border-primary/20 hover:text-primary transition-all active:scale-95 shadow-sm"
                        >
                          <Upload className="w-4 h-4" />
                          Subir Logo
                        </button>
                        <input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'logo_url')} />
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Recomendado: Fondo transparente (PNG/SVG) y ancho mín. 400px</p>
                    </div>
                  </div>
                </div>

                {/* Favicon Upload */}
                <div className="space-y-6">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    <Share2 className="w-3.5 h-3.5 text-primary" />
                    Favicon (Icono de Navegador)
                  </label>
                  <div className="flex flex-col md:flex-row gap-8 items-start md:items-center p-8 bg-slate-50 rounded-[2rem] border border-slate-100 group">
                    <div className="w-16 h-16 flex items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden relative group-hover:border-primary/20 transition-colors">
                      {settings.favicon_url ? (
                        <img src={settings.favicon_url} alt="Favicon" className="w-full h-full object-contain p-2" />
                      ) : (
                        <Globe className="w-8 h-8 text-slate-200" />
                      )}
                      {isUploading.favicon_url && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-4 w-full">
                      <div className="flex gap-3">
                        <button 
                          onClick={() => document.getElementById('favicon-upload')?.click()}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-slate-600 font-black text-[10px] uppercase tracking-widest px-8 py-4 rounded-xl border-2 border-slate-100 hover:border-primary/20 hover:text-primary transition-all active:scale-95 shadow-sm"
                        >
                          <Upload className="w-4 h-4" />
                          Subir Favicon
                        </button>
                        <input id="favicon-upload" type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'favicon_url')} />
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Recomendado: 32x32px o 64x64px en formato ICO o PNG</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SEO Tab */}
          {activeTab === 'seo' && (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 space-y-12 shadow-sm">
               <div className="space-y-10">
                 <div className="space-y-4">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      <Search className="w-3.5 h-3.5 text-primary" />
                      Título SEO (Meta Title)
                    </label>
                    <input 
                      type="text" 
                      value={settings.seo_title}
                      onChange={e => setSettings({ ...settings, seo_title: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.25rem] px-6 py-4 transition-all font-bold text-slate-700 outline-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      <Layout className="w-3.5 h-3.5 text-primary" />
                      Meta Descripción
                    </label>
                    <textarea 
                      rows={4}
                      value={settings.seo_description}
                      onChange={e => setSettings({ ...settings, seo_description: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.25rem] px-6 py-4 transition-all font-bold text-slate-700 outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      <Cpu className="w-3.5 h-3.5 text-primary" />
                      Keywords (Separadas por comas)
                    </label>
                    <input 
                      type="text" 
                      value={settings.seo_keywords}
                      onChange={e => setSettings({ ...settings, seo_keywords: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.25rem] px-6 py-4 transition-all font-bold text-slate-700 outline-none"
                    />
                  </div>
               </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="space-y-10">
              {/* Google Sync */}
              <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 space-y-8 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Google Synchronization</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic opacity-80">Conecta tu ecosistema de Google a Go Easy CRM</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
                    <Chrome className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                
                <div className="p-8 bg-blue-50/50 rounded-[2rem] border border-blue-100/50 flex items-center justify-between group">
                  <div className="space-y-2">
                    <div className="text-blue-900 font-black text-sm capitalize">Módulo en Desarrollo</div>
                    <p className="text-blue-600/70 text-xs font-semibold max-w-sm">Estamos trabajando para integrar Google Calendar, Drive y Search Console directamente en tu panel.</p>
                  </div>
                  <button className="bg-blue-600 text-white font-black px-6 py-3 rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-[1.05] transition-all flex items-center gap-2">
                    Solicitar Demo <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* AI Search Specialization */}
              <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 space-y-8 shadow-sm">
                 <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">AI Search Engine Optimization (AIO)</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic opacity-80">Optimiza tu presencia en Perplexity, SearchGPT y GPT-4</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
                    <Cpu className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="p-8 bg-emerald-50/30 rounded-[2rem] border border-emerald-100/50 space-y-4">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                        <Globe className="w-5 h-5 text-emerald-500" />
                      </div>
                      <h4 className="font-black text-sm text-slate-800">Capa de Rastreo IA</h4>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic line-clamp-2">Habilita metatags avanzados que permiten a los modelos de lenguaje entender mejor tu inventario y servicios.</p>
                      <div className="pt-2">
                        <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200 shadow-sm">Configuración Dinámica</span>
                      </div>
                   </div>

                   <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4 opacity-50 grayscale hover:grayscale-0 transition-all cursor-not-allowed">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                        <Search className="w-5 h-5 text-slate-400" />
                      </div>
                      <h4 className="font-black text-sm text-slate-400">Integración Perplexity</h4>
                      <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic line-clamp-2">Crea una conexión directa para que las consultas de Perplexity muestren tus resultados en tiempo real.</p>
                      <div className="pt-2">
                        <span className="text-[9px] font-black uppercase text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">Próximamente</span>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info & Preview */}
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-slate-900 text-white rounded-[2.5rem] p-10 space-y-8 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px]" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 blur-[60px]" />
              
              <div className="relative z-10 space-y-6">
                <div className="space-y-1">
                  <h3 className="text-xl font-black italic tracking-tight">Tip Profesional</h3>
                  <div className="w-10 h-1 bg-primary rounded-full" />
                </div>
                <p className="text-xs font-medium leading-relaxed text-slate-300 italic opacity-80">
                  "El branding no es solo estética, es confianza. Asegúrate de que tu logo tenga suficiente contraste y que el Favicon sea minimalista para que destaque en las pestañas del navegador."
                </p>
                <div className="flex flex-col gap-4 pt-4">
                   <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-primary">
                     <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                     Cambios en Tiempo Real
                   </div>
                   <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                     <div className="w-2 h-2 rounded-full bg-slate-400" />
                     Impacto Global en el CRM
                   </div>
                </div>
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 space-y-8 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Vista Previa de SEO</h3>
              <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 space-y-4">
                 <div className="space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Google Result</div>
                    <div className="text-blue-600 font-bold text-lg leading-snug line-clamp-2">{settings.seo_title || 'Go Easy CRM'}</div>
                    <div className="text-emerald-600 text-xs font-semibold truncate italic opacity-80">www.goeasyflorida.com</div>
                 </div>
                 <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-3">
                   {settings.seo_description || 'Personalización de metadatos para optimizar la visibilidad de tu flota y servicios en buscadores convencionales y de IA.'}
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
