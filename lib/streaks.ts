import { supabase } from '@/lib/supabase';

export interface PairStreak {
  friend_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  streak: number;
}

export interface StreakGroup {
  id: string;
  name: string;
  owner_id: string;
  my_status: 'invited' | 'active';
  member_count: number;
  streak: number;
}

export interface GroupMember {
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  status: 'invited' | 'active';
  completed_today: boolean;
}

export async function listPairStreaks(): Promise<PairStreak[]> {
  const { data, error } = await supabase.rpc('my_pair_streaks');
  if (error) return [];
  return (data ?? []) as PairStreak[];
}

export async function listStreakGroups(): Promise<StreakGroup[]> {
  const { data, error } = await supabase.rpc('my_streak_groups');
  if (error) return [];
  return (data ?? []) as StreakGroup[];
}

export async function getGroupMembers(gid: string): Promise<GroupMember[]> {
  const { data, error } = await supabase.rpc('group_members_today', { gid });
  if (error) return [];
  return (data ?? []) as GroupMember[];
}

export async function getGroupStreak(gid: string): Promise<number> {
  const { data, error } = await supabase.rpc('group_streak', { gid });
  if (error || data == null) return 0;
  return data as number;
}

export async function createStreakGroup(name: string, friends: string[]): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_streak_group', {
    p_name: name,
    friends,
  });
  if (error) return null;
  return data as string;
}

export async function inviteToGroup(gid: string, friend: string): Promise<boolean> {
  const { error } = await supabase.rpc('invite_to_group', { gid, friend });
  return !error;
}

/** Aceita um convite de grupo (vira membro ativo). */
export async function acceptGroupInvite(gid: string): Promise<boolean> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return false;
  const { error } = await supabase
    .from('streak_group_members')
    .update({ status: 'active' })
    .eq('group_id', gid)
    .eq('user_id', uid);
  return !error;
}

/** Sai do grupo (remove minha associação). */
export async function leaveGroup(gid: string): Promise<boolean> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return false;
  const { error } = await supabase
    .from('streak_group_members')
    .delete()
    .eq('group_id', gid)
    .eq('user_id', uid);
  return !error;
}
