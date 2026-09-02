import { Ionicons } from '@expo/vector-icons';

export type MealType = 'Café da manhã' | 'Almoço' | 'Lanche' | 'Jantar';

export const MEAL_TYPES: { value: MealType; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'Café da manhã', icon: 'cafe-outline' },
  { value: 'Almoço', icon: 'restaurant-outline' },
  { value: 'Lanche', icon: 'nutrition-outline' },
  { value: 'Jantar', icon: 'moon-outline' },
];

/** Suggests a meal type based on the time of day. */
export function suggestMealType(hour: number = new Date().getHours()): MealType {
  if (hour < 11) return 'Café da manhã';
  if (hour < 15) return 'Almoço';
  if (hour < 18) return 'Lanche';
  return 'Jantar';
}

/** Icon for a stored meal type (falls back to a generic plate). */
export function mealTypeIcon(type: string): keyof typeof Ionicons.glyphMap {
  return MEAL_TYPES.find((m) => m.value === type)?.icon ?? 'restaurant-outline';
}
