-- ============================================================================
-- Luma — Migration 04: histórico de peso (weight_logs)
-- Rode no SQL Editor do Supabase, depois das migrações anteriores.
-- ============================================================================

create table if not exists public.weight_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  weight_kg  numeric not null,
  logged_at  timestamptz not null default now()
);

create index if not exists weight_logs_user_logged_idx
  on public.weight_logs (user_id, logged_at);

-- RLS: cada usuário acessa apenas os próprios registros.
alter table public.weight_logs enable row level security;

drop policy if exists "weight_logs_all_own" on public.weight_logs;
create policy "weight_logs_all_own" on public.weight_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- GRANT de tabela para o papel da API (separado do RLS).
grant select, insert, update, delete on table public.weight_logs to authenticated;
