'use client'

import { useState, useTransition } from 'react'
import { cancelPendingAction, type PendingAction } from '@/app/utils/actions/automation-rules'
import { formatDistanceToNow, isPast } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_STYLE: Record<string, string> = {
  pending:    'bg-amber-50 text-amber-600 border-amber-100',
  processing: 'bg-blue-50 text-blue-600 border-blue-100',
  done:       'bg-emerald-50 text-emerald-600 border-emerald-100',
  failed:     'bg-rose-50 text-rose-500 border-rose-100',
  cancelled:  'bg-slate-100 text-slate-400 border-slate-200',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', processing: 'Procesando',
  done: 'Ejecutado', failed: 'Fallido', cancelled: 'Cancelado',
}

const ACTION_ICON: Record<string, string> = {
  whatsapp_template: 'chat', whatsapp_text: 'chat',
  change_stage: 'swap_horiz', notify_agent: 'notifications',
}

export function PendingActionsPanel({ initialActions }: { initialActions: PendingAction[] }) {
  const [actions, setActions] = useState(initialActions)
  const [, startTransition] = useTransition()

  const handleCancel = (id: string) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a))
    startTransition(async () => { await cancelPendingAction(id) })
  }

  const pending = actions.filter(a => a.status === 'pending' || a.status === 'processing')
  const history = actions.filter(a => a.status === 'done' || a.status === 'failed' || a.status === 'cancelled')

  if (actions.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center justify-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
        <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">schedule</span>
        <p className="text-slate-400 font-bold text-sm italic">No hay acciones programadas</p>
      </div>
    )
  }

  const renderRow = (action: PendingAction) => {
    const executeAt = new Date(action.execute_at)
    const overdue = isPast(executeAt) && action.status === 'pending'
    const lead = action.leads
    const ruleName = action.automation_rules?.name || '—'

    return (
      <div key={action.id} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 transition-all">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${STATUS_STYLE[action.status] || 'bg-slate-100'}`}>
          <span className="material-symbols-outlined text-[18px]">
            {ACTION_ICON[action.action_type] || 'bolt'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-black text-slate-800 truncate">
              {lead ? `${lead.first_name} ${lead.last_name}` : action.lead_id.slice(0, 8)}
            </span>
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLE[action.status]}">
              {STATUS_LABEL[action.status] || action.status}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold truncate">{ruleName}</p>
          {action.error && <p className="text-[10px] text-rose-500 font-bold mt-0.5 truncate">{action.error}</p>}
        </div>

        <div className="text-right shrink-0">
          <p className={`text-[10px] font-black ${overdue ? 'text-rose-500' : 'text-slate-400'}`}>
            {action.status === 'done' || action.status === 'failed'
              ? action.executed_at ? formatDistanceToNow(new Date(action.executed_at), { addSuffix: true, locale: es }) : '—'
              : overdue
                ? 'Vencido'
                : formatDistanceToNow(executeAt, { addSuffix: true, locale: es })}
          </p>
          <p className="text-[9px] text-slate-300 mt-0.5">
            {executeAt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {action.status === 'pending' && (
          <button
            onClick={() => handleCancel(action.id)}
            className="shrink-0 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
            title="Cancelar"
          >
            <span className="material-symbols-outlined text-[16px]">cancel</span>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {pending.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
            Próximas · {pending.length}
          </p>
          <div className="flex flex-col gap-2">{pending.map(renderRow)}</div>
        </div>
      )}
      {history.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
            Historial · {history.length}
          </p>
          <div className="flex flex-col gap-2">{history.map(renderRow)}</div>
        </div>
      )}
    </div>
  )
}
