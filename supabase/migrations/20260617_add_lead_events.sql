-- =====================================================
-- lead_events: registro de auditoría append-only del lead
-- =====================================================
-- Cada acción relevante sobre un lead genera un registro NUEVO (nunca se
-- sobreescribe), alimentando la "Línea de Tiempo". Cubre lo que las tablas
-- quotes/vouchers no registran: cambios de etapa (incl. hacia atrás),
-- confirmación de pago, reasignación de agente y edición de datos clave.
--
-- Estrategia RLS (igual que leads/messages):
--   admins       → acceso total
--   agentes      → solo eventos de leads asignados a ellos
--   service_role → sin restricción (webhook de Stripe, automatización)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.lead_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  event_type  text NOT NULL,
  -- null = acción del sistema/automática (ver actor_label)
  actor_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_label text,
  from_status text,
  to_status   text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_events_lead_id_created_at_idx
  ON public.lead_events (lead_id, created_at DESC);

ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;

-- Admins ven todos los eventos; agentes solo los de sus leads asignados
CREATE POLICY "lead_events_select"
  ON public.lead_events
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = lead_events.lead_id
        AND leads.assigned_to = auth.uid()
    )
  );

-- Usuarios autenticados pueden registrar eventos sobre leads a los que acceden
CREATE POLICY "lead_events_insert"
  ON public.lead_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = lead_id
        AND leads.assigned_to = auth.uid()
    )
  );

-- Service role: acceso total (webhook de Stripe, cron, automatización)
CREATE POLICY "lead_events_all_service_role"
  ON public.lead_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
