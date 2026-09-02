import { Ionicons } from '@expo/vector-icons';

export type IconName = keyof typeof Ionicons.glyphMap;

/** Métricas agregadas do usuário usadas para avaliar as conquistas. */
export interface AchievementStats {
  totalMeals: number;
  daysLogged: number;
  streak: number;
  totalKcal: number;
  totalProtein: number;
  proteinGoalDays: number;
  kcalGoalDays: number;
  distinctTypes: number;
  earlyMeals: number;
  lateMeals: number;
  weekendMeals: number;
  waterCount: number;
  waterGoalDays: number;
  weightCount: number;
  fastsCount: number;
  longestFastHours: number;
  templatesCount: number;
}

export interface AchievementDef {
  id: string;
  category: string;
  icon: IconName;
  label: string;
  description: string;
  target: number;
  value: (s: AchievementStats) => number;
}

export interface Achievement {
  id: string;
  category: string;
  icon: IconName;
  label: string;
  description: string;
  target: number;
  progress: number;
  unlocked: boolean;
}

export const CATEGORY_LABELS: Record<string, string> = {
  meals: 'Refeições',
  days: 'Dias registrados',
  streak: 'Sequência',
  water: 'Água',
  hydration: 'Hidratação',
  protein: 'Proteína',
  calories: 'Calorias',
  goal: 'Metas',
  weight: 'Peso',
  fasting: 'Jejum',
  fasting_long: 'Jejuns longos',
  templates: 'Refeições padrão',
  variety: 'Variedade',
  protein_total: 'Proteína acumulada',
  early: 'Madrugador',
  late: 'Coruja',
  weekend: 'Fim de semana',
};

const fmt = (n: number) => n.toLocaleString('pt-BR');

function tier(
  base: string,
  category: string,
  icon: IconName,
  metric: keyof AchievementStats,
  targets: number[],
  label: (t: number) => string,
  description: (t: number) => string,
): AchievementDef[] {
  return targets.map((t) => ({
    id: `${base}_${t}`,
    category,
    icon,
    target: t,
    label: label(t),
    description: description(t),
    value: (s) => s[metric],
  }));
}

export const ACHIEVEMENTS: AchievementDef[] = [
  ...tier('meals', 'meals', 'restaurant', 'totalMeals',
    [1, 5, 10, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000],
    (t) => (t === 1 ? 'Primeira refeição' : `${t} refeições`),
    (t) => `Registre ${t} refeições no total`),

  ...tier('days', 'days', 'calendar', 'daysLogged',
    [1, 3, 7, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365],
    (t) => (t === 1 ? 'Primeiro dia' : `${t} dias registrados`),
    (t) => `Registre em ${t} dias diferentes`),

  ...tier('streak', 'streak', 'flame', 'streak',
    [3, 5, 7, 10, 14, 21, 30, 45, 60, 90, 120, 180, 365],
    (t) => `${t} dias seguidos`,
    (t) => `Mantenha ${t} dias consecutivos`),

  ...tier('water', 'water', 'water', 'waterCount',
    [1, 10, 25, 50, 100, 250, 500],
    (t) => (t === 1 ? 'Primeiro gole' : `${t} registros de água`),
    (t) => `Registre água ${t} vezes`),

  ...tier('hydration', 'hydration', 'water', 'waterGoalDays',
    [1, 5, 10, 25, 50, 100],
    (t) => `Hidratado ${t}x`,
    (t) => `Bata a meta de água em ${t} dias`),

  ...tier('protein', 'protein', 'barbell', 'proteinGoalDays',
    [1, 5, 10, 25, 50, 100],
    (t) => `Meta de proteína ${t}x`,
    (t) => `Bata a meta de proteína em ${t} dias`),

  ...tier('protein_total', 'protein_total', 'barbell', 'totalProtein',
    [1000, 5000, 10000, 50000, 100000],
    (t) => `${fmt(t)}g de proteína`,
    (t) => `Acumule ${fmt(t)}g de proteína registrada`),

  ...tier('calories', 'calories', 'flame-outline', 'totalKcal',
    [10000, 50000, 100000, 500000, 1000000],
    (t) => `${fmt(t)} kcal`,
    (t) => `Acumule ${fmt(t)} kcal registradas`),

  ...tier('goal', 'goal', 'flag', 'kcalGoalDays',
    [1, 5, 10, 25, 50, 100],
    (t) => `Na meta ${t}x`,
    (t) => `Fique dentro da meta de calorias em ${t} dias`),

  ...tier('weight', 'weight', 'scale', 'weightCount',
    [1, 5, 10, 25, 50, 100],
    (t) => (t === 1 ? 'Primeira pesagem' : `${t} pesagens`),
    (t) => `Registre seu peso ${t} vezes`),

  ...tier('fasting', 'fasting', 'timer', 'fastsCount',
    [1, 5, 10, 25, 50, 100],
    (t) => (t === 1 ? 'Primeiro jejum' : `${t} jejuns`),
    (t) => `Conclua ${t} jejuns`),

  ...tier('fastlong', 'fasting_long', 'hourglass', 'longestFastHours',
    [12, 16, 18, 20, 24, 36, 48],
    (t) => `Jejum de ${t}h`,
    (t) => `Conclua um jejum de ${t} horas`),

  ...tier('templates', 'templates', 'bookmark', 'templatesCount',
    [1, 3, 5, 10, 25],
    (t) => `${t} refeições padrão`,
    (t) => `Salve ${t} refeições padrão`),

  ...tier('variety', 'variety', 'apps', 'distinctTypes',
    [2, 3, 4],
    (t) => (t === 4 ? 'Todos os tipos' : `${t} tipos de refeição`),
    (t) => `Registre ${t} tipos diferentes (café/almoço/lanche/jantar)`),

  ...tier('early', 'early', 'sunny', 'earlyMeals',
    [1, 10, 50],
    (t) => (t === 1 ? 'Madrugador' : `Madrugador ${t}x`),
    (t) => `Registre ${t} refeições antes das 7h`),

  ...tier('late', 'late', 'moon', 'lateMeals',
    [1, 10, 50],
    (t) => (t === 1 ? 'Coruja' : `Coruja ${t}x`),
    (t) => `Registre ${t} refeições após as 22h`),

  ...tier('weekend', 'weekend', 'cafe', 'weekendMeals',
    [5, 25, 100],
    (t) => `Fim de semana ${t}`,
    (t) => `Registre ${t} refeições em fins de semana`),
];

export function computeAchievements(s: AchievementStats): Achievement[] {
  return ACHIEVEMENTS.map((d) => {
    const v = d.value(s);
    return {
      id: d.id,
      category: d.category,
      icon: d.icon,
      label: d.label,
      description: d.description,
      target: d.target,
      progress: Math.min(v, d.target),
      unlocked: v >= d.target,
    };
  });
}
