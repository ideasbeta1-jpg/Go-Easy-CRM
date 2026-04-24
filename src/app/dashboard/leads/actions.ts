'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { executeStageAutomation } from '@/utils/automation-engine'
import { assignLeadToAgent } from '@/utils/assignment'

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
    // Asignar agente primero para que el nombre aparezca en el WhatsApp de bienvenida
    await assignLeadToAgent(newLead.id)
    await executeStageAutomation(newLead.id, 'lead_nuevo')
  }

  revalidatePath('/dashboard/leads')
}

// Valid forward-only transitions to avoid re-triggering automations on backward drags
const VALID_TRANSITIONS: Record<string, string[]> = {
  lead_nuevo:          ['en_cotizacion', 'cerrado'],
  en_cotizacion:       ['reserva_confirmada', 'lead_nuevo', 'cerrado'],
  reserva_confirmada:  ['voucher_enviado', 'cerrado'],
  voucher_enviado:     ['cerrado'],
  cerrado:             [],
}

export async function updateLeadStatus(id: string, status: string) {
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

  const { error } = await supabase
    .from('leads')
    .update({ status })
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
