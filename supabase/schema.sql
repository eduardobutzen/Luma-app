-- ============================================================================
-- Luma — schema, trigger de novo usuário e Row Level Security
-- Rode este arquivo no SQL Editor do Supabase (ou via migration).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles: 1 linha por usuário autenticado.
-- As colunas de meta têm DEFAULT porque handle_new_user() só preenche
-- id / name / email no signup.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  name         text not null,
  email        text not null default '',
  avatar_url   text,
  goal_kcal    integer not null default 2000,
  goal_protein integer not null default 150,
  goal_carbs   integer not null default 250,
  goal_fat     integer not null default 65,
  streak       integer not null default 0,
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- meals: refeições registradas. user_id default auth.uid() para que o insert
-- do app (que NÃO envia user_id) seja atribuído automaticamente ao usuário.
-- ----------------------------------------------------------------------------
create table if not exists public.meals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type        text not null,
  description text,
  image_url   text,
  kcal        integer not null default 0,
  protein     integer not null default 0,
  carbs       integer not null default 0,
  fat         integer not null default 0,
  eaten_at    timestamptz not null default now()
);

create index if not exists meals_user_eaten_idx
  on public.meals (user_id, eaten_at);

-- ----------------------------------------------------------------------------
-- meal_items: ingredientes de cada refeição (a posse é herdada via meal_id).
-- ----------------------------------------------------------------------------
create table if not exists public.meal_items (
  id       uuid primary key default gen_random_uuid(),
  meal_id  uuid not null references public.meals (id) on delete cascade,
  name     text not null,
  grams    integer not null default 0,
  protein  integer not null default 0,
  carbs    integer not null default 0,
  fat      integer not null default 0,
  kcal     integer not null default 0
);

create index if not exists meal_items_meal_idx
  on public.meal_items (meal_id);

-- ----------------------------------------------------------------------------
-- Cria a linha em profiles automaticamente quando um auth.user é criado.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Usuário'),
    coalesce(new.email, '')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles   enable row level security;
alter table public.meals      enable row level security;
alter table public.meal_items enable row level security;

-- profiles: cada usuário lê/edita apenas o próprio perfil.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- meals: acesso total restrito às próprias refeições.
drop policy if exists "meals_all_own" on public.meals;
create policy "meals_all_own" on public.meals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- meal_items: posse herdada da refeição-pai.
drop policy if exists "meal_items_all_own" on public.meal_items;
create policy "meal_items_all_own" on public.meal_items
  for all
  using (
    exists (
      select 1 from public.meals m
      where m.id = meal_items.meal_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meals m
      where m.id = meal_items.meal_id and m.user_id = auth.uid()
    )
  );
