import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type DimensionValue } from 'react-native';

import { colors } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: object;
}

/** A single pulsing placeholder block. */
export default function Skeleton({ width = '100%', height = 16, radius = 8, style }: SkeletonProps) {
  const isDark = useScheme() === 'dark';
  const palette = colors[isDark ? 'dark' : 'light'];
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, borderRadius: radius, backgroundColor: palette.surface, opacity: pulse },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    overflow: 'hidden',
  },
});
