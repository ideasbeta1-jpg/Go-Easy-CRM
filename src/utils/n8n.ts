const N8N_BASE_URL = process.env.N8N_WEBHOOK_URL || ''

// Maps each CRM event to its dedicated n8n webhook path
const WEBHOOK_PATHS: Record<string, string> = {
  lead_created:       'lead-created',
  quote_generated:    'quote-generated',
  payment_confirmed:  'payment-confirmed',
  voucher_generated:  'voucher-generated',
}

export async function sendLeadToN8n(leadId: string, event: string, payload: any = {}) {
  // First try event-specific webhook, fallback to generic
  const path = WEBHOOK_PATHS[event]
  const baseUrl = N8N_BASE_URL.replace(/\/+$/, '') // strip trailing slash
  
  if (!baseUrl) return

  const url = path 
    ? `${baseUrl}/${path}` 
    : baseUrl

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
         id: leadId,
         event,
         timestamp: new Date().toISOString(),
         ...payload
      })
    })
  } catch (err) {
    console.error(`n8n Webhook Error [${event}]:`, err)
  }
}
