-- ============================================================================
-- Luma — Migration 02: Storage de fotos, colunas de TDEE e streak automático
-- Rode DEPOIS de supabase/schema.sql, no SQL Editor do Supabase.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Bucket de fotos de refeição (público para leitura; escrita só na própria pasta)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', true)
on conflict (id) do nothing;

-- Leitura pública (necessária para usar a URL pública em image_url).
drop policy if exists "meal_photos_read" on storage.objects;
create policy "meal_photos_read" on storage.objects
  for select using (bucket_id = 'meal-photos');

-- Escrita/edição/remoção apenas em arquivos sob a pasta do próprio usuário
-- (convenção de path: "<uid>/<arquivo>").
drop policy if exists "meal_photos_insert_own" on storage.objects;
create policy "meal_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "meal_photos_update_own" on storage.objects;
create policy "meal_photos_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "meal_photos_delete_own" on storage.objects;
create policy "meal_photos_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- 2) Colunas de perfil para a calculadora TDEE / onboarding
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists weight_kg      numeric,
  add column if not exists height_cm      numeric,
  add column if not exists age            integer,
  add column if not exists sex            text check (sex in ('male', 'female')),
  add column if not exists activity_level text,   -- sedentary | light | moderate | active | very_active
  add column if not exists goal           text,   -- lose | maintain | gain
  add column if not exists onboarded      boolean not null default false;

-- ----------------------------------------------------------------------------
-- 3) Streak automático: nº de dias consecutivos (até hoje) com ao menos 1 refeição.
--    Recalculado por trigger a cada insert/delete em meals.
-- ----------------------------------------------------------------------------
create or replace function public.recompute_streak(uid uuid)
returns integer as $$
declare
  s integer := 0;
  d date := current_date;
begin
  loop
    if exists (
      select 1 from public.meals
      where user_id = uid and eaten_at::date = d
    ) then
      s := s + 1;
      d := d - 1;
    else
      exit;
    end if;
  end loop;
  update public.profiles set streak = s where id = uid;
  return s;
end;
$$ language plpgsql security definer;

create or replace function public.meals_after_change()
returns trigger as $$
begin
  perform public.recompute_streak(coalesce(new.user_id, old.user_id));
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists meals_streak_trigger on public.meals;
create trigger meals_streak_trigger
  after insert or delete on public.meals
  for each row execute function public.meals_after_change();
