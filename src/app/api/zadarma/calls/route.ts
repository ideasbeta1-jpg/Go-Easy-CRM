import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/zadarma/calls?leadId=xxx&limit=20
 * Devuelve el historial de llamadas de un lead con datos del agente.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const leadId = searchParams.get('leadId')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

  if (!leadId) {
    return NextResponse.json({ error: 'leadId requerido' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('call_logs')
    .select(`
      id,
      zadarma_call_id,
      direction,
      status,
      duration,
      recording_url,
      caller_number,
      called_number,
      started_at,
      answered_at,
      ended_at,
      created_at,
      profiles:agent_id (
        id,
        first_name,
        last_name,
        avatar_url
      )
    `)
    .eq('lead_id', leadId)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[/api/zadarma/calls]', error)
    return NextResponse.json({ error: 'Error al obtener llamadas' }, { status: 500 })
  }

  return NextResponse.json({ calls: data })
}
