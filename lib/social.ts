import { supabase } from '@/lib/supabase';

export type PrivacyLevel = 'private' | 'friends' | 'public';
export type FriendStatus = 'none' | 'pending_out' | 'pending_in' | 'friends';

export interface UserSearchResult {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  friend_status: FriendStatus;
}

export interface Friend {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  streak: number | null;
}

export interface FriendRequest {
  friendship_id: string;
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  direction: 'in' | 'out';
  created_at: string;
}

export interface ProfileCard {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  streak: number | null;
  weight_kg: number | null;
  vis_meals: PrivacyLevel;
  vis_achievements: PrivacyLevel;
  vis_photos: PrivacyLevel;
  friend_status: FriendStatus;
  is_self: boolean;
  member_since: string;
}

export async function searchUsers(q: string): Promise<UserSearchResult[]> {
  const { data, error } = await supabase.rpc('search_users', { q });
  if (error) throw new Error(error.message);
  return (data ?? []) as UserSearchResult[];
}

export async function getProfileCard(target: string): Promise<ProfileCard | null> {
  const { data, error } = await supabase.rpc('profile_card', { target });
  if (error || !data || data.length === 0) return null;
  return data[0] as ProfileCard;
}

export interface UserStats {
  can_meals: boolean;
  can_weight: boolean;
  weekly: { date: string; kcal: number }[];
  avg_kcal: number;
  active_days: number;
  total_meals: number;
  avg_protein: number;
  avg_carbs: number;
  avg_fat: number;
  weights: { kg: number }[];
  current_weight: number | null;
  weight_delta: number | null;
  recipes_count: number;
  pair_streak: number;
}

export async function getUserStats(target: string): Promise<UserStats | null> {
  const { data, error } = await supabase.rpc('user_profile_stats', { target });
  if (error || !data) return null;
  return data as UserStats;
}

export async function listFriends(): Promise<Friend[]> {
  const { data, error } = await supabase.rpc('my_friends');
  if (error) return [];
  return (data ?? []) as Friend[];
}

export async function listFriendRequests(): Promise<FriendRequest[]> {
  const { data, error } = await supabase.rpc('my_friend_requests');
  if (error) return [];
  return (data ?? []) as FriendRequest[];
}

/** Envia pedido (ou aceita automaticamente se houver pedido recíproco). */
export async function requestFriendship(target: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('request_friendship', { target });
  if (error) return null;
  return data as string;
}

/** Aceita um pedido recebido (só o destinatário pode, garantido por RLS). */
export async function acceptRequest(friendshipId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId);
  return !error;
}

/** Recusa/cancela um pedido pelo id (qualquer parte pode deletar). */
export async function deleteFriendship(friendshipId: string): Promise<boolean> {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  return !error;
}

/** Remove amizade (ou cancela pedido) com outro usuário pelo id dele. */
export async function removeFriendship(otherId: string): Promise<boolean> {
  const { error } = await supabase.rpc('remove_friendship', { other: otherId });
  return !error;
}
