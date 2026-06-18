import { createClient } from '@/utils/supabase/server'
import SystemLogsPanel, { type SystemLog } from './components/SystemLogsPanel'

export const dynamic = 'force-dynamic'

// Integraciones cuyo estado de salud mostramos en el semáforo
const MONITORED: { key: string; label: string; icon: string }[] = [
  { key: 'whatsapp', label: 'WhatsApp', icon: 'chat' },
  { key: 'email', label: 'Email', icon: 'mail' },
  { key: 'payment', label: 'Pagos (Stripe)', icon: 'payments' },
  { key: 'form', label: 'Formularios', icon: 'description' },
  { key: 'n8n', label: 'n8n', icon: 'account_tree' },
]

type Health = 'ok' | 'unstable' | 'down'

const HEALTH_META: Record<Health, { label: string; dot: string; card: string; text: string }> = {
  ok: { label: 'Operativo', dot: 'bg-emerald-500', card: 'bg-white border-slate-100', text: 'text-emerald-600' },
  unstable: { label: 'Inestable', dot: 'bg-amber-500 animate-pulse', card: 'bg-amber-50 border-amber-100', text: 'text-amber-600' },
  down: { label: 'Caído', dot: 'bg-red-500 animate-pulse', card: 'bg-red-50 border-red-200', text: 'text-red-600' },
}

export default async function LogsPage() {
  const supabase = await createClient()

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const [{ data: logs }, { data: recentErrors }] = await Promise.all([
    supabase
      .from('system_logs')
      .select('id, created_at, category, severity, source, status, message, error, lead_id, context, leads(first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(150),
    supabase
      .from('system_logs')
      .select('category, severity')
      .gte('created_at', oneHourAgo)
      .in('severity', ['error', 'critical']),
  ])

  // Salud por integración a partir de los errores de la última hora
  const health = MONITORED.map(integration => {
    const errs = (recentErrors || []).filter(e => e.category === integration.key)
    const hasCritical = errs.some(e => e.severity === 'critical')
    let status: Health = 'ok'
    if (hasCritical || errs.length >= 3) status = 'down'
    else if (errs.length > 0) status = 'unstable'
    return { ...integration, status, count: errs.length }
  })

  const totalErrorsLastHour = (recentErrors || []).length

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-4">
        <div>
          <h1 className="text-4xl font-sans font-black text-slate-900 tracking-tight leading-none mb-3">Registro del Sistema</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${totalErrorsLastHour > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
            {totalErrorsLastHour > 0
              ? `${totalErrorsLastHour} ${totalErrorsLastHour === 1 ? 'error' : 'errores'} en la última hora`
              : 'Sin errores en la última hora'}
          </p>
        </div>
      </header>

      {/* Semáforo de salud de integraciones */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
        {health.map(h => {
          const meta = HEALTH_META[h.status]
          return (
            <div key={h.key} className={`p-6 rounded-[2rem] border shadow-sm transition-all ${meta.card}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-500">
                  <span className="material-symbols-outlined text-xl">{h.icon}</span>
                </div>
                <span className={`w-3 h-3 rounded-full ${meta.dot}`} />
              </div>
              <div className="text-sm font-black text-slate-800 tracking-tight">{h.label}</div>
              <div className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${meta.text}`}>
                {meta.label}
              </div>
              {h.count > 0 && (
                <div className="text-[10px] font-bold text-slate-400 mt-1">
                  {h.count} {h.count === 1 ? 'fallo' : 'fallos'} / última hora
                </div>
              )}
            </div>
          )
        })}
      </section>

      {/* Bitácora de eventos */}
      <section className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-50 pb-6 mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Bitácora de eventos</h2>
            <p className="text-sm font-bold text-slate-400 mt-1 italic">
              Últimos 150 eventos · pagos, emails, WhatsApp, formularios y caídas de sistema
            </p>
          </div>
          <span className="material-symbols-outlined text-3xl text-slate-200">receipt_long</span>
        </div>
        <SystemLogsPanel logs={(logs || []) as unknown as SystemLog[]} />
      </section>
    </div>
  )
}
