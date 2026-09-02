import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { colors, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';

interface MacroCardProps {
  label: string;
  current: number;
  goal: number;
  color: string;
}

/** Compact card showing a single macro's progress toward its daily goal. */
export default function MacroCard({ label, current, goal, color }: MacroCardProps) {
  const scheme = useScheme();
  const palette = colors[scheme];

  const progress = goal > 0 ? Math.min(current / goal, 1) : 0;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [anim, progress]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${progress * 100}%`],
  });

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.card, boxShadow: neo[scheme].raisedSm },
      ]}>
      <Text style={[styles.label, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: palette.text }]}>{current}g</Text>

      <View style={[styles.track, { backgroundColor: palette.trackBg }]}>
        <Animated.View style={[styles.fill, { width, backgroundColor: color }]} />
      </View>

      <Text style={[styles.goal, { color: palette.textMuted }]}>
        Meta {goal}g
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  value: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 2,
  },
  track: {
    height: 6,
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: 8,
  },
  fill: {
    height: '100%',
    borderRadius: 99,
  },
  goal: {
    fontSize: 10,
    marginTop: 6,
  },
});
