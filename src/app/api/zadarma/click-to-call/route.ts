import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { zadarmaRequest } from '@/lib/zadarma'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/zadarma/click-to-call
 * Body: { leadId, agentId }
 *
 * Inicia un "callback": Zadarma llama primero al agente (extensión PBX),
 * y cuando contesta, conecta automáticamente al cliente (teléfono del lead).
 */
export async function POST(req: NextRequest) {
  const { leadId, agentId } = await req.json()

  if (!leadId || !agentId) {
    return NextResponse.json({ error: 'leadId y agentId son requeridos' }, { status: 400 })
  }

  // Obtener datos del lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, phone, first_name, last_name')
    .eq('id', leadId)
    .single()

  if (leadError || !lead?.phone) {
    return NextResponse.json({ error: 'Lead no encontrado o sin teléfono' }, { status: 404 })
  }

  // Obtener extensión PBX del agente
  const { data: agent, error: agentError } = await supabase
    .from('profiles')
    .select('id, zadarma_sip, first_name')
    .eq('id', agentId)
    .single()

  if (agentError || !agent?.zadarma_sip) {
    return NextResponse.json(
      { error: 'Agente sin extensión PBX configurada (zadarma_sip)' },
      { status: 400 }
    )
  }

  try {
    // API Zadarma: /v1/request/callback/
    // "from" = quién recibe la llamada primero (el agente)
    // "to"   = a quién se llama después (el cliente)
    const result = await zadarmaRequest('/request/callback/', {
      from: agent.zadarma_sip,
      to: lead.phone,
    })

    if ((result as { status?: string }).status !== 'success') {
      return NextResponse.json(
        { error: (result as { message?: string }).message || 'Error al iniciar llamada' },
        { status: 400 }
      )
    }

    // Registrar la llamada saliente en call_logs
    const callId = (result as { call_id?: string }).call_id || `manual_${Date.now()}`
    await supabase.from('call_logs').insert({
      zadarma_call_id: callId,
      lead_id: leadId,
      agent_id: agentId,
      caller_number: agent.zadarma_sip,
      called_number: lead.phone,
      pbx_extension: agent.zadarma_sip,
      direction: 'outbound',
      status: 'initiated',
      started_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, callId })
  } catch (err) {
    console.error('[click-to-call]', err)
    return NextResponse.json({ error: 'Error de conexión con Zadarma' }, { status: 500 })
  }
}
