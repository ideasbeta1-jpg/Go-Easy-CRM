'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, AlertCircle, Info, XOctagon, CheckCircle2, ChevronRight, Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

export interface SystemLog {
  id: string
  created_at: string
  category: string
  severity: string
  source: string
  status: string | null
  message: string
  error: string | null
  lead_id: string | null
  context: Record<string, any> | null
  leads: { first_name: string; last_name: string } | null
}

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  whatsapp: { label: 'WhatsApp', color: 'bg-emerald-50 text-emerald-700' },
  email: { label: 'Email', color: 'bg-blue-50 text-blue-700' },
  payment: { label: 'Pago', color: 'bg-violet-50 text-violet-700' },
  form: { label: 'Formulario', color: 'bg-amber-50 text-amber-700' },
  n8n: { label: 'n8n', color: 'bg-indigo-50 text-indigo-700' },
  meta_capi: { label: 'Meta', color: 'bg-sky-50 text-sky-700' },
  system: { label: 'Sistema', color: 'bg-slate-100 text-slate-600' },
}

const SEVERITY_META: Record<string, { label: string; row: string; chip: string; Icon: typeof Info }> = {
  info: { label: 'Info', row: 'bg-white border-slate-100', chip: 'bg-slate-100 text-slate-500', Icon: Info },
  warning: { label: 'Aviso', row: 'bg-amber-50/50 border-amber-100', chip: 'bg-amber-100 text-amber-700', Icon: AlertTriangle },
  error: { label: 'Error', row: 'bg-rose-50/50 border-rose-100', chip: 'bg-rose-100 text-rose-700', Icon: AlertCircle },
  critical: { label: 'Crítico', row: 'bg-red-50 border-red-200', chip: 'bg-red-600 text-white', Icon: XOctagon },
}

const SEVERITY_ORDER = ['critical', 'error', 'warning', 'info'] as const

export default function SystemLogsPanel({ logs }: { logs: SystemLog[] }) {
  const [category, setCategory] = useState<string>('all')
  const [severity, setSeverity] = useState<string>('all')
  const [query, setQuery] = useState('')

  const categories = useMemo(() => {
    const set = new Set(logs.map(l => l.category))
    return Array.from(set)
  }, [logs])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return logs.filter(l => {
      if (category !== 'all' && l.category !== category) return false
      if (severity !== 'all' && l.severity !== severity) return false
      if (q && !(`${l.message} ${l.error ?? ''} ${l.source}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [logs, category, severity, query])

  return (
    <div className="flex flex-col gap-6">
      {/* Filtros */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <FilterPill active={category === 'all'} onClick={() => setCategory('all')}>Todas</FilterPill>
          {categories.map(c => (
            <FilterPill key={c} active={category === c} onClick={() => setCategory(c)}>
              {CATEGORY_META[c]?.label ?? c}
            </FilterPill>
          ))}
        </div>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <FilterPill active={severity === 'all'} onClick={() => setSeverity('all')}>Cualquier nivel</FilterPill>
            {SEVERITY_ORDER.map(s => (
              <FilterPill key={s} active={severity === s} onClick={() => setSeverity(s)}>
                {SEVERITY_META[s].label}
              </FilterPill>
            ))}
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar en mensajes…"
              className="pl-9 pr-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600 placeholder:text-slate-300 focus:outline-none focus:border-primary w-56"
            />
          </div>
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center opacity-40">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3" />
          <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Sin eventos</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1 italic">No hay registros que coincidan con el filtro</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map(log => {
            const sev = SEVERITY_META[log.severity] ?? SEVERITY_META.info
            const cat = CATEGORY_META[log.category] ?? { label: log.category, color: 'bg-slate-100 text-slate-500' }
            const Icon = sev.Icon
            return (
              <div key={log.id} className={`p-4 rounded-2xl border transition-all ${sev.row}`}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className={`w-4 h-4 ${log.severity === 'critical' ? 'text-red-600' : log.severity === 'error' ? 'text-rose-500' : log.severity === 'warning' ? 'text-amber-500' : 'text-slate-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${sev.chip}`}>{sev.label}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{log.source}</span>
                      {log.leads && log.lead_id && (
                        <Link href={`/dashboard/leads/${log.lead_id}`} className="text-[10px] font-black text-slate-600 hover:text-primary hover:underline flex items-center gap-0.5">
                          {log.leads.first_name} {log.leads.last_name}
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-700">{log.message}</p>
                    {log.error && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1 break-words" title={log.error}>{log.error}</p>
                    )}
                    <p className="text-[9px] font-bold text-slate-400 mt-1">
                      {formatDistanceToNow(new Date(log.created_at), { locale: es, addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full transition-all active:scale-95 ${
        active ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
      }`}
    >
      {children}
    </button>
  )
}
