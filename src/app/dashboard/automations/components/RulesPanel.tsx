'use client'

import { useState, useTransition } from 'react'
import {
  createAutomationRule, toggleAutomationRule, deleteAutomationRule,
  type AutomationRule,
} from '@/app/utils/actions/automation-rules'

const STAGE_LABELS: Record<string, string> = {
  lead_nuevo: 'Lead Nuevo', en_cotizacion: 'En Cotización',
  reserva_confirmada: 'Reserva Confirmada', voucher_enviado: 'Voucher Enviado',
  cerrado_ganado: 'Cerrado Ganado', cerrado_perdido: 'Cerrado Perdido',
}

const STAGES = Object.keys(STAGE_LABELS)

const TRIGGER_LABELS: Record<string, string> = {
  stage_delay: 'Delay tras etapa',
  date_field: 'Fecha del lead',
  inactivity: 'Inactividad en etapa',
}

const ACTION_LABELS: Record<string, string> = {
  whatsapp_template: 'WhatsApp — Plantilla',
  whatsapp_text: 'WhatsApp — Texto libre',
  change_stage: 'Cambiar etapa',
  notify_agent: 'Notificar al agente',
}

const TRIGGER_COLOR: Record<string, string> = {
  stage_delay: 'bg-indigo-50 text-indigo-600',
  date_field: 'bg-amber-50 text-amber-600',
  inactivity: 'bg-rose-50 text-rose-500',
}

const ACTION_COLOR: Record<string, string> = {
  whatsapp_template: 'bg-[#25D366]/10 text-[#25D366]',
  whatsapp_text: 'bg-[#25D366]/10 text-[#25D366]',
  change_stage: 'bg-violet-50 text-violet-600',
  notify_agent: 'bg-blue-50 text-blue-600',
}

function describeTrigger(rule: AutomationRule): string {
  if (rule.trigger_type === 'stage_delay') {
    const h = rule.trigger_delay_hours || 1
    return `${h}h después de → ${STAGE_LABELS[rule.trigger_stage || ''] || rule.trigger_stage}`
  }
  if (rule.trigger_type === 'date_field') {
    const field = rule.trigger_date_field === 'pickup_date' ? 'Recogida' : 'Devolución'
    const offset = rule.trigger_date_offset_hours ?? -24
    const abs = Math.abs(offset)
    const dir = offset < 0 ? 'antes de' : 'después de'
    return `${abs}h ${dir} fecha de ${field}`
  }
  if (rule.trigger_type === 'inactivity') {
    const h = rule.trigger_delay_hours || 24
    return `${h}h sin moverse en → ${STAGE_LABELS[rule.trigger_stage || ''] || rule.trigger_stage}`
  }
  return '—'
}

function describeAction(rule: AutomationRule): string {
  if (rule.action_type === 'whatsapp_template') return `Plantilla: ${rule.action_template || '—'}`
  if (rule.action_type === 'whatsapp_text') return rule.action_message?.slice(0, 40) + (rule.action_message && rule.action_message.length > 40 ? '…' : '') || '—'
  if (rule.action_type === 'change_stage') return `→ ${STAGE_LABELS[rule.action_stage || ''] || rule.action_stage}`
  if (rule.action_type === 'notify_agent') return rule.action_message?.slice(0, 40) + '…' || '—'
  return '—'
}

type FormState = {
  name: string
  trigger_type: 'stage_delay' | 'date_field' | 'inactivity'
  trigger_stage: string
  trigger_delay_hours: string
  trigger_date_field: string
  trigger_date_offset_hours: string
  action_type: 'whatsapp_template' | 'whatsapp_text' | 'change_stage' | 'notify_agent'
  action_template: string
  action_message: string
  action_stage: string
}

const DEFAULT_FORM: FormState = {
  name: '',
  trigger_type: 'stage_delay',
  trigger_stage: 'lead_nuevo',
  trigger_delay_hours: '2',
  trigger_date_field: 'pickup_date',
  trigger_date_offset_hours: '-24',
  action_type: 'whatsapp_text',
  action_template: '',
  action_message: '',
  action_stage: 'en_cotizacion',
}

export function RulesPanel({ initialRules }: { initialRules: AutomationRule[] }) {
  const [rules, setRules] = useState(initialRules)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [formError, setFormError] = useState('')
  const [, startTransition] = useTransition()

  const setField = (key: keyof FormState, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleToggle = (id: string, current: boolean) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !current } : r))
    startTransition(async () => { await toggleAutomationRule(id, !current) })
  }

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar esta regla?')) return
    setRules(prev => prev.filter(r => r.id !== id))
    startTransition(async () => { await deleteAutomationRule(id) })
  }

  const handleSubmit = async () => {
    setFormError('')
    if (!form.name.trim()) { setFormError('El nombre es obligatorio'); return }

    const rule: Omit<AutomationRule, 'id' | 'created_at'> = {
      name: form.name.trim(),
      enabled: true,
      trigger_type: form.trigger_type,
      trigger_stage: ['stage_delay', 'inactivity'].includes(form.trigger_type) ? form.trigger_stage : null,
      trigger_delay_hours: ['stage_delay', 'inactivity'].includes(form.trigger_type) ? parseInt(form.trigger_delay_hours) || 1 : null,
      trigger_date_field: form.trigger_type === 'date_field' ? form.trigger_date_field : null,
      trigger_date_offset_hours: form.trigger_type === 'date_field' ? parseInt(form.trigger_date_offset_hours) || -24 : null,
      action_type: form.action_type,
      action_template: form.action_type === 'whatsapp_template' ? form.action_template : null,
      action_message: ['whatsapp_text', 'notify_agent'].includes(form.action_type) ? form.action_message : null,
      action_stage: form.action_type === 'change_stage' ? form.action_stage : null,
    }

    const result = await createAutomationRule(rule)
    if (!result.ok) { setFormError(result.error || 'Error al guardar'); return }

    setShowForm(false)
    setForm(DEFAULT_FORM)
    // Refetch optimista — simplemente recarga la página
    window.location.reload()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Lista de reglas */}
      {rules.length === 0 && !showForm && (
        <div className="py-16 flex flex-col items-center justify-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
          <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">bolt</span>
          <p className="text-slate-400 font-bold text-sm italic">No hay reglas configuradas</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {rules.map(rule => (
          <div
            key={rule.id}
            className={`flex items-center gap-4 p-5 rounded-2xl border transition-all ${rule.enabled ? 'bg-white border-slate-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}
          >
            {/* Toggle */}
            <button
              onClick={() => handleToggle(rule.id, rule.enabled)}
              className={`relative shrink-0 inline-flex h-5 w-9 items-center rounded-full transition-colors ${rule.enabled ? 'bg-primary' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${rule.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-800 truncate">{rule.name}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${TRIGGER_COLOR[rule.trigger_type] || 'bg-slate-100 text-slate-500'}`}>
                  {TRIGGER_LABELS[rule.trigger_type]} · {describeTrigger(rule)}
                </span>
                <span className="text-slate-300 text-xs">→</span>
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${ACTION_COLOR[rule.action_type] || 'bg-slate-100 text-slate-500'}`}>
                  {ACTION_LABELS[rule.action_type]} · {describeAction(rule)}
                </span>
              </div>
            </div>

            {/* Delete */}
            <button
              onClick={() => handleDelete(rule.id)}
              className="shrink-0 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        ))}
      </div>

      {/* Botón nueva regla */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-primary/30 text-primary text-xs font-black uppercase tracking-widest hover:border-primary hover:bg-primary/5 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nueva Regla
        </button>
      )}

      {/* Formulario inline */}
      {showForm && (
        <div className="bg-slate-50 rounded-[2rem] border border-slate-200 p-8 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900">Nueva regla de automatización</h3>
            <button onClick={() => { setShowForm(false); setFormError('') }} className="text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Nombre */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nombre</label>
            <input
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="Ej: Recordatorio 24h antes de recogida"
              className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
            />
          </div>

          {/* Trigger type */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">¿Cuándo se activa?</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(TRIGGER_LABELS) as [FormState['trigger_type'], string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setField('trigger_type', val)}
                  className={`text-xs font-bold px-3 py-2.5 rounded-xl border transition-all text-left ${form.trigger_type === val ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-600 hover:border-primary/40'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Trigger fields */}
          {(form.trigger_type === 'stage_delay' || form.trigger_type === 'inactivity') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                  {form.trigger_type === 'inactivity' ? 'Sin moverse en etapa' : 'Después de llegar a'}
                </label>
                <select
                  value={form.trigger_stage}
                  onChange={e => setField('trigger_stage', e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                >
                  {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Horas</label>
                <input
                  type="number"
                  min="1"
                  value={form.trigger_delay_hours}
                  onChange={e => setField('trigger_delay_hours', e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                />
              </div>
            </div>
          )}

          {form.trigger_type === 'date_field' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Fecha de referencia</label>
                <select
                  value={form.trigger_date_field}
                  onChange={e => setField('trigger_date_field', e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                >
                  <option value="pickup_date">Fecha de Recogida</option>
                  <option value="return_date">Fecha de Devolución</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Horas (negativo = antes)</label>
                <input
                  type="number"
                  value={form.trigger_date_offset_hours}
                  onChange={e => setField('trigger_date_offset_hours', e.target.value)}
                  placeholder="-24"
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                />
              </div>
            </div>
          )}

          {/* Action type */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">¿Qué hace?</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(ACTION_LABELS) as [FormState['action_type'], string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setField('action_type', val)}
                  className={`text-xs font-bold px-3 py-2.5 rounded-xl border transition-all text-left ${form.action_type === val ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-600 hover:border-primary/40'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Action fields */}
          {form.action_type === 'whatsapp_template' && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nombre de la plantilla</label>
              <input
                value={form.action_template}
                onChange={e => setField('action_template', e.target.value)}
                placeholder="Ej: recordatorio_recogida"
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              />
            </div>
          )}

          {(form.action_type === 'whatsapp_text' || form.action_type === 'notify_agent') && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Mensaje</label>
              <p className="text-[10px] text-slate-400 mb-2">Variables: {'{{first_name}} {{pickup_date}} {{return_date}} {{pickup_location}} {{total_amount}}'}</p>
              <textarea
                value={form.action_message}
                onChange={e => setField('action_message', e.target.value)}
                rows={3}
                placeholder="Ej: Hola {{first_name}}, te recordamos que tu recogida es el {{pickup_date}}."
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white resize-none"
              />
            </div>
          )}

          {form.action_type === 'change_stage' && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Etapa destino</label>
              <select
                value={form.action_stage}
                onChange={e => setField('action_stage', e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              >
                {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select>
            </div>
          )}

          {formError && <p className="text-xs text-rose-500 font-bold">{formError}</p>}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setShowForm(false); setFormError('') }}
              className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-colors"
            >
              Guardar Regla
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
