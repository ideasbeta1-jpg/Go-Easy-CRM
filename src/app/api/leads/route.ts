import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendLeadToN8n } from '@/utils/n8n'
import { assignLeadToAgent } from '@/utils/assignment'

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

    if (data?.id) {
       // Intentar asignación automática
       await assignLeadToAgent(data.id)
    }

    // Trigger direct Meta CAPI (Lead)
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const fbp = cookieStore.get('_fbp')?.value
      const fbc = cookieStore.get('_fbc')?.value
      
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || '127.0.0.1'
      const userAgent = req.headers.get('user-agent') || ''

      const { sendMetaEvent } = await import('@/utils/meta-capi')
      await sendMetaEvent({
        eventName: 'Lead',
        eventID: data.id,
        userData: {
          email,
          phone,
          first_name,
          last_name,
          client_ip_address: ip,
          client_user_agent: userAgent,
          fbp,
          fbc
        },
        customData: {
          content_name: 'Nuevo Lead CRM',
          currency: 'USD'
        }
      })
    } catch (metaError) {
      console.error('Error sending event to Meta CAPI:', metaError)
    }

    // Trigger n8n for lead_created (legacy automation)
    try {
      await sendLeadToN8n(data.id, 'lead_created', {
        first_name,
        last_name,
        phone,
        email,
        category_id,
        event_id: data.id
      })
    } catch (n8nError) {
      console.error('Error sending lead to n8n:', n8nError)
    }

    return NextResponse.json({ success: true, id: data.id }, { status: 201 })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
