import { useCallback, useEffect, useState } from 'react';

import { unreadNotificationsCount } from '@/lib/engagement';
import { currentUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';

/** Contador de notificações não lidas, atualizado em tempo real. */
export function useUnreadNotifications() {
  const [count, setCount] = useState(0);

  const refetch = useCallback(async () => {
    setCount(await unreadNotificationsCount());
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const uid = await currentUserId();
      if (!uid) return;
      channel = supabase
        .channel(`notif-${uid}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
          () => refetch(),
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [refetch]);

  return { count, refetch };
}
