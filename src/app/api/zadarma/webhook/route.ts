import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyZadarmaWebhook } from '@/lib/zadarma'
import { sendLeadToN8n } from '@/utils/n8n'

// Cliente admin perezoso: se crea en la primera petición, no al evaluar el
// módulo. Así el build no falla si SUPABASE_SERVICE_ROLE_KEY no está disponible
// en tiempo de compilación.
let _db: ReturnType<typeof createAdminClient> | null = null
const db = () => (_db ??= createAdminClient())

const DISPOSITION_MAP: Record<string, string> = {
  answered: 'answered',
  busy: 'missed',
  'no answer': 'missed',
  failed: 'failed',
  cancel: 'missed',
}

export async function GET(req: NextRequest) {
  // Validación de Zadarma al configurar el Webhook
  const url = new URL(req.url)
  const zdEcho = url.searchParams.get('zd_echo')
  
  if (zdEcho) {
    return new NextResponse(zdEcho, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return NextResponse.json({ status: 'ok' })
}

export async function POST(req: NextRequest) {
  // Zadarma envía application/x-www-form-urlencoded
  const contentType = req.headers.get('content-type') || ''
  let params: Record<string, string> = {}

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await req.text()
    params = Object.fromEntries(new URLSearchParams(text))
  } else {
    params = await req.json()
  }

  // Verificar firma (el campo "sign" viene dentro del body)
  const signature = params.sign || req.headers.get('sign') || ''
  if (!verifyZadarmaWebhook(params, signature)) {
    console.error('[Zadarma Webhook] Invalid signature', { params })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = params.event

  try {
    switch (event) {
      case 'NOTIFY_START':   await handleCallStart(params);    break
      case 'NOTIFY_ANSWER':  await handleCallAnswer(params);   break
      case 'NOTIFY_END':     await handleCallEnd(params);      break
      case 'NOTIFY_RECORD':  await handleRecordingReady(params); break
    }
  } catch (err: any) {
    console.error('[Zadarma Webhook] Handler error:', err.message)
    // Return 200 so Zadarma does not retry
  }

  return NextResponse.json({ status: 'ok' })
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleCallStart(p: Record<string, string>) {
  const callId = p.call_id || p.pbx_call_id
  const callerNumber = p.caller_id || p.caller_number || ''
  const calledNumber = p.called_did || p.called_number || ''
  const internalNumber = p.internal_number || p.pbx_extension || ''

  // Buscar agente por extensión PBX
  const { data: agent } = await db()
    .from('profiles')
    .select('id')
    .eq('zadarma_sip', internalNumber)
    .maybeSingle()

  // Vincular con lead por número de teléfono — suffix matching para cubrir variantes de código de país
  const normalized10 = normalizePhone(callerNumber)        // últimos 10 dígitos
  const normalizedFull = callerNumber.replace(/^\+/, '')   // sin prefijo +
  // Un contacto puede tener varias reservas: tomamos la más reciente.
  const { data: leadMatches } = await db()
    .from('leads')
    .select('id')
    .or(`phone.ilike.%${normalized10},phone.eq.${normalizedFull},phone.eq.${callerNumber}`)
    .order('created_at', { ascending: false })
    .limit(1)
  const lead = leadMatches?.[0] || null

  const direction = p.direction === 'outgoing' ? 'outbound' : 'inbound'

  const { error } = await db().from('call_logs').upsert(
    {
      zadarma_call_id: callId,
      caller_number: callerNumber,
      called_number: calledNumber,
      pbx_extension: internalNumber,
      lead_id: lead?.id || null,
      agent_id: agent?.id || null,
      direction,
      status: 'initiated',
      started_at: new Date().toISOString(),
    },
    { onConflict: 'zadarma_call_id' }
  )

  if (error) console.error('[handleCallStart]', error)
}

async function handleCallAnswer(p: Record<string, string>) {
  const callId = p.call_id || p.pbx_call_id
  const { error } = await db().from('call_logs').upsert(
    {
      zadarma_call_id: callId,
      status: 'answered',
      answered_at: new Date().toISOString(),
      caller_number: p.caller_id || '',
      called_number: p.called_did || '',
      direction: p.direction === 'outgoing' ? 'outbound' : 'inbound',
    },
    { onConflict: 'zadarma_call_id' }
  )

  if (error) console.error('[handleCallAnswer]', error)
}

async function handleCallEnd(p: Record<string, string>) {
  const callId = p.call_id || p.pbx_call_id
  const duration = parseInt(p.duration || p.billseconds || '0')
  const disposition = (p.disposition || p.call_status || '').toLowerCase()

  const status = DISPOSITION_MAP[disposition] || 'ended'

  const { error } = await db().from('call_logs').upsert(
    {
      zadarma_call_id: callId,
      status,
      duration,
      ended_at: new Date().toISOString(),
      caller_number: p.caller_id || '',
      called_number: p.called_did || '',
      direction: p.direction === 'outgoing' ? 'outbound' : 'inbound',
    },
    { onConflict: 'zadarma_call_id' }
  )

  if (error) {
    console.error('[handleCallEnd]', error)
    return
  }

  // Si la llamada fue perdida, disparamos la automatización de WhatsApp a n8n
  if (status === 'missed') {
    // Buscar la información completa para n8n
    const { data: callLog } = await db()
      .from('call_logs')
      .select(`
        caller_number,
        lead:leads(id, first_name, last_name, phone),
        agent:profiles(id, first_name, last_name, full_name, phone)
      `)
      .eq('zadarma_call_id', callId)
      .maybeSingle()

    if (callLog) {
      const leadData = Array.isArray(callLog.lead) ? callLog.lead[0] : callLog.lead
      const agentData = Array.isArray(callLog.agent) ? callLog.agent[0] : callLog.agent

      const agentName = agentData 
        ? `${agentData.first_name || ''} ${agentData.last_name || ''}`.trim() || agentData.full_name 
        : 'Sin asignar'
      
      const callerName = leadData 
        ? `${leadData.first_name || ''} ${leadData.last_name || ''}`.trim() 
        : ''

      // Payload para la plantilla de Llamada Perdida
      const payload = {
        caller_number: callLog.caller_number || p.caller_id || '',
        caller_name: callerName,
        agent_name: agentName,
        agent_phone: agentData?.phone || '',
        lead_id: leadData?.id || '',
      }

      // Enviar a n8n
      await sendLeadToN8n(leadData?.id || 'unknown', 'llamada_perdida', payload)
    }
  }
}

async function handleRecordingReady(p: Record<string, string>) {
  const callId = p.pbx_call_id || p.call_id_with_rec || p.call_id
  const recordingUrl = p.link || p.record_url || ''

  const { error } = await db()
    .from('call_logs')
    .update({ recording_url: recordingUrl })
    .eq('zadarma_call_id', callId)

  if (error) console.error('[handleRecordingReady]', error)
}

// ─── Utils ────────────────────────────────────────────────────────────────────

/** Retorna los últimos 10 dígitos del teléfono para suffix matching entre formatos internacionales */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10)
}
