'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Phone, MessageSquare, Calendar, Mail, Pencil, ChevronDown, ChevronUp, X, AlertCircle, Clock } from 'lucide-react'

export interface BannerTask {
  id: string
  title: string
  task_type: string
  due_date: string | null
  lead_id: string
  lead_name: string
  overdue: boolean
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  whatsapp: MessageSquare,
  meeting: Calendar,
  email: Mail,
  custom: Pencil,
}

export function TaskBanner({ tasks }: { tasks: BannerTask[] }) {
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || tasks.length === 0) return null

  const overdueCount = tasks.filter(t => t.overdue).length
  const visibleTasks = expanded ? tasks : tasks.slice(0, 3)

  return (
    <div className={`shrink-0 rounded-2xl border overflow-hidden ${
      overdueCount > 0 ? 'bg-red-50/60 border-red-100' : 'bg-amber-50/60 border-amber-100'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            overdueCount > 0 ? 'bg-red-100' : 'bg-amber-100'
          }`}>
            <span className="text-base">📋</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 leading-tight">
              Tienes {tasks.length} tarea{tasks.length > 1 ? 's' : ''} para hoy
            </p>
            {overdueCount > 0 && (
              <p className="text-[11px] font-bold text-red-500 leading-tight">
                {overdueCount} vencida{overdueCount > 1 ? 's' : ''} — requieren atención
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {tasks.length > 3 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:bg-white/60 rounded-lg transition-colors"
            >
              {expanded ? <>Ver menos <ChevronUp className="w-3.5 h-3.5" /></> : <>Ver todas ({tasks.length}) <ChevronDown className="w-3.5 h-3.5" /></>}
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-slate-300 hover:text-slate-500 hover:bg-white/60 rounded-lg transition-colors"
            title="Ocultar por ahora"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="px-3 pb-3 flex flex-col gap-1.5">
        {visibleTasks.map(task => {
          const Icon = TYPE_ICONS[task.task_type] || Pencil
          return (
            <Link
              key={task.id}
              href={`/dashboard/leads/${task.lead_id}?tab=tareas`}
              className="flex items-center gap-3 px-3 py-2.5 bg-white/80 hover:bg-white rounded-xl border border-white transition-colors group"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                task.overdue ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
              }`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate leading-tight">{task.title}</p>
                <p className="text-[10px] font-semibold text-slate-400 truncate">{task.lead_name}</p>
              </div>
              {task.due_date && (
                <span className={`flex items-center gap-1 text-[10px] font-black shrink-0 ${
                  task.overdue ? 'text-red-500' : 'text-slate-400'
                }`}>
                  {task.overdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {format(new Date(task.due_date), 'HH:mm')}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
