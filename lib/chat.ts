import { currentUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export type MessageKind = 'text' | 'recipe' | 'meal' | 'progress';

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  kind: MessageKind;
  body: string | null;
  ref_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface ShareTarget {
  kind: MessageKind; // 'recipe' | 'meal' | 'progress'
  refId: string | null;
  title: string;
  image_url?: string | null;
  kcal?: number | null;
  /** Só aparece em mensagens antigas, de quando havia uma fonte externa. */
  source?: 'user' | 'spoonacular';
}

export interface DmOverview {
  other_id: string;
  last_body: string | null;
  last_kind: MessageKind;
  last_at: string;
  unread: number;
}

export interface GroupChatOverview {
  group_id: string;
  last_body: string | null;
  last_kind: MessageKind;
  last_at: string;
  unread: number;
}

/** Texto curto de prévia a partir do tipo/corpo da última mensagem. */
export function previewText(kind: MessageKind, body: string | null): string {
  if (kind === 'recipe') return '📋 Receita';
  if (kind === 'meal') return '🍽️ Refeição';
  if (kind === 'progress') return '📸 Foto de progresso';
  return body ?? '';
}

export async function getDmOverviews(): Promise<DmOverview[]> {
  const { data, error } = await supabase.rpc('dm_overview');
  if (error) return [];
  return (data ?? []) as DmOverview[];
}

export async function getGroupChatOverviews(): Promise<GroupChatOverview[]> {
  const { data, error } = await supabase.rpc('group_chat_overview');
  if (error) return [];
  return (data ?? []) as GroupChatOverview[];
}

export async function markChatRead(scope: 'dm' | 'group', scopeId: string): Promise<void> {
  await supabase.rpc('mark_chat_read', { p_scope: scope, p_scope_id: scopeId });
}

export interface RecentMeal {
  id: string;
  description: string | null;
  type: string;
  kcal: number;
  image_url: string | null;
}

/** Refeições recentes do usuário (para anexar numa conversa). */
export async function getRecentMeals(limit = 30): Promise<RecentMeal[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data } = await supabase
    .from('meals')
    .select('id, description, type, kcal, image_url')
    .eq('user_id', uid)
    .order('eaten_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as RecentMeal[];
}

export interface ProgressPhotoLite {
  id: string;
  image_url: string;
  note: string | null;
  taken_at: string;
}

/** Fotos de progresso do usuário (para anexar numa conversa). */
export async function getProgressPhotos(limit = 30): Promise<ProgressPhotoLite[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data } = await supabase
    .from('progress_photos')
    .select('id, image_url, note, taken_at')
    .eq('user_id', uid)
    .order('taken_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as ProgressPhotoLite[];
}

/** Resolve (ou cria) a conversa 1:1 com um amigo. */
export async function getOrCreateDm(otherId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_or_create_dm', { other: otherId });
  if (error || !data) return null;
  return data as string;
}

export async function listMessages(opts: { dmId?: string; groupId?: string }): Promise<ChatMessage[]> {
  const { data, error } = await supabase.rpc('list_messages', {
    p_dm: opts.dmId ?? null,
    p_group: opts.groupId ?? null,
  });
  if (error) return [];
  return (data ?? []) as ChatMessage[];
}

export async function sendMessage(opts: {
  dmId?: string;
  groupId?: string;
  kind?: MessageKind;
  body?: string;
  refId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<boolean> {
  const uid = await currentUserId();
  if (!uid) return false;
  const { error } = await supabase.from('messages').insert({
    sender_id: uid,
    dm_id: opts.dmId ?? null,
    group_id: opts.groupId ?? null,
    kind: opts.kind ?? 'text',
    body: opts.body ?? null,
    ref_id: opts.refId ?? null,
    meta: opts.meta ?? {},
  });
  return !error;
}

/** Envia um compartilhamento (receita/refeição/foto) para uma DM ou grupo. */
export async function sendShare(
  target: { dmId?: string; groupId?: string },
  share: ShareTarget,
): Promise<boolean> {
  return sendMessage({
    ...target,
    kind: share.kind,
    refId: share.refId,
    meta: {
      title: share.title,
      image_url: share.image_url ?? null,
      kcal: share.kcal ?? null,
      ...(share.source ? { source: share.source } : {}),
    },
  });
}
