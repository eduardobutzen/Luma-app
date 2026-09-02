import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { mealTypeIcon } from '@/lib/mealType';
import type { Meal } from '@/types';

interface MealRowProps {
  meal: Meal;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** A single meal entry rendered as a list row. */
export default function MealRow({ meal }: MealRowProps) {
  const scheme = useScheme();
  const palette = colors[scheme];
  const placeholderBg = palette.surface;

  return (
    <View style={[styles.row, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
      {meal.imageUri ? (
        <Image source={{ uri: meal.imageUri }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.placeholder, { backgroundColor: placeholderBg }]}>
          <Ionicons name={mealTypeIcon(meal.name)} size={24} color={palette.textMuted} />
        </View>
      )}

      <View style={styles.center}>
        <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
          {meal.name}
        </Text>
        {meal.description ? (
          <Text style={[styles.description, { color: palette.textMuted }]} numberOfLines={1}>
            {meal.description}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>
        <Text style={[styles.kcal, { color: palette.text }]}>
          {meal.macros.calories} kcal
        </Text>
        <Text style={[styles.time, { color: palette.textMuted }]}>
          {formatTime(meal.loggedAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  kcal: {
    fontSize: 15,
    fontWeight: '700',
  },
  time: {
    fontSize: 11,
    marginTop: 2,
  },
});
