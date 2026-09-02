-- ============================================================================
-- Luma — Migration 20: estatísticas do perfil (gráficos no perfil do usuário)
-- Rode DEPOIS das anteriores. É idempotente.
-- Respeita a privacidade por campo (vis_meals / vis_weight) via can_view.
-- ============================================================================

create or replace function public.user_profile_stats(target uuid)
returns jsonb language plpgsql security definer stable
set search_path = public as $$
declare
  viewer uuid := auth.uid();
  can_meals boolean := false;
  can_weight boolean := false;
  weekly jsonb;
  weights jsonb;
  avg_kcal int := 0;
  active_days int := 0;
  total_meals int := 0;
  avg_p int := 0; avg_c int := 0; avg_f int := 0;
  cur_weight numeric; first_weight numeric;
  recipes_count int := 0;
  pstreak int := 0;
begin
  select public.can_view(viewer, p.id, p.vis_meals), public.can_view(viewer, p.id, p.vis_weight)
    into can_meals, can_weight
  from public.profiles p where p.id = target;

  select count(*)::int into recipes_count
  from public.recipes where user_id = target and visibility = 'public';

  if viewer = target or public.are_friends(viewer, target) then
    pstreak := public.pair_streak(viewer, target);
  end if;

  if can_meals then
    select jsonb_agg(jsonb_build_object('date', to_char(g.d, 'YYYY-MM-DD'), 'kcal', coalesce(x.k, 0)) order by g.d)
      into weekly
    from generate_series((current_date - 6), current_date, interval '1 day') g(d)
    left join lateral (
      select sum(m.kcal)::int k from public.meals m
      where m.user_id = target and m.eaten_at::date = g.d::date
    ) x on true;

    with days as (
      select m.eaten_at::date d, sum(m.kcal) k, sum(m.protein) p, sum(m.carbs) c, sum(m.fat) f
      from public.meals m
      where m.user_id = target and m.eaten_at::date > current_date - 7
      group by m.eaten_at::date
    )
    select coalesce(round(avg(k))::int, 0), count(*)::int,
           coalesce(round(avg(p))::int, 0), coalesce(round(avg(c))::int, 0), coalesce(round(avg(f))::int, 0)
      into avg_kcal, active_days, avg_p, avg_c, avg_f
    from days;

    select count(*)::int into total_meals
    from public.meals where user_id = target and eaten_at::date > current_date - 7;
  end if;

  if can_weight then
    select jsonb_agg(jsonb_build_object('kg', s.weight_kg) order by s.logged_at)
      into weights
    from (
      select weight_kg, logged_at from public.weight_logs
      where user_id = target order by logged_at desc limit 30
    ) s;
    select weight_kg into cur_weight from public.weight_logs where user_id = target order by logged_at desc limit 1;
    select weight_kg into first_weight from public.weight_logs where user_id = target order by logged_at asc limit 1;
  end if;

  return jsonb_build_object(
    'can_meals', can_meals,
    'can_weight', can_weight,
    'weekly', coalesce(weekly, '[]'::jsonb),
    'avg_kcal', avg_kcal,
    'active_days', active_days,
    'total_meals', total_meals,
    'avg_protein', avg_p,
    'avg_carbs', avg_c,
    'avg_fat', avg_f,
    'weights', coalesce(weights, '[]'::jsonb),
    'current_weight', cur_weight,
    'weight_delta', case when cur_weight is not null and first_weight is not null
                         then cur_weight - first_weight else null end,
    'recipes_count', recipes_count,
    'pair_streak', pstreak
  );
end;
$$;

grant execute on function public.user_profile_stats(uuid) to authenticated;
