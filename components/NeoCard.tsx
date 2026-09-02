import { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';

/**
 * Cartão: superfície inteira sobre o fundo recuado da tela, com elevação curta.
 * `inset` marca um bloco interno ao cartão (chip, trilha, anexo) — mesmo raio,
 * tom mais fechado e nenhuma elevação, porque ele não flutua sozinho.
 */
export default function NeoCard({
  style,
  inset = false,
  small = false,
  radius = 16,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  /** Bloco interno ao cartão: preenchido, sem elevação. */
  inset?: boolean;
  /** Cantos e elevação mais curtos (chips/botões). */
  small?: boolean;
  radius?: number;
  children: ReactNode;
}) {
  const scheme = useScheme();
  const palette = colors[scheme];
  const shadows = neo[scheme];

  return (
    <View
      style={[
        {
          backgroundColor: inset ? palette.surface : palette.card,
          borderRadius: small ? 12 : radius,
          boxShadow: inset ? undefined : small ? shadows.raisedSm : shadows.raised,
          padding: 16,
        },
        style,
      ]}>
      {children}
    </View>
  );
}
