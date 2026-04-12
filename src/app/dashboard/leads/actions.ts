'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { executeStageAutomation } from '@/utils/automation-engine'

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

  // Trigger automation (this will create the in-app notification)
  if (newLead) {
    await executeStageAutomation(newLead.id, 'lead_nuevo')
  }

  revalidatePath('/dashboard/leads')
}

export async function updateLeadStatus(id: string, status: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  // Trigger automation
  await executeStageAutomation(id, status)

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
