'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Phone, MessageSquare, Calendar, Mail, Pencil,
  Clock, AlertCircle, CheckCircle2, Circle, ExternalLink,
  ChevronRight
} from 'lucide-react'
import { Task, TaskType, TaskStatus, TaskPriority, TaskOutcome, completeTask, cancelTask } from '@/app/utils/actions/tasks'
import TaskOutcomeModal from '@/app/dashboard/leads/[id]/components/sections/TaskOutcomeModal'
import { toast } from 'sonner'

// ── Config ────────────────────────────────────────────────────────────────────

const TASK_TYPE_CONFIG: Record<TaskType, { label: string; icon: React.ElementType; color: string }> = {
  call:     { label: 'Llamada',  icon: Phone,         color: 'bg-blue-100 text-blue-600' },
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'bg-emerald-100 text-emerald-600' },
  meeting:  { label: 'Reunión',  icon: Calendar,      color: 'bg-purple-100 text-purple-600' },
  email:    { label: 'Email',    icon: Mail,           color: 'bg-amber-100 text-amber-600' },
  custom:   { label: 'Tarea',   icon: Pencil,         color: 'bg-slate-100 text-slate-600' },
}

const PRIORITY_DOT: Record<TaskPriority, string> = {
  low: 'bg-slate-300', medium: 'bg-amber-400', high: 'bg-orange-500', urgent: 'bg-red-500'
}

const OUTCOME_CONFIG = {
  positive:  { label: 'Positiva',    color: 'text-emerald-700 bg-emerald-50', icon: '✅' },
  negative:  { label: 'Negativa',    color: 'text-red-700 bg-red-50',         icon: '❌' },
  no_answer: { label: 'No contestó', color: 'text-slate-600 bg-slate-50',     icon: '📵' },
}

function dueDateInfo(date: string) {
  const d = new Date(date)
  if (isPast(d) && !isToday(d)) return { label: `Venció ${format(d, "d MMM", { locale: es })}`, urgent: true }
  if (isToday(d)) return { label: `Hoy ${format(d, "HH:mm")}`, urgent: false }
  if (isTomorrow(d)) return { label: `Mañana ${format(d, "HH:mm")}`, urgent: false }
  return { label: format(d, "d MMM · HH:mm", { locale: es }), urgent: false }
}

// ── Filters ───────────────────────────────────────────────────────────────────

type FilterTab = 'pending' | 'completed' | 'all'

// ── Main Component ────────────────────────────────────────────────────────────

interface Props { initialTasks: Task[] }

export default function TasksClient({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [filter, setFilter] = useState<FilterTab>('pending')
  const [outcomeTask, setOutcomeTask] = useState<Task | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = tasks.filter(t => {
    if (filter === 'pending') return t.status === 'pending' || t.status === 'in_progress'
    if (filter === 'completed') return t.status === 'completed'
    return t.status !== 'cancelled'
  })

  const pendingCount = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length
  const overdueCount = tasks.filter(t =>
    (t.status === 'pending' || t.status === 'in_progress') &&
    t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))
  ).length

  const handleCancel = (taskId: string) => {
    startTransition(async () => {
      const result = await cancelTask(taskId)
      if (result.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'cancelled' as TaskStatus } : t))
        toast.success('Tarea cancelada')
      } else {
        toast.error(result.error || 'Error al cancelar')
      }
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Tareas</h1>
        <p className="text-sm text-slate-500 mt-1">
          {pendingCount} pendientes
          {overdueCount > 0 && <span className="text-red-500 font-bold"> · {overdueCount} vencidas</span>}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
        {([
          { id: 'pending',   label: 'Pendientes' },
          { id: 'completed', label: 'Completadas' },
          { id: 'all',       label: 'Todas' },
        ] as { id: FilterTab; label: string }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
              filter === tab.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-3xl flex items-center justify-center mb-4">
            <CheckCircle2 className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-400">
            {filter === 'pending' ? 'Sin tareas pendientes' : filter === 'completed' ? 'Sin tareas completadas' : 'Sin tareas'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(task => {
            const cfg = TASK_TYPE_CONFIG[task.task_type] || TASK_TYPE_CONFIG.custom
            const Icon = cfg.icon
            const isActive = task.status === 'pending' || task.status === 'in_progress'
            const isCompleted = task.status === 'completed'
            const leadName = task.lead
              ? `${task.lead.first_name || ''} ${task.lead.last_name || ''}`.trim()
              : 'Lead'

            return (
              <div
                key={task.id}
                className={`bg-white rounded-2xl border p-4 transition-all ${
                  isCompleted ? 'border-slate-100 opacity-80' : 'border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Type icon */}
                  <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${cfg.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-sm font-bold leading-snug ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {task.title}
                        </p>

                        {/* Lead link */}
                        <Link
                          href={`/dashboard/leads/${task.lead_id}`}
                          className="flex items-center gap-1 text-[11px] text-primary font-bold hover:underline mt-0.5"
                        >
                          {leadName}
                          <ExternalLink className="w-3 h-3" />
                        </Link>

                        {/* Meta row */}
                        <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                          {isActive && task.priority && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                              <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} />
                              {task.priority === 'urgent' ? 'Urgente' : task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                            </span>
                          )}

                          {task.due_date && isActive && (() => {
                            const { label, urgent } = dueDateInfo(task.due_date)
                            return (
                              <span className={`flex items-center gap-1 text-[10px] font-bold ${urgent ? 'text-red-500' : 'text-slate-400'}`}>
                                {urgent ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                {label}
                              </span>
                            )
                          })()}

                          {isCompleted && task.outcome && OUTCOME_CONFIG[task.outcome] && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${OUTCOME_CONFIG[task.outcome].color}`}>
                              {OUTCOME_CONFIG[task.outcome].icon} {OUTCOME_CONFIG[task.outcome].label}
                            </span>
                          )}

                          {task.source === 'automation' && (
                            <span className="text-[9px] font-black text-primary/60 bg-primary/5 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Auto</span>
                          )}
                        </div>

                        {/* Outcome notes preview */}
                        {isCompleted && task.outcome_notes && (
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-2">{task.outcome_notes}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isActive && (
                          <button
                            onClick={() => setOutcomeTask(task)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors"
                          >
                            Resultado
                          </button>
                        )}
                        <Link
                          href={`/dashboard/leads/${task.lead_id}`}
                          className="p-1.5 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Outcome Modal */}
      {outcomeTask && (
        <TaskOutcomeModal
          task={outcomeTask}
          onClose={() => setOutcomeTask(null)}
          onCompleted={() => {
            setTasks(prev => prev.map(t =>
              t.id === outcomeTask.id ? { ...t, status: 'completed' as TaskStatus } : t
            ))
          }}
        />
      )}
    </div>
  )
}
