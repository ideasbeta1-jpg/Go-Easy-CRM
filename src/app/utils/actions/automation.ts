'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { executeStageAutomation } from '@/utils/automation-engine'
import { revalidatePath } from 'next/cache'

export async function getFailedAutomationLogs(limit = 30) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('automation_logs')
    .select('id, lead_id, stage, channel, action, status, error, created_at, leads(first_name, last_name, phone)')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { logs: [], error: error.message }
  return { logs: data || [] }
}

export type AutomationConfigRow = {
  stage: string
  channel: string
  enabled: boolean
}

export async function getAutomationConfig(): Promise<{ config: AutomationConfigRow[]; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('automation_config')
    .select('stage, channel, enabled')
    .order('stage')
    .order('channel')

  if (error) return { config: [], error: error.message }
  return { config: (data || []) as AutomationConfigRow[] }
}

export async function saveAutomationConfig(
  stage: string,
  channel: string,
  enabled: boolean
): Promise<{ ok: boolean; error?: string }> {
  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from('automation_config')
    .upsert({ stage, channel, enabled, updated_at: new Date().toISOString() }, { onConflict: 'stage,channel' })

  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard/automations')
  return { ok: true }
}

export async function retryAutomation(logId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  // Fetch the log to know which lead + stage to retry
  const { data: log, error: logErr } = await supabase
    .from('automation_logs')
    .select('lead_id, stage')
    .eq('id', logId)
    .single()

  if (logErr || !log) return { ok: false, error: 'Log no encontrado' }

  // Mark as retrying
  await adminSupabase
    .from('automation_logs')
    .update({ status: 'retrying', error: null })
    .eq('id', logId)

  try {
    await executeStageAutomation(log.lead_id, log.stage)
    // Mark original log resolved
    await adminSupabase
      .from('automation_logs')
      .update({ status: 'retried_ok' })
      .eq('id', logId)
    return { ok: true }
  } catch (err: any) {
    await adminSupabase
      .from('automation_logs')
      .update({ status: 'failed', error: err?.message || 'Retry fallido' })
      .eq('id', logId)
    return { ok: false, error: err?.message || 'Error en reintento' }
  }
}
