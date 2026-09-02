import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CollapsibleHeader, LoadingScreen, MacroCard, ScreenHeader } from '@/components';
import { colors, macroPalette, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { useCollapsibleHeader } from '@/hooks/useScrollHide';
import { useMeals } from '@/hooks/useMeals';
import { useProfile } from '@/hooks/useProfile';
import { localDateKey } from '@/lib/date';

export default function ProfileScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const macros = macroPalette[scheme];
  const router = useRouter();
  const { headerHeight, onHeaderHeight, onScroll } = useCollapsibleHeader();

  const today = localDateKey();
  const { profile, loading, refetch: refetchProfile } = useProfile();
  const { meals, refetch: refetchMeals } = useMeals(today);

  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      refetchMeals();
    }, [refetchProfile, refetchMeals]),
  );

  const totals = meals.reduce(
    (acc, m) => ({
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { protein: 0, carbs: 0, fat: 0 },
  );

  const initial = (profile?.name ?? '?').trim().charAt(0).toUpperCase() || '?';

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['left', 'right']}>
      <CollapsibleHeader onHeight={onHeaderHeight}>
        <ScreenHeader
          title="Perfil"
          right={
            <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
              <Ionicons name="settings-outline" size={22} color={palette.text} />
            </Pressable>
          }
        />
      </CollapsibleHeader>

      <Animated.ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: headerHeight + 16 }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: palette.primary }]}>
              <Text style={[styles.avatarInitial, { color: palette.onPrimary }]}>{initial}</Text>
            </View>
          )}
          <Text style={[styles.name, { color: palette.text }]}>
            {profile?.name ?? 'Usuário'}
          </Text>
          <Text style={[styles.email, { color: palette.textMuted }]}>
            {profile?.username ? `@${profile.username}` : (profile?.email ?? '')}
          </Text>
        </View>

        {/* Stat cards */}
        <View style={styles.statRow}>
          <View style={[styles.statCard, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
            <Text style={[styles.statLabel, { color: palette.textMuted }]}>
              Streak atual
            </Text>
            <Text style={[styles.statValue, { color: palette.text }]}>
              {profile?.streak ?? 0} dias
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
            <Text style={[styles.statLabel, { color: palette.textMuted }]}>
              Meta diária
            </Text>
            <Text style={[styles.statValue, { color: palette.text }]}>
              {(profile?.goal_kcal ?? 2000).toLocaleString('pt-BR')} kcal
            </Text>
          </View>
        </View>

        {/* Macro goals */}
        <Text style={[styles.sectionTitle, { color: palette.text }]}>
          Metas de Macros
        </Text>
        <View style={styles.macroList}>
          <MacroCard
            label="Proteína"
            current={totals.protein}
            goal={profile?.goal_protein ?? 150}
            color={macros.protein}
          />
          <MacroCard
            label="Carbos"
            current={totals.carbs}
            goal={profile?.goal_carbs ?? 250}
            color={macros.carbs}
          />
          <MacroCard
            label="Gordura"
            current={totals.fat}
            goal={profile?.goal_fat ?? 65}
            color={macros.fat}
          />
        </View>

        {/* Friends / Social */}
        <Pressable
          style={[styles.rowButton, styles.rowButtonFirst, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
          onPress={() => router.navigate('/social')}>
          <Ionicons name="people-outline" size={20} color={palette.text} />
          <Text style={[styles.rowText, { color: palette.text }]}>Amigos</Text>
          <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
        </Pressable>

        {/* Weight */}
        <Pressable
          style={[styles.rowButton, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
          onPress={() => router.push('/weight')}>
          <Ionicons name="scale-outline" size={20} color={palette.text} />
          <Text style={[styles.rowText, { color: palette.text }]}>Peso</Text>
          <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
        </Pressable>

        {/* Achievements */}
        <Pressable
          style={[styles.rowButton, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
          onPress={() => router.push('/achievements')}>
          <Ionicons name="trophy-outline" size={20} color={palette.text} />
          <Text style={[styles.rowText, { color: palette.text }]}>Conquistas</Text>
          <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
        </Pressable>

        {/* Edit profile */}
        <Pressable
          style={[styles.outlineButton, { borderColor: palette.primary }]}
          onPress={() => router.push('/edit-profile')}>
          <Text style={[styles.outlineText, { color: palette.primary }]}>
            Editar perfil
          </Text>
        </Pressable>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '500',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
  },
  email: {
    fontSize: 14,
    marginTop: 2,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 24,
  },
  macroList: {
    gap: 10,
    marginTop: 12,
  },
  rowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
  },
  rowButtonFirst: {
    marginTop: 24,
  },
  rowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  outlineButton: {
    marginTop: 24,
    borderRadius: 99,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
