import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';

export interface StatItem {
  value: string;
  label: string;
  /** Cor do número, quando ele merece destaque (ex.: a chama da sequência). */
  color?: string;
}

/**
 * Três números de apoio numa linha só, dentro do cartão de tendência.
 * Eram três cartões separados — como cartões, competiam com o gráfico.
 */
export default function StatTriple({ items }: { items: StatItem[] }) {
  const scheme = useScheme();
  const palette = colors[scheme];

  return (
    <View style={[styles.row, { borderTopColor: palette.border }]}>
      {items.map((item) => (
        <View key={item.label} style={styles.cell}>
          <Text style={[styles.value, { color: item.color ?? palette.text }]}>{item.value}</Text>
          <Text style={[styles.label, { color: palette.textMuted }]} numberOfLines={2}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cell: { flex: 1, gap: 2 },
  value: { fontSize: 19, fontWeight: '700' },
  label: { fontSize: 11, lineHeight: 14 },
});
