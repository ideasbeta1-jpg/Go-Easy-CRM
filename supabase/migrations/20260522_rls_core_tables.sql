-- =====================================================
-- RLS Policies: profiles, leads, messages
-- =====================================================
-- Strategy:
--   admins  → full access to everything
--   agentes → own profile + leads assigned to them + messages on those leads
--   service_role → unrestricted (webhooks, cron, automation)
-- =====================================================

-- Helper: check if the current session user is an admin.
-- SECURITY DEFINER so it bypasses RLS when reading profiles (avoids recursion).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND disabled = false
  );
$$;

-- =====================================================
-- PROFILES
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all profiles
-- (agent names/avatars appear across leads, chats, reports)
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile (avatar, status, etc.)
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile (role, name, zadarma fields, disabled)
CREATE POLICY "profiles_update_admin"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Service role has full access (user creation trigger, admin SDK)
CREATE POLICY "profiles_all_service_role"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- LEADS
-- =====================================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Admins see all leads; agents see only their assigned leads
CREATE POLICY "leads_select"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR assigned_to = auth.uid()
  );

-- Admins can create any lead; agents can only create leads assigned to themselves
CREATE POLICY "leads_insert"
  ON public.leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR assigned_to = auth.uid()
  );

-- Admins can update any lead; agents can update leads assigned to them
CREATE POLICY "leads_update"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR assigned_to = auth.uid()
  )
  WITH CHECK (
    public.is_admin()
    OR assigned_to = auth.uid()
  );

-- Only admins can delete (soft or hard) leads
CREATE POLICY "leads_delete_admin"
  ON public.leads
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Service role full access (WhatsApp webhook, n8n, cron automation)
CREATE POLICY "leads_all_service_role"
  ON public.leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- MESSAGES
-- =====================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Admins see all messages; agents see messages on their assigned leads
CREATE POLICY "messages_select"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = messages.lead_id
        AND leads.assigned_to = auth.uid()
    )
  );

-- Authenticated users can insert messages for leads they have access to
CREATE POLICY "messages_insert"
  ON public.messages
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

-- Service role full access (WhatsApp inbound webhook, read receipts, Evolution API)
CREATE POLICY "messages_all_service_role"
  ON public.messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
