import { useCallback, useEffect, useState } from 'react';

import {
  computeAchievements,
  type Achievement,
  type AchievementStats,
} from '@/lib/achievements';
import { localDateKey } from '@/lib/date';
import { supabase } from '@/lib/supabase';

const EMPTY_STATS: AchievementStats = {
  totalMeals: 0,
  daysLogged: 0,
  streak: 0,
  totalKcal: 0,
  totalProtein: 0,
  proteinGoalDays: 0,
  kcalGoalDays: 0,
  distinctTypes: 0,
  earlyMeals: 0,
  lateMeals: 0,
  weekendMeals: 0,
  waterCount: 0,
  waterGoalDays: 0,
  weightCount: 0,
  fastsCount: 0,
  longestFastHours: 0,
  templatesCount: 0,
};

export type { Achievement };

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>(() =>
    computeAchievements(EMPTY_STATS),
  );
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [mealsRes, waterRes, weightRes, fastsRes, templatesRes, profileRes] =
      await Promise.all([
        supabase.from('meals').select('eaten_at, kcal, protein, type').eq('user_id', user.id),
        supabase.from('water_logs').select('amount_ml, logged_at').eq('user_id', user.id),
        supabase.from('weight_logs').select('id').eq('user_id', user.id),
        supabase.from('fasts').select('started_at, ended_at').eq('user_id', user.id).not('ended_at', 'is', null),
        supabase.from('meal_templates').select('id').eq('user_id', user.id),
        supabase.from('profiles').select('streak, goal_kcal, goal_protein, goal_water_ml').eq('id', user.id).single(),
      ]);

    const meals = mealsRes.data ?? [];
    const water = waterRes.data ?? [];
    const fasts = fastsRes.data ?? [];
    const profile = profileRes.data;
    const goalKcal = profile?.goal_kcal ?? 0;
    const goalProtein = profile?.goal_protein ?? 0;
    const goalWater = profile?.goal_water_ml ?? 0;

    // Agregações por dia (refeições).
    const dayKcal = new Map<string, number>();
    const dayProtein = new Map<string, number>();
    const types = new Set<string>();
    let totalKcal = 0;
    let totalProtein = 0;
    let earlyMeals = 0;
    let lateMeals = 0;
    let weekendMeals = 0;

    for (const m of meals) {
      const d = new Date(m.eaten_at);
      const key = localDateKey(d);
      dayKcal.set(key, (dayKcal.get(key) ?? 0) + m.kcal);
      dayProtein.set(key, (dayProtein.get(key) ?? 0) + m.protein);
      types.add(m.type);
      totalKcal += m.kcal;
      totalProtein += m.protein;
      const hour = d.getHours();
      if (hour < 7) earlyMeals += 1;
      if (hour >= 22) lateMeals += 1;
      const wd = d.getDay();
      if (wd === 0 || wd === 6) weekendMeals += 1;
    }

    const proteinGoalDays =
      goalProtein > 0 ? [...dayProtein.values()].filter((p) => p >= goalProtein).length : 0;
    const kcalGoalDays =
      goalKcal > 0
        ? [...dayKcal.values()].filter((k) => k >= goalKcal * 0.9 && k <= goalKcal * 1.1).length
        : 0;

    // Água por dia.
    const dayWater = new Map<string, number>();
    for (const w of water) {
      const key = localDateKey(new Date(w.logged_at));
      dayWater.set(key, (dayWater.get(key) ?? 0) + w.amount_ml);
    }
    const waterGoalDays =
      goalWater > 0 ? [...dayWater.values()].filter((v) => v >= goalWater).length : 0;

    // Jejum mais longo (horas).
    let longestFastHours = 0;
    for (const f of fasts) {
      if (!f.ended_at) continue;
      const hrs = (new Date(f.ended_at).getTime() - new Date(f.started_at).getTime()) / 3600000;
      if (hrs > longestFastHours) longestFastHours = hrs;
    }

    const stats: AchievementStats = {
      totalMeals: meals.length,
      daysLogged: dayKcal.size,
      streak: profile?.streak ?? 0,
      totalKcal,
      totalProtein,
      proteinGoalDays,
      kcalGoalDays,
      distinctTypes: types.size,
      earlyMeals,
      lateMeals,
      weekendMeals,
      waterCount: water.length,
      waterGoalDays,
      weightCount: (weightRes.data ?? []).length,
      fastsCount: fasts.length,
      longestFastHours: Math.floor(longestFastHours),
      templatesCount: (templatesRes.data ?? []).length,
    };

    setAchievements(computeAchievements(stats));
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { achievements, loading, refetch };
}
