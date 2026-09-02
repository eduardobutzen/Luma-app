-- ============================================================================
-- Luma — Migration 18: prévia da última mensagem + não lidas no chat
-- Rode DEPOIS da 17_chat.sql. É idempotente.
-- ============================================================================

create table if not exists public.chat_reads (
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  scope        text not null check (scope in ('dm', 'group')),
  scope_id     uuid not null,
  last_read_at timestamptz not null default now(),
  primary key (user_id, scope, scope_id)
);

alter table public.chat_reads enable row level security;
drop policy if exists "chat_reads_all_own" on public.chat_reads;
create policy "chat_reads_all_own" on public.chat_reads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on table public.chat_reads to authenticated;

-- Marca uma conversa como lida (agora).
create or replace function public.mark_chat_read(p_scope text, p_scope_id uuid)
returns void language sql security definer
set search_path = public as $$
  insert into public.chat_reads (user_id, scope, scope_id, last_read_at)
  values (auth.uid(), p_scope, p_scope_id, now())
  on conflict (user_id, scope, scope_id) do update set last_read_at = now();
$$;

-- Resumo das conversas 1:1 (só as que têm mensagem).
create or replace function public.dm_overview()
returns table (other_id uuid, last_body text, last_kind text, last_at timestamptz, unread integer)
language plpgsql security definer stable
set search_path = public as $$
declare viewer uuid := auth.uid();
begin
  return query
  select
    case when c.user_low = viewer then c.user_high else c.user_low end,
    lm.body, lm.kind, lm.created_at,
    (select count(*)::int from public.messages m2
       where m2.dm_id = c.id and m2.sender_id <> viewer
         and m2.created_at > coalesce(r.last_read_at, 'epoch'::timestamptz))
  from public.dm_conversations c
  left join lateral (
    select m.body, m.kind, m.created_at from public.messages m
    where m.dm_id = c.id order by m.created_at desc limit 1
  ) lm on true
  left join public.chat_reads r on r.user_id = viewer and r.scope = 'dm' and r.scope_id = c.id
  where (c.user_low = viewer or c.user_high = viewer) and lm.created_at is not null;
end;
$$;

-- Resumo dos chats de grupo (grupos onde sou membro ativo, com mensagem).
create or replace function public.group_chat_overview()
returns table (group_id uuid, last_body text, last_kind text, last_at timestamptz, unread integer)
language plpgsql security definer stable
set search_path = public as $$
declare viewer uuid := auth.uid();
begin
  return query
  select g.id, lm.body, lm.kind, lm.created_at,
    (select count(*)::int from public.messages m2
       where m2.group_id = g.id and m2.sender_id <> viewer
         and m2.created_at > coalesce(r.last_read_at, 'epoch'::timestamptz))
  from public.streak_groups g
  join public.streak_group_members mm
    on mm.group_id = g.id and mm.user_id = viewer and mm.status = 'active'
  left join lateral (
    select m.body, m.kind, m.created_at from public.messages m
    where m.group_id = g.id order by m.created_at desc limit 1
  ) lm on true
  left join public.chat_reads r on r.user_id = viewer and r.scope = 'group' and r.scope_id = g.id
  where lm.created_at is not null;
end;
$$;

grant execute on function public.mark_chat_read(text, uuid) to authenticated;
grant execute on function public.dm_overview() to authenticated;
grant execute on function public.group_chat_overview() to authenticated;
