import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';

/**
 * Cabeçalho fixo das abas: título à esquerda, ações à direita.
 *
 * As telas desenham o próprio cabeçalho (o header nativo do navegador está
 * desligado), então este componente é o que mantém altura, tipografia e
 * espaçamento iguais entre elas.
 */
export default function ScreenHeader({
  title,
  right,
}: {
  title: string;
  /** Ícones ou textos de ação alinhados à direita. */
  right?: ReactNode;
}) {
  const scheme = useScheme();
  const palette = colors[scheme];

  return (
    <View style={styles.header}>
      <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
        {title}
      </Text>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
});
