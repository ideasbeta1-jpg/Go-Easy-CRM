import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { stripe } from '@/utils/stripe'
import { createAdminClient } from '@/utils/supabase/admin'
import { executeStageAutomation } from '@/utils/automation-engine'

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('Stripe-Signature') as string

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

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const leadId = session.metadata.lead_id

    if (leadId) {
      const supabase = createAdminClient()
      
      // Update Lead Status to 'reserva_confirmada' and mark deposit as paid
      const { error } = await supabase
        .from('leads')
        .update({ 
           status: 'reserva_confirmada',
           deposit_paid: true 
        })
        .eq('id', leadId)

      if (error) {
        console.error('Error updating lead status:', error)
      } else {
        // Trigger Automation (Includes n8n fallback)
        await executeStageAutomation(leadId, 'reserva_confirmada', {
          stripe_payment_id: session.payment_intent,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency?.toUpperCase() || 'USD',
          event_id: session.id
        })
      }
    }
  }

  return new NextResponse(null, { status: 200 })
}
