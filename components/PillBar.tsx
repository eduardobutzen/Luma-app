import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';

interface PillBarProps {
  value: number;
  /** Valor no topo da trilha. Fixo pela meta, não pelo pico da semana. */
  max: number;
  label: string;
  isActive?: boolean;
  height?: number;
}

const DEFAULT_HEIGHT = 120;
const WIDTH = 32;

/**
 * Barra vertical com trilha visível: a altura da trilha é a escala, então dá
 * para ler quanto falta para o topo — e a linha de meta desenhada por cima
 * (pelo gráfico) fica na mesma altura em todas as semanas.
 */
export default function PillBar({
  value,
  max,
  label,
  isActive = false,
  height = DEFAULT_HEIGHT,
}: PillBarProps) {
  const scheme = useScheme();
  const palette = colors[scheme];

  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  // Dias sem registro ficam com a trilha vazia; qualquer valor > 0 rende ao
  // menos uma faixa visível.
  const fillHeight = value > 0 ? Math.max(ratio * height, 6) : 0;
  const fillColor = isActive ? palette.text : scheme === 'dark' ? '#6E767D' : '#8B98A5';

  return (
    <View style={styles.column}>
      <View style={[styles.track, { height, backgroundColor: palette.trackBg }]}>
        {fillHeight > 0 ? (
          <View style={[styles.fill, { height: fillHeight, backgroundColor: fillColor }]} />
        ) : null}
      </View>
      <Text
        style={[
          styles.label,
          {
            color: isActive ? palette.text : palette.textMuted,
            fontWeight: isActive ? '700' : '400',
          },
        ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    alignItems: 'center',
    gap: 6,
  },
  track: {
    width: WIDTH,
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 99,
  },
  label: {
    fontSize: 11,
  },
});
