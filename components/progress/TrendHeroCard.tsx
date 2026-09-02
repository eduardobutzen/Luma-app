import { StyleSheet, Text, View } from 'react-native';

import PillBar from '@/components/PillBar';
import { colors, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import type { DayTotal } from '@/hooks/useWeeklyMeals';

const CHART_HEIGHT = 120;

/**
 * Cartão de abertura do Progresso: média da semana, variação e as sete barras.
 *
 * A escala das barras vem da meta (×1,25), não do pico da semana — com escala
 * relativa a linha de meta mudaria de altura toda semana e a comparação visual
 * entre semanas se perderia.
 */
export default function TrendHeroCard({
  days,
  avgKcal,
  deltaPct,
  goalKcal,
}: {
  days: DayTotal[];
  avgKcal: number;
  deltaPct: number | null;
  goalKcal: number;
}) {
  const scheme = useScheme();
  const palette = colors[scheme];

  const max = Math.max(goalKcal * 1.25, ...days.map((d) => d.kcal), 1);
  const goalRatio = Math.min(goalKcal / max, 1);

  const deltaText =
    deltaPct === null
      ? 'sem comparação'
      : `${deltaPct > 0 ? '+' : deltaPct < 0 ? '−' : ''}${Math.abs(deltaPct)} %`;

  return (
    <View style={[styles.card, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <Text style={[styles.caption, { color: palette.textMuted }]}>
            Média diária · últimos 7 dias
          </Text>
          <View style={styles.avgRow}>
            <Text style={[styles.avg, { color: palette.text }]}>
              {avgKcal.toLocaleString('pt-BR')}
            </Text>
            <Text style={[styles.avgUnit, { color: palette.textMuted }]}>kcal</Text>
          </View>
        </View>

        <View style={styles.headRight}>
          <Text style={[styles.delta, { color: palette.text }]}>{deltaText}</Text>
          <Text style={[styles.deltaSub, { color: palette.textMuted }]}>vs. semana passada</Text>
        </View>
      </View>

      <View style={styles.chartWrap}>
        {goalKcal > 0 ? (
          <>
            <Text style={[styles.goalLabel, { color: palette.textMuted }]}>
              meta {goalKcal.toLocaleString('pt-BR')}
            </Text>
            {/* Linha de meta cruzando as sete trilhas, na altura proporcional. */}
            <View
              pointerEvents="none"
              style={[
                styles.goalLine,
                { bottom: 22 + goalRatio * CHART_HEIGHT, borderColor: palette.textMuted },
              ]}
            />
          </>
        ) : null}

        <View style={styles.chart}>
          {days.map((d, i) => (
            <PillBar
              key={d.date}
              value={d.kcal}
              max={max}
              label={d.weekday.charAt(0)}
              height={CHART_HEIGHT}
              isActive={i === days.length - 1}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headLeft: { flex: 1 },
  caption: { fontSize: 13 },
  avgRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  avg: { fontSize: 34, fontWeight: '700', letterSpacing: -0.6 },
  avgUnit: { fontSize: 15 },
  headRight: { alignItems: 'flex-end' },
  delta: { fontSize: 17, fontWeight: '700' },
  deltaSub: { fontSize: 11, marginTop: 2 },
  chartWrap: { marginTop: 20 },
  goalLabel: { fontSize: 11, textAlign: 'right', marginBottom: 6 },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.7,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
});
