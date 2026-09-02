import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';

export interface Insight {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
}

/**
 * Leituras da semana em texto corrido. Antes eram pills que escondiam o
 * conteúdo atrás de um Alert — o texto é curto o bastante para ficar à vista.
 */
export default function InsightCard({ insights }: { insights: Insight[] }) {
  const scheme = useScheme();
  const palette = colors[scheme];

  return (
    <View style={[styles.card, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
      <Text style={[styles.title, { color: palette.text }]}>O que os números dizem</Text>

      {insights.map((insight, i) => (
        <View
          key={insight.title}
          style={[
            styles.row,
            i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border },
          ]}>
          <View style={[styles.iconWrap, { backgroundColor: palette.surface }]}>
            <Ionicons name={insight.icon} size={16} color={palette.text} />
          </View>
          <View style={styles.text}>
            <Text style={[styles.rowTitle, { color: palette.text }]}>{insight.title}</Text>
            <Text style={[styles.detail, { color: palette.textMuted }]}>{insight.detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginTop: 12 },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  row: { flexDirection: 'row', gap: 12, paddingTop: 14, marginTop: 0 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  detail: { fontSize: 13, lineHeight: 19, marginTop: 3 },
});
