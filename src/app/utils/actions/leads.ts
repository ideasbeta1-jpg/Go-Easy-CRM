'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateLead(id: string, updates: any) {
  const supabase = await createClient()

  console.log('--- updateLead process start ---')
  console.log('ID:', id)
  console.log('Payload:', JSON.stringify(updates, null, 2))

  const { data, error, status, statusText } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error updating lead (Supabase Error):', error)
    console.error('Status:', status, statusText)
    throw new Error(error.message)
  }

  console.log('Supabase Update response rows:', data?.length)
  if (data?.length === 0) {
    console.warn('Warning: No rows were updated. Potential RLS block or invalid ID.')
  }
  console.log('--- updateLead process end ---')

  revalidatePath(`/dashboard/leads/${id}`)
  revalidatePath('/dashboard/leads')
}

export async function updateLeadStatus(id: string, status: string) {
    const supabase = await createClient()
  
    const { error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', id)
  
    if (error) throw new Error(error.message)
  
    revalidatePath(`/dashboard/leads/${id}`)
    revalidatePath('/dashboard/leads')
}
