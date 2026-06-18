import { createAdminClient } from './supabase/admin'

/**
 * Bitácora central del sistema (tabla `system_logs`).
 *
 * Punto único por el que pasan TODOS los eventos relevantes que pueden fallar
 * fuera del flujo de automatización del pipeline: pagos, formularios y caídas
 * de integraciones. Alimenta la página /dashboard/logs y el semáforo de salud.
 *
 * Diseñado para no romper nunca el flujo del que lo llama: si el insert falla,
 * solo registra en consola (igual que logAutomation en automation-engine).
 */

export type LogCategory =
  | 'whatsapp'
  | 'email'
  | 'payment'
  | 'form'
  | 'system'
  | 'n8n'
  | 'meta_capi'

export type LogSeverity = 'info' | 'warning' | 'error' | 'critical'

export type LogStatus = 'success' | 'failed' | 'skipped'

interface LogEventParams {
  category: LogCategory
  /** Origen técnico, ej. 'stripe_webhook', 'lead_form', 'automation_engine' */
  source: string
  message: string
  severity?: LogSeverity
  status?: LogStatus
  error?: string | null
  leadId?: string | null
  context?: Record<string, any>
}

export async function logSystemEvent({
  category,
  source,
  message,
  severity = 'error',
  status,
  error,
  leadId,
  context = {},
}: LogEventParams): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from('system_logs').insert({
      category,
      source,
      message,
      severity,
      status: status ?? null,
      error: error ?? null,
      lead_id: leadId ?? null,
      context,
    })
  } catch (err) {
    // Nunca propagamos: un fallo al loguear no debe tumbar el flujo principal.
    console.error('[system-log] No se pudo registrar el evento:', err, { category, source, message })
  }
}
