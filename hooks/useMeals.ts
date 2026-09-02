import { useCallback, useState } from 'react';

import { localDayRange } from '@/lib/date';
import { currentUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export interface MealRow {
  id: string;
  type: string;
  description: string | null;
  image_url: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  eaten_at: string;
}

export function useMeals(date: string) {
  const [meals, setMeals] = useState<MealRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeals = useCallback(async () => {
    // Note: we intentionally do NOT flip `loading` back to true on refetch — it
    // stays true only until the first load resolves. Otherwise every focus
    // refetch would blank the screen with a full-screen spinner (bug 1.7).
    const uid = await currentUserId();
    if (!uid) {
      setMeals([]);
      setLoading(false);
      return;
    }
    const { start, end } = localDayRange(date);
    const { data } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', uid)
      .gte('eaten_at', start)
      .lte('eaten_at', end)
      .order('eaten_at', { ascending: true });
    setMeals(data ?? []);
    setLoading(false);
  }, [date]);

  return { meals, loading, refetch: fetchMeals };
}
