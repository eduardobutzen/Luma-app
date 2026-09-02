import { StyleSheet, Text, View } from 'react-native';

import { colors, macroPalette, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';

/**
 * Distribuição de macros como barra empilhada, no lugar do donut.
 *
 * Numa barra a comparação entre as três fatias é direta (mesma base, mesma
 * direção) e a legenda cabe embaixo em uma linha — o donut exigia percorrer o
 * círculo e voltar à legenda para cada fatia.
 */
export default function MacroStackBar({
  protein,
  carbs,
  fat,
}: {
  /** Percentuais das calorias totais; somam ~100. */
  protein: number;
  carbs: number;
  fat: number;
}) {
  const scheme = useScheme();
  const palette = colors[scheme];
  const macros = macroPalette[scheme];

  const segments = [
    { key: 'protein', label: 'proteína', pct: protein, color: macros.protein },
    { key: 'carbs', label: 'carbo', pct: carbs, color: macros.carbs },
    { key: 'fat', label: 'gordura', pct: fat, color: macros.fat },
  ];
  const total = segments.reduce((s, x) => s + x.pct, 0);

  return (
    <View style={[styles.card, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
      <Text style={[styles.title, { color: palette.text }]}>Distribuição de macros</Text>

      <View style={styles.bar}>
        {total > 0 ? (
          segments
            .filter((s) => s.pct > 0)
            .map((s) => (
              <View key={s.key} style={{ flex: s.pct, height: 14, backgroundColor: s.color, borderRadius: 7 }} />
            ))
        ) : (
          <View style={[styles.barEmpty, { backgroundColor: palette.trackBg }]} />
        )}
      </View>

      <View style={styles.legend}>
        {segments.map((s) => (
          <View key={s.key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={[styles.legendText, { color: palette.text }]}>
              <Text style={styles.legendPct}>{s.pct} %</Text>{' '}
              <Text style={{ color: palette.textMuted }}>{s.label}</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginTop: 12 },
  title: { fontSize: 17, fontWeight: '700' },
  bar: { flexDirection: 'row', gap: 3, marginTop: 14 },
  barEmpty: { flex: 1, height: 14, borderRadius: 7 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 13 },
  legendPct: { fontWeight: '700' },
});
