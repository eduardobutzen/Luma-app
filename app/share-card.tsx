import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import ShareCardCanvas, { type CardOptions } from '@/components/share/ShareCardCanvas';
import { colors, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { useAchievements } from '@/hooks/useAchievements';
import { useMeals } from '@/hooks/useMeals';
import { useProfile } from '@/hooks/useProfile';
import { useWeeklyMeals } from '@/hooks/useWeeklyMeals';
import { useWeightLogs } from '@/hooks/useWeightLogs';
import {
  ACCENTS,
  GRADIENTS,
  TEMPLATES,
  buildCard,
  type CardStats,
} from '@/lib/cardTemplates';
import { localDateKey, localDayRange } from '@/lib/date';
import { currentUserId } from '@/lib/session';
import { saveCard, shareCard, type CardFormat } from '@/lib/shareCard';
import { supabase } from '@/lib/supabase';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function ShareCardScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();
  const { width: SW, height: SH } = useWindowDimensions();

  // ── Dados ──────────────────────────────────────────────────────────────
  const today = localDateKey();
  const { meals, refetch: refetchMeals } = useMeals(today);
  const { profile } = useProfile();
  const { latest: weight } = useWeightLogs();
  const { summary, refetch: refetchWeek } = useWeeklyMeals();
  const { achievements } = useAchievements();
  const [month, setMonth] = useState({ avg: 0, days: 0 });

  useFocusEffect(
    useCallback(() => {
      refetchMeals();
      refetchWeek();
    }, [refetchMeals, refetchWeek]),
  );

  useEffect(() => {
    (async () => {
      const start = new Date();
      start.setDate(start.getDate() - 29);
      const uid = await currentUserId();
      if (!uid) return;
      const { start: s } = localDayRange(localDateKey(start));
      const { end: e } = localDayRange(today);
      const { data } = await supabase
        .from('meals')
        .select('kcal, eaten_at')
        .eq('user_id', uid)
        .gte('eaten_at', s)
        .lte('eaten_at', e);
      const rows = data ?? [];
      const days = new Set(rows.map((r) => localDateKey(new Date(r.eaten_at))));
      const total = rows.reduce((sum, r) => sum + r.kcal, 0);
      setMonth({ avg: days.size ? Math.round(total / days.size) : 0, days: days.size });
    })();
  }, [today]);

  const totals = meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const goalKcal = profile?.goal_kcal ?? 2000;
  const now = new Date();

  const stats: CardStats = {
    dateLabel: now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }),
    monthLabel: `${MONTHS[now.getMonth()]}, ${now.getFullYear()}`,
    kcal: totals.kcal,
    goalKcal,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
    goalPct: goalKcal > 0 ? Math.round((totals.kcal / goalKcal) * 100) : 0,
    streak: profile?.streak ?? 0,
    weightKg: weight,
    weekAvgKcal: summary.avgKcal,
    weekDeltaPct: summary.deltaPct,
    weekActiveDays: summary.days.filter((d) => d.kcal > 0).length,
    monthAvgKcal: month.avg,
    monthDays: month.days,
    achievement: achievements.filter((a) => a.unlocked).slice(-1)[0]?.label ?? null,
  };

  // ── Personalização ─────────────────────────────────────────────────────
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [format, setFormat] = useState<CardFormat>('story');
  const [gi, setGi] = useState(0);
  const [ai, setAi] = useState(0);
  const [dark, setDark] = useState(GRADIENTS[0].dark);
  const [showLogo, setShowLogo] = useState(true);
  const [showWatermark, setShowWatermark] = useState(true);
  const [transparent, setTransparent] = useState(false);
  const [busy, setBusy] = useState(false);

  const cardRef = useRef<View>(null);

  const model = buildCard(templateId, stats);
  const options: CardOptions = {
    gradient: GRADIENTS[gi].colors,
    dark,
    primary: ACCENTS[ai],
    showLogo,
    showWatermark,
    transparent,
  };

  // Preview que cabe na área disponível, preservando a proporção do formato.
  const ratio = format === 'story' ? 1920 / 1080 : 1;
  let pw = SW - 80;
  let ph = pw * ratio;
  const maxH = SH * 0.42;
  if (ph > maxH) {
    ph = maxH;
    pw = ph / ratio;
  }

  function selectGradient(i: number) {
    setGi(i);
    setDark(GRADIENTS[i].dark);
  }

  async function onShare() {
    setBusy(true);
    const ok = await shareCard(cardRef, format);
    setBusy(false);
    if (!ok) Alert.alert('Indisponível', 'Compartilhamento não disponível neste dispositivo.');
  }

  async function onSave() {
    setBusy(true);
    const ok = await saveCard(cardRef, format);
    setBusy(false);
    Alert.alert(ok ? 'Salvo!' : 'Permissão negada', ok ? 'Imagem salva na galeria.' : 'Conceda acesso às fotos para salvar.');
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>Compartilhar</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Preview */}
        <Animated.View
          key={`${templateId}-${format}-${gi}-${ai}-${dark}-${showLogo}-${showWatermark}-${transparent}`}
          entering={FadeIn.duration(220)}
          style={styles.previewWrap}>
          <Animated.View entering={ZoomIn.duration(260)} style={styles.shadow}>
            <View style={{ width: pw, height: ph }}>
              {/* Foto de exemplo (apenas no preview) para visualizar o card sem fundo. */}
              {transparent ? (
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600' }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              ) : null}
              <View ref={cardRef} collapsable={false}>
                <ShareCardCanvas width={pw} height={ph} format={format} model={model} options={options} />
              </View>
            </View>
          </Animated.View>
        </Animated.View>

        {/* Templates */}
        <Text style={[styles.label, { color: palette.textMuted }]}>Template</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {TEMPLATES.map((t) => {
            const active = templateId === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setTemplateId(t.id)}
                style={[styles.chip, { backgroundColor: active ? palette.primary : palette.card, borderColor: active ? palette.primary : palette.border }]}>
                <Text style={[styles.chipText, { color: active ? palette.onPrimary : palette.text }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Formato */}
        <Text style={[styles.label, { color: palette.textMuted }]}>Formato</Text>
        <View style={styles.row}>
          {([
            { id: 'story', label: 'Stories 9:16' },
            { id: 'square', label: 'Quadrado 1:1' },
          ] as const).map((f) => {
            const active = format === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFormat(f.id)}
                style={[styles.chip, { backgroundColor: active ? palette.primary : palette.card, borderColor: active ? palette.primary : palette.border }]}>
                <Text style={[styles.chipText, { color: active ? palette.onPrimary : palette.text }]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Gradiente (oculto no modo transparente) */}
        {!transparent ? (
          <>
            <Text style={[styles.label, { color: palette.textMuted }]}>Gradiente</Text>
            <View style={[styles.row, styles.wrap]}>
              {GRADIENTS.map((g, i) => (
                <Pressable
                  key={g.name}
                  onPress={() => selectGradient(i)}
                  style={[styles.swatch, { backgroundColor: g.colors[1], borderColor: gi === i ? palette.primary : 'transparent' }]}
                />
              ))}
            </View>
          </>
        ) : null}

        {/* Cor principal */}
        <Text style={[styles.label, { color: palette.textMuted }]}>Cor principal</Text>
        <View style={[styles.row, styles.wrap]}>
          {ACCENTS.map((c, i) => (
            <Pressable
              key={c}
              onPress={() => setAi(i)}
              style={[styles.swatch, { backgroundColor: c, borderColor: ai === i ? palette.text : 'transparent' }]}
            />
          ))}
        </View>

        {/* Toggles */}
        <View style={[styles.toggleRow, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
          <View style={styles.toggleInfo}>
            <Text style={[styles.toggleLabel, { color: palette.text }]}>Sem fundo (transparente)</Text>
            <Text style={[styles.toggleSub, { color: palette.textMuted }]}>
              PNG transparente para postar sobre sua foto
            </Text>
          </View>
          <Switch value={transparent} onValueChange={setTransparent} trackColor={{ true: palette.primary }} />
        </View>
        {!transparent ? (
          <View style={[styles.toggleRow, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
            <Text style={[styles.toggleLabel, { color: palette.text }]}>Texto claro</Text>
            <Switch value={dark} onValueChange={setDark} trackColor={{ true: palette.primary }} />
          </View>
        ) : null}
        <View style={[styles.toggleRow, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
          <Text style={[styles.toggleLabel, { color: palette.text }]}>Mostrar logo</Text>
          <Switch value={showLogo} onValueChange={setShowLogo} trackColor={{ true: palette.primary }} />
        </View>
        <View style={[styles.toggleRow, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
          <Text style={[styles.toggleLabel, { color: palette.text }]}>Marca d'água</Text>
          <Switch value={showWatermark} onValueChange={setShowWatermark} trackColor={{ true: palette.primary }} />
        </View>
      </ScrollView>

      {/* Ações */}
      <View style={[styles.footer, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
        <Pressable style={[styles.shareButton, { backgroundColor: palette.primary }, busy && { opacity: 0.6 }]} onPress={onShare} disabled={busy}>
          <Ionicons name="share-social" size={18} color={palette.onPrimary} />
          <Text style={[styles.shareText, { color: palette.onPrimary }]}>
            {format === 'story' ? 'Compartilhar nos Stories' : 'Compartilhar'}
          </Text>
        </Pressable>
        <Pressable style={[styles.saveButton, { borderColor: palette.border }]} onPress={onSave} disabled={busy}>
          <Ionicons name="download-outline" size={18} color={palette.text} />
          <Text style={[styles.saveText, { color: palette.text }]}>Salvar imagem</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  previewWrap: { alignItems: 'center', marginVertical: 8 },
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 18,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', gap: 8 },
  wrap: { flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 16, paddingVertical: 9 },
  chipText: { fontSize: 13, fontWeight: '500' },
  swatch: { width: 40, height: 40, borderRadius: 12, borderWidth: 2 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 10,
  },
  toggleInfo: { flex: 1, paddingRight: 12 },
  toggleLabel: { fontSize: 15 },
  toggleSub: { fontSize: 12, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 99,
    paddingVertical: 14,
  },
  shareText: { fontSize: 15, fontWeight: '600' },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 99,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  saveText: { fontSize: 15, fontWeight: '500' },
});
