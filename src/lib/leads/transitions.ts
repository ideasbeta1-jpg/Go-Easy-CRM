export const VALID_TRANSITIONS: Record<string, string[]> = {
  lead_nuevo:          ['en_cotizacion', 'cerrado'],
  en_cotizacion:       ['reserva_confirmada', 'lead_nuevo', 'cerrado'],
  reserva_confirmada:  ['voucher_enviado', 'cerrado'],
  voucher_enviado:     ['cerrado'],
  cerrado:             [],
}

export const STAGE_AUTOMATION_NOTE: Record<string, string> = {
  en_cotizacion:      'Enviará cotización por WhatsApp y email al cliente.',
  reserva_confirmada: 'Enviará confirmación de reserva por WhatsApp y email.',
  voucher_enviado:    'Enviará el voucher oficial por WhatsApp y email.',
  cerrado:            'Enviará mensaje de cierre y finalizará el seguimiento.',
}

export const CONFIRM_STAGES = new Set(['voucher_enviado', 'cerrado'])

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  lead_nuevo:          { label: 'Lead Nuevo',        color: 'bg-slate-400' },
  en_cotizacion:       { label: 'En Cotización',      color: 'bg-indigo-500' },
  reserva_confirmada:  { label: 'Reserva Confirmada', color: 'bg-emerald-500' },
  voucher_enviado:     { label: 'Voucher Enviado',    color: 'bg-amber-500' },
  cerrado:             { label: 'Cerrado / Perdido',  color: 'bg-slate-300' },
}

export const STATUSES = Object.keys(VALID_TRANSITIONS)

export const STAGE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])
)
