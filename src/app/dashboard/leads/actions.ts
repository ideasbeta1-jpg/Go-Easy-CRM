'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { executeStageAutomation } from '@/utils/automation-engine'

export async function createLead(formData: FormData) {
  const supabase = await createClient()

  const data = {
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    phone: formData.get('phone') as string,
    email: formData.get('email') as string,
    pickup_date: formData.get('pickup_date') as string,
    return_date: formData.get('return_date') as string,
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
