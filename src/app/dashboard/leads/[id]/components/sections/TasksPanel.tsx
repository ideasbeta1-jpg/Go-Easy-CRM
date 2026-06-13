'use client'

import { useState, useTransition } from 'react'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Phone, MessageSquare, Calendar, Mail, Pencil,
  CheckCircle2, Clock, AlertCircle, Plus, X, ChevronDown, ChevronUp,
  Circle
} from 'lucide-react'
import {
  Task, TaskType, TaskPriority, TaskStatus,
  createTask, cancelTask
} from '@/app/utils/actions/tasks'
import TaskOutcomeModal from './TaskOutcomeModal'
import { toast } from 'sonner'

// ── Helpers ──────────────────────────────────────────────────────────────────

const TASK_TYPE_CONFIG: Record<TaskType, { label: string; icon: React.ElementType; color: string }> = {
  call:     { label: 'Llamada',  icon: Phone,          color: 'bg-blue-100 text-blue-600' },
  whatsapp: { label: 'WhatsApp', icon: MessageSquare,  color: 'bg-emerald-100 text-emerald-600' },
  meeting:  { label: 'Reunión',  icon: Calendar,       color: 'bg-purple-100 text-purple-600' },
  email:    { label: 'Email',    icon: Mail,            color: 'bg-amber-100 text-amber-600' },
  custom:   { label: 'Tarea',    icon: Pencil,         color: 'bg-slate-100 text-slate-600' },
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; dot: string }> = {
  low:    { label: 'Baja',     dot: 'bg-slate-300' },
  medium: { label: 'Media',    dot: 'bg-amber-400' },
  high:   { label: 'Alta',     dot: 'bg-orange-500' },
  urgent: { label: 'Urgente',  dot: 'bg-red-500' },
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  pending:     { label: 'Pendiente',    color: 'text-amber-600 bg-amber-50 border-amber-100' },
  in_progress: { label: 'En progreso',  color: 'text-blue-600 bg-blue-50 border-blue-100' },
  completed:   { label: 'Completada',   color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  cancelled:   { label: 'Cancelada',    color: 'text-slate-400 bg-slate-50 border-slate-100' },
}

const OUTCOME_CONFIG = {
  positive:  { label: 'Positiva',      color: 'text-emerald-700 bg-emerald-50', icon: '✅' },
  negative:  { label: 'Negativa',      color: 'text-red-700 bg-red-50',         icon: '❌' },
  no_answer: { label: 'No contestó',   color: 'text-slate-600 bg-slate-50',     icon: '📵' },
}

function dueDateLabel(date: string): { label: string; urgent: boolean } {
  const d = new Date(date)
  if (isPast(d) && !isToday(d)) return { label: `Venció ${format(d, "d MMM", { locale: es })}`, urgent: true }
  if (isToday(d)) return { label: `Hoy ${format(d, "HH:mm")}`, urgent: false }
  if (isTomorrow(d)) return { label: `Mañana ${format(d, "HH:mm")}`, urgent: false }
  return { label: format(d, "d MMM · HH:mm", { locale: es }), urgent: false }
}

// ── New Task Form ─────────────────────────────────────────────────────────────

interface NewTaskFormProps {
  leadId: string
  agents: any[]
  currentUserId?: string
  onCreated: (task: Task) => void
  onCancel: () => void
}

function NewTaskForm({ leadId, agents, currentUserId, onCreated, onCancel }: NewTaskFormProps) {
  const [taskType, setTaskType] = useState<TaskType>('call')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState(currentUserId || '')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (!title.trim()) { toast.error('El título es requerido'); return }
    startTransition(async () => {
      const result = await createTask({
        lead_id: leadId,
        task_type: taskType,
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate || undefined,
        assigned_to: assignedTo || undefined,
        priority,
      })
      if (result.ok && result.task) {
        toast.success('Tarea creada')
        onCreated(result.task)
      } else {
        toast.error(result.error || 'Error al crear tarea')
      }
    })
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nueva tarea</p>

      {/* Tipo */}
      <div className="flex gap-1.5 flex-wrap">
        {(Object.entries(TASK_TYPE_CONFIG) as [TaskType, any][]).map(([type, cfg]) => {
          const Icon = cfg.icon
          return (
            <button
              key={type}
              onClick={() => setTaskType(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                taskType === type ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cfg.label}
            </button>
          )
        })}
      </div>

      {/* Título */}
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Título de la tarea"
        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
      />

      {/* Descripción */}
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Descripción (opcional)"
        rows={2}
        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
      />

      <div className="grid grid-cols-2 gap-2">
        {/* Fecha límite */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Fecha límite</label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        {/* Prioridad */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Prioridad</label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value as TaskPriority)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          >
            {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, any][]).map(([p, cfg]) => (
              <option key={p} value={p}>{cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Asignar a */}
      {agents.length > 0 && (
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Asignar a</label>
          <select
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          >
            <option value="">Sin asignar</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.full_name || `${a.first_name} ${a.last_name}`}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || isPending}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPending ? (
            <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creando...</>
          ) : 'Crear tarea'}
        </button>
      </div>
    </div>
  )
}

// ── Task Card ─────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task
  onOutcomeClick: (task: Task) => void
  onCancel: (taskId: string) => void
}

function TaskCard({ task, onOutcomeClick, onCancel }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const cfg = TASK_TYPE_CONFIG[task.task_type] || TASK_TYPE_CONFIG.custom
  const Icon = cfg.icon
  const priorityCfg = PRIORITY_CONFIG[task.priority]
  const statusCfg = STATUS_CONFIG[task.status]
  const isActive = task.status === 'pending' || task.status === 'in_progress'
  const isCompleted = task.status === 'completed'
  const isCancelled = task.status === 'cancelled'

  return (
    <div className={`rounded-2xl border transition-all ${
      isCancelled
        ? 'bg-slate-50 border-slate-100 opacity-60'
        : isCompleted
          ? 'bg-white border-slate-100'
          : 'bg-white border-slate-200 shadow-sm'
    }`}>
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${cfg.color}`}>
          <Icon className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`text-sm font-bold leading-tight ${isCompleted || isCancelled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                {task.title}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {/* Priority dot */}
                {isActive && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                    <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} />
                    {priorityCfg.label}
                  </span>
                )}

                {/* Due date */}
                {task.due_date && isActive && (() => {
                  const { label, urgent } = dueDateLabel(task.due_date)
                  return (
                    <span className={`flex items-center gap-1 text-[10px] font-bold ${urgent ? 'text-red-500' : 'text-slate-400'}`}>
                      {urgent ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {label}
                    </span>
                  )
                })()}

                {/* Outcome badge for completed tasks */}
                {isCompleted && task.outcome && OUTCOME_CONFIG[task.outcome] && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${OUTCOME_CONFIG[task.outcome].color}`}>
                    {OUTCOME_CONFIG[task.outcome].icon} {OUTCOME_CONFIG[task.outcome].label}
                  </span>
                )}

                {/* Source badge */}
                {task.source === 'automation' && (
                  <span className="text-[9px] font-black text-primary/60 bg-primary/5 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Auto</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {isActive && (
                <button
                  onClick={() => onOutcomeClick(task)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Resultado
                </button>
              )}
              {(task.description || task.outcome_notes) && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
              {isActive && (
                <button
                  onClick={() => onCancel(task.id)}
                  className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded: description + outcome notes */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-slate-50 pt-3">
          {task.description && (
            <p className="text-xs text-slate-500 leading-relaxed">{task.description}</p>
          )}
          {task.outcome_notes && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Notas del resultado</p>
              <p className="text-xs text-slate-700 leading-relaxed">{task.outcome_notes}</p>
            </div>
          )}
          {task.completed_at && (
            <p className="text-[10px] text-slate-400">
              Completada el {format(new Date(task.completed_at), "d MMM yyyy · HH:mm", { locale: es })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

interface Props {
  leadId: string
  initialTasks: Task[]
  agents: any[]
  currentUserId?: string
}

export default function TasksPanel({ leadId, initialTasks, agents, currentUserId }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [showForm, setShowForm] = useState(false)
  const [outcomeTask, setOutcomeTask] = useState<Task | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [isPending, startTransition] = useTransition()

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
  const completedTasks = tasks.filter(t => t.status === 'completed')
  const cancelledTasks = tasks.filter(t => t.status === 'cancelled')

  const handleCreated = (task: Task) => {
    setTasks(prev => [task, ...prev])
    setShowForm(false)
  }

  const handleCompleted = () => {
    // Refetch será manejado por revalidatePath en la server action
    // Aquí solo cerramos el modal
  }

  const handleCancel = (taskId: string) => {
    startTransition(async () => {
      const result = await cancelTask(taskId)
      if (result.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'cancelled' as TaskStatus } : t))
        toast.success('Tarea cancelada')
      } else {
        toast.error(result.error || 'Error al cancelar la tarea')
      }
    })
  }

  const overdueCount = pendingTasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))).length

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[15px] font-bold text-slate-900">Tareas</h2>
          {pendingTasks.length > 0 && (
            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
              overdueCount > 0 ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
            }`}>
              {pendingTasks.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva tarea
        </button>
      </div>

      {/* New task form */}
      {showForm && (
        <div className="mb-4">
          <NewTaskForm
            leadId={leadId}
            agents={agents}
            currentUserId={currentUserId}
            onCreated={handleCreated}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Pending tasks */}
      {pendingTasks.length > 0 ? (
        <div className="space-y-2.5 mb-4">
          {pendingTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onOutcomeClick={setOutcomeTask}
              onCancel={handleCancel}
            />
          ))}
        </div>
      ) : !showForm && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-400">Sin tareas pendientes</p>
          <p className="text-xs text-slate-300 mt-1">Crea una tarea o configura automatizaciones para generarlas.</p>
        </div>
      )}

      {/* Completed tasks toggle */}
      {completedTasks.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors py-2"
          >
            {showCompleted ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showCompleted ? 'Ocultar' : 'Ver'} completadas ({completedTasks.length})
          </button>
          {showCompleted && (
            <div className="space-y-2 mt-2">
              {completedTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onOutcomeClick={setOutcomeTask}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Outcome modal */}
      {outcomeTask && (
        <TaskOutcomeModal
          task={outcomeTask}
          onClose={() => setOutcomeTask(null)}
          onCompleted={() => {
            setTasks(prev => prev.map(t =>
              t.id === outcomeTask.id ? { ...t, status: 'completed' as TaskStatus } : t
            ))
            handleCompleted()
          }}
        />
      )}
    </div>
  )
}
