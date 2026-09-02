/**
 * Design tokens do Luma — preto e branco.
 *
 * Princípios:
 * - Cartões são superfícies inteiras, não molduras: o fundo da tela recua um
 *   degrau e o cartão ocupa o degrau de cima (branco sobre cinza no tema claro,
 *   cinza-chumbo sobre preto no escuro), apoiado por uma sombra curta.
 * - Nenhuma cor decorativa. A "cor" do app é a própria tinta: preto no tema
 *   claro, branco no escuro (`primary`), com `onPrimary` para o que vai por cima.
 * - Hierarquia vem de superfície, peso e tamanho de texto — nunca de matiz.
 */

export const colors = {
  light: {
    /** Fundo da tela: recuado, para o cartão branco se destacar sobre ele. */
    background: '#F0F2F4',
    /** Superfície do cartão. */
    card: '#FFFFFF',
    /** Blocos internos ao cartão: chips, trilhas, anexos. */
    surface: '#EFF3F4',
    /** Tinta de destaque — botões sólidos, ícone ativo, links. */
    primary: '#0F1419',
    /** Conteúdo que vai por cima de `primary`. */
    onPrimary: '#FFFFFF',
    text: '#0F1419',
    textMuted: '#536471',
    border: '#E3E8EA',
    /** Contorno de blocos que precisam se delimitar sozinhos. */
    borderStrong: '#CFD9DE',
    badgeBg: '#EFF3F4',
    badgeText: '#0F1419',
    trackBg: '#E3E8EA',
    danger: '#F4212E',
  },
  dark: {
    background: '#000000',
    card: '#16181C',
    surface: '#22262B',
    primary: '#FFFFFF',
    onPrimary: '#000000',
    text: '#E7E9EA',
    textMuted: '#71767B',
    border: '#2F3336',
    borderStrong: '#3E4144',
    badgeBg: '#22262B',
    badgeText: '#E7E9EA',
    trackBg: '#2F3336',
    danger: '#F4212E',
  },
} as const;

/**
 * Elevação dos cartões. As chaves são as mesmas de antes porque as telas as
 * aplicam direto na prop `boxShadow`.
 *
 * No tema claro a profundidade vem da sombra; no escuro, sombra preta sobre
 * fundo preto não aparece, então o degrau é dado pelo tom do próprio cartão
 * mais um contorno discreto.
 */
export const neo = {
  light: {
    /** Cartões e superfícies elevadas. */
    raised: '0px 1px 2px rgba(15,20,25,0.06), 0px 4px 12px rgba(15,20,25,0.08)',
    /** Botões e chips menores. */
    raisedSm: '0px 1px 2px rgba(15,20,25,0.06), 0px 2px 6px rgba(15,20,25,0.06)',
    /** Blocos internos não flutuam — já se distinguem pelo tom. */
    inset: undefined,
    insetSm: undefined,
    /** FAB: sólido, apoiado por uma sombra mais longa. */
    fab: '0px 4px 14px rgba(15,20,25,0.28)',
  },
  dark: {
    raised: '0px 0px 0px 1px #2F3336',
    raisedSm: '0px 0px 0px 1px #2F3336',
    inset: undefined,
    insetSm: undefined,
    fab: '0px 4px 14px rgba(0,0,0,0.7)',
  },
} as const;

/**
 * Exceções coloridas à regra preto e branco. Só entram onde a cor carrega
 * informação que o cinza não separa: as três séries de macro em gráficos e o
 * fogo da sequência. Cada tom tem sua versão por tema para manter contraste.
 */
export const macroPalette = {
  light: {
    protein: '#1D4ED8',
    carbs: '#B45309',
    fat: '#7C3AED',
  },
  dark: {
    protein: '#7AB4FF',
    carbs: '#F5B342',
    fat: '#B99AFF',
  },
} as const;

/** Laranja de chama, para o ícone de sequência (streak). */
export const streakColor = {
  light: '#EA580C',
  dark: '#FB923C',
} as const;

export type ColorScheme = keyof typeof colors;
export type ThemeColors = (typeof colors)[ColorScheme];

export const theme = {
  colors,
  macroPalette,
  streakColor,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  /** Raios contidos: cartões 16, chips/botões pill. */
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    pill: 999,
  },
} as const;

export default theme;
