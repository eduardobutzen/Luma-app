import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import MacroMiniBar from '@/components/MacroMiniBar';
import { colors, neo, streakColor } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';

export type PostType =
  | 'daily_summary'
  | 'recipe_published'
  | 'meal_shared'
  | 'progress_shared'
  | 'streak_milestone'
  | 'achievement';

const TYPE_LABEL: Record<PostType, string> = {
  daily_summary: 'RESUMO',
  recipe_published: 'RECEITA',
  meal_shared: 'REFEIÇÃO',
  progress_shared: 'PROGRESSO',
  streak_milestone: 'SEQUÊNCIA',
  achievement: 'CONQUISTA',
};

/** Etiqueta que diz o tipo da publicação de relance, no lugar do verbo em texto. */
export function TypeBadge({ type }: { type: PostType }) {
  const scheme = useScheme();
  const palette = colors[scheme];
  return (
    <View style={[styles.badge, { backgroundColor: palette.badgeBg }]}>
      <Text style={[styles.badgeText, { color: palette.badgeText }]}>{TYPE_LABEL[type]}</Text>
    </View>
  );
}

export function PostHeader({
  name,
  avatar,
  timeAgo,
  type,
  onPressAuthor,
}: {
  name: string;
  avatar: string | null;
  timeAgo: string;
  type: PostType;
  onPressAuthor?: () => void;
}) {
  const scheme = useScheme();
  const palette = colors[scheme];

  return (
    <View style={styles.header}>
      <Pressable onPress={onPressAuthor} disabled={!onPressAuthor}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: palette.primary }]}>
            <Text style={[styles.avatarInitial, { color: palette.onPrimary }]}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </Pressable>

      <View style={styles.headerText}>
        <Text style={[styles.author, { color: palette.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.time, { color: palette.textMuted }]}>{timeAgo}</Text>
      </View>

      <TypeBadge type={type} />
    </View>
  );
}

const RING = 88;
const RING_STROKE = 9;

/**
 * Corpo do resumo diário: o post com mais dados do feed, tratado como painel —
 * anel de calorias, faixa de macros e dois chips de apoio.
 */
export function SummaryBody({
  kcal,
  goalKcal,
  protein,
  carbs,
  fat,
  waterMl,
  streak,
}: {
  kcal: number;
  goalKcal: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
  streak: number;
}) {
  const scheme = useScheme();
  const palette = colors[scheme];

  const pct = goalKcal > 0 ? Math.round((kcal / goalKcal) * 100) : 0;
  const radius = (RING - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * Math.min(pct / 100, 1);

  return (
    <View style={styles.summary}>
      <View style={styles.summaryTop}>
        <View style={styles.ringWrap}>
          <Svg width={RING} height={RING} style={styles.ringSvg}>
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={radius}
              stroke={palette.trackBg}
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={radius}
              stroke={palette.text}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${filled} ${circumference - filled}`}
            />
          </Svg>
        </View>

        <View style={styles.summaryFigures}>
          <Text style={[styles.kcalBig, { color: palette.text }]}>
            {kcal.toLocaleString('pt-BR')}
          </Text>
          <Text style={[styles.kcalSub, { color: palette.textMuted }]}>
            de {goalKcal.toLocaleString('pt-BR')} kcal · {pct} %
          </Text>
          <View style={styles.macroBarWrap}>
            <MacroMiniBar protein={protein} carbs={carbs} fat={fat} height={6} />
          </View>
          <Text style={[styles.macroLine, { color: palette.textMuted }]}>
            P {protein} g · C {carbs} g · G {fat} g
          </Text>
        </View>
      </View>

      <View style={styles.chipRow}>
        <View style={[styles.chip, { backgroundColor: palette.surface }]}>
          <Text style={[styles.chipText, { color: palette.text }]}>
            {(waterMl / 1000).toFixed(1)} L de água
          </Text>
        </View>
        <View style={[styles.chip, { backgroundColor: palette.surface }]}>
          <Ionicons name="flame" size={13} color={streakColor[scheme]} />
          <Text style={[styles.chipText, { color: palette.text }]}>{streak} dias seguidos</Text>
        </View>
      </View>
    </View>
  );
}

/** Foto de progresso: imagem larga, sem moldura interna competindo. */
export function MediaBody({ uri, caption }: { uri?: string; caption?: string }) {
  const scheme = useScheme();
  const palette = colors[scheme];
  return (
    <View style={styles.media}>
      {uri ? <Image source={{ uri }} style={styles.mediaImage} resizeMode="cover" /> : null}
      {caption ? (
        <Text style={[styles.caption, { color: palette.text }]} numberOfLines={2}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

/** Receita ou refeição citada: miniatura + título + macros. */
export function ThumbBody({
  title,
  image,
  kcal,
  protein,
  perServing = false,
  actionLabel,
  onPress,
}: {
  title: string;
  image?: string;
  kcal?: number;
  protein?: number;
  perServing?: boolean;
  actionLabel?: string;
  onPress?: () => void;
}) {
  const scheme = useScheme();
  const palette = colors[scheme];

  return (
    <Pressable style={styles.thumbRow} onPress={onPress} disabled={!onPress}>
      {image ? (
        <Image source={{ uri: image }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: palette.trackBg }]}>
          <Ionicons name="restaurant-outline" size={22} color={palette.textMuted} />
        </View>
      )}
      <View style={styles.thumbText}>
        <Text style={[styles.thumbTitle, { color: palette.text }]} numberOfLines={2}>
          {title}
        </Text>
        {typeof kcal === 'number' ? (
          <Text style={[styles.thumbMeta, { color: palette.textMuted }]}>
            {kcal} kcal{perServing ? '/porção' : ''}
            {typeof protein === 'number' && protein > 0 ? ` · ${protein} g P` : ''}
          </Text>
        ) : null}
        {actionLabel && onPress ? (
          <Text style={[styles.thumbAction, { color: palette.text }]}>{actionLabel}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Marco de sequência ou conquista: uma linha, sem corpo extra. */
export function StatBody({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const scheme = useScheme();
  const palette = colors[scheme];
  return (
    <View style={styles.statRow}>
      <Ionicons
        name={icon}
        size={18}
        color={icon === 'flame' ? streakColor[scheme] : palette.text}
      />
      <Text style={[styles.statText, { color: palette.text }]}>{text}</Text>
    </View>
  );
}

/** Rodapé: contagem de reações à esquerda, ações à direita. */
export function PostFooter({
  reactions,
  myReaction,
  commentCount,
  onReact,
  onPickReaction,
  onComment,
}: {
  reactions: Record<string, number>;
  myReaction: string | null;
  commentCount: number;
  onReact: () => void;
  onPickReaction: () => void;
  onComment: () => void;
}) {
  const scheme = useScheme();
  const palette = colors[scheme];

  const shown = Object.entries(reactions).filter(([, n]) => n > 0);
  const total = shown.reduce((s, [, n]) => s + n, 0);

  return (
    <View style={[styles.footer, { borderTopColor: palette.border }]}>
      <View style={styles.reactions}>
        {shown.length > 0 ? (
          <>
            <Text style={styles.reactionEmojis}>
              {shown.slice(0, 3).map(([e]) => e).join('')}
            </Text>
            <Text style={[styles.reactionCount, { color: palette.textMuted }]}>{total}</Text>
          </>
        ) : null}
      </View>

      <Pressable style={styles.action} onPress={onReact} onLongPress={onPickReaction} hitSlop={4}>
        <Text style={styles.actionEmoji}>{myReaction ?? '🤍'}</Text>
        <Text
          style={[
            styles.actionLabel,
            { color: myReaction ? palette.text : palette.textMuted },
          ]}>
          Reagir
        </Text>
      </Pressable>

      <Pressable style={styles.action} onPress={onComment} hitSlop={4}>
        <Ionicons name="chatbubble-outline" size={17} color={palette.textMuted} />
        <Text style={[styles.actionLabel, { color: palette.textMuted }]}>
          {commentCount > 0 ? commentCount : 'Comentar'}
        </Text>
      </Pressable>
    </View>
  );
}

/** Moldura da publicação. */
export function PostCard({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress?: () => void;
}) {
  const scheme = useScheme();
  const palette = colors[scheme];
  return (
    <Pressable
      style={[styles.card, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
      onPress={onPress}
      disabled={!onPress}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 14, marginBottom: 12 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 17, fontWeight: '700' },
  headerText: { flex: 1 },
  author: { fontSize: 15, fontWeight: '700' },
  time: { fontSize: 13, marginTop: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },

  summary: { marginTop: 12, gap: 12 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ringWrap: { width: RING, height: RING },
  ringSvg: { transform: [{ rotate: '-90deg' }] },
  summaryFigures: { flex: 1 },
  kcalBig: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  kcalSub: { fontSize: 13, marginTop: 1 },
  macroBarWrap: { marginTop: 10 },
  macroLine: { fontSize: 12, marginTop: 6 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { fontSize: 13, fontWeight: '600' },

  media: { marginTop: 12 },
  mediaImage: { width: '100%', height: 260, borderRadius: 12 },
  caption: { fontSize: 15, marginTop: 8 },

  thumbRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  thumb: { width: 92, height: 92, borderRadius: 12 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  thumbText: { flex: 1, justifyContent: 'center' },
  thumbTitle: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  thumbMeta: { fontSize: 13, marginTop: 4 },
  thumbAction: { fontSize: 13, fontWeight: '700', marginTop: 8 },

  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  statText: { flex: 1, fontSize: 15, lineHeight: 20 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  reactions: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  reactionEmojis: { fontSize: 15 },
  reactionCount: { fontSize: 13, fontWeight: '600' },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 10,
  },
  actionEmoji: { fontSize: 16 },
  actionLabel: { fontSize: 15, fontWeight: '600' },
});
