'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { executeStageAutomation } from '@/utils/automation-engine'
import { assignLeadToAgent } from '@/utils/assignment'
import { VALID_TRANSITIONS } from '@/lib/leads/transitions'
import { scheduleDateRulesForLead } from '@/utils/automation-scheduler'

export async function createLead(formData: FormData) {
  const supabase = await createClient()

  const pickupDate = formData.get('pickup_date') as string
  const pickupTime = formData.get('pickup_time') as string
  const returnDate = formData.get('return_date') as string
  const returnTime = formData.get('return_time') as string

  const data = {
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    phone: formData.get('phone') as string,
    email: formData.get('email') as string,
    pickup_date: pickupDate && pickupTime ? `${pickupDate}T${pickupTime}` : pickupDate,
    return_date: returnDate && returnTime ? `${returnDate}T${returnTime}` : returnDate,
    pickup_location: formData.get('pickup_location') as string,
    return_location: formData.get('return_location') as string,
    category_id: formData.get('category_id') as string || null,
    total_amount: parseFloat(formData.get('total_amount') as string || '0'),
    status: 'lead_nuevo'
  }

  const { data: newLead, error } = await supabase.from('leads').insert(data).select('id').single()

  if (error) {
    throw new Error(error.message)
  }

  if (newLead) {
    // Asignar agente primero y pasar sus datos al motor para que el WhatsApp use el nombre real
    const assignedAgent = await assignLeadToAgent(newLead.id)
    await executeStageAutomation(newLead.id, 'lead_nuevo', assignedAgent ? { assigned_agent: assignedAgent } : {})
    // Programar reglas de fecha (pickup_date, return_date) — fire-and-forget
    scheduleDateRulesForLead(newLead.id).catch(err =>
      console.error('[leads/actions] Error scheduling date rules:', err)
    )
  }

  revalidatePath('/dashboard/leads')
}


export async function updateLeadStatus(id: string, status: string, lostReason?: string) {
  const supabase = await createClient()

  // Fetch current status to check if transition is valid
  const { data: current, error: fetchError } = await supabase
    .from('leads')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError || !current) {
    throw new Error(fetchError?.message || 'Lead no encontrado')
  }

  // Skip update + automation if status didn't change
  if (current.status === status) return

  const updateData: Record<string, any> = {
    status,
    status_changed_at: new Date().toISOString(),
  }

  if (status === 'cerrado_perdido' && lostReason) {
    updateData.lost_reason = lostReason
  }

  const { error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  // Only fire automation for allowed transitions to prevent accidental re-triggers
  const allowedNext = VALID_TRANSITIONS[current.status] ?? []
  if (allowedNext.includes(status)) {
    await executeStageAutomation(id, status)
  }

  revalidatePath('/dashboard/leads')
}

// En un módulo 'use server' solo se pueden exportar funciones async, por eso
// esta constante es local (no exportada).
const TERMINAL_PAGE_SIZE = 30

/**
 * Carga incremental de leads de una etapa (pensado para las columnas cerradas,
 * que crecen sin límite). Devuelve los leads ya enriquecidos con su agente,
 * con el mismo shape que usa el Kanban.
 */
export async function loadMoreLeads(status: string, offset: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { leads: [] as any[] }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = !profile || profile.role === 'admin'

  let query = supabase
    .from('leads')
    .select(`*, category:categories(name, image_url, daily_price)`)
    .is('deleted_at', null)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(offset, offset + TERMINAL_PAGE_SIZE - 1)

  if (!isAdmin) query = query.eq('assigned_to', user.id)

  const { data: leads, error } = await query
  if (error) throw new Error(error.message)

  const assignedToIds = Array.from(new Set((leads || []).map(l => l.assigned_to).filter(Boolean)))
  let profiles: any[] = []
  if (assignedToIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, first_name, last_name, avatar_url')
      .in('id', assignedToIds as string[])
    profiles = data || []
  }
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))

  const processed = (leads || []).map(l => {
    const p = profileMap[l.assigned_to]
    return {
      ...l,
      assigned_to_profile: p
        ? { ...p, full_name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Agente' }
        : null,
    }
  })

  return { leads: processed }
}

export async function searchCustomerByContact(query: string) {
  if (!query || query.length < 3) return null

  const supabase = await createClient()

  // Search by exact match for phone or email
  const { data, error } = await supabase
    .from('leads')
    .select('first_name, last_name, email, phone')
    .or(`email.eq.${query},phone.eq.${query}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data
}

export async function deleteLead(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leads')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/leads')
}

export async function restoreLead(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leads')
    .update({ deleted_at: null })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/leads')
}
