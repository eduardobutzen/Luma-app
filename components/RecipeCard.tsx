import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import MacroMiniBar from '@/components/MacroMiniBar';
import { colors, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';

export interface RecipeCardMacros {
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Cartão da grade de receitas. A variante muda a linha de apoio — autor na
 * comunidade, data nas minhas — mas a moldura, a imagem e a assinatura de
 * macros são as mesmas nas três abas.
 */
export default function RecipeCard({
  title,
  image,
  kcal,
  macros,
  author,
  authorAvatar,
  date,
  badge,
  compact = false,
  onPress,
}: {
  title: string;
  image?: string | null;
  kcal: number;
  macros?: RecipeCardMacros;
  /** Comunidade: quem publicou. */
  author?: string;
  authorAvatar?: string | null;
  /** Rodapé alternativo ao autor (ex.: "12 mar"). */
  date?: string;
  /** Selo sobre a imagem (ex.: "Luma" nas receitas curadas). */
  badge?: string;
  /** Imagem mais baixa, para listas longas ("Minhas"). */
  compact?: boolean;
  onPress: () => void;
}) {
  const scheme = useScheme();
  const palette = colors[scheme];

  const meta = macros
    ? `${kcal} kcal · ${macros.protein} g P`
    : `${kcal} kcal/porção`;

  return (
    <Pressable
      style={[styles.card, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
      onPress={onPress}>
      <View>
        {image ? (
          <Image
            source={{ uri: image }}
            style={[styles.image, compact && styles.imageCompact]}
          />
        ) : (
          <View
            style={[
              styles.image,
              compact && styles.imageCompact,
              styles.imageEmpty,
              { backgroundColor: palette.trackBg },
            ]}>
            <Ionicons name="restaurant-outline" size={26} color={palette.textMuted} />
          </View>
        )}

        {badge ? (
          <View style={[styles.badge, { backgroundColor: palette.primary }]}>
            <Text style={[styles.badgeText, { color: palette.onPrimary }]}>{badge}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: palette.text }]} numberOfLines={2}>
          {title}
        </Text>

        {author ? (
          <View style={styles.authorRow}>
            {authorAvatar ? (
              <Image source={{ uri: authorAvatar }} style={styles.authorAvatar} />
            ) : (
              <View style={[styles.authorAvatar, { backgroundColor: palette.trackBg }]} />
            )}
            <Text style={[styles.meta, { color: palette.textMuted }]} numberOfLines={1}>
              {author}
              {date ? ` · ${date}` : ''}
            </Text>
          </View>
        ) : null}

        {macros ? (
          <View style={styles.macroWrap}>
            <MacroMiniBar protein={macros.protein} carbs={macros.carbs} fat={macros.fat} />
          </View>
        ) : null}

        <Text style={[styles.meta, { color: palette.textMuted }]} numberOfLines={1}>
          {!author && date ? `${kcal} kcal · ${date}` : meta}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  image: { width: '100%', height: 110 },
  imageCompact: { height: 88 },
  imageEmpty: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  body: { padding: 10, gap: 6 },
  title: { fontSize: 15, fontWeight: '600', lineHeight: 19 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  authorAvatar: { width: 16, height: 16, borderRadius: 8 },
  macroWrap: { marginTop: 2 },
  meta: { fontSize: 13 },
});
