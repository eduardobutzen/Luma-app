import { useCallback, useEffect, useState } from 'react';

import { currentUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export interface MealTemplate {
  id: string;
  name: string;
  type: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function useMealTemplates() {
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const uid = await currentUserId();
    if (!uid) {
      setTemplates([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('meal_templates')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    setTemplates(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const remove = useCallback(
    async (id: string) => {
      await supabase.from('meal_templates').delete().eq('id', id);
      await refetch();
    },
    [refetch],
  );

  return { templates, loading, refetch, remove };
}
