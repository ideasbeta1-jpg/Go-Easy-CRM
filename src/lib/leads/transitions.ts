export const VALID_TRANSITIONS: Record<string, string[]> = {
  lead_nuevo:          ['en_cotizacion', 'cerrado_perdido'],
  en_cotizacion:       ['reserva_confirmada', 'lead_nuevo', 'cerrado_perdido'],
  reserva_confirmada:  ['voucher_enviado', 'cerrado_perdido'],
  voucher_enviado:     ['cerrado_ganado', 'cerrado_perdido'],
  cerrado_ganado:      [],
  cerrado_perdido:     [],
}

export const STAGE_AUTOMATION_NOTE: Record<string, string> = {
  en_cotizacion:      'Enviará cotización por WhatsApp y email al cliente.',
  reserva_confirmada: 'Enviará confirmación de reserva por WhatsApp y email.',
  voucher_enviado:    'Enviará el voucher oficial por WhatsApp y email.',
  cerrado_ganado:     'Enviará mensaje de cierre exitoso y agradecimiento al cliente.',
}

// Stages that require a confirmation modal before moving
export const CONFIRM_STAGES = new Set(['voucher_enviado', 'cerrado_ganado'])

// The lost stage always requires a reason modal
export const LOST_STAGE = 'cerrado_perdido'

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
