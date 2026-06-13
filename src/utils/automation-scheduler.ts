import { createAdminClient } from './supabase/admin'

/**
 * Programa pending_actions para reglas de tipo stage_delay al cambiar de etapa.
 * Cancela primero las acciones pendientes anteriores del lead.
 */
export async function scheduleRulesForStage(leadId: string, stage: string) {
  const supabase = createAdminClient()

  // Cancelar acciones pendientes previas de este lead
  await supabase
    .from('pending_actions')
    .update({ status: 'cancelled' })
    .eq('lead_id', leadId)
    .eq('status', 'pending')

  // Buscar reglas de delay que apliquen a esta etapa
  const { data: rules } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('trigger_type', 'stage_delay')
    .eq('trigger_stage', stage)
    .eq('enabled', true)

  if (!rules || rules.length === 0) return

  const now = new Date()
  const actions = rules.map((rule: any) => ({
    rule_id: rule.id,
    lead_id: leadId,
    execute_at: new Date(now.getTime() + (rule.trigger_delay_hours || 1) * 3600 * 1000).toISOString(),
    status: 'pending',
    action_type: rule.action_type,
    action_payload: {
      action_template: rule.action_template,
      action_message: rule.action_message,
      action_stage: rule.action_stage,
      task_payload: rule.task_payload || null,
    },
  }))

  await supabase.from('pending_actions').insert(actions)
}

/**
 * Programa pending_actions para reglas de tipo date_field al crear/actualizar un lead.
 */
export async function scheduleDateRulesForLead(leadId: string) {
  const supabase = createAdminClient()

  const { data: lead } = await supabase
    .from('leads')
    .select('pickup_date, return_date')
    .eq('id', leadId)
    .single()

  if (!lead) return

  const { data: rules } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('trigger_type', 'date_field')
    .eq('enabled', true)

  if (!rules || rules.length === 0) return

  const now = new Date()
  const toInsert: any[] = []

  for (const rule of rules) {
    const fieldValue = rule.trigger_date_field === 'pickup_date' ? lead.pickup_date : lead.return_date
    if (!fieldValue) continue

    const baseDate = new Date(fieldValue)
    const offsetMs = (rule.trigger_date_offset_hours || -24) * 3600 * 1000
    const executeAt = new Date(baseDate.getTime() + offsetMs)

    if (executeAt <= now) continue

    // No duplicar si ya existe una acción pendiente para este lead + regla
    const { data: existing } = await supabase
      .from('pending_actions')
      .select('id')
      .eq('rule_id', rule.id)
      .eq('lead_id', leadId)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) continue

    toInsert.push({
      rule_id: rule.id,
      lead_id: leadId,
      execute_at: executeAt.toISOString(),
      status: 'pending',
      action_type: rule.action_type,
      action_payload: {
        action_template: rule.action_template,
        action_message: rule.action_message,
        action_stage: rule.action_stage,
      },
    })
  }

  if (toInsert.length > 0) {
    await supabase.from('pending_actions').insert(toInsert)
  }
}

/**
 * Interpola variables de lead en un mensaje de texto.
 */
export function interpolateMessage(template: string, lead: any): string {
  return template
    .replace(/\{\{first_name\}\}/g, lead.first_name || 'Cliente')
    .replace(/\{\{last_name\}\}/g, lead.last_name || '')
    .replace(/\{\{pickup_date\}\}/g, lead.pickup_date ? new Date(lead.pickup_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : '—')
    .replace(/\{\{return_date\}\}/g, lead.return_date ? new Date(lead.return_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : '—')
    .replace(/\{\{pickup_location\}\}/g, lead.pickup_location || '—')
    .replace(/\{\{total_amount\}\}/g, lead.total_amount ? `$${lead.total_amount}` : '—')
    .replace(/\{\{agent_name\}\}/g, lead.assigned_agent?.first_name || 'Tu Asesor')
}
