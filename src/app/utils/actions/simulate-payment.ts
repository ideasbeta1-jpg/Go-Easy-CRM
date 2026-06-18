'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { executeStageAutomation } from '@/utils/automation-engine'
import { logLeadEvent, LEAD_EVENT } from '@/lib/leads/events'

export async function simulatePayment(leadId: string): Promise<{ stage: 'voucher_enviado' | 'reserva_confirmada' }> {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = createAdminClient()

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('status, provider_id, draft_provider_confirmation, draft_conductor_nombre, draft_conductor_telefono')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) throw new Error('Lead no encontrado')

  const prevStatus = lead.status ?? null
  const canAutoVoucher = !!(lead.provider_id && lead.draft_provider_confirmation)

  // Pago simulado del cliente
  await logLeadEvent(supabase, {
    leadId,
    type: LEAD_EVENT.PAYMENT_CONFIRMED,
    actorId: user.id,
    metadata: { simulated: true },
  })

  if (canAutoVoucher) {
    const voucherNumber = `GF-${Math.floor(100000 + Math.random() * 900000)}`

    const { data: voucher, error: voucherError } = await supabase
      .from('vouchers')
      .insert({
        lead_id: leadId,
        confirmation_number: voucherNumber,
        provider_confirmation: lead.draft_provider_confirmation,
        conductor_nombre: lead.draft_conductor_nombre || null,
        conductor_telefono: lead.draft_conductor_telefono || null,
      })
      .select()
      .single()

    if (voucherError) throw new Error(voucherError.message)

    await supabase.from('leads').update({
      status: 'voucher_enviado',
      deposit_paid: true,
      draft_provider_confirmation: null,
      draft_conductor_nombre: null,
      draft_conductor_telefono: null,
      updated_at: new Date().toISOString()
    }).eq('id', leadId)

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://goeasyflorida.com').replace(/\/$/, '')

    await logLeadEvent(supabase, {
      leadId,
      type: LEAD_EVENT.VOUCHER_GENERATED,
      actorId: user.id,
      metadata: {
        voucher_id: voucher.id,
        voucher_number: voucherNumber,
        voucher_url: `${appUrl}/v/${voucher.id}`,
        provider_confirmation: lead.draft_provider_confirmation,
        auto_generated: true,
        simulated: true,
      },
    })
    await logLeadEvent(supabase, {
      leadId, type: LEAD_EVENT.STAGE_CHANGE, actorId: user.id,
      fromStatus: prevStatus, toStatus: 'voucher_enviado',
    })

    await executeStageAutomation(leadId, 'voucher_enviado', {
      voucher_number: voucherNumber,
      voucher_url: `${appUrl}/v/${voucher.id}`,
      provider_confirmation: lead.draft_provider_confirmation,
      amount: 0,
      auto_generated: true
    })

    revalidatePath(`/dashboard/leads/${leadId}`)
    return { stage: 'voucher_enviado' }
  } else {
    await supabase.from('leads').update({
      status: 'reserva_confirmada',
      deposit_paid: true,
      updated_at: new Date().toISOString()
    }).eq('id', leadId)

    await logLeadEvent(supabase, {
      leadId, type: LEAD_EVENT.STAGE_CHANGE, actorId: user.id,
      fromStatus: prevStatus, toStatus: 'reserva_confirmada',
    })

    await executeStageAutomation(leadId, 'reserva_confirmada', { amount: 0 })

    revalidatePath(`/dashboard/leads/${leadId}`)
    return { stage: 'reserva_confirmada' }
  }
}
