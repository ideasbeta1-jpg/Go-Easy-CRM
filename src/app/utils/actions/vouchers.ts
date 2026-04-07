'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { executeStageAutomation } from '@/utils/automation-engine'

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

  // 3. Trigger Automation (Includes n8n fallback)
  await executeStageAutomation(leadId, 'voucher_enviado', {
     voucher_number: voucherNumber,
     voucher_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/voucher/${voucher.id}`
  })

  revalidatePath(`/dashboard/leads/${leadId}`)
  
  return voucher
}
