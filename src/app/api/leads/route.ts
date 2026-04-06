import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendLeadToN8n } from '@/utils/n8n'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      first_name,
      last_name,
      phone,
      email,
      pickup_date,
      return_date,
      pickup_location,
      pickup_location_id,
      return_location,
      return_location_id,
      category_id,
    } = body

    // Basic validation
    if (!first_name || !last_name || !phone || !email || !pickup_date || !return_date || !pickup_location || !return_location || !category_id) {
      return NextResponse.json({ error: 'Todos los campos son requeridos.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          first_name,
          last_name,
          phone,
          email,
          pickup_date,
          return_date,
          pickup_location,
          pickup_location_id,
          return_location,
          return_location_id,
          category_id,
          status: 'lead_nuevo',
        },
      ])
      .select('id')
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger n8n for lead_created (for Meta CAPI and general automation)
    // We send personal data directly to n8n to facilitate SHA256 hashing
    try {
      await sendLeadToN8n(data.id, 'lead_created', {
        first_name,
        last_name,
        phone,
        email,
        category_id,
        event_id: data.id // Vital for Meta CAPI Deduplication (Matching the Browser event)
      })
    } catch (n8nError) {
      console.error('Error sending lead to n8n:', n8nError)
      // We don't return 500 here to not break the user experience if n8n is down
    }

    return NextResponse.json({ success: true, id: data.id }, { status: 201 })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
