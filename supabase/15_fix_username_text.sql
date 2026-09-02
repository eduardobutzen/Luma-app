-- ============================================================================
-- Luma — Migration 15: corrige "structure of query does not match function
-- result type". O profiles.username é CITEXT, mas as RPCs declaram a coluna
-- como TEXT — o Postgres recusa em runtime. Solução: castar username::text.
-- Rode DEPOIS das 10–14. É idempotente (create or replace, mesma assinatura).
-- ============================================================================

-- search_users (11)
create or replace function public.search_users(q text)
returns table (id uuid, name text, username text, avatar_url text, friend_status text)
language plpgsql security definer stable
set search_path = public as $$
declare
  viewer uuid := auth.uid();
  term   text := '%' || trim(q) || '%';
begin
  if length(trim(coalesce(q, ''))) < 2 then
    return;
  end if;
  return query
  select p.id, p.name, p.username::text, p.avatar_url, public.friendship_status(viewer, p.id)
  from public.profiles p
  where p.discoverable
    and p.id <> viewer
    and (p.username ilike term or p.name ilike term)
  order by p.username nulls last
  limit 20;
end;
$$;

-- profile_card (11)
create or replace function public.profile_card(target uuid)
returns table (
  id uuid, name text, username text, avatar_url text, bio text,
  streak integer, weight_kg numeric,
  vis_meals public.privacy_level, vis_achievements public.privacy_level, vis_photos public.privacy_level,
  friend_status text, is_self boolean, member_since timestamptz
)
language plpgsql security definer stable
set search_path = public as $$
declare viewer uuid := auth.uid();
begin
  return query
  select
    p.id, p.name, p.username::text, p.avatar_url, p.bio,
    case when public.can_view(viewer, p.id, p.vis_streak) then p.streak end,
    case when public.can_view(viewer, p.id, p.vis_weight) then p.weight_kg end,
    p.vis_meals, p.vis_achievements, p.vis_photos,
    public.friendship_status(viewer, p.id),
    (viewer = p.id),
    p.created_at
  from public.profiles p
  where p.id = target
    and (p.discoverable or public.are_friends(viewer, p.id) or viewer = p.id);
end;
$$;

-- my_friends (11)
create or replace function public.my_friends()
returns table (id uuid, name text, username text, avatar_url text, streak integer)
language plpgsql security definer stable
set search_path = public as $$
declare viewer uuid := auth.uid();
begin
  return query
  select p.id, p.name, p.username::text, p.avatar_url,
    case when public.can_view(viewer, p.id, p.vis_streak) then p.streak end
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = viewer then f.addressee_id else f.requester_id end
  where f.status = 'accepted' and (f.requester_id = viewer or f.addressee_id = viewer)
  order by p.username nulls last;
end;
$$;

-- my_friend_requests (11)
create or replace function public.my_friend_requests()
returns table (
  friendship_id uuid, id uuid, name text, username text, avatar_url text,
  direction text, created_at timestamptz
)
language plpgsql security definer stable
set search_path = public as $$
declare viewer uuid := auth.uid();
begin
  return query
  select f.id, p.id, p.name, p.username::text, p.avatar_url,
    case when f.requester_id = viewer then 'out' else 'in' end,
    f.created_at
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = viewer then f.addressee_id else f.requester_id end
  where f.status = 'pending' and (f.requester_id = viewer or f.addressee_id = viewer)
  order by f.created_at desc;
end;
$$;

-- my_pair_streaks (12)
create or replace function public.my_pair_streaks()
returns table (friend_id uuid, name text, username text, avatar_url text, streak integer)
language plpgsql security definer stable
set search_path = public as $$
declare viewer uuid := auth.uid();
begin
  return query
  select p.id, p.name, p.username::text, p.avatar_url, public.pair_streak(viewer, p.id)
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = viewer then f.addressee_id else f.requester_id end
  where f.status = 'accepted' and (f.requester_id = viewer or f.addressee_id = viewer)
  order by public.pair_streak(viewer, p.id) desc, p.username nulls last;
end;
$$;

-- group_members_today (12)
create or replace function public.group_members_today(gid uuid)
returns table (user_id uuid, name text, username text, avatar_url text, status text, completed_today boolean)
language plpgsql security definer stable
set search_path = public as $$
declare viewer uuid := auth.uid();
begin
  if not public.in_group(gid, viewer) then return; end if;
  return query
  select m.user_id, p.name, p.username::text, p.avatar_url, m.status,
    coalesce((select c.completed from public.daily_completions c
              where c.user_id = m.user_id and c.day = current_date), false)
  from public.streak_group_members m
  join public.profiles p on p.id = m.user_id
  where m.group_id = gid
  order by m.status, p.username nulls last;
end;
$$;

-- community_recipes (13)
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
    p.id, p.name, p.username::text, p.avatar_url, r.created_at
  from public.recipes r
  join public.profiles p on p.id = r.user_id
  where r.visibility = 'public'
    and (trim(coalesce(q, '')) = '' or r.title ilike term)
  order by r.created_at desc
  limit 40;
end;
$$;

-- recipe_with_author (13)
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
    p.name, p.username::text, p.avatar_url, (r.user_id = viewer)
  from public.recipes r
  join public.profiles p on p.id = r.user_id
  where r.id = rid and (r.visibility = 'public' or r.user_id = viewer);
end;
$$;

-- friend_feed (14)
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
    p.name, p.username::text, p.avatar_url, (a.user_id = viewer)
  from public.activity a
  join public.profiles p on p.id = a.user_id
  where a.user_id = viewer or public.are_friends(viewer, a.user_id)
  order by a.created_at desc
  limit greatest(lim, 1) offset greatest(off, 0);
end;
$$;
