'use client'

import { useState, useEffect, useCallback } from 'react'
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Play, Pause, Loader2 } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface CallLog {
  id: string
  zadarma_call_id: string
  direction: 'inbound' | 'outbound'
  status: 'initiated' | 'answered' | 'missed' | 'failed' | 'ended'
  duration: number
  recording_url: string | null
  caller_number: string
  called_number: string
  started_at: string | null
  ended_at: string | null
  profiles: {
    id: string
    first_name: string
    last_name: string
    avatar_url: string | null
  } | null
}

interface CallLogPanelProps {
  leadId: string
  leadPhone: string
  agentId: string
  agentSip: string | null
}

function formatDuration(seconds: number): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function CallDirectionIcon({ direction, status }: { direction: string; status: string }) {
  if (status === 'missed' || status === 'failed') {
    return <PhoneMissed className="w-3.5 h-3.5 text-rose-500" />
  }
  if (direction === 'inbound') {
    return <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500" />
  }
  return <PhoneOutgoing className="w-3.5 h-3.5 text-blue-500" />
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    answered: { label: 'Contestada', className: 'bg-emerald-50 text-emerald-700' },
    missed: { label: 'Perdida', className: 'bg-rose-50 text-rose-700' },
    failed: { label: 'Fallida', className: 'bg-slate-100 text-slate-500' },
    initiated: { label: 'Iniciada', className: 'bg-blue-50 text-blue-600' },
    ended: { label: 'Terminada', className: 'bg-slate-50 text-slate-600' },
  }
  const config = configs[status] || { label: status, className: 'bg-slate-50 text-slate-500' }
  return (
    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${config.className}`}>
      {config.label}
    </span>
  )
}

function AudioPlayer({ url }: { url: string }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [audio] = useState(() => new Audio(url))

  useEffect(() => {
    audio.onended = () => setIsPlaying(false)
    return () => { audio.pause(); audio.src = '' }
  }, [audio])

  const toggle = () => {
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-violet-50 text-violet-600 hover:bg-violet-100 px-2.5 py-1 rounded-full transition-colors"
    >
      {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      {isPlaying ? 'Pausar' : 'Escuchar'}
    </button>
  )
}

export default function CallLogPanel({ leadId, leadPhone }: CallLogPanelProps) {
  const [calls, setCalls] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCalls = useCallback(async () => {
    try {
      const res = await fetch(`/api/zadarma/calls?leadId=${leadId}`)
      const data = await res.json()
      setCalls(data.calls || [])
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    fetchCalls()
    const interval = setInterval(fetchCalls, 30_000)
    return () => clearInterval(interval)
  }, [fetchCalls])

  return (
    <div id="call-log-panel" className="bg-white border border-slate-100 rounded-[2rem] lg:rounded-[3.5rem] p-6 lg:p-10 shadow-[0_15px_40px_rgba(0,0,0,0.02)] scroll-mt-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center">
            <Phone className="w-4 h-4" />
          </div>
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Llamadas · Zadarma</h4>
        </div>

        {leadPhone ? (
          <a
            href={`tel:${leadPhone}`}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-violet-600/20 hover:scale-105 active:scale-95"
          >
            <Phone className="w-3.5 h-3.5" />
            Llamar
          </a>
        ) : (
          <span className="flex items-center gap-2 bg-slate-100 text-slate-400 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest cursor-not-allowed">
            <Phone className="w-3.5 h-3.5" />
            Sin teléfono
          </span>
        )}
      </div>

      {/* Call List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center opacity-30">
            <Phone size={40} className="mb-3 text-slate-200" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sin llamadas registradas</p>
          </div>
        ) : (
          calls.map((call) => (
            <div key={call.id} className="bg-slate-50/60 hover:bg-slate-50 rounded-2xl p-4 border border-slate-100/60 transition-colors">
              <div className="flex items-start justify-between gap-3">
                {/* Icon + Info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <CallDirectionIcon direction={call.direction} status={call.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <StatusBadge status={call.status} />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        {call.direction === 'inbound' ? 'Entrante' : 'Saliente'}
                      </span>
                      {call.duration > 0 && (
                        <span className="text-[9px] font-bold text-slate-500">
                          · {formatDuration(call.duration)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-700 truncate">
                      {call.direction === 'inbound' ? call.caller_number : call.called_number}
                    </p>
                    {call.profiles && (
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                        Agente: {call.profiles.first_name} {call.profiles.last_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: time + recording */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {call.started_at && (
                    <span className="text-[9px] font-bold text-slate-400">
                      {formatDistanceToNow(new Date(call.started_at), { locale: es, addSuffix: true })}
                    </span>
                  )}
                  {call.recording_url && (
                    <AudioPlayer url={call.recording_url} />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
