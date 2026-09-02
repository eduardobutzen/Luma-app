import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useScrollHide } from '@/hooks/useScrollHide';

/**
 * Barra de abas que desce para fora da tela junto com o cabeçalho.
 *
 * Envolve a barra padrão do navegador em vez de reimplementá-la, para não
 * perder acessibilidade, ripple e o roteamento que ela já resolve.
 */
export default function HidingTabBar(props: BottomTabBarProps) {
  const { hidden } = useScrollHide();
  const [height, setHeight] = useState(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hidden.value * height }],
  }));

  return (
    <Animated.View
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      style={[styles.wrap, animatedStyle]}>
      <BottomTabBar {...props} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
