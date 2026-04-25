-- Push subscriptions table for Web Push API (VAPID)
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  -- One subscription record per device per user
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

-- Users can only manage their own subscriptions
create policy "Users manage own push subscriptions"
  on public.push_subscriptions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role can read all subscriptions to send pushes
create policy "Service role reads all push subscriptions"
  on public.push_subscriptions
  for select
  to service_role
  using (true);
