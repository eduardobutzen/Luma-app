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

import { colors } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { supabase } from '@/lib/supabase';
import { calcTargets, type Activity, type Goal, type Sex } from '@/lib/tdee';

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Feminino' },
];

const ACTIVITY_OPTIONS: { value: Activity; label: string }[] = [
  { value: 'sedentary', label: 'Sedentário' },
  { value: 'light', label: 'Leve' },
  { value: 'moderate', label: 'Moderado' },
  { value: 'active', label: 'Ativo' },
  { value: 'very_active', label: 'Muito ativo' },
];

const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: 'lose', label: 'Perder' },
  { value: 'maintain', label: 'Manter' },
  { value: 'gain', label: 'Ganhar' },
];

export default function OnboardingScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);

  const cleanUsername = username.trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  const usernameValid = cleanUsername.length >= 3;
  const weightNum = Number(weight);
  const heightNum = Number(height);
  const ageNum = Number(age);
  const valid =
    usernameValid &&
    weightNum > 0 &&
    heightNum > 0 &&
    ageNum > 0 &&
    sex !== null &&
    activity !== null &&
    goal !== null;

  async function handleFinish() {
    if (!valid || saving) return;
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const targets = calcTargets({
      weightKg: weightNum,
      heightCm: heightNum,
      age: ageNum,
      sex: sex!,
      activity: activity!,
      goal: goal!,
    });

    const { error } = await supabase
      .from('profiles')
      .update({
        username: cleanUsername,
        weight_kg: weightNum,
        height_cm: heightNum,
        age: ageNum,
        sex,
        activity_level: activity,
        goal,
        goal_kcal: targets.kcal,
        goal_protein: targets.protein,
        goal_carbs: targets.carbs,
        goal_fat: targets.fat,
        onboarded: true,
      })
      .eq('id', user.id);

    setSaving(false);
    if (error) {
      if (error.code === '23505') {
        Alert.alert('Nome de usuário em uso', 'Esse @username já foi escolhido. Tente outro.');
      } else {
        Alert.alert('Erro', error.message);
      }
      return;
    }
    router.replace('/(tabs)');
  }

  const inputStyle = [
    styles.input,
    { backgroundColor: palette.card, borderColor: palette.border, color: palette.text },
  ];

  function chipRow<T extends string>(
    options: { value: T; label: string }[],
    selected: T | null,
    onSelect: (v: T) => void,
  ) {
    return (
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const active = selected === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onSelect(opt.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? palette.primary : palette.card,
                  borderColor: active ? palette.primary : palette.border,
                },
              ]}>
              <Text
                style={[
                  styles.chipText,
                  { color: active ? palette.onPrimary : palette.text },
                ]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: palette.text }]}>
            Vamos calcular suas metas
          </Text>
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>
            Usamos seus dados para estimar suas calorias e macros diários.
          </Text>

          <Text style={[styles.label, { color: palette.textMuted }]}>Nome de usuário</Text>
          <TextInput
            style={inputStyle}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Ex: eduardo_fit"
            placeholderTextColor={palette.textMuted}
          />
          <Text style={[styles.helper, { color: palette.textMuted }]}>
            É por ele que seus amigos vão te encontrar. Mín. 3 caracteres (letras, números e _).
          </Text>

          <Text style={[styles.label, { color: palette.textMuted }]}>Peso (kg)</Text>
          <TextInput
            style={inputStyle}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            placeholder="Ex: 70"
            placeholderTextColor={palette.textMuted}
          />

          <Text style={[styles.label, { color: palette.textMuted }]}>Altura (cm)</Text>
          <TextInput
            style={inputStyle}
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
            placeholder="Ex: 175"
            placeholderTextColor={palette.textMuted}
          />

          <Text style={[styles.label, { color: palette.textMuted }]}>Idade</Text>
          <TextInput
            style={inputStyle}
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            placeholder="Ex: 28"
            placeholderTextColor={palette.textMuted}
          />

          <Text style={[styles.label, { color: palette.textMuted }]}>Sexo</Text>
          {chipRow(SEX_OPTIONS, sex, setSex)}

          <Text style={[styles.label, { color: palette.textMuted }]}>
            Nível de atividade
          </Text>
          {chipRow(ACTIVITY_OPTIONS, activity, setActivity)}

          <Text style={[styles.label, { color: palette.textMuted }]}>Objetivo</Text>
          {chipRow(GOAL_OPTIONS, goal, setGoal)}

          <Pressable
            style={[styles.finishButton, { backgroundColor: palette.primary }, !valid && styles.finishButtonDisabled]}
            onPress={handleFinish}
            disabled={!valid || saving}>
            {saving ? (
              <ActivityIndicator color={palette.onPrimary} />
            ) : (
              <Text style={[styles.finishText, { color: palette.onPrimary }]}>Calcular e começar</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    marginTop: 16,
    marginBottom: 6,
  },
  helper: {
    fontSize: 11,
    marginTop: 6,
  },
  input: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 0.5,
    fontSize: 15,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 0.5,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  finishButton: {
    borderRadius: 99,
    paddingVertical: 14,
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishButtonDisabled: {
    opacity: 0.5,
  },
  finishText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
