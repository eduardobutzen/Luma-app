-- ============================================================================
-- Luma — Migration 11: amizades + helpers/RPCs sociais
-- Rode DEPOIS da 10_social_identity.sql. É idempotente.
-- (Helpers e RPCs ficam aqui, logo após a tabela que eles consultam.)
-- ============================================================================

create table if not exists public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  addressee_id  uuid not null references auth.users (id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at    timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

-- No máximo uma linha por par (independe de quem pediu).
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);
create index if not exists friendships_requester_idx on public.friendships (requester_id, status);

alter table public.friendships enable row level security;

drop policy if exists "friendships_select" on public.friendships;
create policy "friendships_select" on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "friendships_insert" on public.friendships;
create policy "friendships_insert" on public.friendships for insert
  with check (auth.uid() = requester_id and requester_id <> addressee_id);

-- Só o destinatário pode aceitar (update). O remetente cancela via delete.
drop policy if exists "friendships_update" on public.friendships;
create policy "friendships_update" on public.friendships for update
  using (auth.uid() = addressee_id) with check (auth.uid() = addressee_id);

drop policy if exists "friendships_delete" on public.friendships;
create policy "friendships_delete" on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

grant select, insert, update, delete on table public.friendships to authenticated;

-- ----------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER: ignoram RLS para não recursar nas policies).
-- ----------------------------------------------------------------------------

create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a))
  );
$$;

create or replace function public.can_view(viewer uuid, owner_id uuid, lvl public.privacy_level)
returns boolean language sql security definer stable
set search_path = public as $$
  select viewer = owner_id
      or lvl = 'public'
      or (lvl = 'friends' and public.are_friends(viewer, owner_id));
$$;

create or replace function public.friendship_status(viewer uuid, other uuid)
returns text language sql security definer stable
set search_path = public as $$
  select case
    when exists (select 1 from public.friendships f where f.status = 'accepted'
                   and ((f.requester_id = viewer and f.addressee_id = other)
                     or (f.requester_id = other and f.addressee_id = viewer)))
      then 'friends'
    when exists (select 1 from public.friendships f where f.status = 'pending'
                   and f.requester_id = viewer and f.addressee_id = other)
      then 'pending_out'
    when exists (select 1 from public.friendships f where f.status = 'pending'
                   and f.requester_id = other and f.addressee_id = viewer)
      then 'pending_in'
    else 'none'
  end;
$$;

-- ----------------------------------------------------------------------------
-- RPCs: leitura de perfil de terceiros com privacidade POR CAMPO aplicada.
-- ----------------------------------------------------------------------------

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
    p.id, p.name, p.username, p.avatar_url, p.bio,
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
  select p.id, p.name, p.username, p.avatar_url, public.friendship_status(viewer, p.id)
  from public.profiles p
  where p.discoverable
    and p.id <> viewer
    and (p.username ilike term or p.name ilike term)
  order by p.username nulls last
  limit 20;
end;
$$;

-- Meus amigos (identidade liberada por serem amigos) + streak se permitido.
create or replace function public.my_friends()
returns table (id uuid, name text, username text, avatar_url text, streak integer)
language plpgsql security definer stable
set search_path = public as $$
declare viewer uuid := auth.uid();
begin
  return query
  select p.id, p.name, p.username, p.avatar_url,
    case when public.can_view(viewer, p.id, p.vis_streak) then p.streak end
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = viewer then f.addressee_id else f.requester_id end
  where f.status = 'accepted' and (f.requester_id = viewer or f.addressee_id = viewer)
  order by p.username nulls last;
end;
$$;

-- Pedidos pendentes (entrada e saída).
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
  select f.id, p.id, p.name, p.username, p.avatar_url,
    case when f.requester_id = viewer then 'out' else 'in' end,
    f.created_at
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = viewer then f.addressee_id else f.requester_id end
  where f.status = 'pending' and (f.requester_id = viewer or f.addressee_id = viewer)
  order by f.created_at desc;
end;
$$;

-- Pedir amizade: aceita automaticamente se já houver pedido recíproco; idempotente.
create or replace function public.request_friendship(target uuid)
returns text
language plpgsql security definer
set search_path = public as $$
declare
  viewer uuid := auth.uid();
  existing public.friendships;
begin
  if target = viewer then return 'self'; end if;
  select * into existing from public.friendships f
   where (f.requester_id = viewer and f.addressee_id = target)
      or (f.requester_id = target and f.addressee_id = viewer)
   limit 1;
  if found then
    if existing.status = 'accepted' then return 'friends'; end if;
    if existing.addressee_id = viewer then
      update public.friendships set status = 'accepted' where id = existing.id;
      return 'accepted';
    end if;
    return 'pending_out';
  end if;
  insert into public.friendships (requester_id, addressee_id, status)
    values (viewer, target, 'pending');
  return 'requested';
end;
$$;

-- Remover amizade / cancelar pedido entre mim e outro usuário.
create or replace function public.remove_friendship(other uuid)
returns void
language sql security definer
set search_path = public as $$
  delete from public.friendships f
  where (f.requester_id = auth.uid() and f.addressee_id = other)
     or (f.requester_id = other and f.addressee_id = auth.uid());
$$;

grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant execute on function public.can_view(uuid, uuid, public.privacy_level) to authenticated;
grant execute on function public.friendship_status(uuid, uuid) to authenticated;
grant execute on function public.profile_card(uuid) to authenticated;
grant execute on function public.search_users(text) to authenticated;
grant execute on function public.my_friends() to authenticated;
grant execute on function public.my_friend_requests() to authenticated;
grant execute on function public.request_friendship(uuid) to authenticated;
grant execute on function public.remove_friendship(uuid) to authenticated;
