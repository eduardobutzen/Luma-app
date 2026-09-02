-- ============================================================================
-- Luma — Migration 05: controle de ingestão de água
-- Rode no SQL Editor do Supabase, depois das migrações anteriores.
-- ============================================================================

create table if not exists public.water_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount_ml  integer not null,
  logged_at  timestamptz not null default now()
);

create index if not exists water_logs_user_logged_idx
  on public.water_logs (user_id, logged_at);

alter table public.water_logs enable row level security;

drop policy if exists "water_logs_all_own" on public.water_logs;
create policy "water_logs_all_own" on public.water_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on table public.water_logs to authenticated;

-- Meta diária de água (ml) no perfil.
alter table public.profiles
  add column if not exists goal_water_ml integer not null default 2000;
