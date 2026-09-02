import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LineChart, PillBar } from '@/components';
import { colors, macroPalette, neo, streakColor } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { getUserActivity, type UserActivityItem } from '@/lib/feed';
import {
  getProfileCard,
  getUserStats,
  removeFriendship,
  requestFriendship,
  type ProfileCard,
  type UserStats,
} from '@/lib/social';

const POST_LABEL: Record<string, string> = {
  recipe_published: 'Publicou uma receita',
  meal_shared: 'Compartilhou uma refeição',
  progress_shared: 'Compartilhou uma foto de progresso',
  daily_summary: 'Compartilhou o resumo do dia',
  streak_milestone: 'Marco de streak',
  achievement: 'Conquista desbloqueada',
};

const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const weekday = (dateStr: string) => WD[new Date(`${dateStr}T00:00:00`).getDay()];

export default function UserProfileScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const macros = macroPalette[scheme];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [card, setCard] = useState<ProfileCard | null>(null);
  const [posts, setPosts] = useState<UserActivityItem[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [c, p, s] = await Promise.all([getProfileCard(id), getUserActivity(id), getUserStats(id)]);
    setCard(c);
    setPosts(p);
    setStats(s);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleAdd() {
    if (!id) return;
    setBusy(true);
    Haptics.selectionAsync();
    await requestFriendship(id);
    await load();
    setBusy(false);
  }

  function handleRemove() {
    if (!id) return;
    Alert.alert('Remover amigo', 'Deseja desfazer essa amizade?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          await removeFriendship(id);
          await load();
          setBusy(false);
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    );
  }

  if (!card) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
        </View>
        <View style={[styles.center, { flex: 1, paddingHorizontal: 32 }]}>
          <Ionicons name="lock-closed-outline" size={48} color={palette.textMuted} />
          <Text style={[styles.privateText, { color: palette.textMuted }]}>
            Este perfil é privado ou não está disponível.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isFriend = card.friend_status === 'friends';
  const chips: { icon: keyof typeof Ionicons.glyphMap; color: string; value: string; label: string }[] = [];
  if (card.streak !== null) chips.push({ icon: 'flame', color: streakColor[scheme], value: String(card.streak), label: 'Sequência' });
  if (stats?.current_weight != null)
    chips.push({ icon: 'scale-outline', color: palette.textMuted, value: `${stats.current_weight} kg`, label: 'Peso' });
  if (isFriend && stats && stats.pair_streak > 0)
    chips.push({ icon: 'flame-outline', color: streakColor[scheme], value: String(stats.pair_streak), label: 'Com você' });
  if (stats && stats.recipes_count > 0)
    chips.push({ icon: 'book-outline', color: palette.textMuted, value: String(stats.recipes_count), label: 'Receitas' });

  const weekMax = stats ? Math.max(1, ...stats.weekly.map((d) => d.kcal)) : 1;
  const weights = stats?.weights.map((w) => w.kg) ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Identity */}
        <View style={styles.identity}>
          {card.avatar_url ? (
            <Image source={{ uri: card.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: palette.primary }]}>
              <Text style={[styles.avatarInitial, { color: palette.onPrimary }]}>{card.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={[styles.name, { color: palette.text }]}>{card.name}</Text>
          {card.username ? (
            <Text style={[styles.username, { color: palette.textMuted }]}>@{card.username}</Text>
          ) : null}
          {card.bio ? <Text style={[styles.bio, { color: palette.text }]}>{card.bio}</Text> : null}
        </View>

        {/* Friend action + chat */}
        {!card.is_self ? (
          <View style={styles.actionsRow}>
            {isFriend ? (
              <>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: palette.primary }]}
                  onPress={() => router.push(`/chat/dm/${id}`)}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={palette.onPrimary} />
                  <Text style={[styles.actionText, { color: palette.onPrimary }]}>Mensagem</Text>
                </Pressable>
                <Pressable
                  style={[styles.iconAction, { backgroundColor: palette.card, borderColor: palette.border }]}
                  onPress={handleRemove}
                  disabled={busy}>
                  <Ionicons name="person-remove-outline" size={18} color={palette.text} />
                </Pressable>
              </>
            ) : card.friend_status === 'pending_out' ? (
              <View style={[styles.actionBtn, { backgroundColor: palette.card, flex: 1 }]}>
                <Ionicons name="time-outline" size={18} color={palette.textMuted} />
                <Text style={[styles.actionText, { color: palette.textMuted }]}>Pedido enviado</Text>
              </View>
            ) : (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: palette.primary, flex: 1 }]}
                onPress={handleAdd}
                disabled={busy}>
                {busy ? (
                  <ActivityIndicator color={palette.onPrimary} />
                ) : (
                  <>
                    <Ionicons name={card.friend_status === 'pending_in' ? 'checkmark' : 'person-add'} size={18} color={palette.onPrimary} />
                    <Text style={[styles.actionText, { color: palette.onPrimary }]}>
                      {card.friend_status === 'pending_in' ? 'Aceitar pedido' : 'Adicionar amigo'}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        ) : null}

        {/* Stat chips */}
        {chips.length > 0 ? (
          <View style={styles.chipsRow}>
            {chips.map((c) => (
              <View key={c.label} style={[styles.chip, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
                <Ionicons name={c.icon} size={20} color={c.color} />
                <Text style={[styles.chipValue, { color: palette.text }]}>{c.value}</Text>
                <Text style={[styles.chipLabel, { color: palette.textMuted }]}>{c.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Weekly calories */}
        {stats?.can_meals && stats.weekly.length > 0 ? (
          <View style={[styles.sectionCard, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Calorias · 7 dias</Text>
              <Text style={[styles.sectionMuted, { color: palette.textMuted }]}>
                média {stats.avg_kcal} kcal
              </Text>
            </View>
            <View style={styles.weekRow}>
              {stats.weekly.map((d, i) => (
                <PillBar
                  key={d.date}
                  value={d.kcal}
                  max={weekMax}
                  label={weekday(d.date)}
                  isActive={i === stats.weekly.length - 1}
                />
              ))}
            </View>
            <View style={[styles.macroAvg, { borderTopColor: palette.border }]}>
              <Text style={[styles.macroAvgItem, { color: macros.protein }]}>P {stats.avg_protein}g</Text>
              <Text style={[styles.macroAvgItem, { color: macros.carbs }]}>C {stats.avg_carbs}g</Text>
              <Text style={[styles.macroAvgItem, { color: macros.fat }]}>G {stats.avg_fat}g</Text>
              <Text style={[styles.macroAvgItem, { color: palette.textMuted }]}>{stats.active_days}/7 dias</Text>
            </View>
          </View>
        ) : null}

        {/* Weight trend */}
        {stats?.can_weight && weights.length >= 2 ? (
          <View style={[styles.sectionCard, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Peso</Text>
              {stats.weight_delta != null ? (
                <Text
                  style={[
                    styles.sectionMuted,
                    { color: stats.weight_delta <= 0 ? palette.text : palette.textMuted },
                  ]}>
                  {stats.weight_delta > 0 ? '+' : ''}
                  {stats.weight_delta.toFixed(1)} kg
                </Text>
              ) : null}
            </View>
            <LineChart values={weights} color={palette.primary} height={140} />
          </View>
        ) : null}

        {/* Publicações */}
        {posts.length > 0 ? (
          <View style={styles.postsSection}>
            <Text style={[styles.postsTitle, { color: palette.text }]}>Publicações</Text>
            {posts.map((p) => {
              const meta = p.meta as { title?: string; image_url?: string };
              const isRecipe = p.type === 'recipe_published';
              const tappable = isRecipe && !!p.ref_id;
              return (
                <Pressable
                  key={p.id}
                  disabled={!tappable}
                  style={[styles.postCard, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
                  onPress={() => tappable && router.push(`/community-recipe/${p.ref_id}`)}>
                  {meta.image_url ? (
                    <Image source={{ uri: meta.image_url }} style={styles.postThumb} />
                  ) : (
                    <View style={[styles.postThumb, styles.postThumbEmpty, { backgroundColor: palette.trackBg }]}>
                      <Ionicons name="newspaper-outline" size={18} color={palette.primary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.postLabel, { color: palette.textMuted }]}>
                      {POST_LABEL[p.type] ?? 'Publicação'}
                    </Text>
                    {meta.title ? (
                      <Text style={[styles.postTitle, { color: palette.text }]} numberOfLines={2}>
                        {meta.title}
                      </Text>
                    ) : null}
                  </View>
                  {tappable ? <Ionicons name="chevron-forward" size={16} color={palette.textMuted} /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <Text style={[styles.memberSince, { color: palette.textMuted }]}>
          No Luma desde {new Date(card.member_since).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  scroll: { padding: 16 },
  identity: { alignItems: 'center', gap: 6, marginBottom: 16 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 38, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700', marginTop: 6 },
  username: { fontSize: 15 },
  bio: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 99,
  },
  iconAction: { width: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 99, borderWidth: 1 },
  actionText: { fontSize: 15, fontWeight: '600' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  chip: { flexGrow: 1, minWidth: 70, borderRadius: 16, padding: 14, alignItems: 'center' },
  chipValue: { fontSize: 18, fontWeight: '700', marginTop: 6 },
  chipLabel: { fontSize: 12, marginTop: 2 },
  sectionCard: { borderRadius: 16, padding: 16, marginTop: 16 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionMuted: { fontSize: 13, fontWeight: '600' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  macroAvg: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  macroAvgItem: { fontSize: 13, fontWeight: '600' },
  postsSection: { marginTop: 24 },
  postsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  postCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  postThumb: { width: 44, height: 44, borderRadius: 8 },
  postThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  postLabel: { fontSize: 12 },
  postTitle: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  memberSince: { fontSize: 13, marginTop: 24, textAlign: 'center' },
  privateText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
