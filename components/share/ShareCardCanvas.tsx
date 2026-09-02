import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';

import type { CardModel } from '@/lib/cardTemplates';
import type { CardFormat } from '@/lib/shareCard';

export interface CardOptions {
  gradient: [string, string];
  dark: boolean;
  primary: string;
  showLogo: boolean;
  showWatermark: boolean;
  /** PNG transparente (sem fundo) — para postar sobre uma foto. */
  transparent: boolean;
}

interface ShareCardCanvasProps {
  width: number;
  height: number;
  format: CardFormat;
  model: CardModel;
  options: CardOptions;
}

/**
 * Card visual (puro/apresentacional). Tamanhos proporcionais à largura → o
 * mesmo componente serve para o preview e para o export 1080px (preview ===
 * export). No formato Stories aplica as áreas seguras do Instagram (~250px topo/
 * base, ~60px laterais sobre 1080×1920). Em modo transparente, remove o fundo e
 * reforça a legibilidade com sombra de texto.
 */
export default function ShareCardCanvas({ width, height, format, model, options }: ShareCardCanvasProps) {
  const W = width;
  const transparent = options.transparent;

  const text = transparent ? '#FFFFFF' : options.dark ? '#FFFFFF' : '#0A0A0A';
  const muted = transparent
    ? 'rgba(255,255,255,0.85)'
    : options.dark
      ? 'rgba(255,255,255,0.72)'
      : 'rgba(0,0,0,0.55)';
  const chipBg = transparent
    ? 'rgba(0,0,0,0.4)'
    : options.dark
      ? 'rgba(255,255,255,0.12)'
      : 'rgba(0,0,0,0.06)';

  // Sombra para legibilidade quando não há fundo (sobre fotos quaisquer).
  const shadow: TextStyle = transparent
    ? { textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: W * 0.02, textShadowOffset: { width: 0, height: 1 } }
    : {};

  // Áreas seguras do Stories (1080×1920): ~60px laterais, ~250px topo/base.
  const padH = format === 'story' ? W * 0.056 : W * 0.08;
  const padV = format === 'story' ? W * 0.231 : W * 0.08;

  const frameStyle = {
    width,
    height,
    borderRadius: transparent ? 0 : W * 0.06,
    paddingHorizontal: padH,
    paddingTop: padV,
    paddingBottom: padV,
  };

  const content = (
    <>
      {/* Header */}
      <View>
        <Text style={[{ fontSize: W * 0.13 }, shadow]}>{model.emoji}</Text>
        <Text style={[{ fontSize: W * 0.062, fontWeight: '700', color: text, marginTop: W * 0.02 }, shadow]}>
          {model.title}
        </Text>
        <View
          style={{ height: W * 0.012, width: W * 0.18, borderRadius: 99, backgroundColor: options.primary, marginTop: W * 0.03 }}
        />
      </View>

      {/* Middle */}
      <View style={styles.middle}>
        {model.bigValue ? (
          <View style={styles.bigBlock}>
            <Text style={[{ fontSize: W * 0.2, fontWeight: '800', color: text, letterSpacing: -1 }, shadow]}>
              {model.bigValue}
            </Text>
            {model.bigUnit ? (
              <Text style={[{ fontSize: W * 0.05, color: muted, marginTop: -W * 0.01 }, shadow]}>
                {model.bigUnit}
              </Text>
            ) : null}
          </View>
        ) : null}

        {model.subtitle ? (
          <Text style={[{ fontSize: W * 0.08, fontWeight: '700', color: text, textAlign: 'center' }, shadow]}>
            {model.subtitle}
          </Text>
        ) : null}

        {model.stats.length > 0 ? (
          <View style={[styles.statsRow, { marginTop: W * 0.07, gap: W * 0.04 }]}>
            {model.stats.map((s) => (
              <View key={s.label} style={styles.statCol}>
                <Text style={[{ fontSize: W * 0.06, fontWeight: '700', color: text }, shadow]}>{s.value}</Text>
                <Text style={[{ fontSize: W * 0.035, color: muted, marginTop: W * 0.01 }, shadow]}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {model.highlights.length > 0 ? (
          <View style={{ marginTop: W * 0.07, gap: W * 0.025, alignItems: 'center' }}>
            {model.highlights.map((h) => (
              <View
                key={h.text}
                style={[styles.chip, { backgroundColor: chipBg, borderRadius: 99, paddingHorizontal: W * 0.04, paddingVertical: W * 0.022, gap: W * 0.02 }]}>
                <Ionicons name={h.icon} size={W * 0.05} color={options.primary} />
                <Text style={{ fontSize: W * 0.043, fontWeight: '600', color: text }}>{h.text}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {/* Footer / branding */}
      <View style={styles.footer}>
        <Text style={[{ fontSize: W * 0.035, color: muted }, shadow]}>{model.dateLabel}</Text>
        <View style={styles.brandRow}>
          {options.showLogo ? (
            <View style={[styles.logo, { width: W * 0.07, height: W * 0.07, borderRadius: W * 0.018, backgroundColor: options.primary }]}>
              <Ionicons name="flame" size={W * 0.045} color="#FFFFFF" />
            </View>
          ) : null}
          {options.showWatermark ? (
            <Text style={[{ fontSize: W * 0.038, fontWeight: '600', color: muted }, shadow]}>Gerado com Luma</Text>
          ) : (
            <Text style={[{ fontSize: W * 0.045, fontWeight: '700', color: text }, shadow]}>Luma</Text>
          )}
        </View>
      </View>
    </>
  );

  if (transparent) {
    return <View style={[styles.card, frameStyle]}>{content}</View>;
  }

  return (
    <LinearGradient
      colors={options.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, frameStyle]}>
      {content}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { justifyContent: 'space-between', overflow: 'hidden' },
  middle: { flex: 1, justifyContent: 'center' },
  bigBlock: { alignItems: 'flex-start' },
  statsRow: { flexDirection: 'row' },
  statCol: { flex: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { alignItems: 'center', justifyContent: 'center' },
});
