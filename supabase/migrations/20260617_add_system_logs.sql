-- =====================================================
-- system_logs: registro central de eventos del sistema
-- =====================================================
-- Bitácora append-only de TODO lo que puede fallar fuera del flujo de un lead
-- concreto: pagos (Stripe), envío de email/WhatsApp, registro de formularios,
-- y caídas/desconexiones de integraciones ("sistema desconectado").
--
-- A diferencia de `automation_logs` (atada a una etapa del pipeline y con su
-- panel de reintento), esta tabla es genérica: category + severity + source.
-- Alimenta la página /dashboard/logs y el semáforo de salud de integraciones.
--
-- Estrategia RLS:
--   admins       → lectura total (es información de toda la operación)
--   service_role → acceso total (webhooks, cron, automatización, server actions)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.system_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- whatsapp | email | payment | form | system | n8n | meta_capi
  category    text NOT NULL,
  -- info | warning | error | critical
  severity    text NOT NULL DEFAULT 'error',
  -- origen técnico: automation_engine | stripe_webhook | lead_form | public_data ...
  source      text NOT NULL,
  -- success | failed | skipped (opcional, para eventos con resultado)
  status      text,
  -- texto legible para el operador
  message     text NOT NULL,
  -- detalle técnico del error (stack/mensaje de la API)
  error       text,
  -- lead relacionado si aplica (no todos los eventos tienen lead)
  lead_id     uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  -- payload arbitrario: event_id de Stripe, montos, request body, etc.
  context     jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Listado general ordenado por fecha
CREATE INDEX IF NOT EXISTS system_logs_created_at_idx
  ON public.system_logs (created_at DESC);

-- Filtros por categoría/severidad (página de logs y semáforo de salud)
CREATE INDEX IF NOT EXISTS system_logs_category_severity_idx
  ON public.system_logs (category, severity, created_at DESC);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Solo los admins pueden leer la bitácora del sistema
CREATE POLICY "system_logs_select_admin"
  ON public.system_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Service role: acceso total (webhooks de Stripe, cron, automatización)
CREATE POLICY "system_logs_all_service_role"
  ON public.system_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
