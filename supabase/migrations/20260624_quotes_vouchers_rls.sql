-- =====================================================
-- RLS: quotes y vouchers (historial del lead)
-- =====================================================
-- La migración 20260522_rls_core_tables.sql habilitó RLS solo en
-- profiles/leads/messages. Las tablas `quotes` y `vouchers` —que alimentan el
-- historial del lead y el flujo de cotización del admin— quedaron sin políticas
-- en migraciones (solo estaban en docs/schema.sql).
--
-- Síntoma si RLS quedó activado sin políticas: el admin/agente no puede generar
-- cotizaciones (INSERT denegado) y estas no aparecen en el historial (SELECT
-- denegado). Si RLS quedó desactivado: cualquier sesión autenticada las ve.
--
-- Esta migración es IDEMPOTENTE y deja el estado correcto en ambos casos:
--   admins        → acceso total
--   agentes       → cotizaciones/vouchers de leads asignados a ellos
--   service_role  → bypass de RLS (webhook de Stripe, cron) — implícito
-- =====================================================

ALTER TABLE public.quotes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- ---- Quotes (heredan la visibilidad del lead) ------------------------------
DROP POLICY IF EXISTS quotes_select ON public.quotes;
DROP POLICY IF EXISTS quotes_insert ON public.quotes;
DROP POLICY IF EXISTS quotes_update ON public.quotes;
DROP POLICY IF EXISTS quotes_delete ON public.quotes;

CREATE POLICY quotes_select ON public.quotes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = quotes.lead_id AND (l.assigned_to = auth.uid() OR public.is_admin())
  ));

CREATE POLICY quotes_insert ON public.quotes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = quotes.lead_id AND (l.assigned_to = auth.uid() OR public.is_admin())
  ));

CREATE POLICY quotes_update ON public.quotes
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = quotes.lead_id AND (l.assigned_to = auth.uid() OR public.is_admin())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = quotes.lead_id AND (l.assigned_to = auth.uid() OR public.is_admin())
  ));

CREATE POLICY quotes_delete ON public.quotes
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = quotes.lead_id AND (l.assigned_to = auth.uid() OR public.is_admin())
  ));

-- ---- Vouchers (también aparecen en el historial del lead) -------------------
DROP POLICY IF EXISTS vouchers_select ON public.vouchers;
DROP POLICY IF EXISTS vouchers_insert ON public.vouchers;
DROP POLICY IF EXISTS vouchers_update ON public.vouchers;

CREATE POLICY vouchers_select ON public.vouchers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY vouchers_insert ON public.vouchers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY vouchers_update ON public.vouchers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
