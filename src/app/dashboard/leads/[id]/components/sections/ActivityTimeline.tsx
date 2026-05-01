'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Zap, AlertCircle } from 'lucide-react'

interface TimelineEvent {
  id: string
  title: string
  date: string
  icon: React.ElementType
  color: string
  desc: string
  isMismatch?: boolean
}

interface Props {
  events: TimelineEvent[]
  activeQuote?: any
  onRegenerateQuote: () => void
}

export function ActivityTimeline({ events, activeQuote, onRegenerateQuote }: Props) {
  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] lg:rounded-[3.5rem] p-6 md:p-10 lg:p-16 shadow-[0_15px_40px_rgba(0,0,0,0.02)]">
      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1 mb-8 lg:mb-10">Línea de Tiempo</h3>
      <div className="space-y-8 relative pl-6 border-l-2 border-slate-50">
        {events.map((event) => {
          const EventIcon = event.icon
          return (
            <div key={event.id} className="relative">
              <div className={`absolute -left-[41px] -top-1 w-10 h-10 rounded-full flex items-center justify-center ring-8 ring-white ${event.color}`}>
                <EventIcon className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 rounded-2xl p-5 ml-4 border border-slate-100/50">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">{event.title}</h4>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {event.date ? format(new Date(event.date), 'dd MMM yyyy · HH:mm', { locale: es }) : ''}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-500 mt-2">{event.desc}</p>

                {event.id === 'quote' && activeQuote && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/cotizacion/${activeQuote.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-200 transition-all border border-amber-200/50"
                    >
                      <Zap className="w-3 h-3" /> Ver Propuesta
                    </Link>
                  </div>
                )}

                {event.isMismatch && (
                  <div className="mt-4">
                    <button
                      onClick={onRegenerateQuote}
                      className="inline-flex items-center gap-2 bg-white text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all border border-red-200 shadow-sm"
                    >
                      <Zap className="w-3 h-3" /> Regenerar Cotización con nuevos valores
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
