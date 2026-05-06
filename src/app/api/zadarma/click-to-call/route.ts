import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { zadarmaRequest } from '@/lib/zadarma'

const supabase = createServiceClient(
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
  // Verificar sesión del usuario autenticado
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { leadId, agentId } = await req.json()

  if (!leadId || !agentId) {
    return NextResponse.json({ error: 'leadId y agentId son requeridos' }, { status: 400 })
  }

  // Solo el propio agente puede iniciar una llamada en su nombre
  if (agentId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    // Solo registrar en call_logs si Zadarma devuelve un callId real.
    // Si no, el webhook NOTIFY_START lo creará con el ID correcto evitando duplicados.
    const callId = (result as { call_id?: string }).call_id
    if (callId) {
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
    }

    return NextResponse.json({ success: true, callId: callId || null })
  } catch (err) {
    console.error('[click-to-call]', err)
    return NextResponse.json({ error: 'Error de conexión con Zadarma' }, { status: 500 })
  }
}
