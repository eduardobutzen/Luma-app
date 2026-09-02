import { useCallback, useEffect, useState } from 'react';

import { currentUserId } from '@/lib/session';
import {
  listPairStreaks,
  listStreakGroups,
  type PairStreak,
  type StreakGroup,
} from '@/lib/streaks';

/** Pares 1:1 e grupos do usuário (resumo para o segmento Streaks). */
export function useStreaks() {
  const [pairs, setPairs] = useState<PairStreak[]>([]);
  const [groups, setGroups] = useState<StreakGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const uid = await currentUserId();
    if (!uid) {
      setPairs([]);
      setGroups([]);
      setLoading(false);
      return;
    }
    const [p, g] = await Promise.all([listPairStreaks(), listStreakGroups()]);
    setPairs(p);
    setGroups(g);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { pairs, groups, loading, refetch };
}
