'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export type AutomationRule = {
  id: string
  name: string
  enabled: boolean
  trigger_type: 'stage_delay' | 'date_field' | 'inactivity'
  trigger_stage: string | null
  trigger_delay_hours: number | null
  trigger_date_field: string | null
  trigger_date_offset_hours: number | null
  action_type: 'whatsapp_template' | 'whatsapp_text' | 'change_stage' | 'notify_agent' | 'create_task'
  action_template: string | null
  action_message: string | null
  action_stage: string | null
  task_payload: any | null
  created_at: string
}

export type PendingAction = {
  id: string
  rule_id: string | null
  lead_id: string
  execute_at: string
  status: string
  action_type: string
  action_payload: any
  error: string | null
  executed_at: string | null
  created_at: string
  automation_rules: { name: string } | null
  leads: { first_name: string; last_name: string; phone: string } | null
}

export async function getAutomationRules(): Promise<{ rules: AutomationRule[]; error?: string }> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('automation_rules')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { rules: [], error: error.message }
  return { rules: (data || []) as AutomationRule[] }
}

export async function createAutomationRule(
  rule: Omit<AutomationRule, 'id' | 'created_at'>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('automation_rules').insert(rule)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard/automations')
  return { ok: true }
}

export async function toggleAutomationRule(
  id: string,
  enabled: boolean
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('automation_rules')
    .update({ enabled })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard/automations')
  return { ok: true }
}

export async function deleteAutomationRule(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('automation_rules').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard/automations')
  return { ok: true }
}

export async function getPendingActions(limit = 30): Promise<{ actions: PendingAction[]; error?: string }> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('pending_actions')
    .select('*, automation_rules(name)')
    .neq('status', 'cancelled')
    .order('execute_at', { ascending: true })
    .limit(limit)

  if (error) return { actions: [], error: error.message }

  // Enriquecer con datos del lead manualmente (lead_id no tiene FK explícita)
  const actions = await Promise.all(
    (data || []).map(async (action: any) => {
      const { data: lead } = await supabase
        .from('leads')
        .select('first_name, last_name, phone')
        .eq('id', action.lead_id)
        .maybeSingle()
      return { ...action, leads: lead || null }
    })
  )

  return { actions: actions as PendingAction[] }
}

export async function cancelPendingAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('pending_actions')
    .update({ status: 'cancelled' })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard/automations')
  return { ok: true }
}
