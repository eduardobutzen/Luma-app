import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CalorieRing,
  CollapsibleHeader,
  LoadingScreen,
  MacroCard,
  MealRow,
  NeoCard,
  PressableScale,
  RegisterSheet,
} from '@/components';
import { colors, macroPalette, neo, streakColor } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { useCollapsibleHeader } from '@/hooks/useScrollHide';
import { localDateKey } from '@/lib/date';
import { useFasting } from '@/hooks/useFasting';
import { scheduleDailySummaryInvite } from '@/lib/notifications';
import { updateMacroWidget } from '@/lib/widget';
import { useMeals, type MealRow as MealRowData } from '@/hooks/useMeals';
import { useProfile } from '@/hooks/useProfile';
import { useWater } from '@/hooks/useWater';
import type { Meal } from '@/types';

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
}

const AVATAR = require('@/assets/icon.png');

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Adapt a DB meal row to the shape the MealRow component renders. */
function toMeal(row: MealRowData): Meal {
  return {
    id: row.id,
    name: row.type,
    type: 'snack',
    description: row.description ?? undefined,
    imageUri: row.image_url ?? undefined,
    loggedAt: row.eaten_at,
    macros: {
      calories: row.kcal,
      protein: row.protein,
      carbs: row.carbs,
      fat: row.fat,
    },
  };
}

export default function HomeScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const macros = macroPalette[scheme];
  const shadows = neo[scheme];
  const router = useRouter();

  const today = localDateKey();
  const { meals, loading: mealsLoading, refetch } = useMeals(today);
  const { profile, loading: profileLoading } = useProfile();
  const { totalMl, addWater, removeWater, refetch: refetchWater } = useWater(today);
  const { active: activeFast, refetch: refetchFast } = useFasting();

  const [refreshing, setRefreshing] = useState(false);
  const [fastNow, setFastNow] = useState(Date.now());
  const { headerHeight, onHeaderHeight, onScroll } = useCollapsibleHeader();

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchWater();
      refetchFast();
    }, [refetch, refetchWater, refetchFast]),
  );

  // Agenda (uma vez) o convite diário de resumo às 22:00.
  useEffect(() => {
    scheduleDailySummaryInvite();
  }, []);

  // Cronômetro do jejum só corre quando há jejum ativo.
  useEffect(() => {
    if (!activeFast) return;
    const t = setInterval(() => setFastNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [activeFast]);

  const fastElapsed = activeFast ? fastNow - new Date(activeFast.started_at).getTime() : 0;

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refetch(), refetchWater()]);
    setRefreshing(false);
  }

  function handleAddWater(ml: number) {
    Haptics.selectionAsync();
    addWater(ml);
  }

  function handleRemoveWater(ml: number) {
    Haptics.selectionAsync();
    removeWater(ml);
  }

  const waterGoal = profile?.goal_water_ml ?? 2000;
  const waterPct = Math.min(totalMl / waterGoal, 1);

  const totals = meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const goalKcal = profile?.goal_kcal ?? 2000;
  const goalProtein = profile?.goal_protein ?? 150;
  const goalCarbs = profile?.goal_carbs ?? 250;
  const goalFat = profile?.goal_fat ?? 65;
  const remaining = Math.max(goalKcal - totals.kcal, 0);

  // Mantém o widget de tela inicial (Android) sincronizado. No-op em iOS/Expo Go.
  useEffect(() => {
    updateMacroWidget({
      kcal: totals.kcal,
      goalKcal,
      waterMl: totalMl,
      goalWaterMl: waterGoal,
      streak: profile?.streak ?? 0,
    });
  }, [totals.kcal, goalKcal, totalMl, waterGoal, profile?.streak]);

  const greeting = greetingForHour(new Date().getHours());

  // Cabeçalho fixo, como nas outras abas — a saudação faz o papel do título.
  const screenHeader = (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Image source={AVATAR} style={styles.avatar} />
        <View>
          <Text style={[styles.greeting, { color: palette.textMuted }]}>{greeting},</Text>
          <Text style={[styles.userName, { color: palette.text }]}>
            {profile?.name ?? 'Atleta'}
          </Text>
        </View>
      </View>

      <View style={styles.headerRight}>
        <PressableScale
          style={[
            styles.socialButton,
            { backgroundColor: palette.card, boxShadow: shadows.raisedSm },
          ]}
          onPress={() => router.navigate('/social')}
          hitSlop={8}>
          <Ionicons name="people-outline" size={20} color={palette.text} />
        </PressableScale>
        <View style={[styles.streakBadge, { backgroundColor: palette.surface }]}>
          <Ionicons name="flame" size={14} color={streakColor[scheme]} />
          <Text style={[styles.streakText, { color: palette.text }]}>
            {profile?.streak ?? 0} dias
          </Text>
        </View>
      </View>
    </View>
  );

  const header = (
    <View>
      {/* Calorie card */}
      <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.calorieCard}>
        <NeoCard style={{ padding: 20 }}>
          <View style={styles.ringWrap}>
            <CalorieRing current={totals.kcal} goal={goalKcal} />
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <View style={styles.calorieStats}>
            <View style={styles.calorieStat}>
              <Ionicons name="time-outline" size={16} color={palette.textMuted} />
              <Text style={[styles.calorieStatText, { color: palette.textMuted }]}>
                {remaining} kcal restantes
              </Text>
            </View>
            <View style={styles.calorieStat}>
              <Ionicons name="flame" size={16} color={palette.textMuted} />
              <Text style={[styles.calorieStatText, { color: palette.textMuted }]}>
                {totals.kcal.toLocaleString('pt-BR')} kcal consumidas
              </Text>
            </View>
          </View>
        </NeoCard>
      </Animated.View>

      {/* Macro grid */}
      <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.macroGrid}>
        <View style={styles.macroItem}>
          <MacroCard label="Proteína" current={totals.protein} goal={goalProtein} color={macros.protein} />
        </View>
        <View style={styles.macroItem}>
          <MacroCard label="Carbos" current={totals.carbs} goal={goalCarbs} color={macros.carbs} />
        </View>
        <View style={styles.macroItem}>
          <MacroCard label="Gordura" current={totals.fat} goal={goalFat} color={macros.fat} />
        </View>
      </Animated.View>

      {/* Water card */}
      <Animated.View entering={FadeInDown.delay(180).duration(400)} style={styles.waterCard}>
        <NeoCard>
        <View style={styles.waterTop}>
          <View style={styles.waterTitleRow}>
            <View style={[styles.waterIconWrap, { backgroundColor: palette.surface }]}>
              <Ionicons name="water" size={16} color={palette.text} />
            </View>
            <Text style={[styles.waterTitle, { color: palette.text }]}>Água</Text>
          </View>
          <Text style={[styles.waterValue, { color: palette.textMuted }]}>
            <Text style={{ color: palette.text, fontWeight: '700' }}>{totalMl}</Text> / {waterGoal} ml
          </Text>
        </View>

        <View style={[styles.waterTrack, { backgroundColor: palette.trackBg }]}>
          <View
            style={[
              styles.waterFill,
              { width: `${waterPct * 100}%`, backgroundColor: palette.text },
            ]}
          />
        </View>

        <View style={styles.waterButtons}>
          <PressableScale
            style={[
              styles.waterButton,
              styles.waterButtonIcon,
              {
                backgroundColor: palette.card,
                boxShadow: shadows.raisedSm,
                opacity: totalMl <= 0 ? 0.4 : 1,
              },
            ]}
            onPress={() => handleRemoveWater(250)}
            disabled={totalMl <= 0}>
            <Ionicons name="remove" size={18} color={palette.text} />
          </PressableScale>
          {[250, 500].map((ml) => (
            <PressableScale
              key={ml}
              style={[
                styles.waterButton,
                { backgroundColor: palette.card, boxShadow: shadows.raisedSm },
              ]}
              onPress={() => handleAddWater(ml)}>
              <Ionicons name="add" size={15} color={palette.text} />
              <Text style={[styles.waterButtonText, { color: palette.text }]}>{ml} ml</Text>
            </PressableScale>
          ))}
        </View>
        </NeoCard>
      </Animated.View>

      {/* Fasting card */}
      <Animated.View entering={FadeInDown.delay(240).duration(400)} style={styles.fastCard}>
        <PressableScale onPress={() => router.push('/fasting')}>
          <NeoCard style={styles.fastContent}>
            <View style={[styles.fastIcon, { backgroundColor: palette.surface }]}>
              <Ionicons name="timer-outline" size={20} color={palette.text} />
            </View>
            <View style={styles.fastInfo}>
              <Text style={[styles.fastTitle, { color: palette.text }]}>Jejum</Text>
              <Text style={[styles.fastSub, { color: palette.textMuted }]}>
                {activeFast
                  ? `Em andamento · ${formatElapsed(fastElapsed)} / ${activeFast.target_hours}h`
                  : 'Toque para iniciar um jejum'}
              </Text>
            </View>
            {activeFast ? (
              <View style={[styles.fastBadge, { backgroundColor: palette.primary }]}>
                <Text style={[styles.fastBadgeText, { color: palette.onPrimary }]}>ativo</Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
            )}
          </NeoCard>
        </PressableScale>
      </Animated.View>

      {/* Meals section header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>
          Refeições de hoje
        </Text>
        <Pressable onPress={() => router.push('/(tabs)/history')} hitSlop={8}>
          <Text style={[styles.sectionLink, { color: palette.textMuted }]}>
            Ver tudo
          </Text>
        </Pressable>
      </View>
    </View>
  );

  if (mealsLoading || profileLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['left', 'right']}>
      <CollapsibleHeader onHeight={onHeaderHeight}>{screenHeader}</CollapsibleHeader>

      <Animated.FlatList<MealRowData>
        data={meals}
        keyExtractor={(item) => item.id}
        itemLayoutAnimation={LinearTransition.springify().damping(18)}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(300 + index * 60).duration(350)}>
            <MealRow meal={toMeal(item)} />
          </Animated.View>
        )}
        ListHeaderComponent={header}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="restaurant-outline" size={36} color={palette.textMuted} />
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              Nenhuma refeição hoje — registre a primeira.
            </Text>
          </View>
        }
        contentContainerStyle={[styles.listContent, { paddingTop: headerHeight + 12 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            progressViewOffset={headerHeight}
            tintColor={palette.textMuted}
          />
        }
      />

      {/* Registro: FAB "+" que sobe a folha com as opções */}
      <RegisterSheet
        options={[
          {
            icon: 'camera',
            title: 'Câmera',
            subtitle: 'Foto com IA ou escanear código de barras',
            onPress: () => router.push('/camera'),
          },
          {
            icon: 'create-outline',
            title: 'Registrar manualmente',
            subtitle: 'Busque alimentos ou use suas refeições salvas',
            onPress: () => router.push('/confirm'),
          },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 170, // espaço para a tab bar flutuante + FAB
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  greeting: {
    fontSize: 13,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '700',
  },
  calorieCard: {},
  ringWrap: {
    alignItems: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 20,
    marginBottom: 12,
  },
  calorieStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calorieStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calorieStatText: {
    fontSize: 12,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  macroItem: {
    flex: 1,
  },
  waterCard: {
    marginTop: 12,
  },
  waterTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waterIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  waterValue: {
    fontSize: 13,
  },
  waterTrack: {
    height: 10,
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: 14,
  },
  waterFill: {
    height: '100%',
    borderRadius: 99,
  },
  waterButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  waterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  waterButtonIcon: {
    paddingHorizontal: 13,
  },
  waterButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  fastCard: {
    marginTop: 12,
  },
  fastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  fastIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fastInfo: { flex: 1 },
  fastTitle: { fontSize: 15, fontWeight: '700' },
  fastSub: { fontSize: 13, marginTop: 2 },
  fastBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  fastBadgeText: { fontSize: 11, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionLink: {
    fontSize: 14,
  },
});
