'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { assignLeadWithContact } from '@/utils/assignment'
import { executeStageAutomation } from '@/utils/automation-engine'
import { findOrCreateContact } from '@/lib/contacts/findOrCreate'

export async function submitPublicLead(formData: FormData) {
  // Honeypot: bots fill hidden fields, humans don't
  const honeypot = formData.get('website') as string
  if (honeypot) redirect('/cotizar')

  const phone = (formData.get('phone') as string)?.trim()
  if (!phone) throw new Error('Teléfono requerido')

  // Rate limit: max 1 submission per phone every 5 minutes
  const adminSupabase = createAdminClient()
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: recentLead } = await adminSupabase
    .from('leads')
    .select('id')
    .eq('phone', phone)
    .gte('created_at', fiveMinutesAgo)
    .limit(1)
    .maybeSingle()

  if (recentLead) redirect('/cotizar?success=true')

  const supabase = await createClient()

  const first_name = formData.get('first_name') as string
  const last_name = formData.get('last_name') as string
  const email = formData.get('email') as string

  // Contacto (persona) único por teléfono — usa cliente admin porque el visitante puede ser anónimo.
  const contact = await findOrCreateContact(adminSupabase, { first_name, last_name, phone, email })
  if (!contact) {
    throw new Error('No se pudo registrar el contacto.')
  }

  const data = {
    contact_id: contact.id,
    first_name,
    last_name,
    phone,
    email,
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
    const assignedAgent = await assignLeadWithContact(lead.id, contact)
    await executeStageAutomation(lead.id, 'lead_nuevo', assignedAgent ? { assigned_agent: assignedAgent } : {})
  }

  // Success: Redirect to a "thank you" or back with a partial success message
  redirect('/cotizar?success=true')
}
