import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendWABATextMessage } from '@/utils/waba'
import { sendTemplateMessageWithError } from '@/utils/waba'
import { interpolateMessage } from '@/utils/automation-scheduler'
import { broadcastNotification } from '@/app/utils/actions/notifications'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const results: any[] = []

  // ── 1. Procesar pending_actions con fecha vencida ──────────────────────────
  const { data: due } = await supabase
    .from('pending_actions')
    .select('*')
    .eq('status', 'pending')
    .lte('execute_at', new Date().toISOString())
    .limit(50)

  for (const action of due || []) {
    await supabase.from('pending_actions').update({ status: 'processing' }).eq('id', action.id)

    try {
      const result = await executeAction(action, supabase)
      await supabase.from('pending_actions').update({
        status: 'done',
        executed_at: new Date().toISOString(),
      }).eq('id', action.id)
      results.push({ id: action.id, ok: true, ...result })
    } catch (err: any) {
      await supabase.from('pending_actions').update({
        status: 'failed',
        error: err.message,
        executed_at: new Date().toISOString(),
      }).eq('id', action.id)
      results.push({ id: action.id, ok: false, error: err.message })
    }
  }

  // ── 2. Procesar reglas de inactividad ──────────────────────────────────────
  const { data: inactivityRules } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('trigger_type', 'inactivity')
    .eq('enabled', true)

  for (const rule of inactivityRules || []) {
    const threshold = new Date(Date.now() - (rule.trigger_delay_hours || 24) * 3600 * 1000).toISOString()

    const { data: staleLeads } = await supabase
      .from('leads')
      .select('id')
      .eq('status', rule.trigger_stage)
      .lte('status_changed_at', threshold)
      .is('deleted_at', null)
      .limit(20)

    for (const lead of staleLeads || []) {
      // Evitar re-ejecutar si ya fue procesado en las últimas 24h
      const { data: recent } = await supabase
        .from('pending_actions')
        .select('id')
        .eq('rule_id', rule.id)
        .eq('lead_id', lead.id)
        .eq('status', 'done')
        .gte('executed_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
        .maybeSingle()

      if (recent) continue

      const fakeAction = {
        id: `inactivity_${rule.id}_${lead.id}`,
        rule_id: rule.id,
        lead_id: lead.id,
        action_type: rule.action_type,
        action_payload: {
          action_template: rule.action_template,
          action_message: rule.action_message,
          action_stage: rule.action_stage,
        },
      }

      try {
        await executeAction(fakeAction, supabase)
        // Registrar como done
        await supabase.from('pending_actions').insert({
          rule_id: rule.id,
          lead_id: lead.id,
          execute_at: new Date().toISOString(),
          status: 'done',
          action_type: rule.action_type,
          action_payload: fakeAction.action_payload,
          executed_at: new Date().toISOString(),
        })
        results.push({ rule: rule.name, lead_id: lead.id, ok: true })
      } catch (err: any) {
        results.push({ rule: rule.name, lead_id: lead.id, ok: false, error: err.message })
      }
    }
  }

  return NextResponse.json({ processed: results.length, results })
}

async function executeAction(action: any, supabase: any) {
  const payload = action.action_payload || {}

  // Obtener datos del lead
  const { data: lead } = await supabase
    .from('leads')
    .select('*, assigned_to_profile:profiles(first_name, last_name, phone)')
    .eq('id', action.lead_id)
    .single()

  if (!lead) throw new Error(`Lead ${action.lead_id} no encontrado`)

  lead.assigned_agent = lead.assigned_to_profile

  switch (action.action_type) {
    case 'whatsapp_template': {
      if (!lead.phone) throw new Error('Lead sin teléfono')
      const template = payload.action_template
      if (!template) throw new Error('Template no especificado')
      const result = await sendTemplateMessageWithError(lead.phone, template, 'es_CO', [
        { type: 'body', parameters: [{ type: 'text', text: lead.first_name || 'Cliente' }] }
      ])
      if (!result.ok) throw new Error(result.error || 'Error enviando template')
      await supabase.from('messages').insert({
        lead_id: action.lead_id,
        content: `📄 [Regla automática — Plantilla: ${template}]`,
        direction: 'outbound',
      })
      return { type: 'whatsapp_template', template }
    }

    case 'whatsapp_text': {
      if (!lead.phone) throw new Error('Lead sin teléfono')
      const raw = payload.action_message || ''
      const text = interpolateMessage(raw, lead)
      await sendWABATextMessage(lead.phone, text)
      await supabase.from('messages').insert({
        lead_id: action.lead_id,
        content: text,
        direction: 'outbound',
      })
      return { type: 'whatsapp_text' }
    }

    case 'change_stage': {
      const targetStage = payload.action_stage
      if (!targetStage) throw new Error('Etapa destino no especificada')
      await supabase
        .from('leads')
        .update({ status: targetStage, status_changed_at: new Date().toISOString() })
        .eq('id', action.lead_id)
      return { type: 'change_stage', stage: targetStage }
    }

    case 'notify_agent': {
      const raw = payload.action_message || 'Hay una actualización en un lead.'
      const text = interpolateMessage(raw, lead)
      await broadcastNotification(
        {
          type: 'automation',
          title: '⚡ Automatización',
          body: text,
          link: `/dashboard/leads/${action.lead_id}`,
          lead_id: action.lead_id,
        },
        lead.assigned_to || null
      )
      return { type: 'notify_agent' }
    }

    default:
      throw new Error(`Tipo de acción desconocido: ${action.action_type}`)
  }
}
