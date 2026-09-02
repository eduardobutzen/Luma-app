-- ============================================================================
-- Luma — Migration 19: post de "resumo diário" no feed
-- Rode DEPOIS da 16/17/18. É idempotente.
-- ============================================================================

alter table public.activity drop constraint if exists activity_type_check;
alter table public.activity add constraint activity_type_check
  check (type in (
    'recipe_published', 'achievement', 'streak_milestone',
    'meal_shared', 'progress_shared', 'daily_summary'
  ));
