// Registro de eventos del lead (tabla `lead_events`). Append-only: cada acción
// genera un registro nuevo que alimenta la Línea de Tiempo. Ver migración
// supabase/migrations/20260617_add_lead_events.sql.

export const LEAD_EVENT = {
  LEAD_CREATED: 'lead_created',
  STAGE_CHANGE: 'stage_change',
  QUOTE_GENERATED: 'quote_generated',
  VOUCHER_GENERATED: 'voucher_generated',
  PAYMENT_CONFIRMED: 'payment_confirmed',
  AGENT_ASSIGNED: 'agent_assigned',
  FIELD_CHANGED: 'field_changed',
  NOTE: 'note',
} as const

export type LeadEventType = (typeof LEAD_EVENT)[keyof typeof LEAD_EVENT]

export interface LogLeadEventParams {
  leadId: string
  type: LeadEventType
  /** id del agente que ejecutó la acción; null = sistema/automático */
  actorId?: string | null
  /** etiqueta cuando no hay actor humano (p. ej. 'Sistema', 'Cliente (pago Stripe)') */
  actorLabel?: string | null
  fromStatus?: string | null
  toStatus?: string | null
  metadata?: Record<string, any>
}

/**
 * Inserta un evento en `lead_events`. Recibe el cliente Supabase por parámetro
 * para poder usarse tanto con el cliente de usuario (server actions) como con
 * el admin/service-role (webhook de Stripe).
 *
 * Nunca lanza: un fallo de registro no debe romper la acción principal. Se
 * registra en consola y se devuelve `false`.
 */
export async function logLeadEvent(
  supabase: any,
  { leadId, type, actorId = null, actorLabel = null, fromStatus = null, toStatus = null, metadata = {} }: LogLeadEventParams
): Promise<boolean> {
  try {
    const { error } = await supabase.from('lead_events').insert({
      lead_id: leadId,
      event_type: type,
      actor_id: actorId,
      actor_label: actorLabel,
      from_status: fromStatus,
      to_status: toStatus,
      metadata,
    })
    if (error) {
      console.error('[logLeadEvent] insert error:', error.message)
      return false
    }
    return true
  } catch (e: any) {
    console.error('[logLeadEvent] unexpected error:', e?.message || e)
    return false
  }
}

// Campos del lead que se auditan como `field_changed` (con etiqueta legible).
export const TRACKED_LEAD_FIELDS: Record<string, string> = {
  total_amount: 'Monto total',
  pickup_date: 'Fecha de recogida',
  return_date: 'Fecha de devolución',
  category_id: 'Categoría de vehículo',
}
