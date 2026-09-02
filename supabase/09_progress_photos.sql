-- ============================================================================
-- Luma — Migration 09: fotos de progresso corporal (progress_photos)
-- Rode no SQL Editor do Supabase, depois das migrações anteriores.
-- As imagens ficam no bucket existente `meal-photos`, na subpasta
-- `${user_id}/progress/...` — a policy de Storage (1ª pasta = user_id) já cobre.
-- ============================================================================

create table if not exists public.progress_photos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  image_url  text not null,
  weight_kg  numeric,
  note       text,
  taken_at   timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists progress_photos_user_idx
  on public.progress_photos (user_id, taken_at desc);

alter table public.progress_photos enable row level security;

drop policy if exists "progress_photos_all_own" on public.progress_photos;
create policy "progress_photos_all_own" on public.progress_photos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on table public.progress_photos to authenticated;
