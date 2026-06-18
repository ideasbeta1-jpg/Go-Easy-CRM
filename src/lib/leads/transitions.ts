// Orden del pipeline de venta. `cerrado_perdido` es un desenlace lateral (lost)
// al que se puede llegar desde cualquier etapa, no forma parte del avance lineal.
export const STAGE_ORDER = [
  'lead_nuevo',
  'en_cotizacion',
  'reserva_confirmada',
  'voucher_enviado',
  'cerrado_ganado',
]

// The lost stage always requires a reason modal
export const LOST_STAGE = 'cerrado_perdido'

// Transiciones permitidas desde cada etapa. La regla:
//   - AVANZAR a la siguiente etapa del pipeline (dispara su automatización:
//     generar cotización, enviar voucher, etc.).
//   - RETROCEDER a cualquier etapa anterior (p. ej. regenerar una cotización o
//     reenviar un voucher moviendo el lead hacia atrás).
//   - Marcar como PERDIDO desde cualquier etapa.
//   - Las etapas terminales (ganado/perdido) pueden REABRIRSE hacia cualquier
//     etapa del pipeline.
function buildValidTransitions(): Record<string, string[]> {
  const transitions: Record<string, string[]> = {}
  STAGE_ORDER.forEach((stage, i) => {
    const back = STAGE_ORDER.slice(0, i)              // todas las etapas anteriores
    const next = STAGE_ORDER[i + 1] ? [STAGE_ORDER[i + 1]] : []  // la siguiente
    transitions[stage] = [...back, ...next, LOST_STAGE]
  })
  // Un lead perdido puede reactivarse hacia cualquier etapa del pipeline.
  transitions[LOST_STAGE] = [...STAGE_ORDER]
  return transitions
}

export const VALID_TRANSITIONS: Record<string, string[]> = buildValidTransitions()

export const STAGE_AUTOMATION_NOTE: Record<string, string> = {
  en_cotizacion:      'Enviará cotización por WhatsApp y email al cliente.',
  reserva_confirmada: 'Enviará confirmación de reserva por WhatsApp y email.',
  voucher_enviado:    'Enviará el voucher oficial por WhatsApp y email.',
  cerrado_ganado:     'Enviará mensaje de cierre exitoso y agradecimiento al cliente.',
}

// Etapas que disparan una automatización con envío al cliente (cotización,
// confirmación, voucher, cierre). Requieren confirmación antes de mover, porque
// ahora se puede retroceder a ellas y eso reenviaría mensajes al cliente.
export const CONFIRM_STAGES = new Set([
  'en_cotizacion',
  'reserva_confirmada',
  'voucher_enviado',
  'cerrado_ganado',
])

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  lead_nuevo:          { label: 'Lead Nuevo',         color: 'bg-blue-500' },
  en_cotizacion:       { label: 'En Cotización',       color: 'bg-indigo-500' },
  reserva_confirmada:  { label: 'Reserva Confirmada',  color: 'bg-emerald-500' },
  voucher_enviado:     { label: 'Voucher Enviado',     color: 'bg-amber-500' },
  cerrado_ganado:      { label: 'Cerrado Ganado',      color: 'bg-emerald-600' },
  cerrado_perdido:     { label: 'Cerrado Perdido',     color: 'bg-rose-400' },
}

export const STATUSES = Object.keys(VALID_TRANSITIONS)

export const STAGE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])
)

export const LOST_REASONS = [
  'Precio muy alto',
  'Eligió a la competencia',
  'Sin respuesta del cliente',
  'Cambió de planes / canceló viaje',
  'Fechas no disponibles',
  'No calificó (requisitos)',
  'Otro',
]
