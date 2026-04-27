// Base URL of the n8n instance (without trailing slash)
const N8N_BASE = 'https://n8nib.ideasbeta.com/webhook'

/**
 * Maps CRM stage names (from automation-engine) to their n8n webhook paths.
 * These paths must match the "Path" field in each n8n Webhook node.
 */
const WEBHOOK_PATHS: Record<string, string> = {
  // Stage events fired by automation-engine
  lead_nuevo:          'nuevo-lead-whatsapp',
  reserva_confirmada:  'pago-recibido-whatsapp',
  // Zadarma call events (fired from /api/zadarma/calls)
  llamada_perdida:     'llamada-perdida-whatsapp',
  // Legacy aliases kept for backward compatibility
  lead_created:        'nuevo-lead-whatsapp',
  payment_confirmed:   'pago-recibido-whatsapp',
}

/**
 * Sends an event to the appropriate n8n webhook.
 * Called by automation-engine after every stage change.
 * Also called directly for events like missed calls.
 */
export async function sendLeadToN8n(leadId: string, event: string, payload: any = {}) {
  const path = WEBHOOK_PATHS[event]

  // Skip events that have no mapped webhook (e.g. en_cotizacion, voucher_enviado)
  if (!path) {
    console.log(`[n8n] No webhook mapped for event: ${event} — skipping`)
    return
  }

  const url = `${N8N_BASE}/${path}`

  // Build a normalized payload that all n8n workflows can read
  const agent = payload.assigned_agent
  const agentName = agent
    ? `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || agent.full_name || 'Sin asignar'
    : (payload.agent_name || 'Sin asignar')

  const body = {
    // Identity
    lead_id:    leadId,
    event,
    timestamp:  new Date().toISOString(),
    // Lead fields (used by WhatsApp message templates)
    lead_name:  payload.lead_name  || payload.first_name  || '',
    agent_name: agentName,
    lead_phone: payload.lead_phone || payload.phone       || '',
    lead_email: payload.lead_email || payload.email       || '',
    source:     payload.source     || payload.fuente      || '',
    // Payment fields (used by pago-recibido workflow)
    amount:     payload.amount     || payload.monto       || 0,
    currency:   payload.currency   || 'USD',
    concepto:   payload.concepto   || payload.description || '',
    // Call fields (used by llamada-perdida workflow)
    caller_number: payload.caller_number || '',
    caller_name:   payload.caller_name   || '',
    // Raw payload passthrough
    ...payload,
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    console.log(`[n8n] Webhook [${event}] → ${url} | status: ${res.status}`)
  } catch (err) {
    console.error(`[n8n] Webhook Error [${event}]:`, err)
  }
}
