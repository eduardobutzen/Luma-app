-- ============================================================================
-- Luma — Migration 21: engajamento social (reações, comentários, notificações)
-- Rode DEPOIS das anteriores (precisa de activity, messages, friendships, etc.).
-- É idempotente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tabelas
-- ----------------------------------------------------------------------------
create table if not exists public.reactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('activity', 'message')),
  target_id   uuid not null,
  emoji       text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);
create index if not exists reactions_target_idx on public.reactions (target_type, target_id);

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activity (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists comments_activity_idx on public.comments (activity_id, created_at);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade, -- destinatário
  actor_id   uuid references auth.users (id) on delete cascade,
  type       text not null,
  ref_type   text,
  ref_id     uuid,
  meta       jsonb not null default '{}'::jsonb,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Helpers de visibilidade (SECURITY DEFINER — sem recursão de RLS)
-- ----------------------------------------------------------------------------
create or replace function public.can_see_activity(aid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.activity a
    where a.id = aid and (a.user_id = auth.uid() or public.are_friends(auth.uid(), a.user_id))
  );
$$;

create or replace function public.can_see_message(mid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.messages m
    where m.id = mid and (
      (m.dm_id is not null and public.in_dm(m.dm_id, auth.uid()))
      or (m.group_id is not null and public.is_group_member(m.group_id, auth.uid()))
    )
  );
$$;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.reactions enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "reactions_select" on public.reactions;
create policy "reactions_select" on public.reactions for select using (
  (target_type = 'activity' and public.can_see_activity(target_id))
  or (target_type = 'message' and public.can_see_message(target_id))
);
drop policy if exists "reactions_insert" on public.reactions;
create policy "reactions_insert" on public.reactions for insert with check (
  user_id = auth.uid() and (
    (target_type = 'activity' and public.can_see_activity(target_id))
    or (target_type = 'message' and public.can_see_message(target_id))
  )
);
drop policy if exists "reactions_update" on public.reactions;
create policy "reactions_update" on public.reactions for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "reactions_delete" on public.reactions;
create policy "reactions_delete" on public.reactions for delete using (user_id = auth.uid());

drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments for select
  using (public.can_see_activity(activity_id));
drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments for insert
  with check (user_id = auth.uid() and public.can_see_activity(activity_id));
drop policy if exists "comments_delete" on public.comments;
create policy "comments_delete" on public.comments for delete using (user_id = auth.uid());

drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications for select using (user_id = auth.uid());
drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on table public.reactions to authenticated;
grant select, insert, delete on table public.comments to authenticated;
grant select, update on table public.notifications to authenticated;

-- ----------------------------------------------------------------------------
-- Triggers → notifications (todas SECURITY DEFINER)
-- ----------------------------------------------------------------------------
create or replace function public.notify_friendship()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if TG_OP = 'INSERT' and NEW.status = 'pending' then
    insert into public.notifications (user_id, actor_id, type, ref_type, ref_id)
    values (NEW.addressee_id, NEW.requester_id, 'friend_request', 'user', NEW.requester_id);
  elsif TG_OP = 'UPDATE' and NEW.status = 'accepted' and OLD.status is distinct from 'accepted' then
    insert into public.notifications (user_id, actor_id, type, ref_type, ref_id)
    values (NEW.requester_id, NEW.addressee_id, 'friend_accept', 'user', NEW.addressee_id);
  end if;
  return NEW;
end;
$$;
drop trigger if exists friendships_notify on public.friendships;
create trigger friendships_notify after insert or update on public.friendships
  for each row execute function public.notify_friendship();

create or replace function public.notify_reaction()
returns trigger language plpgsql security definer
set search_path = public as $$
declare owner_id uuid;
begin
  if NEW.target_type = 'activity' then
    select a.user_id into owner_id from public.activity a where a.id = NEW.target_id;
  else
    select m.sender_id into owner_id from public.messages m where m.id = NEW.target_id;
  end if;
  if owner_id is not null and owner_id <> NEW.user_id then
    insert into public.notifications (user_id, actor_id, type, ref_type, ref_id, meta)
    values (owner_id, NEW.user_id, 'reaction', NEW.target_type, NEW.target_id,
            jsonb_build_object('emoji', NEW.emoji));
  end if;
  return NEW;
end;
$$;
drop trigger if exists reactions_notify on public.reactions;
create trigger reactions_notify after insert on public.reactions
  for each row execute function public.notify_reaction();

create or replace function public.notify_comment()
returns trigger language plpgsql security definer
set search_path = public as $$
declare owner_id uuid;
begin
  select a.user_id into owner_id from public.activity a where a.id = NEW.activity_id;
  if owner_id is not null and owner_id <> NEW.user_id then
    insert into public.notifications (user_id, actor_id, type, ref_type, ref_id, meta)
    values (owner_id, NEW.user_id, 'comment', 'activity', NEW.activity_id,
            jsonb_build_object('preview', left(NEW.body, 80)));
  end if;
  return NEW;
end;
$$;
drop trigger if exists comments_notify on public.comments;
create trigger comments_notify after insert on public.comments
  for each row execute function public.notify_comment();

create or replace function public.notify_group_invite()
returns trigger language plpgsql security definer
set search_path = public as $$
declare owner_id uuid;
begin
  if NEW.status = 'invited' then
    select g.owner_id into owner_id from public.streak_groups g where g.id = NEW.group_id;
    if owner_id is not null and owner_id <> NEW.user_id then
      insert into public.notifications (user_id, actor_id, type, ref_type, ref_id, meta)
      values (NEW.user_id, owner_id, 'group_invite', 'group', NEW.group_id, '{}'::jsonb);
    end if;
  end if;
  return NEW;
end;
$$;
drop trigger if exists sgm_notify on public.streak_group_members;
create trigger sgm_notify after insert on public.streak_group_members
  for each row execute function public.notify_group_invite();

-- ----------------------------------------------------------------------------
-- RPCs
-- ----------------------------------------------------------------------------
-- Alterna reação (mesmo emoji = remove; outro = troca). Retorna 'set'|'removed'|'denied'.
create or replace function public.toggle_reaction(p_target_type text, p_target_id uuid, p_emoji text)
returns text language plpgsql security definer
set search_path = public as $$
declare cur text;
begin
  if p_target_type = 'activity' and not public.can_see_activity(p_target_id) then return 'denied'; end if;
  if p_target_type = 'message' and not public.can_see_message(p_target_id) then return 'denied'; end if;

  select emoji into cur from public.reactions
   where user_id = auth.uid() and target_type = p_target_type and target_id = p_target_id;

  if cur = p_emoji then
    delete from public.reactions
     where user_id = auth.uid() and target_type = p_target_type and target_id = p_target_id;
    return 'removed';
  end if;

  insert into public.reactions (user_id, target_type, target_id, emoji)
  values (auth.uid(), p_target_type, p_target_id, p_emoji)
  on conflict (user_id, target_type, target_id)
    do update set emoji = excluded.emoji, created_at = now();
  return 'set';
end;
$$;

create or replace function public.list_comments(aid uuid)
returns table (id uuid, user_id uuid, author_name text, author_username text, author_avatar text, body text, created_at timestamptz)
language plpgsql security definer stable
set search_path = public as $$
begin
  if not public.can_see_activity(aid) then return; end if;
  return query
  select c.id, c.user_id, p.name, p.username::text, p.avatar_url, c.body, c.created_at
  from public.comments c join public.profiles p on p.id = c.user_id
  where c.activity_id = aid
  order by c.created_at asc;
end;
$$;

create or replace function public.list_notifications()
returns table (
  id uuid, actor_id uuid, actor_name text, actor_avatar text,
  type text, ref_type text, ref_id uuid, meta jsonb, read boolean, created_at timestamptz
)
language plpgsql security definer stable
set search_path = public as $$
declare viewer uuid := auth.uid();
begin
  return query
  select n.id, n.actor_id, p.name, p.avatar_url, n.type, n.ref_type, n.ref_id, n.meta, n.read, n.created_at
  from public.notifications n
  left join public.profiles p on p.id = n.actor_id
  where n.user_id = viewer
  order by n.created_at desc
  limit 50;
end;
$$;

create or replace function public.unread_notifications_count()
returns integer language sql security definer stable
set search_path = public as $$
  select count(*)::int from public.notifications where user_id = auth.uid() and not read;
$$;

create or replace function public.mark_notifications_read()
returns void language sql security definer
set search_path = public as $$
  update public.notifications set read = true where user_id = auth.uid() and not read;
$$;

grant execute on function public.can_see_activity(uuid) to authenticated;
grant execute on function public.can_see_message(uuid) to authenticated;
grant execute on function public.toggle_reaction(text, uuid, text) to authenticated;
grant execute on function public.list_comments(uuid) to authenticated;
grant execute on function public.list_notifications() to authenticated;
grant execute on function public.unread_notifications_count() to authenticated;
grant execute on function public.mark_notifications_read() to authenticated;

-- ----------------------------------------------------------------------------
-- friend_feed: + reações (emoji→contagem), my_reaction, comment_count
-- ----------------------------------------------------------------------------
drop function if exists public.friend_feed(integer, integer);
create or replace function public.friend_feed(lim integer default 40, off integer default 0)
returns table (
  id uuid, user_id uuid, type text, ref_id uuid, meta jsonb, created_at timestamptz,
  author_name text, author_username text, author_avatar text, is_mine boolean,
  reactions jsonb, my_reaction text, comment_count integer
)
language plpgsql security definer stable
set search_path = public as $$
declare viewer uuid := auth.uid();
begin
  return query
  select a.id, a.user_id, a.type, a.ref_id, a.meta, a.created_at,
    p.name, p.username::text, p.avatar_url, (a.user_id = viewer),
    coalesce((
      select jsonb_object_agg(z.emoji, z.cnt)
      from (select r.emoji, count(*) cnt from public.reactions r
            where r.target_type = 'activity' and r.target_id = a.id group by r.emoji) z
    ), '{}'::jsonb),
    (select r2.emoji from public.reactions r2
      where r2.target_type = 'activity' and r2.target_id = a.id and r2.user_id = viewer),
    (select count(*)::int from public.comments c where c.activity_id = a.id)
  from public.activity a
  join public.profiles p on p.id = a.user_id
  where a.user_id = viewer or public.are_friends(viewer, a.user_id)
  order by a.created_at desc
  limit greatest(lim, 1) offset greatest(off, 0);
end;
$$;
grant execute on function public.friend_feed(integer, integer) to authenticated;

-- Realtime para o badge do sino.
do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when others then null;
  end;
end$$;
