'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { assignLeadToAgent } from '@/utils/assignment'
import { executeStageAutomation } from '@/utils/automation-engine'

export async function submitPublicLead(formData: FormData) {
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
    category_id: formData.get('category_id') as string,
    status: 'lead_nuevo'
  }

  const { data: lead, error } = await supabase
    .from('leads')
    .insert(data)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // Trigger assignment and stage automation
  if (lead?.id) {
    const assignedAgent = await assignLeadToAgent(lead.id)
    await executeStageAutomation(lead.id, 'lead_nuevo', assignedAgent ? { assigned_agent: assignedAgent } : {})
  }

  // Success: Redirect to a "thank you" or back with a partial success message
  redirect('/cotizar?success=true')
}
