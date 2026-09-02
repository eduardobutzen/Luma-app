-- ============================================================================
-- Luma — Migration 06: refeições padrão (templates reutilizáveis)
-- Rode no SQL Editor do Supabase, depois das migrações anteriores.
-- ============================================================================

create table if not exists public.meal_templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  type       text not null,
  kcal       integer not null default 0,
  protein    integer not null default 0,
  carbs      integer not null default 0,
  fat        integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists meal_templates_user_idx
  on public.meal_templates (user_id, created_at);

create table if not exists public.meal_template_items (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.meal_templates (id) on delete cascade,
  name        text not null,
  grams       integer not null default 0,
  protein     integer not null default 0,
  carbs       integer not null default 0,
  fat         integer not null default 0,
  kcal        integer not null default 0
);

create index if not exists meal_template_items_template_idx
  on public.meal_template_items (template_id);

-- RLS
alter table public.meal_templates      enable row level security;
alter table public.meal_template_items enable row level security;

drop policy if exists "meal_templates_all_own" on public.meal_templates;
create policy "meal_templates_all_own" on public.meal_templates
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "meal_template_items_all_own" on public.meal_template_items;
create policy "meal_template_items_all_own" on public.meal_template_items
  for all
  using (
    exists (
      select 1 from public.meal_templates t
      where t.id = meal_template_items.template_id and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meal_templates t
      where t.id = meal_template_items.template_id and t.user_id = auth.uid()
    )
  );

-- GRANTs
grant select, insert, update, delete on table public.meal_templates      to authenticated;
grant select, insert, update, delete on table public.meal_template_items to authenticated;
