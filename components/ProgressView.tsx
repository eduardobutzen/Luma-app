import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { type useAnimatedScrollHandler } from 'react-native-reanimated';

import LoadingScreen from '@/components/LoadingScreen';
import InsightCard, { type Insight } from '@/components/progress/InsightCard';
import MacroStackBar from '@/components/progress/MacroStackBar';
import StatTriple from '@/components/progress/StatTriple';
import TrendHeroCard from '@/components/progress/TrendHeroCard';
import { colors, neo, streakColor } from '@/constants/theme';
import { useAchievements } from '@/hooks/useAchievements';
import { useProfile } from '@/hooks/useProfile';
import { useScheme } from '@/hooks/useScheme';
import { useWeeklyMeals } from '@/hooks/useWeeklyMeals';
import { useWeightLogs } from '@/hooks/useWeightLogs';

/**
 * Conteúdo da aba "Progresso". Vive sob o cabeçalho do Histórico, por isso
 * recebe de lá a altura a reservar e o handler de rolagem — medir por conta
 * própria daria zero, já que o cabeçalho não é dele.
 */
export default function ProgressView({
  headerHeight = 0,
  onScroll,
}: {
  headerHeight?: number;
  onScroll?: ReturnType<typeof useAnimatedScrollHandler>;
}) {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();

  const { summary, loading, refetch } = useWeeklyMeals();
  const { profile } = useProfile();
  const { latest: latestWeight, refetch: refetchWeight } = useWeightLogs();
  const { achievements, refetch: refetchAchievements } = useAchievements();

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchWeight();
      refetchAchievements();
    }, [refetch, refetchWeight, refetchAchievements]),
  );

  const goalKcal = profile?.goal_kcal ?? 2000;
  const proteinGoal = profile?.goal_protein ?? 0;
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  // "Na meta" = dentro de 10 % para mais ou para menos, não um alvo exato.
  const daysOnTarget = summary.days.filter(
    (d) => d.kcal > 0 && Math.abs(d.kcal - goalKcal) <= goalKcal * 0.1,
  ).length;
  const proteinDays =
    proteinGoal > 0 ? summary.days.filter((d) => d.protein >= proteinGoal).length : 0;
  const activeDays = summary.days.filter((d) => d.kcal > 0).length;
  const streak = profile?.streak ?? 0;

  const insights: Insight[] = [
    {
      icon: 'restaurant-outline',
      title: 'Consistência',
      detail: `Você registrou refeições em ${activeDays} dos últimos 7 dias.${
        activeDays < 7 ? ' Dias sem registro deixam a média menos confiável.' : ''
      }`,
    },
    {
      icon: 'barbell-outline',
      title: 'Adesão à proteína',
      detail:
        proteinGoal > 0
          ? `Meta de ${proteinGoal} g batida em ${proteinDays} de 7 dias.`
          : 'Defina uma meta de proteína no seu perfil para acompanhar a adesão.',
    },
    {
      icon: 'flash-outline',
      title: 'Média de calorias',
      detail: `${summary.avgKcal.toLocaleString('pt-BR')} kcal por dia, contra a meta de ${goalKcal.toLocaleString('pt-BR')} kcal.`,
    },
  ];

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Animated.ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: headerHeight + 12 }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}>
        {/* Ponto focal da tela: a semana contra a meta */}
        <TrendHeroCard
          days={summary.days}
          avgKcal={summary.avgKcal}
          deltaPct={summary.deltaPct}
          goalKcal={goalKcal}
        />

        <View
          style={[styles.statCard, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
          <StatTriple
            items={[
              { value: `${daysOnTarget}/7`, label: 'dias na meta' },
              { value: `${proteinDays}/7`, label: 'meta de proteína' },
              { value: String(streak), label: 'dias de sequência', color: streakColor[scheme] },
            ]}
          />
        </View>

        <MacroStackBar
          protein={summary.dist.protein}
          carbs={summary.dist.carbs}
          fat={summary.dist.fat}
        />

        <InsightCard insights={insights} />

        {/* Peso e conquistas viram atalhos: são destinos, não métricas da semana */}
        <View style={styles.linkRow}>
          <Pressable
            style={[styles.linkCard, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
            onPress={() => router.push('/weight')}>
            <Ionicons name="scale-outline" size={20} color={palette.text} />
            <View style={styles.linkText}>
              <Text style={[styles.linkValue, { color: palette.text }]}>
                {latestWeight !== null ? `${latestWeight} kg` : '—'}
              </Text>
              <Text style={[styles.linkLabel, { color: palette.textMuted }]}>Peso</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
          </Pressable>

          <Pressable
            style={[styles.linkCard, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
            onPress={() => router.push('/achievements')}>
            <Ionicons name="trophy-outline" size={20} color={palette.text} />
            <View style={styles.linkText}>
              <Text style={[styles.linkValue, { color: palette.text }]}>
                {unlockedCount}/{achievements.length}
              </Text>
              <Text style={[styles.linkLabel, { color: palette.textMuted }]}>Conquistas</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
          </Pressable>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 140 },
  // O StatTriple já traz o próprio traço superior e o respiro interno.
  statCard: { borderRadius: 16, paddingHorizontal: 16, paddingBottom: 16, marginTop: 12 },
  linkRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  linkCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    padding: 14,
  },
  linkText: { flex: 1 },
  linkValue: { fontSize: 15, fontWeight: '700' },
  linkLabel: { fontSize: 12, marginTop: 1 },
});
