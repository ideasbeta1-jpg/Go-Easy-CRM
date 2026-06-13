'use client'

import { useState, useTransition } from 'react'
import { X, Phone, MessageSquare, Calendar, Mail, Pencil, CheckCircle2, AlertCircle } from 'lucide-react'
import { completeTask, Task, TaskOutcome } from '@/app/utils/actions/tasks'
import { toast } from 'sonner'

const TASK_TYPE_LABELS: Record<string, string> = {
  call: 'Llamada',
  whatsapp: 'WhatsApp',
  meeting: 'Reunión',
  email: 'Email',
  custom: 'Tarea',
}

const TASK_TYPE_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  whatsapp: MessageSquare,
  meeting: Calendar,
  email: Mail,
  custom: Pencil,
}

interface Props {
  task: Task
  onClose: () => void
  onCompleted: () => void
}

export default function TaskOutcomeModal({ task, onClose, onCompleted }: Props) {
  const [responded, setResponded] = useState<'yes' | 'no' | null>(null)
  const [callResult, setCallResult] = useState<'positive' | 'negative' | null>(null)
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  const isCall = task.task_type === 'call'

  const getOutcome = (): TaskOutcome | null => {
    if (responded === 'no') return 'no_answer'
    if (responded === 'yes' && callResult === 'positive') return 'positive'
    if (responded === 'yes' && callResult === 'negative') return 'negative'
    return null
  }

  const canSubmit = responded !== null && (responded === 'no' || callResult !== null)

  const handleSubmit = () => {
    const outcome = getOutcome()
    if (!outcome) return

    startTransition(async () => {
      const result = await completeTask(task.id, outcome, notes || undefined)
      if (result.ok) {
        toast.success('Resultado registrado correctamente')
        onCompleted()
        onClose()
      } else {
        toast.error(result.error || 'Error al registrar el resultado')
      }
    })
  }

  const TaskIcon = TASK_TYPE_ICONS[task.task_type] || Pencil

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                <TaskIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {TASK_TYPE_LABELS[task.task_type] || 'Tarea'}
                </p>
                <h3 className="text-sm font-black text-slate-900 leading-tight truncate">{task.title}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Pregunta 1: ¿El cliente respondió? */}
          <div className="space-y-2.5">
            <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
              {isCall ? '¿El cliente contestó la llamada?' : '¿El cliente respondió?'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setResponded('no'); setCallResult(null) }}
                className={`flex-1 py-2.5 px-4 rounded-2xl text-sm font-bold border-2 transition-all ${
                  responded === 'no'
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                }`}
              >
                {isCall ? 'No contestó' : 'No respondió'}
              </button>
              <button
                onClick={() => setResponded('yes')}
                className={`flex-1 py-2.5 px-4 rounded-2xl text-sm font-bold border-2 transition-all ${
                  responded === 'yes'
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                }`}
              >
                Sí respondió
              </button>
            </div>
          </div>

          {/* Pregunta 2: ¿Positiva o negativa? (solo si respondió) */}
          {responded === 'yes' && (
            <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
                {isCall ? '¿Cómo fue la llamada?' : '¿Cuál fue el resultado?'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCallResult('negative')}
                  className={`flex-1 py-2.5 px-4 rounded-2xl text-sm font-bold border-2 transition-all ${
                    callResult === 'negative'
                      ? 'bg-red-500 border-red-500 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-red-300'
                  }`}
                >
                  Negativa
                </button>
                <button
                  onClick={() => setCallResult('positive')}
                  className={`flex-1 py-2.5 px-4 rounded-2xl text-sm font-bold border-2 transition-all ${
                    callResult === 'positive'
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
                  }`}
                >
                  Positiva
                </button>
              </div>
            </div>
          )}

          {/* Follow-up preview */}
          {canSubmit && getOutcome() && task.follow_up_rules?.[getOutcome()!] && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3.5 animate-in fade-in duration-200">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">
                Acción automática programada
              </p>
              {(() => {
                const rule = task.follow_up_rules[getOutcome()!]
                if (rule.action === 'create_task') {
                  const hours = rule.delay_hours || 0
                  return (
                    <p className="text-xs font-bold text-amber-800">
                      📋 Se creará la tarea "{rule.title || 'Seguimiento'}"
                      {hours > 0 ? ` en ${hours} hora${hours > 1 ? 's' : ''}` : ' ahora mismo'}
                    </p>
                  )
                }
                if (rule.action === 'whatsapp_text' || rule.action === 'whatsapp_template') {
                  const hours = rule.delay_hours || 0
                  return (
                    <p className="text-xs font-bold text-amber-800">
                      💬 Se enviará un mensaje de WhatsApp
                      {hours > 0 ? ` en ${hours} hora${hours > 1 ? 's' : ''}` : ' ahora mismo'}
                    </p>
                  )
                }
                if (rule.action === 'notify_agent') {
                  return <p className="text-xs font-bold text-amber-800">🔔 Se enviará una notificación al agente</p>
                }
                return null
              })()}
            </div>
          )}

          {/* Comentarios */}
          <div className="space-y-2">
            <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Comentarios <span className="text-slate-400 font-medium normal-case">(opcional)</span>
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="¿Qué mencionó el cliente? ¿Próximos pasos?"
              className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-1 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Guardar resultado
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
