'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { sendLeadToN8n } from '@/utils/n8n'

export async function generateVoucherForLead(leadId: string) {
  const supabase = await createClient()

  // Generate a voucher number (GF-XXXXXX)
  const voucherNumber = `GF-${Math.floor(100000 + Math.random() * 900000)}`

  // 1. Create the Voucher record
  const { data: voucher, error: voucherError } = await supabase
    .from('vouchers')
    .insert({
      lead_id: leadId,
      voucher_number: voucherNumber
    })
    .select()
    .single()

  if (voucherError) throw new Error(voucherError.message)

  // 2. Update Lead Status
  const { error: updateError } = await supabase
    .from('leads')
    .update({ status: 'voucher_enviado' })
    .eq('id', leadId)

  if (updateError) throw new Error(updateError.message)

  // 3. Trigger n8n (Optional: Automate Sending via WhatsApp)
  await sendLeadToN8n(leadId, 'voucher_generated', {
     voucher_number: voucherNumber,
     voucher_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/voucher/${voucher.id}`
  })

  revalidatePath(`/dashboard/leads/${leadId}`)
  
  return voucher
}
