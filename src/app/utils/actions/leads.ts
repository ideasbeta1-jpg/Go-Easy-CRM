'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { logLeadEvent, LEAD_EVENT, TRACKED_LEAD_FIELDS } from '@/lib/leads/events'

export async function updateLead(id: string, updates: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Snapshot previo de los campos auditables presentes en `updates`, para
  // poder registrar qué cambió (sin sobreescribir el historial).
  const auditKeys = ['status', 'assigned_to', ...Object.keys(TRACKED_LEAD_FIELDS)]
    .filter(k => k in updates)
  const { data: prev } = auditKeys.length
    ? await supabase.from('leads').select(auditKeys.join(',')).eq('id', id).single()
    : { data: null }

  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) throw new Error(error.message)

  if (data?.length === 0) {
    throw new Error('No se actualizó ningún registro. Verifica permisos o el ID del lead.')
  }

  await logLeadFieldChanges(supabase, id, user.id, prev, updates)

  revalidatePath(`/dashboard/leads/${id}`)
  revalidatePath('/dashboard/leads')
}

// Compara el snapshot previo con los `updates` aplicados y registra un evento
// por cada cambio relevante: etapa, reasignación de agente y datos clave.
async function logLeadFieldChanges(supabase: any, leadId: string, actorId: string, prev: any, updates: any) {
  if (!prev) return
  const changed = (key: string) => key in updates && String(prev[key] ?? '') !== String(updates[key] ?? '')

  if (changed('status')) {
    await logLeadEvent(supabase, {
      leadId, type: LEAD_EVENT.STAGE_CHANGE, actorId,
      fromStatus: prev.status, toStatus: updates.status,
    })
  }

  if (changed('assigned_to')) {
    await logLeadEvent(supabase, {
      leadId, type: LEAD_EVENT.AGENT_ASSIGNED, actorId,
      metadata: { from_agent: prev.assigned_to ?? null, to_agent: updates.assigned_to ?? null },
    })
  }

  for (const field of Object.keys(TRACKED_LEAD_FIELDS)) {
    if (changed(field)) {
      await logLeadEvent(supabase, {
        leadId, type: LEAD_EVENT.FIELD_CHANGED, actorId,
        metadata: { field, label: TRACKED_LEAD_FIELDS[field], old_value: prev[field] ?? null, new_value: updates[field] ?? null },
      })
    }
  }
}

export async function updateLeadStatus(id: string, status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: prev } = await supabase.from('leads').select('status').eq('id', id).single()

  const { error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(error.message)

  if (prev && prev.status !== status) {
    await logLeadEvent(supabase, {
      leadId: id, type: LEAD_EVENT.STAGE_CHANGE, actorId: user.id,
      fromStatus: prev.status, toStatus: status,
    })
  }

  revalidatePath(`/dashboard/leads/${id}`)
  revalidatePath('/dashboard/leads')
}

export async function deleteLead(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('leads')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/leads')
}
