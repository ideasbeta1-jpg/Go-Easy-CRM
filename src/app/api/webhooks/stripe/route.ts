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
          stripe_payment_id: paymentIntentId,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency?.toUpperCase() || 'USD',
          event_id: session.id
        })
      } catch (autoError: any) {
        console.error('[Stripe Webhook] Automation error:', autoError.message)
      }
    }
  }

  return new NextResponse(null, { status: 200 })
}
