/** Shared domain types for the Luma app. */

/** A meal type slot within a day. */
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** Aggregate macronutrient values, expressed in grams (calories in kcal). */
export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** A single logged meal. */
export interface Meal {
  id: string;
  name: string;
  type: MealType;
  /** Optional short description (e.g. portion or notes). */
  description?: string;
  /** Optional thumbnail image URI for the meal. */
  imageUri?: string;
  /** ISO 8601 timestamp of when the meal was logged. */
  loggedAt: string;
  macros: MacroTotals;
}

/** The user's daily nutrition targets. */
export interface UserGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
