import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import FailedLogsPanel from './components/FailedLogsPanel'
import { AutomationConfigPanel } from './components/AutomationConfigPanel'
import { getAutomationConfig } from '@/app/utils/actions/automation'
import { RulesPanel } from './components/RulesPanel'
import { PendingActionsPanel } from './components/PendingActionsPanel'
import { getAutomationRules, getPendingActions } from '@/app/utils/actions/automation-rules'

export default async function AutomationsPage() {
  const supabase = await createClient()

  // Fetch recent messages with their related leads
  const { data: messages } = await supabase
    .from('messages')
    .select('*, lead:leads(first_name, last_name, phone)')
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch failed automation logs
  const { data: failedLogs } = await supabase
    .from('automation_logs')
    .select('id, lead_id, stage, channel, action, status, error, created_at, leads(first_name, last_name, phone)')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(30)

  const { config: automationConfig } = await getAutomationConfig()
  const { rules: automationRules } = await getAutomationRules()
  const { actions: pendingActions } = await getPendingActions()

  // Status of n8n configuration
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL
  const isn8nConfigured = !!n8nWebhookUrl

  // Stats for the header
  const totalMessages = (messages || []).length
  const inboundCount = (messages || []).filter(m => m.direction === 'inbound').length
  const outboundCount = (messages || []).filter(m => m.direction === 'outbound').length
  const failedCount = (failedLogs || []).length

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
      {/* Premium Header Section */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-4">
        <div>
          <h1 className="text-4xl font-sans font-black text-slate-900 tracking-tight leading-none mb-3">Automatizaciones y Mensajes</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
             <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
             Flujos n8n & Comunicación en tiempo real
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm p-2 rounded-full border border-slate-100 shadow-sm">
           <div className={`flex items-center gap-3 px-6 py-3 rounded-full ${isn8nConfigured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'} border border-current/10 transition-all`}>
             <span className="material-symbols-outlined text-[18px]">{isn8nConfigured ? 'terminal' : 'warning'}</span>
             <span className="text-xs font-black uppercase tracking-wider">{isn8nConfigured ? 'n8n Conectado' : 'n8n Desconectado'}</span>
           </div>
           
           <button className="bg-primary hover:bg-oceanic text-white px-8 py-3.5 rounded-full text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px]">sync</span>
              Sincronizar Flujos
           </button>
        </div>
      </header>

      {/* Stats Bento Grid Header */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl">forum</span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Mensajes</div>
              <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">{totalMessages}</div>
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-[0.03] scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-700">
            <span className="material-symbols-outlined text-[120px]">forum</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl">call_received</span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Entrantes</div>
              <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">{inboundCount}</div>
            </div>
          </div>
           <div className="absolute -right-6 -bottom-6 opacity-[0.03] scale-150 -rotate-12 group-hover:rotate-0 transition-transform duration-700">
            <span className="material-symbols-outlined text-[120px]">call_received</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl">call_made</span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Salientes</div>
              <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">{outboundCount}</div>
            </div>
          </div>
           <div className="absolute -right-6 -bottom-6 opacity-[0.03] scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-700">
            <span className="material-symbols-outlined text-[120px]">call_made</span>
          </div>
        </div>

        <div className={`p-8 rounded-[2.5rem] border shadow-sm hover:shadow-xl transition-all group overflow-hidden relative ${failedCount > 0 ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-5 relative z-10">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${failedCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
              <span className="material-symbols-outlined text-2xl">error</span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fallos</div>
              <div className={`text-3xl font-black tracking-tight mt-0.5 ${failedCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{failedCount}</div>
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-[0.03] scale-150 -rotate-12 group-hover:rotate-0 transition-transform duration-700">
            <span className="material-symbols-outlined text-[120px]">error</span>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 min-h-[600px]">
        {/* Messages Feed View */}
        <section className="lg:col-span-8 bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 flex flex-col gap-10">
          <div className="flex items-center justify-between border-b border-slate-50 pb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Registro de Comunicación</h2>
              <p className="text-sm font-bold text-slate-400 mt-1 italic">Últimos eventos procesados por el motor n8n</p>
            </div>
            <div className="flex gap-2">
              <span className="px-4 py-1.5 bg-slate-50 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-100">Live Feedback</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {(!messages || messages.length === 0) ? (
              <div className="py-24 flex flex-col items-center justify-center bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                <span className="material-symbols-outlined text-4xl text-slate-300 animate-bounce mb-4">move_to_inbox</span>
                <p className="text-slate-400 font-bold text-lg italic uppercase tracking-tighter opacity-70">Aún no hay mensajes procesados</p>
              </div>
            ) : (
              messages.map((message) => (
                <div 
                  key={message.id} 
                  className="flex items-start gap-6 p-6 hover:bg-slate-50 rounded-[2rem] transition-all border border-transparent hover:border-slate-100 cursor-pointer group"
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                    message.direction === 'inbound' 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : 'bg-primary/10 text-primary'
                  }`}>
                    <span className="material-symbols-outlined text-[20px]">
                      {message.direction === 'inbound' ? 'mail_lock' : 'forward_to_inbox'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Link 
                          href={message.lead_id ? `/dashboard/leads/${message.lead_id}` : '#'} 
                          className="text-sm font-black text-slate-800 hover:text-primary transition-colors hover:underline decoration-2 underline-offset-4"
                        >
                          {message.lead ? `${message.lead.first_name} ${message.lead.last_name}` : 'Evento de Sistema'}
                        </Link>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                          message.direction === 'inbound' ? 'bg-emerald-100/50 text-emerald-700' : 'bg-primary/10 text-primary'
                        }`}>
                          {message.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 font-sans opacity-70">
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[13px] font-medium text-slate-600 leading-relaxed truncate group-hover:whitespace-normal transition-all duration-300">
                      {message.content}
                    </p>
                  </div>
                  
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-[18px] text-slate-300">open_in_new</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Configurations Side Panel */}
        <aside className="lg:col-span-4 flex flex-col gap-10">
          {/* n8n Status Card */}
          <div className="bg-oceanic rounded-[3rem] p-10 text-white shadow-2xl shadow-primary/30 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <h3 className="text-2xl font-black tracking-tight leading-none italic">n8n Engine</h3>
                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/20 backdrop-blur-md ${isn8nConfigured ? 'bg-emerald-400 text-emerald-950' : 'bg-white/10'}`}>
                  {isn8nConfigured ? 'Live' : 'Inactive'}
                </div>
              </div>
              
              <p className="text-[13px] leading-relaxed font-medium opacity-80 italic">
                {isn8nConfigured 
                  ? "El motor de automatización está escuchando eventos y procesando lógica de negocio externa."
                  : "Por favor configura la variable N8N_WEBHOOK_URL en el entorno para activar el procesamiento automático."}
              </p>

              <div className="flex flex-col gap-3 mt-4">
                <button className="bg-white text-primary rounded-full py-4 text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.03] transition-all active:scale-95 flex items-center justify-center gap-3">
                   <span className="material-symbols-outlined text-[18px]">settings_input_composite</span>
                   Configurar Workflow
                </button>
                <div className="text-[10px] text-center font-bold opacity-60 uppercase tracking-[0.15em] py-2 border-t border-white/10">Version 1.48.0 Stable</div>
              </div>
            </div>

            {/* Background elements */}
            <div className="absolute -right-20 -bottom-20 opacity-10 group-hover:scale-110 transition-transform duration-1000">
               <span className="material-symbols-outlined text-[350px]">hub</span>
            </div>
          </div>

          {/* Integration Statuses */}
          <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
            <h3 className="text-lg font-black text-slate-900 tracking-tight mb-8">Estado de Integraciones</h3>
            
            <div className="flex flex-col gap-6">
               <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-[#25D366]/10 text-[#25D366] rounded-xl flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-xl">chat</span>
                     </div>
                     <div>
                        <div className="text-xs font-black text-slate-800">WhatsApp API</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Evolution API</div>
                     </div>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#4ade80]" />
               </div>

               <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-[#6366f1]/10 text-[#6366f1] rounded-xl flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-xl">payments</span>
                     </div>
                     <div>
                        <div className="text-xs font-black text-slate-800">Stripe Webhooks</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Pagos & Vouchers</div>
                     </div>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#4ade80]" />
               </div>

               <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 grayscale transition-all hover:grayscale-0 cursor-not-allowed group">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                        <span className="material-symbols-outlined text-xl">mail</span>
                     </div>
                     <div>
                        <div className="text-xs font-black text-slate-800 group-hover:text-slate-900">Email Marketing</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">Coming soon...</div>
                     </div>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
               </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden flex flex-col items-center justify-center text-center gap-4">
            <div className="relative z-10">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-primary">Próximo Paso</div>
              <h4 className="text-xl font-black tracking-tight leading-tight italic px-4">Configura respuestas automáticas con IA</h4>
            </div>
            <button className="relative z-10 mt-2 bg-white/10 hover:bg-white/20 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all">Explorar Labs</button>
            <div className="absolute inset-0 bg-dots opacity-20" />
          </div>
        </aside>
      </div>

      {/* Automation Config — control de canales por etapa */}
      <section className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-50 pb-6 mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Control de Automatizaciones
              <span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full">Kanban</span>
            </h2>
            <p className="text-sm font-bold text-slate-400 mt-1 italic">
              Activa o desactiva cada canal por etapa del pipeline
            </p>
          </div>
          <span className="material-symbols-outlined text-3xl text-slate-200">tune</span>
        </div>
        <AutomationConfigPanel initialConfig={automationConfig} />
      </section>

      {/* Reglas de automatización + Cola de acciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 flex flex-col gap-8">
          <div className="flex items-center justify-between border-b border-slate-50 pb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                Reglas
                <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">{automationRules.length}</span>
              </h2>
              <p className="text-sm font-bold text-slate-400 mt-1 italic">Delays, fechas e inactividad</p>
            </div>
            <span className="material-symbols-outlined text-3xl text-slate-200">bolt</span>
          </div>
          <RulesPanel initialRules={automationRules as any} />
        </section>

        <section className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 flex flex-col gap-8">
          <div className="flex items-center justify-between border-b border-slate-50 pb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                Cola de acciones
                {pendingActions.filter(a => a.status === 'pending').length > 0 && (
                  <span className="text-[10px] font-black bg-amber-50 text-amber-600 px-3 py-1 rounded-full">
                    {pendingActions.filter(a => a.status === 'pending').length} pendientes
                  </span>
                )}
              </h2>
              <p className="text-sm font-bold text-slate-400 mt-1 italic">Acciones programadas y ejecutadas</p>
            </div>
            <span className="material-symbols-outlined text-3xl text-slate-200">schedule</span>
          </div>
          <PendingActionsPanel initialActions={pendingActions as any} />
        </section>
      </div>

      {/* Failed Automations — full width */}
      <section className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-50 pb-6 mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Automatizaciones Fallidas
              {failedCount > 0 && (
                <span className="text-[10px] font-black bg-rose-100 text-rose-600 px-3 py-1 rounded-full">{failedCount} pendientes</span>
              )}
            </h2>
            <p className="text-sm font-bold text-slate-400 mt-1 italic">Mensajes y acciones que no se completaron · Puedes reintentarlos con un clic</p>
          </div>
        </div>
        <FailedLogsPanel initialLogs={(failedLogs || []) as any} />
      </section>
    </div>
  )
}
