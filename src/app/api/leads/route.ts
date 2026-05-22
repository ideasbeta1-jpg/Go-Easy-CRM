import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendLeadToN8n } from '@/utils/n8n'
import { assignLeadToAgent } from '@/utils/assignment'
import { executeStageAutomation } from '@/utils/automation-engine'

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
      source,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
    } = body

    // Basic validation
    if (!first_name || !last_name || !phone || !email || !pickup_date || !return_date || !pickup_location || !return_location || !category_id) {
      return NextResponse.json({ error: 'Todos los campos son requeridos.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Dedup by phone — if a non-deleted lead with this phone exists return it
    const cleanPhone = phone.replace(/\D/g, '')
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, status')
      .or(`phone.eq.${phone},phone.eq.${cleanPhone},phone.like.%${cleanPhone}`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingLead) {
      console.log('[/api/leads] Duplicate phone detected, returning existing lead:', existingLead.id)
      return NextResponse.json({ success: true, id: existingLead.id, duplicate: true }, { status: 200 })
    }

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
          source: source || null,
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
          utm_term: utm_term || null,
          utm_content: utm_content || null,
        },
      ])
      .select('id')
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (data?.id) {
      // Asignar agente primero y pasar sus datos al motor para que el WhatsApp use el nombre real
      const assignedAgent = await assignLeadToAgent(data.id)
      await executeStageAutomation(data.id, 'lead_nuevo', assignedAgent ? { assigned_agent: assignedAgent } : {})
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
      
      const eventPayload = {
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
      }

      // 1. Enviar Evento Estándar (Recomendado por Meta para optimización genérica)
      await sendMetaEvent({
        eventName: 'Lead',
        ...eventPayload
      })

      // 2. Enviar Evento Personalizado (Solicitado)
      await sendMetaEvent({
        eventName: 'Lead_renta',
        ...eventPayload
      })
    } catch (metaError) {
      console.error('Error sending event to Meta CAPI:', metaError)
    }



    return NextResponse.json({ success: true, id: data.id }, { status: 201 })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
