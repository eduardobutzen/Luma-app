import { StyleSheet, View } from 'react-native';

import { macroPalette } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';

/**
 * Três segmentos proporcionais à contribuição calórica de cada macro
 * (proteína e carboidrato ×4 kcal/g, gordura ×9). Serve como assinatura visual
 * da receita — não substitui os números, que aparecem ao lado.
 */
export default function MacroMiniBar({
  protein,
  carbs,
  fat,
  height = 4,
}: {
  protein: number;
  carbs: number;
  fat: number;
  height?: number;
}) {
  const scheme = useScheme();
  const macros = macroPalette[scheme];

  const kcal = { protein: protein * 4, carbs: carbs * 4, fat: fat * 9 };
  const total = kcal.protein + kcal.carbs + kcal.fat;
  if (total <= 0) return null;

  const segments = [
    { key: 'protein', flex: kcal.protein, color: macros.protein },
    { key: 'carbs', flex: kcal.carbs, color: macros.carbs },
    { key: 'fat', flex: kcal.fat, color: macros.fat },
  ].filter((s) => s.flex > 0);

  return (
    <View style={[styles.row, { height }]}>
      {segments.map((s) => (
        <View
          key={s.key}
          style={{ flex: s.flex, height, borderRadius: height / 2, backgroundColor: s.color }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 2,
  },
});
