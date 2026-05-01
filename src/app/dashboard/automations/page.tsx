import { createClient } from '@/utils/supabase/server'
import FailedLogsPanel from './components/FailedLogsPanel'
import { AutomationConfigPanel } from './components/AutomationConfigPanel'
import { getAutomationConfig } from '@/app/utils/actions/automation'
import { RulesPanel } from './components/RulesPanel'
import { PendingActionsPanel } from './components/PendingActionsPanel'
import { getAutomationRules, getPendingActions } from '@/app/utils/actions/automation-rules'

export default async function AutomationsPage() {
  const supabase = await createClient()

  const { data: failedLogs } = await supabase
    .from('automation_logs')
    .select('id, lead_id, stage, channel, action, status, error, created_at, leads(first_name, last_name, phone)')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(30)

  const { config: automationConfig } = await getAutomationConfig()
  const { rules: automationRules } = await getAutomationRules()
  const { actions: pendingActions } = await getPendingActions()

  const failedCount = (failedLogs || []).length
  const pendingCount = pendingActions.filter(a => a.status === 'pending').length

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-4">
        <div>
          <h1 className="text-4xl font-sans font-black text-slate-900 tracking-tight leading-none mb-3">Automatizaciones</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Reglas, delays y acciones del pipeline
          </p>
        </div>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl">bolt</span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reglas activas</div>
              <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                {automationRules.filter(r => r.enabled).length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl">schedule</span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Acciones pendientes</div>
              <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">{pendingCount}</div>
            </div>
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
        </div>
      </section>

      {/* Control de canales por etapa */}
      <section className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-50 pb-6 mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Control de Canales
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

      {/* Reglas + Cola */}
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
                {pendingCount > 0 && (
                  <span className="text-[10px] font-black bg-amber-50 text-amber-600 px-3 py-1 rounded-full">
                    {pendingCount} pendientes
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

      {/* Fallos */}
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
