'use client'

import { useState, useTransition } from 'react'
import { AlertCircle, RefreshCw, CheckCircle2, Loader2, ChevronRight } from 'lucide-react'
import { retryAutomation } from '@/app/utils/actions/automation'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface FailedLog {
  id: string
  lead_id: string
  stage: string
  channel: string
  action: string
  status: string
  error: string | null
  created_at: string
  leads: { first_name: string; last_name: string; phone: string } | null
}

const STAGE_LABELS: Record<string, string> = {
  lead_nuevo: 'Lead Nuevo',
  en_cotizacion: 'En Cotización',
  reserva_confirmada: 'Reserva Confirmada',
  voucher_enviado: 'Voucher Enviado',
  cerrado: 'Cerrado',
}

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: 'bg-emerald-50 text-emerald-700',
  email: 'bg-blue-50 text-blue-700',
  n8n: 'bg-violet-50 text-violet-700',
  system: 'bg-slate-100 text-slate-600',
}

export default function FailedLogsPanel({ initialLogs }: { initialLogs: FailedLog[] }) {
  const [logs, setLogs] = useState<FailedLog[]>(initialLogs)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, 'ok' | 'error'>>({})
  const [, startTransition] = useTransition()

  const handleRetry = (logId: string) => {
    setRetrying(logId)
    startTransition(async () => {
      const res = await retryAutomation(logId)
      setRetrying(null)
      if (res.ok) {
        setResults(prev => ({ ...prev, [logId]: 'ok' }))
        // Remove from list after short delay
        setTimeout(() => setLogs(prev => prev.filter(l => l.id !== logId)), 1500)
      } else {
        setResults(prev => ({ ...prev, [logId]: 'error' }))
      }
    })
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center opacity-40">
        <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3" />
        <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Sin fallos recientes</p>
        <p className="text-[10px] font-bold text-slate-400 mt-1 italic">Todas las automatizaciones se ejecutaron correctamente</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {logs.map(log => {
        const result = results[log.id]
        const isRetrying = retrying === log.id
        return (
          <div key={log.id} className={`p-5 rounded-2xl border transition-all ${result === 'ok' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50/60 border-rose-100'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white border border-rose-100 flex items-center justify-center shrink-0 mt-0.5">
                  {result === 'ok'
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <AlertCircle className="w-4 h-4 text-rose-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {log.leads ? (
                      <Link href={`/dashboard/leads/${log.lead_id}`} className="text-sm font-black text-slate-800 hover:text-primary transition-colors hover:underline flex items-center gap-0.5">
                        {log.leads.first_name} {log.leads.last_name}
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <span className="text-sm font-black text-slate-500">Lead {log.lead_id.slice(0, 8)}</span>
                    )}
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${CHANNEL_COLORS[log.channel] || 'bg-slate-100 text-slate-500'}`}>
                      {log.channel}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      {STAGE_LABELS[log.stage] || log.stage}
                    </span>
                  </div>
                  {log.error && (
                    <p className="text-[10px] font-bold text-rose-600 truncate max-w-sm" title={log.error}>
                      {log.error}
                    </p>
                  )}
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                    {formatDistanceToNow(new Date(log.created_at), { locale: es, addSuffix: true })}
                  </p>
                </div>
              </div>

              {result === 'ok' ? (
                <span className="shrink-0 flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-100 px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Reenviado
                </span>
              ) : (
                <button
                  onClick={() => handleRetry(log.id)}
                  disabled={isRetrying}
                  className="shrink-0 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-white hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-200 px-3 py-1.5 rounded-full transition-all active:scale-95 disabled:opacity-50"
                >
                  {isRetrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  {isRetrying ? 'Reintentando...' : 'Reintentar'}
                </button>
              )}
            </div>
            {result === 'error' && (
              <p className="mt-2 ml-11 text-[9px] font-bold text-rose-500">Reintento fallido — revisa la configuración de la integración</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
