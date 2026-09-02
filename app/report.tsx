import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { LoadingScreen } from '@/components';
import { colors, macroPalette, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { useProfile } from '@/hooks/useProfile';
import { useWeeklyMeals } from '@/hooks/useWeeklyMeals';
import { useWeightLogs } from '@/hooks/useWeightLogs';
import { localDayRange } from '@/lib/date';
import { shareImage } from '@/lib/export';
import { currentUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';

const WEEKDAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function ReportScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const macros = macroPalette[scheme];
  const router = useRouter();

  const { summary, loading, refetch } = useWeeklyMeals();
  const { profile } = useProfile();
  const { logs } = useWeightLogs();
  const [waterAvg, setWaterAvg] = useState<number | null>(null);
  const cardsRef = useRef<View>(null);

  // useWeeklyMeals doesn't auto-fetch; trigger it on mount.
  useEffect(() => {
    refetch();
  }, [refetch]);

  async function handleShare() {
    try {
      const uri = await captureRef(cardsRef, { format: 'png', quality: 0.9 });
      const ok = await shareImage(uri);
      if (!ok) Alert.alert('Indisponível', 'Compartilhamento não disponível neste dispositivo.');
    } catch {
      Alert.alert('Erro', 'Não foi possível gerar a imagem.');
    }
  }

  useEffect(() => {
    (async () => {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      const uid = await currentUserId();
      if (!uid) return;
      const { start: s } = localDayRange(start.toISOString().split('T')[0]);
      const { end: e } = localDayRange(today.toISOString().split('T')[0]);
      const { data } = await supabase
        .from('water_logs')
        .select('amount_ml')
        .eq('user_id', uid)
        .gte('logged_at', s)
        .lte('logged_at', e);
      const total = (data ?? []).reduce((sum, r) => sum + r.amount_ml, 0);
      setWaterAvg(Math.round(total / 7));
    })();
  }, []);

  if (loading) return <LoadingScreen />;

  const proteinGoal = profile?.goal_protein ?? 0;
  const proteinDays =
    proteinGoal > 0 ? summary.days.filter((d) => d.protein >= proteinGoal).length : 0;

  const bestDay = summary.days.reduce(
    (best, d) => (d.kcal > best.kcal ? d : best),
    summary.days[0] ?? { weekday: '—', kcal: 0, date: '' },
  );
  const bestDayLabel =
    bestDay.kcal > 0
      ? `${WEEKDAYS_FULL[new Date(`${bestDay.date}T00:00:00`).getDay()]} · ${bestDay.kcal} kcal`
      : '—';

  // Weight delta over the last 7 days.
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekLogs = logs.filter((l) => new Date(l.logged_at) >= weekAgo);
  const weightDelta =
    weekLogs.length >= 2
      ? weekLogs[weekLogs.length - 1].weight_kg - weekLogs[0].weight_kg
      : null;

  const deltaLabel =
    summary.deltaPct === null
      ? 'sem comparação'
      : `${summary.deltaPct >= 0 ? '+' : ''}${summary.deltaPct}% vs semana passada`;

  const rows: { icon: keyof typeof Ionicons.glyphMap; color: string; label: string; value: string; sub?: string }[] = [
    {
      icon: 'flash',
      color: macros.protein,
      label: 'Média de calorias',
      value: `${summary.avgKcal.toLocaleString('pt-BR')} kcal`,
      sub: deltaLabel,
    },
    {
      icon: 'barbell',
      color: macros.protein,
      label: 'Adesão à proteína',
      value: `${proteinDays}/7 dias`,
      sub: proteinGoal > 0 ? `meta ${proteinGoal}g` : 'defina sua meta',
    },
    {
      icon: 'trophy',
      color: palette.textMuted,
      label: 'Melhor dia',
      value: bestDayLabel,
    },
    {
      icon: 'pie-chart',
      color: macros.carbs,
      label: 'Distribuição de macros',
      value: `P ${summary.dist.protein}% · C ${summary.dist.carbs}% · G ${summary.dist.fat}%`,
    },
    {
      icon: 'water',
      color: palette.textMuted,
      label: 'Média de água',
      value: waterAvg !== null ? `${waterAvg} ml/dia` : '—',
    },
    {
      icon: 'scale',
      color: palette.text,
      label: 'Variação de peso',
      value:
        weightDelta === null
          ? '—'
          : `${weightDelta >= 0 ? '+' : ''}${weightDelta.toFixed(1)} kg`,
      sub: weightDelta === null ? 'registre 2+ pesos' : 'nos últimos 7 dias',
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Ionicons name="arrow-back" size={24} color={palette.text} onPress={() => router.back()} />
          <Text style={[styles.title, { color: palette.text }]}>Relatório Semanal</Text>
          <Pressable onPress={handleShare} hitSlop={8}>
            <Ionicons name="share-outline" size={22} color={palette.primary} />
          </Pressable>
        </View>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          Resumo dos seus últimos 7 dias.
        </Text>

        <View ref={cardsRef} collapsable={false} style={{ backgroundColor: palette.background }}>
        {rows.map((r, i) => (
          <Animated.View
            key={r.label}
            entering={FadeInDown.delay(i * 60).duration(250)}
            style={[styles.card, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
            <View style={[styles.iconWrap, { backgroundColor: palette.surface }]}>
              <Ionicons name={r.icon} size={20} color={r.color} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardLabel, { color: palette.textMuted }]}>{r.label}</Text>
              <Text style={[styles.cardValue, { color: palette.text }]}>{r.value}</Text>
              {r.sub ? (
                <Text style={[styles.cardSub, { color: palette.textMuted }]}>{r.sub}</Text>
              ) : null}
            </View>
          </Animated.View>
        ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 4, marginBottom: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardLabel: { fontSize: 12 },
  cardValue: { fontSize: 17, fontWeight: '500', marginTop: 2 },
  cardSub: { fontSize: 12, marginTop: 2 },
});
