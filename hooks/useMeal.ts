import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export interface MealItemRow {
  id: string;
  meal_id: string;
  name: string;
  grams: number;
  protein: number;
  carbs: number;
  fat: number;
  kcal: number;
}

export interface MealDetail {
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

export function useMeal(id: string) {
  const [meal, setMeal] = useState<MealDetail | null>(null);
  const [items, setItems] = useState<MealItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const [{ data: m }, { data: it }] = await Promise.all([
      supabase.from('meals').select('*').eq('id', id).single(),
      supabase.from('meal_items').select('*').eq('meal_id', id).order('id'),
    ]);
    setMeal(m);
    setItems(it ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { meal, items, loading, refetch };
}
