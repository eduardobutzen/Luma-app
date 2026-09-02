-- ============================================================================
-- Luma — Migration 13: receitas de usuário (minhas vs comunidade)
-- Rode DEPOIS da 12_shared_streaks.sql. É idempotente.
-- Imagens no bucket meal-photos, path ${uid}/recipes/...
-- Macros gravados POR PORÇÃO (servings). Ingredientes guardam macros absolutos.
-- ============================================================================

create table if not exists public.recipes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null,
  description text,
  image_url   text,
  servings    integer not null default 1,
  kcal        integer not null default 0,
  protein     integer not null default 0,
  carbs       integer not null default 0,
  fat         integer not null default 0,
  steps       text[] not null default '{}',
  visibility  text not null default 'private' check (visibility in ('private', 'public')),
  created_at  timestamptz not null default now()
);

create index if not exists recipes_user_idx on public.recipes (user_id, created_at desc);
create index if not exists recipes_public_idx on public.recipes (visibility, created_at desc);

create table if not exists public.recipe_ingredients (
  id        uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  name      text not null,
  grams     integer not null default 0,
  protein   integer not null default 0,
  carbs     integer not null default 0,
  fat       integer not null default 0,
  kcal      integer not null default 0
);
create index if not exists recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id);

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;

-- Receitas: leio as minhas + as públicas; só mexo nas minhas.
drop policy if exists "recipes_select" on public.recipes;
create policy "recipes_select" on public.recipes for select
  using (user_id = auth.uid() or visibility = 'public');
drop policy if exists "recipes_insert" on public.recipes;
create policy "recipes_insert" on public.recipes for insert
  with check (user_id = auth.uid());
drop policy if exists "recipes_update" on public.recipes;
create policy "recipes_update" on public.recipes for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "recipes_delete" on public.recipes;
create policy "recipes_delete" on public.recipes for delete
  using (user_id = auth.uid());

-- Ingredientes herdam a visibilidade da receita.
drop policy if exists "recipe_ingredients_select" on public.recipe_ingredients;
create policy "recipe_ingredients_select" on public.recipe_ingredients for select
  using (exists (select 1 from public.recipes r
                 where r.id = recipe_id and (r.user_id = auth.uid() or r.visibility = 'public')));
drop policy if exists "recipe_ingredients_write" on public.recipe_ingredients;
create policy "recipe_ingredients_write" on public.recipe_ingredients for all
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()));

grant select, insert, update, delete on table public.recipes to authenticated;
grant select, insert, update, delete on table public.recipe_ingredients to authenticated;

-- ----------------------------------------------------------------------------
-- RPCs: catálogo da comunidade + detalhe com identidade do autor.
-- (SECURITY DEFINER para anexar nome/avatar do autor, que está em profiles.)
-- ----------------------------------------------------------------------------
create or replace function public.community_recipes(q text)
returns table (
  id uuid, title text, image_url text, servings integer,
  kcal integer, protein integer, carbs integer, fat integer,
  author_id uuid, author_name text, author_username text, author_avatar text, created_at timestamptz
)
language plpgsql security definer stable
set search_path = public as $$
declare term text := '%' || trim(coalesce(q, '')) || '%';
begin
  return query
  select r.id, r.title, r.image_url, r.servings,
    r.kcal, r.protein, r.carbs, r.fat,
    p.id, p.name, p.username, p.avatar_url, r.created_at
  from public.recipes r
  join public.profiles p on p.id = r.user_id
  where r.visibility = 'public'
    and (trim(coalesce(q, '')) = '' or r.title ilike term)
  order by r.created_at desc
  limit 40;
end;
$$;

create or replace function public.recipe_with_author(rid uuid)
returns table (
  id uuid, user_id uuid, title text, description text, image_url text, servings integer,
  kcal integer, protein integer, carbs integer, fat integer, steps text[],
  visibility text, created_at timestamptz,
  author_name text, author_username text, author_avatar text, is_mine boolean
)
language plpgsql security definer stable
set search_path = public as $$
declare viewer uuid := auth.uid();
begin
  return query
  select r.id, r.user_id, r.title, r.description, r.image_url, r.servings,
    r.kcal, r.protein, r.carbs, r.fat, r.steps, r.visibility, r.created_at,
    p.name, p.username, p.avatar_url, (r.user_id = viewer)
  from public.recipes r
  join public.profiles p on p.id = r.user_id
  where r.id = rid and (r.visibility = 'public' or r.user_id = viewer);
end;
$$;

grant execute on function public.community_recipes(text) to authenticated;
grant execute on function public.recipe_with_author(uuid) to authenticated;
