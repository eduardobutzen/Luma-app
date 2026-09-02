import { useCallback, useEffect, useState } from 'react';

import {
  acceptRequest,
  deleteFriendship,
  listFriendRequests,
  listFriends,
  removeFriendship,
  requestFriendship,
  type Friend,
  type FriendRequest,
} from '@/lib/social';
import { currentUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export function useFriends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const uid = await currentUserId();
    if (!uid) {
      setFriends([]);
      setRequests([]);
      setLoading(false);
      return;
    }
    const [f, r] = await Promise.all([listFriends(), listFriendRequests()]);
    setFriends(f);
    setRequests(r);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Atualiza em tempo real quando alguém envia/aceita/cancela uma amizade.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const uid = await currentUserId();
      if (!uid) return;
      channel = supabase
        .channel(`friends-${uid}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'friendships', filter: `requester_id=eq.${uid}` },
          () => refetch(),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${uid}` },
          () => refetch(),
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [refetch]);

  const incoming = requests.filter((r) => r.direction === 'in');
  const outgoing = requests.filter((r) => r.direction === 'out');

  const add = useCallback(
    async (target: string) => {
      const result = await requestFriendship(target);
      await refetch();
      return result;
    },
    [refetch],
  );

  const accept = useCallback(
    async (friendshipId: string) => {
      const ok = await acceptRequest(friendshipId);
      await refetch();
      return ok;
    },
    [refetch],
  );

  const reject = useCallback(
    async (friendshipId: string) => {
      const ok = await deleteFriendship(friendshipId);
      await refetch();
      return ok;
    },
    [refetch],
  );

  const remove = useCallback(
    async (otherId: string) => {
      const ok = await removeFriendship(otherId);
      await refetch();
      return ok;
    },
    [refetch],
  );

  return { friends, incoming, outgoing, loading, refetch, add, accept, reject, remove };
}
