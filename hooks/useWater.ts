import { useCallback, useState } from 'react';

import { localDayRange } from '@/lib/date';
import { currentUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export function useWater(date: string) {
  const [totalMl, setTotalMl] = useState(0);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const uid = await currentUserId();
    if (!uid) {
      setTotalMl(0);
      setLoading(false);
      return;
    }
    const { start, end } = localDayRange(date);
    const { data } = await supabase
      .from('water_logs')
      .select('amount_ml')
      .eq('user_id', uid)
      .gte('logged_at', start)
      .lte('logged_at', end);
    setTotalMl((data ?? []).reduce((sum, r) => sum + r.amount_ml, 0));
    setLoading(false);
  }, [date]);

  const addWater = useCallback(
    async (amountMl: number) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from('water_logs')
        .insert({ user_id: user.id, amount_ml: amountMl });
      await refetch();
    },
    [refetch],
  );

  // Remove água registrando um valor negativo, sem deixar o total do dia < 0.
  const removeWater = useCallback(
    async (amountMl: number) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const delta = -Math.min(amountMl, totalMl);
      if (delta === 0) return; // já está em 0
      await supabase.from('water_logs').insert({ user_id: user.id, amount_ml: delta });
      await refetch();
    },
    [refetch, totalMl],
  );

  return { totalMl, loading, addWater, removeWater, refetch };
}
