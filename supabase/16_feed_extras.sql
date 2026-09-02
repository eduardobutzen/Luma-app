-- ============================================================================
-- Luma — Migration 16: compartilhar foto de progresso + publicações no perfil
-- Rode DEPOIS da 14_feed.sql. É idempotente.
-- ============================================================================

-- Novo tipo de atividade: foto de progresso compartilhada.
alter table public.activity drop constraint if exists activity_type_check;
alter table public.activity add constraint activity_type_check
  check (type in ('recipe_published', 'achievement', 'streak_milestone', 'meal_shared', 'progress_shared'));

-- Publicações de um usuário (para exibir no perfil dele).
-- Regra de visibilidade: receitas públicas aparecem para qualquer um; os demais
-- tipos só para amigos aceitos (ou o próprio dono).
create or replace function public.user_activity(target uuid, lim integer default 10)
returns table (id uuid, type text, ref_id uuid, meta jsonb, created_at timestamptz)
language plpgsql security definer stable
set search_path = public as $$
declare viewer uuid := auth.uid();
begin
  return query
  select a.id, a.type, a.ref_id, a.meta, a.created_at
  from public.activity a
  where a.user_id = target
    and (a.type = 'recipe_published' or public.are_friends(viewer, target) or viewer = target)
  order by a.created_at desc
  limit greatest(lim, 1);
end;
$$;

grant execute on function public.user_activity(uuid, integer) to authenticated;
