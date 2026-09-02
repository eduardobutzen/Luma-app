-- ============================================================================
-- Luma — Migration 10: identidade social no perfil (username, bio, privacidade)
-- Rode no SQL Editor do Supabase, ANTES da 11_friendships.sql.
-- É idempotente.
-- ============================================================================

-- username case-insensitive e único.
create extension if not exists citext;

-- Níveis de privacidade por campo.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'privacy_level') then
    create type public.privacy_level as enum ('private', 'friends', 'public');
  end if;
end$$;

-- Colunas sociais no profile.
alter table public.profiles
  add column if not exists username        citext unique,
  add column if not exists bio             text,
  add column if not exists discoverable    boolean not null default true,
  add column if not exists vis_streak       public.privacy_level not null default 'friends',
  add column if not exists vis_weight       public.privacy_level not null default 'private',
  add column if not exists vis_meals        public.privacy_level not null default 'friends',
  add column if not exists vis_achievements public.privacy_level not null default 'public',
  add column if not exists vis_photos       public.privacy_level not null default 'private';

-- Busca por username/nome.
create index if not exists profiles_username_idx on public.profiles (username);
