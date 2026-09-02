import { Ionicons } from '@expo/vector-icons';

// ───────────────────────────────────────────────────────────────────────────
// Modelo de dados de um Social Share Card.
// Os templates (DAILY, WEEKLY, ...) transformam as estatísticas do usuário
// (CardStats) em um CardModel pronto para o ShareCardCanvas renderizar.
// Adicionar um template novo = adicionar um item em TEMPLATES.
// ───────────────────────────────────────────────────────────────────────────

export type IconName = keyof typeof Ionicons.glyphMap;

export interface CardStat {
  label: string;
  value: string;
}

export interface CardHighlight {
  icon: IconName;
  text: string;
}

export interface CardModel {
  emoji: string;
  title: string;
  /** Valor grande de destaque (ex.: "2.145"). */
  bigValue?: string;
  bigUnit?: string;
  /** Alternativa ao bigValue (ex.: nome da conquista). */
  subtitle?: string;
  stats: CardStat[];
  highlights: CardHighlight[];
  dateLabel: string;
}

/** Estatísticas do usuário usadas pelos templates. */
export interface CardStats {
  dateLabel: string;
  monthLabel: string;
  kcal: number;
  goalKcal: number;
  protein: number;
  carbs: number;
  fat: number;
  goalPct: number;
  streak: number;
  weightKg: number | null;
  weekAvgKcal: number;
  weekDeltaPct: number | null;
  weekActiveDays: number;
  monthAvgKcal: number;
  monthDays: number;
  achievement: string | null;
}

export interface CardTemplate {
  id: string;
  label: string;
  build: (s: CardStats) => CardModel;
}

const fmt = (n: number) => n.toLocaleString('pt-BR');

const deltaLabel = (d: number | null) =>
  d === null ? '—' : `${d >= 0 ? '+' : ''}${d}%`;

export const TEMPLATES: CardTemplate[] = [
  {
    id: 'daily',
    label: 'Diário',
    build: (s) => ({
      emoji: '🔥',
      title: 'Resumo do Dia',
      bigValue: fmt(s.kcal),
      bigUnit: 'kcal',
      stats: [
        { label: 'Proteína', value: `${s.protein}g` },
        { label: 'Carbos', value: `${s.carbs}g` },
        { label: 'Gordura', value: `${s.fat}g` },
      ],
      highlights: [
        { icon: 'flag', text: `${s.goalPct}% da meta atingida` },
        { icon: 'flame', text: `${s.streak} dias consecutivos` },
      ],
      dateLabel: s.dateLabel,
    }),
  },
  {
    id: 'weekly',
    label: 'Semanal',
    build: (s) => ({
      emoji: '📊',
      title: 'Resumo da Semana',
      bigValue: fmt(s.weekAvgKcal),
      bigUnit: 'kcal/dia em média',
      stats: [
        { label: 'Dias ativos', value: `${s.weekActiveDays}/7` },
        { label: 'vs anterior', value: deltaLabel(s.weekDeltaPct) },
        { label: 'Sequência', value: `${s.streak}` },
      ],
      highlights: [
        { icon: 'trending-up', text: 'Evolução constante 💪' },
      ],
      dateLabel: 'Últimos 7 dias',
    }),
  },
  {
    id: 'monthly',
    label: 'Mensal',
    build: (s) => ({
      emoji: '📅',
      title: 'Resumo do Mês',
      bigValue: fmt(s.monthAvgKcal),
      bigUnit: 'kcal/dia em média',
      stats: [
        { label: 'Dias registrados', value: `${s.monthDays}` },
        { label: 'Sequência', value: `${s.streak}d` },
        { label: 'Peso', value: s.weightKg !== null ? `${s.weightKg}kg` : '—' },
      ],
      highlights: [{ icon: 'calendar', text: `${s.monthDays} dias acompanhados` }],
      dateLabel: s.monthLabel,
    }),
  },
  {
    id: 'streak',
    label: 'Sequência',
    build: (s) => ({
      emoji: '⚡',
      title: 'Sequência',
      bigValue: `${s.streak}`,
      bigUnit: 'dias consecutivos',
      stats: [],
      highlights: [{ icon: 'flame', text: 'Disciplina todos os dias 🔥' }],
      dateLabel: s.dateLabel,
    }),
  },
  {
    id: 'achievement',
    label: 'Conquista',
    build: (s) => ({
      emoji: '🏆',
      title: 'Conquista desbloqueada',
      subtitle: s.achievement ?? 'Continue para desbloquear!',
      stats: [],
      highlights: [{ icon: 'flame', text: `${s.streak} dias de sequência` }],
      dateLabel: s.dateLabel,
    }),
  },
  {
    id: 'goal',
    label: 'Meta',
    build: (s) => ({
      emoji: '🎯',
      title: 'Meta do Dia',
      bigValue: `${s.goalPct}%`,
      bigUnit: 'da meta diária',
      stats: [
        { label: 'Proteína', value: `${s.protein}g` },
        { label: 'Carbos', value: `${s.carbs}g` },
        { label: 'Gordura', value: `${s.fat}g` },
      ],
      highlights: [{ icon: 'flame', text: `${s.streak} dias consecutivos` }],
      dateLabel: s.dateLabel,
    }),
  },
];

export function buildCard(templateId: string, stats: CardStats): CardModel {
  const tpl = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
  return tpl.build(stats);
}

// ── Personalização ──────────────────────────────────────────────────────────

export interface Gradient {
  name: string;
  colors: [string, string];
  dark: boolean;
}

// Fundos em escala de cinza, na mesma linguagem preto e branco do app.
export const GRADIENTS: Gradient[] = [
  { name: 'Preto', colors: ['#000000', '#16181C'], dark: true },
  { name: 'Grafite', colors: ['#16181C', '#2F3336'], dark: true },
  { name: 'Ardósia', colors: ['#2F3336', '#536471'], dark: true },
  { name: 'Chumbo', colors: ['#536471', '#8B98A5'], dark: true },
  { name: 'Névoa', colors: ['#EFF3F4', '#8B98A5'], dark: false },
  { name: 'Branco', colors: ['#FFFFFF', '#EFF3F4'], dark: false },
];

export const ACCENTS = ['#FFFFFF', '#E7E9EA', '#A9B3BA', '#8B98A5', '#536471', '#0F1419'];
