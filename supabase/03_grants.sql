-- ============================================================================
-- Luma — Migration 03: GRANTs de tabela para os papéis da API (PostgREST)
-- Corrige "permission denied for table ..." — privilégio de TABELA, separado
-- do RLS. O RLS continua restringindo QUAIS linhas cada usuário acessa; o GRANT
-- apenas permite que o papel `authenticated` toque na tabela.
-- Rode no SQL Editor do Supabase.
-- ============================================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.profiles   to authenticated;
grant select, insert, update, delete on table public.meals      to authenticated;
grant select, insert, update, delete on table public.meal_items to authenticated;

-- Garante que tabelas futuras no schema public também fiquem acessíveis.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
