import { localDateKey, localDayRange } from '@/lib/date';
import { currentUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export type ActivityType =
  | 'recipe_published'
  | 'achievement'
  | 'streak_milestone'
  | 'meal_shared'
  | 'progress_shared'
  | 'daily_summary';

export interface FeedItem {
  id: string;
  user_id: string;
  type: ActivityType;
  ref_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  author_name: string;
  author_username: string | null;
  author_avatar: string | null;
  is_mine: boolean;
  reactions: Record<string, number>;
  my_reaction: string | null;
  comment_count: number;
}

export async function getFeed(limit = 40, offset = 0): Promise<FeedItem[]> {
  const { data, error } = await supabase.rpc('friend_feed', { lim: limit, off: offset });
  if (error) return [];
  return (data ?? []) as FeedItem[];
}

export interface UserActivityItem {
  id: string;
  type: ActivityType;
  ref_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

/** Publicações de um usuário (para o perfil). Respeita privacidade no servidor. */
export async function getUserActivity(target: string, limit = 10): Promise<UserActivityItem[]> {
  const { data, error } = await supabase.rpc('user_activity', { target, lim: limit });
  if (error) return [];
  return (data ?? []) as UserActivityItem[];
}

/** Compartilha uma foto de progresso no feed dos amigos. */
export async function shareProgressPhoto(photo: {
  id: string;
  image_url: string;
  note: string | null;
}): Promise<boolean> {
  const uid = await currentUserId();
  if (!uid) return false;
  const { error } = await supabase.from('activity').insert({
    user_id: uid,
    type: 'progress_shared',
    ref_id: photo.id,
    meta: {
      title: photo.note ?? 'Foto de progresso',
      image_url: photo.image_url,
    },
  });
  return !error;
}

/** Monta e publica o "resumo do dia" no feed (totais de hoje). */
export async function postDailySummary(): Promise<{ ok: boolean; error?: string }> {
  const uid = await currentUserId();
  if (!uid) return { ok: false, error: 'Sessão não encontrada.' };
  const today = localDateKey();
  const { start, end } = localDayRange(today);

  const [{ data: meals }, { data: water }, { data: prof }] = await Promise.all([
    supabase
      .from('meals')
      .select('kcal, protein, carbs, fat')
      .eq('user_id', uid)
      .gte('eaten_at', start)
      .lte('eaten_at', end),
    supabase
      .from('water_logs')
      .select('amount_ml')
      .eq('user_id', uid)
      .gte('logged_at', start)
      .lte('logged_at', end),
    supabase.from('profiles').select('streak, goal_kcal').eq('id', uid).single(),
  ]);

  const totals = (meals ?? []).reduce(
    (acc, m) => ({
      kcal: acc.kcal + (m.kcal ?? 0),
      protein: acc.protein + (m.protein ?? 0),
      carbs: acc.carbs + (m.carbs ?? 0),
      fat: acc.fat + (m.fat ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const waterMl = (water ?? []).reduce((a, w) => a + (w.amount_ml ?? 0), 0);

  const { error } = await supabase.from('activity').insert({
    user_id: uid,
    type: 'daily_summary',
    ref_id: null,
    meta: {
      date: today,
      kcal: totals.kcal,
      goal_kcal: prof?.goal_kcal ?? 2000,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      water_ml: waterMl,
      streak: prof?.streak ?? 0,
    },
  });
  return { ok: !error, error: error?.message };
}

/** Compartilha uma refeição no feed dos amigos. */
export async function shareMeal(meal: {
  id: string;
  description: string | null;
  type: string;
  kcal: number;
  image_url: string | null;
}): Promise<boolean> {
  const uid = await currentUserId();
  if (!uid) return false;
  const { error } = await supabase.from('activity').insert({
    user_id: uid,
    type: 'meal_shared',
    ref_id: meal.id,
    meta: {
      title: meal.description ?? meal.type,
      meal_type: meal.type,
      kcal: meal.kcal,
      image_url: meal.image_url,
    },
  });
  return !error;
}
