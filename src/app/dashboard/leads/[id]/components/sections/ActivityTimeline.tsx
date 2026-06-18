'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Zap, AlertCircle, ExternalLink } from 'lucide-react'

interface TimelineEvent {
  id: string
  title: string
  date: string
  icon: React.ElementType
  color: string
  desc: string
  isMismatch?: boolean
  quoteId?: string
  actor?: string
  href?: string
  linkLabel?: string
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
          const isQuoteEvent = event.id.startsWith('quote-') && event.quoteId
          const isActiveQuoteEvent = isQuoteEvent && activeQuote && event.quoteId === activeQuote.id

          return (
            <div key={event.id} className="relative">
              <div className={`absolute -left-[41px] -top-1 w-10 h-10 rounded-full flex items-center justify-center ring-8 ring-white ${event.color}`}>
                <EventIcon className="w-4 h-4" />
              </div>
              <div className={`rounded-2xl p-5 ml-4 border ${event.isMismatch ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100/50'}`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">{event.title}</h4>
                    {isActiveQuoteEvent && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest rounded-full border border-amber-200">
                        Activa
                      </span>
                    )}
                    {isQuoteEvent && !isActiveQuoteEvent && event.id !== 'quote-mismatch' && (
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-full">
                        Invalidada
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                    {event.date ? format(new Date(event.date), 'dd MMM yyyy · HH:mm', { locale: es }) : ''}
                  </span>
                </div>
                <p className={`text-xs font-bold mt-2 ${event.isMismatch ? 'text-red-600' : 'text-slate-500'}`}>{event.desc}</p>

                {event.actor && (
                  <p className="text-[10px] font-bold text-slate-400 mt-1.5">por {event.actor}</p>
                )}

                {/* Link button for any quote event that has a quoteId */}
                {isQuoteEvent && event.quoteId && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/cotizacion/${event.quoteId}`}
                      target="_blank"
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                        isActiveQuoteEvent
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200/50'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-200/50'
                      }`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {isActiveQuoteEvent ? 'Ver Propuesta Activa' : 'Ver Enlace (Invalidado)'}
                    </Link>
                  </div>
                )}

                {/* Enlace genérico (vouchers u otros eventos con href) */}
                {!isQuoteEvent && event.href && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={event.href}
                      target="_blank"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-100"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {event.linkLabel || 'Ver'}
                    </Link>
                  </div>
                )}

                {event.isMismatch && (
                  <div className="mt-4">
                    <button
                      onClick={onRegenerateQuote}
                      className="inline-flex items-center gap-2 bg-white text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all border border-red-200 shadow-sm"
                    >
                      <Zap className="w-3 h-3" /> Regenerar con precio actualizado
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
