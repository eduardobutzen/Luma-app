import { useCallback, useEffect, useState } from 'react';

import { localDateKey } from '@/lib/date';
import { currentUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export interface Fast {
  id: string;
  started_at: string;
  ended_at: string | null;
  target_hours: number;
}

function computeStreak(history: Fast[]): number {
  const days = new Set(
    history
      .filter((f) => f.ended_at)
      .map((f) => localDateKey(new Date(f.ended_at as string))),
  );
  let streak = 0;
  const d = new Date();
  while (days.has(localDateKey(d))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function useFasting() {
  const [active, setActive] = useState<Fast | null>(null);
  const [history, setHistory] = useState<Fast[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const uid = await currentUserId();
    if (!uid) {
      setActive(null);
      setHistory([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('fasts')
      .select('*')
      .eq('user_id', uid)
      .order('started_at', { ascending: false });
    const rows = (data ?? []) as Fast[];
    setActive(rows.find((r) => !r.ended_at) ?? null);
    setHistory(rows.filter((r) => r.ended_at));
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const startFast = useCallback(
    async (targetHours: number) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('fasts').insert({ user_id: user.id, target_hours: targetHours });
      await refetch();
    },
    [refetch],
  );

  const endFast = useCallback(async () => {
    if (!active) return;
    await supabase.from('fasts').update({ ended_at: new Date().toISOString() }).eq('id', active.id);
    await refetch();
  }, [active, refetch]);

  return {
    active,
    history,
    streak: computeStreak(history),
    loading,
    refetch,
    startFast,
    endFast,
  };
}
