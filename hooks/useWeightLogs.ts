import { useCallback, useEffect, useState } from 'react';

import { currentUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export interface WeightLog {
  id: string;
  weight_kg: number;
  logged_at: string;
}

export function useWeightLogs() {
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const uid = await currentUserId();
    if (!uid) {
      setLogs([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', uid)
      .order('logged_at', { ascending: true });
    setLogs(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const latest = logs.length > 0 ? logs[logs.length - 1].weight_kg : null;

  return { logs, latest, loading, refetch };
}
