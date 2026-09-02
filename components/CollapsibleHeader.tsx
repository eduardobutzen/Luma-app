import { useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { useScrollHide } from '@/hooks/useScrollHide';

/**
 * Cabeçalho que desliza para fora ao rolar a página para baixo e volta ao subir.
 *
 * Fica em posição absoluta sobre o conteúdo, e a área segura do topo entra aqui
 * dentro — assim o bloco inteiro sai de cena e a lista aproveita a tela toda.
 * As telas reservam o espaço dele com `paddingTop: headerHeight`.
 */
export default function CollapsibleHeader({
  children,
  onHeight,
}: {
  children: ReactNode;
  /** Recebe a altura medida, para a tela reservar espaço na lista. */
  onHeight?: (height: number) => void;
}) {
  const scheme = useScheme();
  const palette = colors[scheme];
  const insets = useSafeAreaInsets();
  const { hidden } = useScrollHide();
  const [height, setHeight] = useState(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -hidden.value * height }],
    opacity: 1 - hidden.value * 0.35,
  }));

  return (
    <Animated.View
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        setHeight(h);
        onHeight?.(h);
      }}
      style={[
        styles.wrap,
        { backgroundColor: palette.background, paddingTop: insets.top },
        animatedStyle,
      ]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
