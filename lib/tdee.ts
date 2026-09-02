/** TDEE + macro target calculation (Mifflin-St Jeor). */

export type Sex = 'male' | 'female';
export type Activity =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';

const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Calorie adjustment applied to TDEE per goal.
const GOAL_ADJUST: Record<Goal, number> = {
  lose: -0.2,
  maintain: 0,
  gain: 0.15,
};

export interface TdeeInput {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activity: Activity;
  goal: Goal;
}

export interface MacroTargets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Returns daily calorie and macro targets. Macros use a 30% protein / 40% carb
 * / 30% fat calorie split (4/4/9 kcal per gram).
 */
export function calcTargets(input: TdeeInput): MacroTargets {
  const { weightKg, heightCm, age, sex, activity, goal } = input;

  const bmr =
    10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
  const tdee = bmr * ACTIVITY_FACTOR[activity];
  const kcal = Math.round(tdee * (1 + GOAL_ADJUST[goal]));

  return {
    kcal,
    protein: Math.round((kcal * 0.3) / 4),
    carbs: Math.round((kcal * 0.4) / 4),
    fat: Math.round((kcal * 0.3) / 9),
  };
}
