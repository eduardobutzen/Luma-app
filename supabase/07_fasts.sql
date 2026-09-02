-- ============================================================================
-- Luma — Migration 07: jejum intermitente (fasts)
-- Rode no SQL Editor do Supabase, depois das migrações anteriores.
-- ============================================================================

create table if not exists public.fasts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,
  target_hours integer not null default 16,
  created_at   timestamptz not null default now()
);

create index if not exists fasts_user_idx on public.fasts (user_id, started_at);

-- Garante no máximo um jejum ativo (ended_at null) por usuário.
create unique index if not exists fasts_one_active_idx
  on public.fasts (user_id)
  where ended_at is null;

alter table public.fasts enable row level security;

drop policy if exists "fasts_all_own" on public.fasts;
create policy "fasts_all_own" on public.fasts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on table public.fasts to authenticated;
