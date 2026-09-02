-- ============================================================================
-- Luma — Migration 23: receitas curadas do app ("Descobrir")
--
-- A aba Descobrir passa a mostrar receitas do próprio app: as curadas pela
-- equipe + as públicas da comunidade. A fonte externa (Spoonacular) saiu.
--
-- As curadas pertencem a um perfil oficial, para continuarem sendo receitas
-- normais: abrem na tela de detalhe, registram como refeição, vão para o chat
-- e para o feed sem nenhum caminho especial no app.
--
-- Rode DEPOIS da 22_friendships_realtime.sql. É idempotente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Conta oficial
--
-- profiles.id referencia auth.users, então o perfil precisa de um usuário. O
-- insert abaixo cria um usuário de sistema, sem senha utilizável (não dá para
-- fazer login com ele: encrypted_password recebe um hash inválido).
--
-- Se preferir, crie a conta pelo painel (Authentication › Add user) e troque o
-- UUID abaixo pelo dela — o resto do script funciona igual.
-- ----------------------------------------------------------------------------
do $$
declare
  official_id uuid := '00000000-0000-4000-a000-0000000c0ffe'::uuid;
begin
  if not exists (select 1 from auth.users where id = official_id) then
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      official_id,
      'authenticated',
      'authenticated',
      'receitas@luma.app',
      '!',                       -- hash inválido: bloqueia login nesta conta
      now(),
      '{"provider":"system","providers":["system"]}'::jsonb,
      '{"name":"Luma"}'::jsonb,
      now(), now()
    );
  end if;

  insert into public.profiles (id, name, email, avatar_url)
  values (official_id, 'Luma', 'receitas@luma.app', null)
  on conflict (id) do update set name = excluded.name;
end $$;

-- ----------------------------------------------------------------------------
-- 2. Marca de curadoria
--
-- Uma coluna própria (em vez de comparar o user_id no app) deixa o critério no
-- banco: dá para promover a receita de um usuário a curada sem mudar de dono.
-- ----------------------------------------------------------------------------
alter table public.recipes
  add column if not exists curated boolean not null default false;

create index if not exists recipes_curated_idx
  on public.recipes (curated, created_at desc)
  where visibility = 'public';

-- ----------------------------------------------------------------------------
-- 3. Catálogo do Descobrir
--
-- Substitui community_recipes: mesma assinatura, mais o campo `curated`, e as
-- curadas vêm primeiro. O app usa esta função na única aba de descoberta.
-- ----------------------------------------------------------------------------
create or replace function public.discover_recipes(q text)
returns table (
  id uuid, title text, image_url text, servings integer,
  kcal integer, protein integer, carbs integer, fat integer,
  author_id uuid, author_name text, author_username text, author_avatar text,
  curated boolean, created_at timestamptz
)
language plpgsql security definer stable
set search_path = public as $$
declare term text := '%' || trim(coalesce(q, '')) || '%';
begin
  return query
  select r.id, r.title, r.image_url, r.servings,
    r.kcal, r.protein, r.carbs, r.fat,
    p.id, p.name, p.username::text, p.avatar_url,
    r.curated, r.created_at
  from public.recipes r
  join public.profiles p on p.id = r.user_id
  where r.visibility = 'public'
    and (trim(coalesce(q, '')) = '' or r.title ilike term)
  order by r.curated desc, r.created_at desc
  limit 60;
end;
$$;

grant execute on function public.discover_recipes(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Inserção de uma receita curada
--
-- Helper para adicionar receitas sem repetir o user_id oficial em cada insert.
-- Devolve o id da receita criada (ou o da existente, se o título repetir).
-- ----------------------------------------------------------------------------
create or replace function public.add_curated_recipe(
  p_title text,
  p_description text,
  p_image_url text,
  p_servings integer,
  p_kcal integer,
  p_protein integer,
  p_carbs integer,
  p_fat integer,
  p_steps text[]
)
returns uuid
language plpgsql security definer
set search_path = public as $$
declare
  official_id uuid := '00000000-0000-4000-a000-0000000c0ffe'::uuid;
  rid uuid;
begin
  select id into rid
  from public.recipes
  where user_id = official_id and title = p_title
  limit 1;

  if rid is not null then
    update public.recipes set
      description = p_description,
      image_url   = p_image_url,
      servings    = p_servings,
      kcal        = p_kcal,
      protein     = p_protein,
      carbs       = p_carbs,
      fat         = p_fat,
      steps       = p_steps
    where id = rid;
    return rid;
  end if;

  insert into public.recipes (
    user_id, title, description, image_url, servings,
    kcal, protein, carbs, fat, steps, visibility, curated
  ) values (
    official_id, p_title, p_description, p_image_url, p_servings,
    p_kcal, p_protein, p_carbs, p_fat, p_steps, 'public', true
  )
  returning id into rid;

  return rid;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. Ingredientes de uma receita curada
-- ----------------------------------------------------------------------------
create or replace function public.set_curated_ingredients(
  p_recipe_id uuid,
  p_names text[],
  p_grams integer[],
  p_protein integer[],
  p_carbs integer[],
  p_fat integer[],
  p_kcal integer[]
)
returns void
language plpgsql security definer
set search_path = public as $$
begin
  delete from public.recipe_ingredients where recipe_id = p_recipe_id;

  insert into public.recipe_ingredients (recipe_id, name, grams, protein, carbs, fat, kcal)
  select p_recipe_id, n, g, pr, cb, ft, kc
  from unnest(p_names, p_grams, p_protein, p_carbs, p_fat, p_kcal)
    as t(n, g, pr, cb, ft, kc);
end;
$$;
