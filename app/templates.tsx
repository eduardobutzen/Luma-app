import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, neo } from '@/constants/theme';
import { useMealTemplates, type MealTemplate } from '@/hooks/useMealTemplates';
import { useScheme } from '@/hooks/useScheme';
import { mealTypeIcon } from '@/lib/mealType';
import { registerTemplate } from '@/lib/templates';

export default function TemplatesScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();

  const { templates, loading, refetch, remove } = useMealTemplates();
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  async function handleRegister(template: MealTemplate) {
    if (busyId) return;
    setBusyId(template.id);
    const ok = await registerTemplate(template.id);
    setBusyId(null);
    if (!ok) {
      Alert.alert('Erro', 'Não foi possível registrar a refeição.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Registrado!', `${template.name} foi adicionada ao seu dia.`);
  }

  function handleDelete(template: MealTemplate) {
    Alert.alert('Excluir refeição padrão', `Remover "${template.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => remove(template.id) },
    ]);
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>Refeições padrão</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          Salve pratos que você come com frequência e registre com um toque.
        </Text>

        {!loading && templates.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="bookmark-outline" size={40} color={palette.textMuted} />
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              Nenhuma refeição padrão ainda. Crie uma ao registrar uma refeição (botão
              "Salvar como refeição padrão").
            </Text>
          </View>
        ) : null}

        {templates.map((t) => (
          <View key={t.id} style={[styles.card, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
            <View style={[styles.iconWrap, { backgroundColor: palette.surface }]}>
              <Ionicons name={mealTypeIcon(t.type)} size={20} color={palette.primary} />
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
                {t.name}
              </Text>
              <Text style={[styles.macros, { color: palette.textMuted }]}>
                {t.kcal} kcal · P {t.protein} C {t.carbs} G {t.fat}
              </Text>
            </View>
            <Pressable
              style={styles.addButton}
              onPress={() => handleRegister(t)}
              disabled={busyId === t.id}>
              <Ionicons name="add-circle" size={28} color={palette.primary} />
            </Pressable>
            <Pressable onPress={() => handleDelete(t)} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={palette.danger} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  subtitle: { fontSize: 13, marginBottom: 12 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700' },
  macros: { fontSize: 12, marginTop: 2 },
  addButton: {},
});
