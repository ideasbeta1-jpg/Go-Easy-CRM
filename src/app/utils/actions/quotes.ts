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

  // 2. Create the quote record first to get the ID for the success URL
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 3)

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      lead_id: leadId,
      expires_at: expiresAt.toISOString(),
      total_amount: totalAmount,
      pickup_date: lead.pickup_date,
      return_date: lead.return_date
    })
    .select()
    .single()

  if (quoteError) throw new Error(quoteError.message)

  // 2.5 Calculate exact deposit (Go Easy Margin) based on actual negotiation or defaults
  let depositAmount = Math.round(totalAmount * 0.2 * 100) // Fallback safety
  
  if (lead.pickup_date && lead.return_date) {
      const pickup = new Date(lead.pickup_date)
      const dropoff = new Date(lead.return_date)
      if (pickup < dropoff) {
          const diffInMs = dropoff.getTime() - pickup.getTime()
          const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24))
          
          // La ganancia (margen) es la verdad para el depósito
          const dailyMargin = lead.agreed_daily_price !== null 
            ? Number(lead.agreed_daily_price) 
            : Number(category?.daily_price || 0)
            
          const totalMargin = dailyMargin * diffInDays
          
          if (totalMargin > 0) {
              depositAmount = Math.round(totalMargin * 100)
          }
      }
  }

  // 3. Create Stripe Checkout Session (Margen de Reserva Go Easy)

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Depósito Reserva: ${category?.name || 'Categoría General'}`,
            description: `Reserva para ${lead.first_name} ${lead.last_name}. Pick-up: ${lead.pickup_location}`,
            images: category?.image_url ? [category.image_url] : [],
          },
          unit_amount: depositAmount,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/cotizacion/${quote.id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/cotizacion/${quote.id}`,
    metadata: {
       lead_id: leadId,
       quote_id: quote.id
    }
  })

  // 4. Update lead status to 'en_cotizacion' and save amount
  const { error: updateError } = await supabase
    .from('leads')
    .update({ 
      status: 'en_cotizacion',
      total_amount: totalAmount 
    })
    .eq('id', leadId)

  if (updateError) throw new Error(updateError.message)

  // 5. Update the quote record with the stripe_link
  const { error: updateQuoteError } = await supabase
    .from('quotes')
    .update({
      stripe_link: session.url
    })
    .eq('id', quote.id)

  if (updateQuoteError) throw new Error(updateQuoteError.message)

  // 6. Trigger Automation Engine (Includes n8n fallback)
  await executeStageAutomation(leadId, 'en_cotizacion', {
     amount: totalAmount,
     stripe_link: session.url
  })


  revalidatePath(`/dashboard/leads/${leadId}`)
  
  return quote
}
