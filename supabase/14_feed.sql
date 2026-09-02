-- ============================================================================
-- Luma — Migration 14: feed de atividades dos amigos
-- Rode DEPOIS da 13_recipes.sql. É idempotente.
-- ============================================================================

create table if not exists public.activity (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type       text not null check (type in ('recipe_published', 'achievement', 'streak_milestone', 'meal_shared')),
  ref_id     uuid,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_user_idx on public.activity (user_id, created_at desc);
create index if not exists activity_created_idx on public.activity (created_at desc);

alter table public.activity enable row level security;

-- Vejo a minha atividade e a dos meus amigos.
drop policy if exists "activity_select" on public.activity;
create policy "activity_select" on public.activity for select
  using (user_id = auth.uid() or public.are_friends(auth.uid(), user_id));

drop policy if exists "activity_insert" on public.activity;
create policy "activity_insert" on public.activity for insert
  with check (user_id = auth.uid());

drop policy if exists "activity_delete" on public.activity;
create policy "activity_delete" on public.activity for delete
  using (user_id = auth.uid());

grant select, insert, delete on table public.activity to authenticated;

-- Publicar uma receita (ou torná-la pública) gera um item no feed.
create or replace function public.recipes_activity()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if NEW.visibility = 'public'
     and (TG_OP = 'INSERT' or OLD.visibility is distinct from 'public') then
    insert into public.activity (user_id, type, ref_id, meta)
    values (NEW.user_id, 'recipe_published', NEW.id,
      jsonb_build_object('title', NEW.title, 'image_url', NEW.image_url, 'kcal', NEW.kcal));
  end if;
  return NEW;
end;
$$;

drop trigger if exists recipes_activity_trigger on public.recipes;
create trigger recipes_activity_trigger
  after insert or update on public.recipes
  for each row execute function public.recipes_activity();

-- Feed: minha atividade + a dos amigos, com a identidade do autor.
create or replace function public.friend_feed(lim integer default 40, off integer default 0)
returns table (
  id uuid, user_id uuid, type text, ref_id uuid, meta jsonb, created_at timestamptz,
  author_name text, author_username text, author_avatar text, is_mine boolean
)
language plpgsql security definer stable
set search_path = public as $$
declare viewer uuid := auth.uid();
begin
  return query
  select a.id, a.user_id, a.type, a.ref_id, a.meta, a.created_at,
    p.name, p.username, p.avatar_url, (a.user_id = viewer)
  from public.activity a
  join public.profiles p on p.id = a.user_id
  where a.user_id = viewer or public.are_friends(viewer, a.user_id)
  order by a.created_at desc
  limit greatest(lim, 1) offset greatest(off, 0);
end;
$$;

grant execute on function public.friend_feed(integer, integer) to authenticated;
