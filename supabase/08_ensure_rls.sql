-- ============================================================================
-- Luma — Migration 08: GARANTIR RLS em todas as tabelas (isolamento por usuário)
-- Sintoma corrigido: usuário recém-criado via dados de outra conta = RLS estava
-- desligado ou sem política. Rode este script no SQL Editor do Supabase.
-- É idempotente: pode rodar quantas vezes quiser.
-- ============================================================================

-- 1) Habilita RLS (mesmo que já estivesse, não dá erro).
alter table public.profiles             enable row level security;
alter table public.meals                enable row level security;
alter table public.meal_items           enable row level security;
alter table public.weight_logs          enable row level security;
alter table public.water_logs           enable row level security;
alter table public.fasts                enable row level security;
alter table public.meal_templates       enable row level security;
alter table public.meal_template_items  enable row level security;

-- 2) Políticas por usuário (recriadas para garantir o estado correto).

-- profiles (cada um só o próprio registro)
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- meals
drop policy if exists "meals_all_own" on public.meals;
create policy "meals_all_own" on public.meals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- weight_logs
drop policy if exists "weight_logs_all_own" on public.weight_logs;
create policy "weight_logs_all_own" on public.weight_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- water_logs
drop policy if exists "water_logs_all_own" on public.water_logs;
create policy "water_logs_all_own" on public.water_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- fasts
drop policy if exists "fasts_all_own" on public.fasts;
create policy "fasts_all_own" on public.fasts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- meal_templates
drop policy if exists "meal_templates_all_own" on public.meal_templates;
create policy "meal_templates_all_own" on public.meal_templates for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- meal_items (posse herdada da refeição-pai)
drop policy if exists "meal_items_all_own" on public.meal_items;
create policy "meal_items_all_own" on public.meal_items for all
  using (exists (select 1 from public.meals m where m.id = meal_items.meal_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.meals m where m.id = meal_items.meal_id and m.user_id = auth.uid()));

-- meal_template_items (posse herdada do template-pai)
drop policy if exists "meal_template_items_all_own" on public.meal_template_items;
create policy "meal_template_items_all_own" on public.meal_template_items for all
  using (exists (select 1 from public.meal_templates t where t.id = meal_template_items.template_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.meal_templates t where t.id = meal_template_items.template_id and t.user_id = auth.uid()));

-- 3) Conferência: lista as tabelas e se o RLS está ativo (rowsecurity = true).
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles','meals','meal_items','weight_logs','water_logs','fasts','meal_templates','meal_template_items')
order by tablename;
