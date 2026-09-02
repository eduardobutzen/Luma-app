import { useCallback, useEffect, useState } from 'react';

import { getFeed, type FeedItem } from '@/lib/feed';
import { currentUserId } from '@/lib/session';

export function useFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const uid = await currentUserId();
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    setItems(await getFeed());
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { items, loading, refetch };
}
