import { currentUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export const REACTION_EMOJIS = ['❤️', '🔥', '💪', '👏'] as const;

export type ReactionTarget = 'activity' | 'message';

export interface Comment {
  id: string;
  user_id: string;
  author_name: string;
  author_username: string | null;
  author_avatar: string | null;
  body: string;
  created_at: string;
}

export type NotificationType =
  | 'friend_request'
  | 'friend_accept'
  | 'reaction'
  | 'comment'
  | 'group_invite';

export interface AppNotification {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_avatar: string | null;
  type: NotificationType;
  ref_type: string | null;
  ref_id: string | null;
  meta: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

/** Alterna reação (mesmo emoji remove). Retorna 'set' | 'removed' | 'denied' | null. */
export async function toggleReaction(
  targetType: ReactionTarget,
  targetId: string,
  emoji: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('toggle_reaction', {
    p_target_type: targetType,
    p_target_id: targetId,
    p_emoji: emoji,
  });
  if (error) return null;
  return data as string;
}

export async function listComments(activityId: string): Promise<Comment[]> {
  const { data, error } = await supabase.rpc('list_comments', { aid: activityId });
  if (error) return [];
  return (data ?? []) as Comment[];
}

export async function addComment(activityId: string, body: string): Promise<boolean> {
  const uid = await currentUserId();
  if (!uid) return false;
  const { error } = await supabase
    .from('comments')
    .insert({ activity_id: activityId, user_id: uid, body });
  return !error;
}

export async function listNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase.rpc('list_notifications');
  if (error) return [];
  return (data ?? []) as AppNotification[];
}

export async function unreadNotificationsCount(): Promise<number> {
  const { data, error } = await supabase.rpc('unread_notifications_count');
  if (error || data == null) return 0;
  return data as number;
}

export async function markNotificationsRead(): Promise<void> {
  await supabase.rpc('mark_notifications_read');
}
