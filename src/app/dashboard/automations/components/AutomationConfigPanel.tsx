'use client'

import { useState, useTransition } from 'react'
import { saveAutomationConfig, type AutomationConfigRow } from '@/app/utils/actions/automation'

const STAGE_LABELS: Record<string, string> = {
  lead_nuevo:         'Lead Nuevo',
  en_cotizacion:      'En Cotización',
  reserva_confirmada: 'Reserva Confirmada',
  voucher_enviado:    'Voucher Enviado',
  cerrado_ganado:     'Cerrado Ganado',
  cerrado_perdido:    'Cerrado Perdido',
}

const CHANNEL_META: Record<string, { label: string; icon: string; color: string }> = {
  whatsapp:       { label: 'WhatsApp',       icon: 'chat',            color: 'text-[#25D366]' },
  email:          { label: 'Email',          icon: 'mail',            color: 'text-indigo-500' },
  n8n:            { label: 'n8n',            icon: 'hub',             color: 'text-orange-500' },
  meta_capi:      { label: 'Meta CAPI',      icon: 'conversion_path', color: 'text-blue-500'   },
  in_app:         { label: 'Notif. interna', icon: 'notifications',   color: 'text-violet-500' },
  agent_whatsapp: { label: 'WA al Agente',   icon: 'support_agent',   color: 'text-emerald-500'},
}

const STAGE_ORDER = [
  'lead_nuevo',
  'en_cotizacion',
  'reserva_confirmada',
  'voucher_enviado',
  'cerrado_ganado',
  'cerrado_perdido',
]

type ConfigMap = Record<string, Record<string, boolean>>

function buildMap(rows: AutomationConfigRow[]): ConfigMap {
  const map: ConfigMap = {}
  for (const row of rows) {
    if (!map[row.stage]) map[row.stage] = {}
    map[row.stage][row.channel] = row.enabled
  }
  return map
}

export function AutomationConfigPanel({ initialConfig }: { initialConfig: AutomationConfigRow[] }) {
  const [config, setConfig] = useState<ConfigMap>(() => buildMap(initialConfig))
  const [saving, setSaving] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const isOn = (stage: string, channel: string): boolean =>
    config[stage]?.[channel] !== false

  const toggle = (stage: string, channel: string) => {
    const next = !isOn(stage, channel)
    const key = `${stage}:${channel}`

    setConfig(prev => ({
      ...prev,
      [stage]: { ...(prev[stage] || {}), [channel]: next }
    }))

    setSaving(key)
    startTransition(async () => {
      await saveAutomationConfig(stage, channel, next)
      setSaving(null)
    })
  }

  // Collect unique channels in display order
  const allChannels = Object.keys(CHANNEL_META).filter(ch =>
    initialConfig.some(r => r.channel === ch)
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="text-left text-xs font-black text-slate-400 uppercase tracking-widest pb-4 pr-6 pl-1 whitespace-nowrap">
              Etapa
            </th>
            {allChannels.map(ch => {
              const meta = CHANNEL_META[ch]
              return (
                <th key={ch} className="pb-4 px-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`material-symbols-outlined text-xl ${meta.color}`}>{meta.icon}</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-tight whitespace-nowrap">
                      {meta.label}
                    </span>
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {STAGE_ORDER.map((stage, i) => {
            const stageChannels = initialConfig.filter(r => r.stage === stage).map(r => r.channel)
            if (stageChannels.length === 0) return null

            return (
              <tr
                key={stage}
                className={`transition-colors ${i % 2 === 0 ? 'bg-slate-50/60' : ''} hover:bg-primary/5 rounded-2xl`}
              >
                <td className="py-3 pr-6 pl-3 rounded-l-2xl whitespace-nowrap">
                  <span className="text-xs font-black text-slate-700">{STAGE_LABELS[stage] || stage}</span>
                </td>
                {allChannels.map(ch => {
                  const hasChannel = stageChannels.includes(ch)
                  const on = isOn(stage, ch)
                  const key = `${stage}:${ch}`
                  const isSaving = saving === key

                  return (
                    <td key={ch} className="py-3 px-3 text-center last:rounded-r-2xl">
                      {hasChannel ? (
                        <button
                          onClick={() => toggle(stage, ch)}
                          disabled={!!saving}
                          title={on ? 'Deshabilitar' : 'Habilitar'}
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-60 ${
                            on ? 'bg-primary' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                              on ? 'translate-x-4' : 'translate-x-0.5'
                            }`}
                          />
                          {isSaving && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <span className="h-2 w-2 animate-spin rounded-full border border-white border-t-transparent" />
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="text-slate-200 text-lg">·</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>

      <p className="mt-6 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
        Los cambios aplican inmediatamente al próximo movimiento en el Kanban
      </p>
    </div>
  )
}
