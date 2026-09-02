import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, neo, streakColor } from '@/constants/theme';
import { useFasting, type Fast } from '@/hooks/useFasting';
import { useScheme } from '@/hooks/useScheme';

const PROTOCOLS = [
  { label: '16:8', hours: 16 },
  { label: '18:6', hours: 18 },
  { label: '20:4', hours: 20 },
  { label: '24h', hours: 24 },
];

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function fastDurationLabel(f: Fast): string {
  if (!f.ended_at) return '—';
  const ms = new Date(f.ended_at).getTime() - new Date(f.started_at).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}min`;
}

export default function FastingScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();

  const { active, history, streak, startFast, endFast, refetch } = useFasting();
  const [target, setTarget] = useState(16);
  const [now, setNow] = useState(Date.now());

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  // Atualiza o cronômetro de segundo em segundo enquanto há jejum ativo.
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const elapsedMs = active ? now - new Date(active.started_at).getTime() : 0;
  const targetMs = (active?.target_hours ?? target) * 3600000;
  const progress = active ? Math.min(elapsedMs / targetMs, 1) : 0;
  const reachedGoal = active ? elapsedMs >= targetMs : false;

  async function handleStart() {
    await startFast(target);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleEnd() {
    Alert.alert('Encerrar jejum', 'Deseja encerrar o jejum atual?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Encerrar',
        onPress: async () => {
          await endFast();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <Text style={[styles.title, { color: palette.text }]}>Jejum</Text>
          <View style={[styles.streakChip, { backgroundColor: palette.surface }]}>
            <Ionicons name="flame" size={14} color={streakColor[scheme]} />
            <Text style={[styles.streakText, { color: palette.text }]}>{streak}</Text>
          </View>
        </View>

        {active ? (
          <View style={[styles.timerCard, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
            <Text style={[styles.timerLabel, { color: palette.textMuted }]}>
              Jejum em andamento · meta {active.target_hours}h
            </Text>
            <Text style={[styles.timer, { color: reachedGoal ? palette.text : palette.textMuted }]}>
              {formatElapsed(elapsedMs)}
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
              <View
                style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: palette.primary }]}
              />
            </View>
            <Text style={[styles.goalNote, { color: palette.textMuted }]}>
              {reachedGoal ? 'Meta atingida! 🎉' : `${Math.round(progress * 100)}% da meta`}
            </Text>
            <Pressable style={styles.endButton} onPress={handleEnd}>
              <Text style={styles.endText}>Encerrar jejum</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.startCard, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
            <Text style={[styles.startLabel, { color: palette.text }]}>Escolha o protocolo</Text>
            <View style={styles.protocolRow}>
              {PROTOCOLS.map((p) => {
                const activeSel = target === p.hours;
                return (
                  <Pressable
                    key={p.label}
                    onPress={() => setTarget(p.hours)}
                    style={[
                      styles.protocolChip,
                      {
                        backgroundColor: activeSel ? palette.primary : palette.background,
                        borderColor: activeSel ? palette.primary : palette.border,
                      },
                    ]}>
                    <Text
                      style={[styles.protocolText, { color: activeSel ? palette.onPrimary : palette.text }]}>
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable style={[styles.startButton, { backgroundColor: palette.primary }]} onPress={handleStart}>
              <Ionicons name="play" size={18} color={palette.onPrimary} />
              <Text style={[styles.startButtonText, { color: palette.onPrimary }]}>Iniciar jejum de {target}h</Text>
            </Pressable>
          </View>
        )}

        {/* History */}
        {history.length > 0 ? (
          <>
            <Text style={[styles.section, { color: palette.text }]}>Histórico</Text>
            {history.slice(0, 20).map((f) => (
              <View key={f.id} style={[styles.historyRow, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
                <Ionicons name="checkmark-circle" size={20} color={palette.text} />
                <Text style={[styles.historyDate, { color: palette.text }]}>
                  {new Date(f.started_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </Text>
                <Text style={[styles.historyDur, { color: palette.textMuted }]}>
                  {fastDurationLabel(f)} / {f.target_hours}h
                </Text>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  title: { flex: 1, fontSize: 18, fontWeight: '700' },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  streakText: { fontSize: 12, fontWeight: '600', },
  timerCard: { borderRadius: 16, padding: 20, alignItems: 'center' },
  timerLabel: { fontSize: 13 },
  timer: { fontSize: 44, fontWeight: '600', marginTop: 8, fontVariant: ['tabular-nums'] },
  progressTrack: { width: '100%', height: 8, borderRadius: 99, overflow: 'hidden', marginTop: 16 },
  progressFill: { height: '100%', borderRadius: 99 },
  goalNote: { fontSize: 13, marginTop: 8 },
  endButton: {
    marginTop: 16,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: '#F4212E',
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  endText: { color: '#F4212E', fontSize: 15, fontWeight: '500' },
  startCard: { borderRadius: 16, padding: 20 },
  startLabel: { fontSize: 15, fontWeight: '500', marginBottom: 12 },
  protocolRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  protocolChip: {
    flex: 1,
    minWidth: 64,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  protocolText: { fontSize: 15, fontWeight: '600' },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 99,
    paddingVertical: 14,
    marginTop: 16,
  },
  startButtonText: { fontSize: 15, fontWeight: '500' },
  section: { fontSize: 17, fontWeight: '500', marginTop: 24, marginBottom: 8 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  historyDate: { fontSize: 14, fontWeight: '500' },
  historyDur: { flex: 1, fontSize: 13, textAlign: 'right' },
});
