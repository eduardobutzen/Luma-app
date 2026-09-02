import { useCallback, useState } from 'react';

import { localDateKey, localDayRange } from '@/lib/date';
import { currentUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export interface DayTotal {
  date: string; // yyyy-mm-dd
  weekday: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface WeeklySummary {
  days: DayTotal[];
  /** Average kcal across days (in the current week) that have at least one meal. */
  avgKcal: number;
  /** Average kcal of the previous 7-day window. */
  prevAvgKcal: number;
  /** % change of avgKcal vs the previous week, or null when no prior data. */
  deltaPct: number | null;
  /** Macro distribution as % of total calories (protein/carbs ×4, fat ×9). */
  dist: { protein: number; carbs: number; fat: number };
}

const EMPTY: WeeklySummary = {
  days: [],
  avgKcal: 0,
  prevAvgKcal: 0,
  deltaPct: null,
  dist: { protein: 0, carbs: 0, fat: 0 },
};

function avgOf(days: DayTotal[]): number {
  const withData = days.filter((d) => d.kcal > 0);
  if (withData.length === 0) return 0;
  return Math.round(withData.reduce((s, d) => s + d.kcal, 0) / withData.length);
}

export function useWeeklyMeals() {
  const [summary, setSummary] = useState<WeeklySummary>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const today = new Date();

    // 14 ordered day buckets (oldest → today), keyed by LOCAL date.
    const buckets: DayTotal[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      buckets.push({
        date: localDateKey(d),
        weekday: WEEKDAYS[d.getDay()],
        kcal: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });
    }

    const { start: startStr } = localDayRange(buckets[0].date);
    const { end: endStr } = localDayRange(buckets[buckets.length - 1].date);

    const uid = await currentUserId();
    if (!uid) {
      setSummary(EMPTY);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', uid)
      .gte('eaten_at', startStr)
      .lte('eaten_at', endStr);
    const rows = data ?? [];

    const byDate = new Map(buckets.map((d) => [d.date, d]));
    for (const m of rows) {
      const bucket = byDate.get(localDateKey(new Date(m.eaten_at)));
      if (bucket) {
        bucket.kcal += m.kcal;
        bucket.protein += m.protein;
        bucket.carbs += m.carbs;
        bucket.fat += m.fat;
      }
    }

    const prevDays = buckets.slice(0, 7);
    const days = buckets.slice(7); // current week

    const avgKcal = avgOf(days);
    const prevAvgKcal = avgOf(prevDays);
    const deltaPct =
      prevAvgKcal > 0 ? Math.round(((avgKcal - prevAvgKcal) / prevAvgKcal) * 100) : null;

    const pCal = days.reduce((s, d) => s + d.protein, 0) * 4;
    const cCal = days.reduce((s, d) => s + d.carbs, 0) * 4;
    const fCal = days.reduce((s, d) => s + d.fat, 0) * 9;
    const macroCal = pCal + cCal + fCal;
    const dist =
      macroCal > 0
        ? {
            protein: Math.round((pCal / macroCal) * 100),
            carbs: Math.round((cCal / macroCal) * 100),
            fat: Math.round((fCal / macroCal) * 100),
          }
        : { protein: 0, carbs: 0, fat: 0 };

    setSummary({ days, avgKcal, prevAvgKcal, deltaPct, dist });
    setLoading(false);
  }, []);

  return { summary, loading, refetch };
}
