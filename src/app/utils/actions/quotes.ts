'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { stripe } from '@/utils/stripe'
import { executeStageAutomation } from '@/utils/automation-engine'

export async function generateQuoteForLead(leadId: string, totalAmount: number) {
  const supabase = await createClient()

  // 1. Fetch Lead data
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (!lead) throw new Error('Lead not found')

  // 1.1 Fetch category separately
  const { data: category } = lead.category_id
    ? await supabase.from('categories').select('*').eq('id', lead.category_id).single()
    : { data: null }

  // 2. Calculate deposit amount (Go Easy Margin) — snapshot before creating the record
  let depositAmount = Math.round(totalAmount * 0.2 * 100) // Fallback safety (cents)
  let depositDollars = totalAmount * 0.2

  if (lead.pickup_date && lead.return_date) {
    const pickup = new Date(lead.pickup_date)
    const dropoff = new Date(lead.return_date)
    if (pickup < dropoff) {
      const diffInDays = Math.ceil((dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24))

      const dailyMargin = lead.agreed_daily_price !== null
        ? Number(lead.agreed_daily_price)
        : Number(category?.daily_price || 0)

      const totalMargin = dailyMargin * diffInDays

      if (totalMargin > 0) {
        depositAmount = Math.round(totalMargin * 100) // cents for Stripe
        depositDollars = totalMargin
      }
    }
  }

  // 3. Invalidate all previous quotes for this lead
  await supabase
    .from('quotes')
    .update({ is_active: false })
    .eq('lead_id', leadId)

  // 4. Create new quote record (with snapshot of amount and deposit)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 3)

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      lead_id: leadId,
      expires_at: expiresAt.toISOString(),
      total_amount: totalAmount,
      deposit_amount: depositDollars,
      pickup_date: lead.pickup_date,
      return_date: lead.return_date,
      is_active: true,
    })
    .select()
    .single()

  if (quoteError) throw new Error(quoteError.message)

  // 5. Create Stripe Checkout Session
  const safeImageUrl = category?.image_url?.startsWith('https://') ? category.image_url : undefined
  const safeDepositAmount = Math.max(depositAmount, 50) // Stripe minimum is 50 cents

  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>
  try {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Depósito Reserva: ${category?.name || 'Categoría General'}`,
              description: `Reserva para ${lead.first_name} ${lead.last_name}. Pick-up: ${lead.pickup_location}`,
              ...(safeImageUrl ? { images: [safeImageUrl] } : {}),
            },
            unit_amount: safeDepositAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://goeasyflorida.com'}/q/${quote.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://goeasyflorida.com'}/q/${quote.id}`,
      metadata: {
        lead_id: leadId,
        quote_id: quote.id,
      },
    })
  } catch (stripeError: any) {
    console.error('[generateQuoteForLead] Stripe error:', stripeError?.message, stripeError?.raw)
    throw new Error(`Error al crear sesión de pago: ${stripeError?.message || 'Error de Stripe'}`)
  }

  // 6. Update lead status and save amount
  const { error: updateError } = await supabase
    .from('leads')
    .update({
      status: 'en_cotizacion',
      total_amount: totalAmount,
    })
    .eq('id', leadId)

  if (updateError) throw new Error(updateError.message)

  // 7. Save stripe_link on the quote
  const { error: updateQuoteError } = await supabase
    .from('quotes')
    .update({ stripe_link: session.url })
    .eq('id', quote.id)

  if (updateQuoteError) throw new Error(updateQuoteError.message)

  // 8. Trigger Automation Engine
  await executeStageAutomation(leadId, 'en_cotizacion', {
    amount: totalAmount,
    stripe_link: session.url,
  })

  revalidatePath(`/dashboard/leads/${leadId}`)

  return quote
}
