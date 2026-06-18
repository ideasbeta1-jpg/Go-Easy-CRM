-- ============================================================================
-- Go Easy CRM — Esquema Completo de Base de Datos (PostgreSQL / Supabase)
-- ----------------------------------------------------------------------------
-- Proyecto Supabase: oupphpttipkedntaxizk · PostgreSQL 17.6
-- Generado/verificado: 2026-06-17
--
-- Este archivo reconstruye toda la capa `public` del CRM desde cero:
--   1. Extensiones        6. Triggers
--   2. Tipos (enums)      7. Row Level Security (habilitar + políticas)
--   3. Funciones          8. Datos semilla (automation_config, automation_rules)
--   4. Tablas             9. Storage buckets (referencia)
--   5. Índices
--
-- Orden pensado para respetar dependencias de claves foráneas. Es idempotente
-- en lo razonable (IF NOT EXISTS / OR REPLACE) salvo en ENUM y políticas, donde
-- Postgres no soporta IF NOT EXISTS en todos los casos.
--
-- NOTA: las tablas referencian `auth.users` (esquema gestionado por Supabase Auth).
-- ============================================================================


-- ============================================================================
-- 1. EXTENSIONES
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto"   WITH SCHEMA extensions;


-- ============================================================================
-- 2. TIPOS PERSONALIZADOS (ENUMS)
-- ============================================================================

-- Estados del pipeline de ventas. cerrado_ganado / cerrado_perdido sustituyen
-- al antiguo `cerrado` (conservado por compatibilidad con registros históricos).
DO $$ BEGIN
  CREATE TYPE public.lead_status AS ENUM (
    'lead_nuevo',
    'en_cotizacion',
    'reserva_confirmada',
    'voucher_enviado',
    'cerrado',            -- legacy
    'cerrado_ganado',
    'cerrado_perdido'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Roles de usuario del CRM.
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'agente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 3. FUNCIONES
-- ============================================================================

-- Devuelve true si el usuario autenticado es admin y NO está deshabilitado.
-- SECURITY DEFINER para poder leer profiles dentro de las políticas RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND disabled = false
  );
$$;

-- Crea automáticamente un profile cuando se registra un usuario en auth.users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'agente'::public.user_role)
  );
  RETURN NEW;
END;
$$;

-- Marca como inactivos a los agentes que superaron su inactivity_timeout.
-- Pensada para ejecutarse vía cron / pg_cron.
CREATE OR REPLACE FUNCTION public.cleanup_stale_agents()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET is_active = false
  WHERE is_active = true
    AND last_active_at < NOW() - (inactivity_timeout || ' minutes')::interval;
END;
$$;

-- Última conversación (preview) de cada lead — usado por la bandeja de chats.
CREATE OR REPLACE FUNCTION public.get_conversation_previews(p_lead_ids uuid[])
RETURNS TABLE (
  id uuid, lead_id uuid, content text, direction text,
  media_url text, media_type text, is_read boolean, status text,
  created_at timestamptz
)
LANGUAGE sql STABLE
SET search_path TO ''
AS $$
  SELECT DISTINCT ON (m.lead_id)
    m.id, m.lead_id, m.content, m.direction, m.media_url, m.media_type,
    m.is_read, m.status, m.created_at
  FROM public.messages m
  WHERE m.lead_id = ANY(p_lead_ids)
  ORDER BY m.lead_id, m.created_at DESC;
$$;

-- Hereda contact_id desde el lead cuando un mensaje se inserta sin él.
CREATE OR REPLACE FUNCTION public.set_message_contact_id()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.contact_id IS NULL AND NEW.lead_id IS NOT NULL THEN
    SELECT contact_id INTO NEW.contact_id FROM public.leads WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Mantiene updated_at = now() en UPDATE (genérico).
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Igual que la anterior, dedicada a tasks.
CREATE OR REPLACE FUNCTION public.update_tasks_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


-- ============================================================================
-- 4. TABLAS
-- ============================================================================

-- ---- 4.1 Catálogos maestros -------------------------------------------------

CREATE TABLE IF NOT EXISTS public.categories (
  id              uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name            text NOT NULL,
  daily_price     numeric NOT NULL,
  base_daily_cost numeric,                       -- costo real del proveedor (interno)
  image_url       text,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.providers (
  id                uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name              text NOT NULL,
  contact_name      text,
  email             text,
  whatsapp_group_id text,                        -- integración n8n / Evolution
  logo_url          text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.locations (
  id         uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name       text NOT NULL UNIQUE,
  code       text,
  type       text,                               -- airport | downtown | terminal
  created_at timestamptz DEFAULT now()
);
COMMENT ON COLUMN public.locations.type IS 'Type of site (e.g., airport, downtown, terminal)';

CREATE TABLE IF NOT EXISTS public.provider_offices (
  id          uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  provider_id uuid NOT NULL REFERENCES public.providers(id),
  location_id uuid NOT NULL REFERENCES public.locations(id),
  address     text,
  phone       text,
  hours       text,
  notes       text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (provider_id, location_id)
);

-- ---- 4.2 Usuarios y contactos ----------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id                   uuid PRIMARY KEY REFERENCES auth.users(id),
  role                 public.user_role NOT NULL DEFAULT 'agente',
  full_name            text,
  first_name           text,
  last_name            text,
  phone                text,
  whatsapp_number      text,
  bio                  text,
  avatar_url           text,
  is_active            boolean DEFAULT false,       -- online/offline (presencia)
  last_active_at       timestamptz DEFAULT now(),
  last_assigned_at     timestamptz DEFAULT now(),   -- cola Round Robin
  inactivity_timeout   integer DEFAULT 60,          -- minutos
  zadarma_sip          text,                        -- extensión PBX
  zadarma_sip_password text,
  disabled             boolean NOT NULL DEFAULT false,
  updated_at           timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.profiles.disabled IS 'Controlado por admin. Si es true, el agente no recibe nuevos leads vía Round Robin.';

CREATE TABLE IF NOT EXISTS public.contacts (
  id               uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  first_name       text,
  last_name        text,
  email            text,
  phone            text,
  phone_normalized text,                            -- clave de deduplicación
  assigned_to      uuid REFERENCES auth.users(id),  -- agente "dueño" del cliente
  source           text,
  utm_source       text,
  utm_medium       text,
  utm_campaign     text,
  utm_term         text,
  utm_content      text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz                       -- soft delete
);

-- ---- 4.3 Pipeline central ---------------------------------------------------

CREATE TABLE IF NOT EXISTS public.leads (
  id                          uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  first_name                  text NOT NULL,
  last_name                   text NOT NULL,
  phone                       text,
  email                       text,
  pickup_date                 timestamptz,
  return_date                 timestamptz,
  pickup_location             text,
  pickup_location_id          uuid REFERENCES public.locations(id),
  return_location             text,
  return_location_id          uuid REFERENCES public.locations(id),
  category_id                 uuid REFERENCES public.categories(id),
  status                      public.lead_status NOT NULL DEFAULT 'lead_nuevo',
  status_changed_at           timestamptz,                 -- para reglas de inactividad
  assigned_to                 uuid REFERENCES auth.users(id),
  provider_id                 uuid REFERENCES public.providers(id),
  contact_id                  uuid REFERENCES public.contacts(id),
  rate_plan                   text DEFAULT 'base',         -- base | premium
  agreed_daily_price          numeric,                     -- ganancia Go Easy / día
  total_amount                numeric,
  deposit_paid                boolean NOT NULL DEFAULT false,
  stripe_payment_id           text,
  source                      text,
  utm_source                  text,
  utm_medium                  text,
  utm_campaign                text,
  utm_term                    text,
  utm_content                 text,
  notes                       text,                        -- internas (solo staff)
  lost_reason                 text,                        -- al pasar a cerrado_perdido
  draft_provider_confirmation text,                        -- borrador previo a voucher
  draft_conductor_nombre      text,
  draft_conductor_telefono    text,
  deleted_at                  timestamptz,                 -- soft delete
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- ---- 4.4 Documentos de salida ----------------------------------------------

CREATE TABLE IF NOT EXISTS public.quotes (
  id             uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  lead_id        uuid NOT NULL REFERENCES public.leads(id),
  stripe_link    text,
  pdf_url        text,
  total_amount   numeric,
  deposit_amount numeric,                          -- depósito a cobrar online
  pickup_date    timestamptz,                      -- snapshot
  return_date    timestamptz,                      -- snapshot
  expires_at     timestamptz,
  is_active      boolean NOT NULL DEFAULT true,     -- false al regenerar
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vouchers (
  id                    uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  lead_id               uuid NOT NULL REFERENCES public.leads(id),
  confirmation_number   text NOT NULL,            -- GF-XXXXXX
  provider_confirmation text,                      -- ID oficial de la rentadora
  voucher_url           text,
  conductor_nombre      text,
  conductor_telefono    text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ---- 4.5 Comunicación -------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.messages (
  id         uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  lead_id    uuid REFERENCES public.leads(id),
  contact_id uuid REFERENCES public.contacts(id),
  content    text NOT NULL,
  direction  text CHECK (direction IN ('inbound', 'outbound')),
  media_url  text,
  media_type text,                                 -- audio/ogg, image/jpeg, ...
  wamid      text,                                 -- WhatsApp message id
  status     text DEFAULT 'sent',                  -- sent|delivered|read|failed
  is_read    boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    uuid NOT NULL REFERENCES public.leads(id),
  agent_id   uuid REFERENCES public.profiles(id),
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid NOT NULL REFERENCES public.leads(id),
  event_type  text NOT NULL,                       -- stage_change|payment_confirmed|...
  actor_id    uuid REFERENCES public.profiles(id),
  actor_label text,
  from_status text,
  to_status   text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id),
  type       text NOT NULL,                        -- lead_assigned|payment_confirmed|...
  title      text NOT NULL,
  body       text,
  link       text,
  lead_id    uuid REFERENCES public.leads(id),
  is_read    boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.call_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid REFERENCES public.leads(id),
  agent_id        uuid REFERENCES public.profiles(id),
  zadarma_call_id text UNIQUE,
  caller_number   text,
  called_number   text,
  pbx_extension   text,
  direction       text CHECK (direction IN ('inbound', 'outbound')),
  status          text DEFAULT 'initiated',        -- initiated|answered|missed|failed|ended
  duration        integer DEFAULT 0,               -- segundos
  recording_url   text,
  started_at      timestamptz,
  answered_at     timestamptz,
  ended_at        timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id),
  endpoint   text NOT NULL,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

-- ---- 4.6 Tareas / seguimiento ----------------------------------------------

CREATE TABLE IF NOT EXISTS public.tasks (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id            uuid NOT NULL REFERENCES public.leads(id),
  task_type          text NOT NULL DEFAULT 'call',     -- call|whatsapp|meeting|email|custom
  title              text NOT NULL,
  description        text,
  due_date           timestamptz,
  assigned_to        uuid REFERENCES auth.users(id),
  status             text NOT NULL DEFAULT 'pending',  -- pending|in_progress|completed|cancelled
  priority           text NOT NULL DEFAULT 'medium',   -- low|medium|high|urgent
  outcome            text,                             -- positive|negative|no_answer
  outcome_notes      text,
  completed_at       timestamptz,
  completed_by       uuid REFERENCES auth.users(id),
  follow_up_rules    jsonb NOT NULL DEFAULT '{}'::jsonb,  -- acciones por outcome
  parent_task_id     uuid REFERENCES public.tasks(id),
  automation_rule_id uuid,                             -- regla que la generó (auditoría)
  source             text NOT NULL DEFAULT 'manual',   -- manual|automation
  created_by         uuid REFERENCES auth.users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ---- 4.7 Configuración del CRM ---------------------------------------------

CREATE TABLE IF NOT EXISTS public.email_templates (
  id         uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  stage      text NOT NULL UNIQUE,                 -- etapa del pipeline
  subject    text NOT NULL,
  body       text NOT NULL,                        -- HTML
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_template_mappings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL UNIQUE,              -- nombre exacto en Meta
  stage         text,
  language_code text DEFAULT 'es',
  mappings      jsonb NOT NULL DEFAULT '{}'::jsonb, -- variable template -> campo lead
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  id               integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- singleton
  crm_name         text DEFAULT 'Go Easy CRM',
  crm_tagline      text DEFAULT 'Premium Car Rental CRM',
  logo_url         text,
  favicon_url      text,
  seo_title        text DEFAULT 'Go Easy CRM - Premium Car Rental',
  seo_description  text DEFAULT 'The most advanced CRM for car rental businesses.',
  seo_keywords     text DEFAULT 'crm, car rental, florida, management',
  google_config    jsonb DEFAULT '{}'::jsonb,
  ai_search_config jsonb DEFAULT '{}'::jsonb,
  updated_at       timestamptz DEFAULT now()
);

-- ---- 4.8 Motor de automatización -------------------------------------------

-- Habilita/deshabilita cada canal por etapa. PK compuesta (stage, channel).
CREATE TABLE IF NOT EXISTS public.automation_config (
  stage      text NOT NULL,
  channel    text NOT NULL,    -- whatsapp|email|n8n|in_app|meta_capi|agent_whatsapp
  enabled    boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (stage, channel)
);

-- Reglas configurables del motor (delays, fechas, inactividad -> acciones).
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      text NOT NULL,
  enabled                   boolean DEFAULT true,
  trigger_type              text NOT NULL,        -- stage_delay|date_field|inactivity
  trigger_stage             text,
  trigger_delay_hours       integer,
  trigger_date_field        text,                 -- pickup_date|return_date
  trigger_date_offset_hours integer DEFAULT -24,
  action_type               text NOT NULL,        -- whatsapp_template|whatsapp_text|change_stage|notify_agent|create_task
  action_template           text,
  action_message            text,
  action_stage              text,
  task_payload              jsonb,                -- config de la tarea a crear
  created_at                timestamptz DEFAULT now()
);

-- Cola de acciones diferidas que el cron ejecuta cuando execute_at <= now().
CREATE TABLE IF NOT EXISTS public.pending_actions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id        uuid REFERENCES public.automation_rules(id),
  lead_id        uuid NOT NULL,
  execute_at     timestamptz NOT NULL,
  status         text DEFAULT 'pending',          -- pending|processing|done|failed|cancelled
  action_type    text NOT NULL,
  action_payload jsonb DEFAULT '{}'::jsonb,
  error          text,
  executed_at    timestamptz,
  created_at     timestamptz DEFAULT now()
);

-- Bitácora de cada ejecución del motor (un registro por canal).
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       uuid REFERENCES public.leads(id),
  stage         text NOT NULL,
  channel       text NOT NULL,
  template_name text,
  status        text DEFAULT 'sent',              -- sent|failed|skipped|success|error
  error_message text,
  created_at    timestamptz DEFAULT now()
);

-- Bitácora centralizada de salud del sistema (alimenta /dashboard/logs).
CREATE TABLE IF NOT EXISTS public.system_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category   text NOT NULL,                        -- whatsapp|email|payment|form|system|n8n|meta_capi
  severity   text NOT NULL DEFAULT 'error',        -- info|warning|error|critical
  source     text NOT NULL,
  status     text,                                 -- success|failed|skipped
  message    text NOT NULL,
  error      text,
  lead_id    uuid REFERENCES public.leads(id),
  context    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================================
-- 5. ÍNDICES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_leads_active              ON public.leads (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to         ON public.leads (assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_category_id         ON public.leads (category_id);
CREATE INDEX IF NOT EXISTS idx_leads_provider_id         ON public.leads (provider_id);
CREATE INDEX IF NOT EXISTS idx_leads_pickup_location_id  ON public.leads (pickup_location_id);
CREATE INDEX IF NOT EXISTS idx_leads_return_location_id  ON public.leads (return_location_id);
CREATE INDEX IF NOT EXISTS leads_contact_id_idx          ON public.leads (contact_id);

CREATE INDEX IF NOT EXISTS contacts_assigned_to_idx      ON public.contacts (assigned_to);
CREATE UNIQUE INDEX IF NOT EXISTS contacts_phone_normalized_key
  ON public.contacts (phone_normalized)
  WHERE phone_normalized IS NOT NULL AND char_length(phone_normalized) >= 7;

CREATE INDEX IF NOT EXISTS idx_messages_lead_created     ON public.messages (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_contact_id_idx       ON public.messages (contact_id);
CREATE UNIQUE INDEX IF NOT EXISTS messages_wamid_unique  ON public.messages (wamid) WHERE wamid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id        ON public.lead_notes (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_agent_id       ON public.lead_notes (agent_id);
CREATE INDEX IF NOT EXISTS lead_events_lead_id_created_at_idx ON public.lead_events (lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotes_lead_created       ON public.quotes (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vouchers_lead_created     ON public.vouchers (lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx      ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx      ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx  ON public.notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS notifications_created_at_idx   ON public.notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_lead_id      ON public.notifications (lead_id);

CREATE INDEX IF NOT EXISTS idx_call_logs_lead_id         ON public.call_logs (lead_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_agent_id        ON public.call_logs (agent_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_started_at      ON public.call_logs (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_lead_id             ON public.tasks (lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned            ON public.tasks (assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by          ON public.tasks (created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_by        ON public.tasks (completed_by);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id      ON public.tasks (parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status              ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date            ON public.tasks (due_date);

CREATE INDEX IF NOT EXISTS idx_pending_actions_execute   ON public.pending_actions (execute_at, status);
CREATE INDEX IF NOT EXISTS idx_pending_actions_lead      ON public.pending_actions (lead_id);
CREATE INDEX IF NOT EXISTS idx_pending_actions_rule_id   ON public.pending_actions (rule_id);

CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON public.automation_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_automation_logs_lead_id   ON public.automation_logs (lead_id);

CREATE INDEX IF NOT EXISTS system_logs_created_at_idx        ON public.system_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS system_logs_category_severity_idx ON public.system_logs (category, severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_provider_offices_location_id  ON public.provider_offices (location_id);

-- Cola Round Robin: agentes activos / asignables ordenados por antigüedad.
CREATE INDEX IF NOT EXISTS idx_active_agents      ON public.profiles (is_active, last_assigned_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_profiles_assignment
  ON public.profiles (role, disabled, last_assigned_at NULLS FIRST)
  WHERE role = 'agente' AND disabled = false;


-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_set_message_contact_id ON public.messages;
CREATE TRIGGER trg_set_message_contact_id
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_message_contact_id();

DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_tasks_updated_at();

-- Crea el profile al alta de un usuario en Supabase Auth.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- Patrón general:
--   * authenticated  -> acceso filtrado por rol (is_admin()) o por pertenencia
--                       (assigned_to = auth.uid()).
--   * service_role   -> bypass total (webhooks / cron usan la service key).
--
-- ⚠️ automation_logs NO tiene RLS habilitado en producción (queda expuesta a la
--    anon key). Ver nota al final del archivo antes de habilitarla.
-- ============================================================================

ALTER TABLE public.categories                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_offices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_template_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_config          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_actions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs                ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.automation_logs         ENABLE ROW LEVEL SECURITY;  -- ver nota final

-- ---- Catálogos: lectura para autenticados, escritura para admin -------------
CREATE POLICY categories_select_authenticated ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY categories_write_admin          ON public.categories FOR ALL    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY categories_all_service_role     ON public.categories FOR ALL    TO service_role  USING (true) WITH CHECK (true);

CREATE POLICY providers_select  ON public.providers FOR SELECT TO authenticated USING (true);
CREATE POLICY providers_all     ON public.providers FOR ALL    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY locations_select  ON public.locations FOR SELECT USING (true);
CREATE POLICY locations_all     ON public.locations FOR ALL    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY provider_offices_select ON public.provider_offices FOR SELECT USING (true);
CREATE POLICY provider_offices_all    ON public.provider_offices FOR ALL    TO authenticated USING (true) WITH CHECK (true);

-- ---- Profiles --------------------------------------------------------------
CREATE POLICY profiles_select_authenticated ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_update_own           ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_admin         ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY profiles_all_service_role     ON public.profiles FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- ---- Contacts --------------------------------------------------------------
CREATE POLICY contacts_select       ON public.contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY contacts_insert       ON public.contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY contacts_update       ON public.contacts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY contacts_admin_all    ON public.contacts FOR ALL    USING (public.is_admin());
CREATE POLICY contacts_service_role ON public.contacts FOR ALL    TO service_role USING (true) WITH CHECK (true);

-- ---- Leads (admin ve todo; agente solo los asignados) ----------------------
CREATE POLICY leads_select          ON public.leads FOR SELECT TO authenticated USING (public.is_admin() OR assigned_to = auth.uid());
CREATE POLICY leads_insert          ON public.leads FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR assigned_to = auth.uid());
CREATE POLICY leads_update          ON public.leads FOR UPDATE TO authenticated USING (public.is_admin() OR assigned_to = auth.uid()) WITH CHECK (public.is_admin() OR assigned_to = auth.uid());
CREATE POLICY leads_delete_admin    ON public.leads FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY leads_all_service_role ON public.leads FOR ALL   TO service_role  USING (true) WITH CHECK (true);

-- ---- Quotes (heredan visibilidad del lead) ---------------------------------
CREATE POLICY quotes_select ON public.quotes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = quotes.lead_id AND (l.assigned_to = auth.uid() OR public.is_admin())));
CREATE POLICY quotes_insert ON public.quotes FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = quotes.lead_id AND (l.assigned_to = auth.uid() OR public.is_admin())));
CREATE POLICY quotes_update ON public.quotes FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = quotes.lead_id AND (l.assigned_to = auth.uid() OR public.is_admin())));
CREATE POLICY quotes_delete ON public.quotes FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = quotes.lead_id AND (l.assigned_to = auth.uid() OR public.is_admin())));

-- ---- Vouchers --------------------------------------------------------------
CREATE POLICY vouchers_select ON public.vouchers FOR SELECT TO authenticated USING (true);
CREATE POLICY vouchers_insert ON public.vouchers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY vouchers_update ON public.vouchers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ---- Messages (heredan visibilidad del lead) -------------------------------
CREATE POLICY messages_select          ON public.messages FOR SELECT TO authenticated USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = messages.lead_id AND l.assigned_to = auth.uid()));
CREATE POLICY messages_insert          ON public.messages FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = messages.lead_id AND l.assigned_to = auth.uid()));
CREATE POLICY messages_all_service_role ON public.messages FOR ALL  TO service_role USING (true) WITH CHECK (true);

-- ---- Lead notes ------------------------------------------------------------
CREATE POLICY lead_notes_all ON public.lead_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- Lead events -----------------------------------------------------------
CREATE POLICY lead_events_select          ON public.lead_events FOR SELECT TO authenticated USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_events.lead_id AND l.assigned_to = auth.uid()));
CREATE POLICY lead_events_insert          ON public.lead_events FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_events.lead_id AND l.assigned_to = auth.uid()));
CREATE POLICY lead_events_all_service_role ON public.lead_events FOR ALL  TO service_role USING (true) WITH CHECK (true);

-- ---- Notifications (cada usuario ve las suyas) -----------------------------
CREATE POLICY users_select_own_notifications ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY users_update_own_notifications ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY users_delete_own_notifications ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY service_role_insert_notifications ON public.notifications FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY service_role_select_notifications ON public.notifications FOR SELECT TO service_role USING (true);

-- ---- Call logs -------------------------------------------------------------
CREATE POLICY agents_read_own_calls ON public.call_logs FOR SELECT USING (agent_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY call_logs_service_role ON public.call_logs FOR ALL USING (auth.role() = 'service_role');

-- ---- Push subscriptions ----------------------------------------------------
CREATE POLICY push_manage_own  ON public.push_subscriptions FOR ALL    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY push_service_read ON public.push_subscriptions FOR SELECT TO service_role USING (true);

-- ---- Tasks (asignado, creador o admin) -------------------------------------
CREATE POLICY tasks_select ON public.tasks FOR SELECT USING (auth.uid() = assigned_to OR auth.uid() = created_by OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY tasks_insert ON public.tasks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY tasks_update ON public.tasks FOR UPDATE USING (auth.uid() = assigned_to OR auth.uid() = created_by OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ---- Plantillas y configuración --------------------------------------------
CREATE POLICY email_templates_read ON public.email_templates FOR SELECT USING (true);
CREATE POLICY email_templates_all  ON public.email_templates FOR ALL    USING (auth.role() = 'authenticated');

CREATE POLICY wtm_select ON public.whatsapp_template_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY wtm_insert ON public.whatsapp_template_mappings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY wtm_update ON public.whatsapp_template_mappings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY system_settings_select ON public.system_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY system_settings_update ON public.system_settings FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ---- Motor de automatización -----------------------------------------------
-- automation_config / automation_rules / pending_actions: gestionados por
-- admin desde la UI (server actions con sesión) y por service_role (cron).
CREATE POLICY automation_config_all   ON public.automation_config FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY automation_config_svc   ON public.automation_config FOR ALL TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY automation_rules_all    ON public.automation_rules  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY automation_rules_svc    ON public.automation_rules  FOR ALL TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY pending_actions_all     ON public.pending_actions   FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY pending_actions_svc     ON public.pending_actions   FOR ALL TO service_role  USING (true) WITH CHECK (true);

-- ---- System logs (solo admin lee; service_role escribe) --------------------
CREATE POLICY system_logs_select_admin    ON public.system_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY system_logs_all_service_role ON public.system_logs FOR ALL   TO service_role  USING (true) WITH CHECK (true);


-- ============================================================================
-- 8. DATOS SEMILLA
-- ============================================================================

-- Fila singleton de configuración del sistema.
INSERT INTO public.system_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Matriz canal × etapa (todo habilitado por defecto). El motor asume "enabled"
-- cuando no existe la fila, así que esto es opcional pero recomendado para la UI.
INSERT INTO public.automation_config (stage, channel, enabled) VALUES
  ('lead_nuevo',         'whatsapp',       true),
  ('lead_nuevo',         'email',          true),
  ('lead_nuevo',         'in_app',         true),
  ('lead_nuevo',         'n8n',            true),
  ('lead_nuevo',         'meta_capi',      true),
  ('en_cotizacion',      'whatsapp',       true),
  ('en_cotizacion',      'email',          true),
  ('en_cotizacion',      'in_app',         true),
  ('en_cotizacion',      'n8n',            true),
  ('en_cotizacion',      'meta_capi',      true),
  ('reserva_confirmada', 'whatsapp',       true),
  ('reserva_confirmada', 'email',          true),
  ('reserva_confirmada', 'in_app',         true),
  ('reserva_confirmada', 'n8n',            true),
  ('reserva_confirmada', 'meta_capi',      true),
  ('reserva_confirmada', 'agent_whatsapp', true),
  ('voucher_enviado',    'whatsapp',       true),
  ('voucher_enviado',    'email',          true),
  ('voucher_enviado',    'in_app',         true),
  ('voucher_enviado',    'n8n',            true),
  ('voucher_enviado',    'meta_capi',      true),
  ('cerrado_ganado',     'whatsapp',       true),
  ('cerrado_ganado',     'email',          true),
  ('cerrado_ganado',     'in_app',         true),
  ('cerrado_ganado',     'n8n',            true),
  ('cerrado_perdido',    'in_app',         true),
  ('cerrado_perdido',    'n8n',            true)
ON CONFLICT (stage, channel) DO NOTHING;


-- ============================================================================
-- 9. STORAGE BUCKETS (referencia — crear desde el panel de Supabase o API)
-- ----------------------------------------------------------------------------
--   avatars         -> fotos de perfil (público lectura)
--   chat_media      -> audios/imágenes/documentos de WhatsApp (público lectura)
--   provider-logos  -> logos de rentadoras (público lectura)
--   vehicles        -> imágenes de flota por categoría (público lectura)
-- ============================================================================


-- ============================================================================
-- NOTA DE SEGURIDAD — automation_logs
-- ----------------------------------------------------------------------------
-- En producción esta tabla tiene RLS DESHABILITADO, por lo que queda expuesta a
-- las roles anon/authenticated. El motor escribe en ella con service_role. Para
-- cerrarla sin romper el dashboard de fallos, habilitar RLS y añadir políticas:
--
--   ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY automation_logs_select_admin ON public.automation_logs
--     FOR SELECT TO authenticated USING (public.is_admin());
--   CREATE POLICY automation_logs_service_role ON public.automation_logs
--     FOR ALL TO service_role USING (true) WITH CHECK (true);
--
-- Validar primero que /dashboard/automations (FailedLogsPanel) siga leyendo.
-- ============================================================================
