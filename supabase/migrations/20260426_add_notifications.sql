-- Create notifications table for in-app notification center
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  body       TEXT,
  link       TEXT,
  lead_id    UUID        REFERENCES public.leads(id) ON DELETE SET NULL,
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx      ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx  ON public.notifications (user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS notifications_created_at_idx   ON public.notifications (created_at DESC);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "users_select_own_notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "users_update_own_notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role (admin client) can insert notifications for any user
CREATE POLICY "service_role_insert_notifications"
  ON public.notifications
  FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

-- Service role can read all notifications (needed for push delivery)
CREATE POLICY "service_role_select_notifications"
  ON public.notifications
  FOR SELECT
  TO service_role
  USING (TRUE);
