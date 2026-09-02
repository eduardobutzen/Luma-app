import { useCallback, useEffect, useRef, useState } from 'react';

import { listMessages, type ChatMessage } from '@/lib/chat';
import { supabase } from '@/lib/supabase';

export type Participants = Record<string, { name: string; avatar: string | null }>;

/**
 * Carrega e mantém em tempo real as mensagens de uma DM ou grupo.
 * `participants` resolve nome/avatar de cada remetente para as mensagens que
 * chegam via realtime (que vêm sem o join de profiles).
 */
export function useMessages(
  opts: { dmId?: string; groupId?: string },
  participants: Participants,
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const partRef = useRef(participants);
  partRef.current = participants;

  const key = opts.dmId ?? opts.groupId ?? null;

  const refetch = useCallback(async () => {
    if (!key) {
      setLoading(false);
      return;
    }
    setMessages(await listMessages(opts));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!key) return;
    const filter = opts.dmId ? `dm_id=eq.${opts.dmId}` : `group_id=eq.${opts.groupId}`;
    const channel = supabase
      .channel(`chat-${key}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter },
        (payload) => {
          const r = payload.new as {
            id: string;
            sender_id: string;
            kind: ChatMessage['kind'];
            body: string | null;
            ref_id: string | null;
            meta: Record<string, unknown> | null;
            created_at: string;
          };
          const who = partRef.current[r.sender_id] ?? { name: '—', avatar: null };
          setMessages((prev) =>
            prev.some((m) => m.id === r.id)
              ? prev
              : [
                  ...prev,
                  {
                    id: r.id,
                    sender_id: r.sender_id,
                    sender_name: who.name,
                    sender_avatar: who.avatar,
                    kind: r.kind,
                    body: r.body,
                    ref_id: r.ref_id,
                    meta: r.meta ?? {},
                    created_at: r.created_at,
                  },
                ],
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { messages, loading, refetch };
}
