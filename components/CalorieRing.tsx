import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';

interface CalorieRingProps {
  current: number;
  goal: number;
  size?: number;
}

const STROKE_WIDTH = 14;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Circular progress ring showing calories consumed vs. the daily goal. */
export default function CalorieRing({ current, goal, size = 200 }: CalorieRingProps) {
  const scheme = useScheme();
  const palette = colors[scheme];
  const trackColor = palette.trackBg;

  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goal > 0 ? Math.min(current / goal, 1) : 0;
  const targetOffset = circumference * (1 - progress);

  const anim = useRef(new Animated.Value(circumference)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: targetOffset,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [anim, targetOffset]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={palette.text}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={anim}
        />
      </Svg>

      <View style={styles.center}>
        <Text style={[styles.value, { color: palette.text }]}>{current}</Text>
        <Text style={[styles.caption, { color: palette.textMuted }]}>
          de {goal} kcal
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    // Start the progress arc at the top (12 o'clock).
    transform: [{ rotate: '-90deg' }],
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  caption: {
    fontSize: 12,
    marginTop: 2,
  },
});
