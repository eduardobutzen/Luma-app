import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LineChart } from '@/components';
import { colors, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { useWeightLogs } from '@/hooks/useWeightLogs';
import { supabase } from '@/lib/supabase';
import { calcTargets } from '@/lib/tdee';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function WeightScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();

  const { logs, latest, refetch } = useWeightLogs();
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleLog() {
    const value = Number(weight.replace(',', '.'));
    if (!(value > 0) || saving) return;
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('weight_logs')
      .insert({ user_id: user.id, weight_kg: value });
    if (error) {
      setSaving(false);
      Alert.alert('Erro', error.message);
      return;
    }

    // Update current weight and, if the profile has the TDEE inputs, recalc goals.
    const { data: p } = await supabase
      .from('profiles')
      .select('age, height_cm, sex, activity_level, goal')
      .eq('id', user.id)
      .single();

    const updates: Record<string, number> = { weight_kg: value };
    if (p?.age && p?.height_cm && p?.sex && p?.activity_level && p?.goal) {
      const t = calcTargets({
        weightKg: value,
        heightCm: p.height_cm,
        age: p.age,
        sex: p.sex,
        activity: p.activity_level,
        goal: p.goal,
      });
      updates.goal_kcal = t.kcal;
      updates.goal_protein = t.protein;
      updates.goal_carbs = t.carbs;
      updates.goal_fat = t.fat;
    }
    await supabase.from('profiles').update(updates).eq('id', user.id);

    setSaving(false);
    setWeight('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    refetch();
  }

  const values = logs.map((l) => l.weight_kg);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="arrow-back" size={24} color={palette.text} />
            </Pressable>
            <Text style={[styles.title, { color: palette.text }]}>Peso</Text>
          </View>

          {/* Current + input */}
          <View style={[styles.card, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
            <Text style={[styles.currentLabel, { color: palette.textMuted }]}>
              Peso atual
            </Text>
            <Text style={[styles.currentValue, { color: palette.text }]}>
              {latest !== null ? `${latest} kg` : '—'}
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
                ]}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder="Novo peso (kg)"
                placeholderTextColor={palette.textMuted}
              />
              <Pressable
                style={[styles.logButton, { backgroundColor: palette.primary }, saving && styles.logButtonDisabled]}
                onPress={handleLog}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={palette.onPrimary} />
                ) : (
                  <Text style={[styles.logText, { color: palette.onPrimary }]}>Registrar</Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* Trend chart */}
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Tendência</Text>
          <View style={[styles.card, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
            {values.length >= 2 ? (
              <LineChart values={values} color={palette.primary} />
            ) : (
              <Text style={[styles.hint, { color: palette.textMuted }]}>
                Registre ao menos 2 pesos para ver a tendência.
              </Text>
            )}
          </View>

          {/* History */}
          {logs.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Histórico</Text>
              <View style={[styles.card, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
                {[...logs].reverse().map((log, index, arr) => (
                  <View
                    key={log.id}
                    style={[
                      styles.logRow,
                      index < arr.length - 1 && {
                        borderBottomWidth: 0.5,
                        borderBottomColor: palette.border,
                      },
                    ]}>
                    <Text style={[styles.logDate, { color: palette.textMuted }]}>
                      {fmtDate(log.logged_at)}
                    </Text>
                    <Text style={[styles.logWeight, { color: palette.text }]}>
                      {log.weight_kg} kg
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '700' },
  card: { borderRadius: 16, padding: 16, marginTop: 12 },
  currentLabel: { fontSize: 12 },
  currentValue: { fontSize: 28, fontWeight: '500', marginTop: 2 },
  inputRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  input: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 0.5,
    fontSize: 15,
  },
  logButton: {
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonDisabled: { opacity: 0.6 },
  logText: { fontSize: 15, fontWeight: '500' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginTop: 24 },
  hint: { fontSize: 13 },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  logDate: { fontSize: 14 },
  logWeight: { fontSize: 14, fontWeight: '500' },
});
