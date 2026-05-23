import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { stripe } from '@/utils/stripe'
import { createAdminClient } from '@/utils/supabase/admin'
import { executeStageAutomation } from '@/utils/automation-engine'

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('Stripe-Signature') as string

  if (!signature) {
    return new NextResponse('Missing signature', { status: 400 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const leadId = session.metadata.lead_id
    const paymentIntentId = session.payment_intent

    if (!leadId) {
      return new NextResponse(null, { status: 200 })
    }

    const supabase = createAdminClient()
    const amount = session.amount_total ? session.amount_total / 100 : 0
    const currency = session.currency?.toUpperCase() || 'USD'

    // Fetch lead to check if voucher can be auto-generated
    const { data: lead } = await supabase
      .from('leads')
      .select('provider_id, draft_provider_confirmation, draft_conductor_nombre, draft_conductor_telefono')
      .eq('id', leadId)
      .single()

    const canAutoVoucher = !!(lead?.provider_id && lead?.draft_provider_confirmation)

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

      if (voucherError) {
        console.error('[Stripe Webhook] Auto-voucher creation error:', voucherError.message)
        // Fallback: flujo normal de reserva confirmada
        await supabase.from('leads').update({
          status: 'reserva_confirmada',
          deposit_paid: true,
          stripe_payment_id: paymentIntentId,
          updated_at: new Date().toISOString()
        }).eq('id', leadId)

        try {
          await executeStageAutomation(leadId, 'reserva_confirmada', {
            stripe_payment_id: paymentIntentId, amount, currency, event_id: session.id
          })
        } catch (autoError: any) {
          console.error('[Stripe Webhook] Automation error (fallback):', autoError.message)
        }
      } else {
        await supabase.from('leads').update({
          status: 'voucher_enviado',
          deposit_paid: true,
          stripe_payment_id: paymentIntentId,
          draft_provider_confirmation: null,
          draft_conductor_nombre: null,
          draft_conductor_telefono: null,
          updated_at: new Date().toISOString()
        }).eq('id', leadId)

        await supabase.from('lead_notes').insert({
          lead_id: leadId,
          agent_id: null,
          content: `[VOUCHER_GENERATED] Voucher ${voucherNumber} generado automáticamente al confirmarse el pago.`
        })

        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://goeasyflorida.com').replace(/\/$/, '')

        try {
          await executeStageAutomation(leadId, 'voucher_enviado', {
            voucher_number: voucherNumber,
            voucher_url: `${appUrl}/v/${voucher.id}`,
            provider_confirmation: lead.draft_provider_confirmation,
            stripe_payment_id: paymentIntentId,
            amount, currency, event_id: session.id,
            auto_generated: true
          })
        } catch (autoError: any) {
          console.error('[Stripe Webhook] Automation error (auto-voucher):', autoError.message)
        }
      }
    } else {
      const { error } = await supabase
        .from('leads')
        .update({
          status: 'reserva_confirmada',
          deposit_paid: true,
          stripe_payment_id: paymentIntentId,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)

      if (error) {
        console.error('[Stripe Webhook] DB update error:', error.message)
      } else {
        try {
          await executeStageAutomation(leadId, 'reserva_confirmada', {
            stripe_payment_id: paymentIntentId, amount, currency, event_id: session.id
          })
        } catch (autoError: any) {
          console.error('[Stripe Webhook] Automation error:', autoError.message)
        }
      }
    }
  }

  return new NextResponse(null, { status: 200 })
}
