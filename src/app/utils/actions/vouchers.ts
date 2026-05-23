'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { executeStageAutomation } from '@/utils/automation-engine'

export async function generateVoucherForLead(
  leadId: string,
  providerId: string,
  providerConfirmation: string,
  conductorNombre: string,
  conductorTelefono: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 1. Update Lead Provider and status
  const { error: leadUpdateError } = await supabase
    .from('leads')
    .update({
      provider_id: providerId,
      status: 'voucher_enviado',
      draft_provider_confirmation: null,
      draft_conductor_nombre: null,
      draft_conductor_telefono: null,
    })
    .eq('id', leadId)

  if (leadUpdateError) throw new Error(leadUpdateError.message)

  // 2. Generate a voucher number (GF-XXXXXX)
  const voucherNumber = `GF-${Math.floor(100000 + Math.random() * 900000)}`

  // 3. Create the Voucher record
  const { data: voucher, error: voucherError } = await supabase
    .from('vouchers')
    .insert({
      lead_id: leadId,
      confirmation_number: voucherNumber,
      provider_confirmation: providerConfirmation,
      conductor_nombre: conductorNombre,
      conductor_telefono: conductorTelefono,
    })
    .select()
    .single()

  if (voucherError) throw new Error(voucherError.message)

  // 4. Add Timeline Note
  const { data: userData } = await supabase.auth.getUser()
  const agentId = userData.user?.id

  await supabase
    .from('lead_notes')
    .insert({
      lead_id: leadId,
      agent_id: agentId,
      content: `[VOUCHER_GENERATED] Se ha generado y enviado el voucher oficial ${voucherNumber}.`
    })

  // 5. Trigger Automation (Includes n8n fallback)
  await executeStageAutomation(leadId, 'voucher_enviado', {
     voucher_number: voucherNumber,
     voucher_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://goeasyflorida.com'}/v/${voucher.id}`,
     provider_confirmation: providerConfirmation
  })

  revalidatePath(`/dashboard/leads/${leadId}`)
  revalidatePath(`/voucher/${voucher.id}`)
  revalidatePath(`/v/${voucher.id}`)

  return voucher
}

export async function saveVoucherDraft(
  leadId: string,
  providerId: string,
  providerConfirmation: string,
  conductorNombre: string,
  conductorTelefono: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('leads')
    .update({
      provider_id: providerId || null,
      draft_provider_confirmation: providerConfirmation,
      draft_conductor_nombre: conductorNombre,
      draft_conductor_telefono: conductorTelefono,
    })
    .eq('id', leadId)

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/leads/${leadId}`)
}

export async function updateProviderConfirmation(
  voucherId: string,
  providerConfirmation: string,
  conductorNombre: string,
  conductorTelefono: string,
  leadId: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('vouchers')
    .update({
      provider_confirmation: providerConfirmation,
      conductor_nombre: conductorNombre,
      conductor_telefono: conductorTelefono,
    })
    .eq('id', voucherId)

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/leads/${leadId}`)
  revalidatePath(`/voucher/${voucherId}`)
}
