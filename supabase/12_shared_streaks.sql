-- ============================================================================
-- Luma — Migration 12: streak compartilhado ("meta cumprida", pares e grupos)
-- Rode DEPOIS da 11_friendships.sql. É idempotente.
--
-- "Dia cumprido" = registrou >= 1 refeição E kcal do dia dentro de 85%-110%
-- da meta (goal_kcal). Datas usam eaten_at::date (mesma base do streak atual).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) daily_completions: um registro por usuário por dia.
-- ----------------------------------------------------------------------------
create table if not exists public.daily_completions (
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day       date not null,
  completed boolean not null default false,
  kcal      integer not null default 0,
  goal_kcal integer not null default 0,
  primary key (user_id, day)
);

alter table public.daily_completions enable row level security;

drop policy if exists "daily_completions_all_own" on public.daily_completions;
create policy "daily_completions_all_own" on public.daily_completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on table public.daily_completions to authenticated;

-- ----------------------------------------------------------------------------
-- 2) Recomputar "dia cumprido" e integrar ao trigger de meals.
-- ----------------------------------------------------------------------------
create or replace function public.recompute_completion(uid uuid, d date)
returns void language plpgsql security definer
set search_path = public as $$
declare
  total integer := 0;
  n     integer := 0;
  goal  integer := 2000;
  ok    boolean := false;
begin
  if uid is null or d is null then return; end if;

  select coalesce(sum(m.kcal), 0), count(*) into total, n
  from public.meals m
  where m.user_id = uid and m.eaten_at::date = d;

  select coalesce(p.goal_kcal, 2000) into goal from public.profiles p where p.id = uid;

  ok := (n >= 1 and total >= goal * 0.85 and total <= goal * 1.10);

  if n = 0 then
    delete from public.daily_completions where user_id = uid and day = d;
  else
    insert into public.daily_completions (user_id, day, completed, kcal, goal_kcal)
    values (uid, d, ok, total, goal)
    on conflict (user_id, day) do update
      set completed = excluded.completed,
          kcal = excluded.kcal,
          goal_kcal = excluded.goal_kcal;
  end if;
end;
$$;

-- Estende o trigger existente: além de recomputar o streak pessoal, recomputa
-- a "meta cumprida" do(s) dia(s) afetado(s).
create or replace function public.meals_after_change()
returns trigger language plpgsql security definer
set search_path = public as $$
declare uid uuid := coalesce(new.user_id, old.user_id);
begin
  perform public.recompute_streak(uid);
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
    perform public.recompute_completion(uid, new.eaten_at::date);
  end if;
  if (TG_OP = 'UPDATE' or TG_OP = 'DELETE') then
    perform public.recompute_completion(uid, old.eaten_at::date);
  end if;
  return null;
end;
$$;

-- Garante que o trigger também dispara em UPDATE (edição de refeição).
drop trigger if exists meals_streak_trigger on public.meals;
create trigger meals_streak_trigger
  after insert or update or delete on public.meals
  for each row execute function public.meals_after_change();

-- Backfill das refeições já existentes.
do $$
declare r record;
begin
  for r in select distinct user_id, eaten_at::date as d from public.meals loop
    perform public.recompute_completion(r.user_id, r.d);
  end loop;
end$$;

-- ----------------------------------------------------------------------------
-- 3) Streak de PARES (1:1). Hoje em andamento não zera (grace de 1 dia).
-- ----------------------------------------------------------------------------
create or replace function public.both_done(a uuid, b uuid, d date)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from public.daily_completions c where c.user_id = a and c.day = d and c.completed)
     and exists (select 1 from public.daily_completions c where c.user_id = b and c.day = d and c.completed);
$$;

create or replace function public.pair_streak(a uuid, b uuid)
returns integer language plpgsql security definer stable
set search_path = public as $$
declare s integer := 0; d date := current_date; i integer := 0;
begin
  if not public.both_done(a, b, d) then d := d - 1; end if;  -- grace: hoje ainda pode
  loop
    exit when i >= 365;
    if public.both_done(a, b, d) then s := s + 1; d := d - 1; i := i + 1;
    else exit; end if;
  end loop;
  return s;
end;
$$;

-- Pares com todos os meus amigos (para a lista de Streaks).
create or replace function public.my_pair_streaks()
returns table (friend_id uuid, name text, username text, avatar_url text, streak integer)
language plpgsql security definer stable
set search_path = public as $$
declare viewer uuid := auth.uid();
begin
  return query
  select p.id, p.name, p.username, p.avatar_url, public.pair_streak(viewer, p.id)
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = viewer then f.addressee_id else f.requester_id end
  where f.status = 'accepted' and (f.requester_id = viewer or f.addressee_id = viewer)
  order by public.pair_streak(viewer, p.id) desc, p.username nulls last;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4) GRUPOS / squads.
-- ----------------------------------------------------------------------------
create table if not exists public.streak_groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.streak_group_members (
  group_id  uuid not null references public.streak_groups (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  status    text not null default 'invited' check (status in ('invited', 'active')),
  primary key (group_id, user_id)
);

-- Helpers SECURITY DEFINER (evitam recursão entre as policies das duas tabelas).
create or replace function public.in_group(gid uuid, uid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from public.streak_group_members m
                 where m.group_id = gid and m.user_id = uid);
$$;

create or replace function public.is_group_member(gid uuid, uid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from public.streak_group_members m
                 where m.group_id = gid and m.user_id = uid and m.status = 'active');
$$;

create or replace function public.group_owner(gid uuid)
returns uuid language sql security definer stable
set search_path = public as $$
  select owner_id from public.streak_groups where id = gid;
$$;

alter table public.streak_groups enable row level security;
alter table public.streak_group_members enable row level security;

drop policy if exists "streak_groups_select" on public.streak_groups;
create policy "streak_groups_select" on public.streak_groups for select
  using (public.in_group(id, auth.uid()));
drop policy if exists "streak_groups_insert" on public.streak_groups;
create policy "streak_groups_insert" on public.streak_groups for insert
  with check (owner_id = auth.uid());
drop policy if exists "streak_groups_modify" on public.streak_groups;
create policy "streak_groups_modify" on public.streak_groups for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "streak_groups_delete" on public.streak_groups;
create policy "streak_groups_delete" on public.streak_groups for delete
  using (owner_id = auth.uid());

drop policy if exists "sgm_select" on public.streak_group_members;
create policy "sgm_select" on public.streak_group_members for select
  using (public.in_group(group_id, auth.uid()));
drop policy if exists "sgm_insert" on public.streak_group_members;
create policy "sgm_insert" on public.streak_group_members for insert
  with check (public.group_owner(group_id) = auth.uid() or user_id = auth.uid());
drop policy if exists "sgm_update" on public.streak_group_members;
create policy "sgm_update" on public.streak_group_members for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "sgm_delete" on public.streak_group_members;
create policy "sgm_delete" on public.streak_group_members for delete
  using (user_id = auth.uid() or public.group_owner(group_id) = auth.uid());

grant select, insert, update, delete on table public.streak_groups to authenticated;
grant select, insert, update, delete on table public.streak_group_members to authenticated;

-- Streak do grupo: dias consecutivos em que TODOS os membros ativos cumpriram,
-- contando a partir da entrada mais recente (max joined_at). Grace de hoje.
create or replace function public.group_all_done(gid uuid, d date, member_count integer)
returns boolean language sql security definer stable
set search_path = public as $$
  select member_count > 0 and member_count = (
    select count(*) from public.streak_group_members m
    where m.group_id = gid and m.status = 'active'
      and exists (select 1 from public.daily_completions c
                  where c.user_id = m.user_id and c.day = d and c.completed)
  );
$$;

create or replace function public.group_streak(gid uuid)
returns integer language plpgsql security definer stable
set search_path = public as $$
declare
  s integer := 0; d date := current_date; floor_d date; member_count integer; i integer := 0;
begin
  select count(*), max(joined_at::date) into member_count, floor_d
  from public.streak_group_members where group_id = gid and status = 'active';
  if member_count = 0 then return 0; end if;
  if not public.group_all_done(gid, d, member_count) then d := d - 1; end if;
  loop
    exit when i >= 365 or d < floor_d;
    if public.group_all_done(gid, d, member_count) then s := s + 1; d := d - 1; i := i + 1;
    else exit; end if;
  end loop;
  return s;
end;
$$;

-- RPC: criar grupo já com amigos convidados.
create or replace function public.create_streak_group(p_name text, friends uuid[])
returns uuid language plpgsql security definer
set search_path = public as $$
declare gid uuid; viewer uuid := auth.uid(); fid uuid;
begin
  insert into public.streak_groups (name, owner_id) values (p_name, viewer) returning id into gid;
  insert into public.streak_group_members (group_id, user_id, status) values (gid, viewer, 'active');
  foreach fid in array coalesce(friends, '{}'::uuid[]) loop
    if public.are_friends(viewer, fid) then
      insert into public.streak_group_members (group_id, user_id, status)
      values (gid, fid, 'invited') on conflict do nothing;
    end if;
  end loop;
  return gid;
end;
$$;

-- RPC: convidar mais um amigo (qualquer membro ativo pode).
create or replace function public.invite_to_group(gid uuid, friend uuid)
returns void language plpgsql security definer
set search_path = public as $$
declare viewer uuid := auth.uid();
begin
  if not public.is_group_member(gid, viewer) then return; end if;
  if not public.are_friends(viewer, friend) then return; end if;
  insert into public.streak_group_members (group_id, user_id, status)
  values (gid, friend, 'invited') on conflict do nothing;
end;
$$;

-- RPC: meus grupos (inclui convites pendentes) + streak + contagem.
create or replace function public.my_streak_groups()
returns table (id uuid, name text, owner_id uuid, my_status text, member_count integer, streak integer)
language plpgsql security definer stable
set search_path = public as $$
declare viewer uuid := auth.uid();
begin
  return query
  select g.id, g.name, g.owner_id, mine.status,
    (select count(*)::int from public.streak_group_members mm
      where mm.group_id = g.id and mm.status = 'active'),
    public.group_streak(g.id)
  from public.streak_groups g
  join public.streak_group_members mine on mine.group_id = g.id and mine.user_id = viewer
  order by g.created_at desc;
end;
$$;

-- RPC: membros do grupo + status de hoje (✅/⬜).
create or replace function public.group_members_today(gid uuid)
returns table (user_id uuid, name text, username text, avatar_url text, status text, completed_today boolean)
language plpgsql security definer stable
set search_path = public as $$
declare viewer uuid := auth.uid();
begin
  if not public.in_group(gid, viewer) then return; end if;
  return query
  select m.user_id, p.name, p.username, p.avatar_url, m.status,
    coalesce((select c.completed from public.daily_completions c
              where c.user_id = m.user_id and c.day = current_date), false)
  from public.streak_group_members m
  join public.profiles p on p.id = m.user_id
  where m.group_id = gid
  order by m.status, p.username nulls last;
end;
$$;

grant execute on function public.recompute_completion(uuid, date) to authenticated;
grant execute on function public.both_done(uuid, uuid, date) to authenticated;
grant execute on function public.pair_streak(uuid, uuid) to authenticated;
grant execute on function public.my_pair_streaks() to authenticated;
grant execute on function public.in_group(uuid, uuid) to authenticated;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.group_owner(uuid) to authenticated;
grant execute on function public.group_all_done(uuid, date, integer) to authenticated;
grant execute on function public.group_streak(uuid) to authenticated;
grant execute on function public.create_streak_group(text, uuid[]) to authenticated;
grant execute on function public.invite_to_group(uuid, uuid) to authenticated;
grant execute on function public.my_streak_groups() to authenticated;
grant execute on function public.group_members_today(uuid) to authenticated;
