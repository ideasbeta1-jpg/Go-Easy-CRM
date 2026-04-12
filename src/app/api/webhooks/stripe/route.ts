import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { stripe } from '@/utils/stripe'
import { createAdminClient } from '@/utils/supabase/admin'
import { executeStageAutomation } from '@/utils/automation-engine'

export async function POST(req: Request) {
  console.log('[Stripe Webhook] Recibida solicitud POST');
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('Stripe-Signature') as string

  if (!signature) {
    console.error('[Stripe Webhook] Error: Signature faltante');
    return new NextResponse('Missing signature', { status: 400 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    console.log(`[Stripe Webhook] Evento construido: ${event.type}`);
  } catch (err: any) {
    console.error(`[Stripe Webhook] Error de validación: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const leadId = session.metadata.lead_id
    const paymentIntentId = session.payment_intent

    console.log(`[Stripe Webhook] Checkout completado para Lead: ${leadId}, PaymentIntent: ${paymentIntentId}`);

    if (leadId) {
      const supabase = createAdminClient()
      
      // Update Lead Status to 'reserva_confirmada' and mark deposit as paid
      // IMPORTANTE: Ahora guardamos el stripe_payment_id como evidencia
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
        console.error('[Stripe Webhook] Error actualizando DB:', error)
      } else {
        console.log(`[Stripe Webhook] Lead ${leadId} actualizado a reserva_confirmada exitosamente`);
        
        // Trigger Automation (Includes n8n fallback)
        try {
          await executeStageAutomation(leadId, 'reserva_confirmada', {
            stripe_payment_id: paymentIntentId,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency?.toUpperCase() || 'USD',
            event_id: session.id
          })
        } catch (autoError) {
          console.error('[Stripe Webhook] Error en motor de automatización:', autoError);
        }
      }
    } else {
      console.warn('[Stripe Webhook] Advertencia: No se encontró lead_id en la metadata de la sesión');
    }
  }

  return new NextResponse(null, { status: 200 })
}
