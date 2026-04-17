'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { executeStageAutomation } from '@/utils/automation-engine'

export async function generateVoucherForLead(leadId: string, providerId: string, providerConfirmation: string) {
  const supabase = await createClient()

  // 1. Update Lead Provider (in case it was changed in the CTA)
  const { error: leadUpdateError } = await supabase
    .from('leads')
    .update({ 
      provider_id: providerId,
      status: 'voucher_enviado' 
    })
    .eq('id', leadId)

  if (leadUpdateError) throw new Error(leadUpdateError.message)

  // 2. Generate a voucher number (GF-XXXXXX)
  const voucherNumber = `GF-${Math.floor(100000 + Math.random() * 900000)}`

  // 3. Create the Voucher record with confirmation from the start
  const { data: voucher, error: voucherError } = await supabase
    .from('vouchers')
    .insert({
      lead_id: leadId,
      confirmation_number: voucherNumber,
      provider_confirmation: providerConfirmation
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
  
  return voucher
}

export async function updateProviderConfirmation(voucherId: string, providerConfirmation: string, leadId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('vouchers')
    .update({ 
      provider_confirmation: providerConfirmation 
    })
    .eq('id', voucherId)

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/leads/${leadId}`)
  revalidatePath(`/voucher/${voucherId}`)
}
