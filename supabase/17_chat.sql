-- ============================================================================
-- Luma — Migration 17: chat privado (1:1) e em grupo (nos grupos de streak)
-- Rode DEPOIS das 10–16. É idempotente.
-- Mensagens podem ser texto ou compartilhamento de receita/refeição/foto.
-- ============================================================================

-- Conversa 1:1 (par normalizado).
create table if not exists public.dm_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_low   uuid not null references auth.users (id) on delete cascade,
  user_high  uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_low <> user_high)
);
create unique index if not exists dm_pair_idx on public.dm_conversations (user_low, user_high);

-- Mensagens: ou de uma DM (dm_id) ou de um grupo de streak (group_id).
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  sender_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  dm_id      uuid references public.dm_conversations (id) on delete cascade,
  group_id   uuid references public.streak_groups (id) on delete cascade,
  kind       text not null default 'text' check (kind in ('text', 'recipe', 'meal', 'progress')),
  body       text,
  ref_id     uuid,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check ((dm_id is not null) <> (group_id is not null))
);
create index if not exists messages_dm_idx on public.messages (dm_id, created_at);
create index if not exists messages_group_idx on public.messages (group_id, created_at);

alter table public.dm_conversations enable row level security;
alter table public.messages enable row level security;

-- Helper SECURITY DEFINER: sou participante desta DM?
create or replace function public.in_dm(d uuid, u uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from public.dm_conversations c
                 where c.id = d and (c.user_low = u or c.user_high = u));
$$;

-- Policies dm_conversations
drop policy if exists "dm_select" on public.dm_conversations;
create policy "dm_select" on public.dm_conversations for select
  using (auth.uid() = user_low or auth.uid() = user_high);
drop policy if exists "dm_insert" on public.dm_conversations;
create policy "dm_insert" on public.dm_conversations for insert
  with check (auth.uid() = user_low or auth.uid() = user_high);

-- Policies messages
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages for select
  using (
    (dm_id is not null and public.in_dm(dm_id, auth.uid()))
    or (group_id is not null and public.is_group_member(group_id, auth.uid()))
  );
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages for insert
  with check (
    sender_id = auth.uid()
    and (
      (dm_id is not null and public.in_dm(dm_id, auth.uid()))
      or (group_id is not null and public.is_group_member(group_id, auth.uid()))
    )
  );

grant select, insert on table public.dm_conversations to authenticated;
grant select, insert on table public.messages to authenticated;

-- Pega (ou cria) a DM com um amigo. Só entre amigos aceitos.
create or replace function public.get_or_create_dm(other uuid)
returns uuid language plpgsql security definer
set search_path = public as $$
declare
  viewer uuid := auth.uid();
  lo uuid; hi uuid; cid uuid;
begin
  if other = viewer or not public.are_friends(viewer, other) then
    return null;
  end if;
  lo := least(viewer, other);
  hi := greatest(viewer, other);
  select id into cid from public.dm_conversations where user_low = lo and user_high = hi;
  if cid is null then
    insert into public.dm_conversations (user_low, user_high) values (lo, hi) returning id into cid;
  end if;
  return cid;
end;
$$;

-- Lista mensagens (com identidade do remetente). Autoriza por DM/grupo.
create or replace function public.list_messages(p_dm uuid default null, p_group uuid default null, lim integer default 200)
returns table (
  id uuid, sender_id uuid, sender_name text, sender_avatar text,
  kind text, body text, ref_id uuid, meta jsonb, created_at timestamptz
)
language plpgsql security definer stable
set search_path = public as $$
declare viewer uuid := auth.uid();
begin
  if p_dm is not null and not public.in_dm(p_dm, viewer) then return; end if;
  if p_group is not null and not public.is_group_member(p_group, viewer) then return; end if;
  return query
  select m.id, m.sender_id, p.name, p.avatar_url, m.kind, m.body, m.ref_id, m.meta, m.created_at
  from public.messages m
  join public.profiles p on p.id = m.sender_id
  where (p_dm is not null and m.dm_id = p_dm)
     or (p_group is not null and m.group_id = p_group)
  order by m.created_at asc
  limit greatest(lim, 1);
end;
$$;

grant execute on function public.in_dm(uuid, uuid) to authenticated;
grant execute on function public.get_or_create_dm(uuid) to authenticated;
grant execute on function public.list_messages(uuid, uuid, integer) to authenticated;

-- Realtime: publica a tabela messages (ignora se já estiver publicada).
do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when others then null;
  end;
end$$;
