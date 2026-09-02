import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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

import { colors, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { useMeal, type MealItemRow } from '@/hooks/useMeal';
import { searchLocalFoods } from '@/lib/brazilianFoods';
import { shareMeal } from '@/lib/feed';
import { searchFoods, type FoodResult } from '@/lib/foodSearch';
import { supabase } from '@/lib/supabase';

interface EditItem {
  id: string;
  name: string;
  grams: number;
  pPerG: number;
  cPerG: number;
  fPerG: number;
  kPerG: number;
}

function toEditItem(row: MealItemRow): EditItem {
  const g = row.grams > 0 ? row.grams : 1;
  return {
    id: row.id,
    name: row.name,
    grams: row.grams,
    pPerG: row.protein / g,
    cPerG: row.carbs / g,
    fPerG: row.fat / g,
    kPerG: row.kcal / g,
  };
}

function macrosOf(item: EditItem) {
  return {
    protein: Math.round(item.pPerG * item.grams),
    carbs: Math.round(item.cPerG * item.grams),
    fat: Math.round(item.fPerG * item.grams),
    kcal: Math.round(item.kPerG * item.grams),
  };
}

export default function MealDetailScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { meal, items, loading } = useMeal(id);

  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [originalIds, setOriginalIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FoodResult[]>([]);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);

  const searchSeq = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const searchY = useRef(0);

  useEffect(() => {
    setEditItems(items.map(toEditItem));
    setOriginalIds(items.map((i) => i.id));
  }, [items]);

  const replaceTarget = editItems.find((i) => i.id === replaceTargetId) ?? null;

  const doSearch = useCallback(async (term: string) => {
    const q = term.trim();
    const seq = ++searchSeq.current;
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    const local = searchLocalFoods(q);
    setResults(local);
    setSearching(true);
    const off = await searchFoods(q);
    if (seq !== searchSeq.current) return;
    const localNames = new Set(local.map((l) => l.name.toLowerCase()));
    setResults([...local, ...off.filter((o) => !localNames.has(o.name.toLowerCase()))]);
    setSearching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 350);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  function scrollToSearch() {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(searchY.current - 80, 0), animated: true });
    }, 250);
  }

  function startReplace(item: EditItem) {
    setReplaceTargetId(item.id);
    setSearchOpen(true);
    setQuery(item.name);
    setResults([]);
    scrollToSearch();
  }

  function addFood(food: FoodResult) {
    setEditItems((prev) => {
      if (replaceTargetId) {
        return prev.map((it) =>
          it.id === replaceTargetId
            ? {
                ...it,
                name: food.name,
                pPerG: food.protein100 / 100,
                cPerG: food.carbs100 / 100,
                fPerG: food.fat100 / 100,
                kPerG: food.kcal100 / 100,
              }
            : it,
        );
      }
      return [
        ...prev,
        {
          id: `new-${food.id}-${Date.now()}`,
          name: food.name,
          grams: 100,
          pPerG: food.protein100 / 100,
          cPerG: food.carbs100 / 100,
          fPerG: food.fat100 / 100,
          kPerG: food.kcal100 / 100,
        },
      ];
    });
    setReplaceTargetId(null);
    setQuery('');
    setResults([]);
  }

  const totals = editItems.reduce(
    (acc, i) => {
      const m = macrosOf(i);
      return {
        kcal: acc.kcal + m.kcal,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
      };
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  function updateGrams(itemId: string, text: string) {
    const grams = Number(text.replace(/[^0-9]/g, '')) || 0;
    setEditItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, grams } : i)),
    );
  }

  function removeItem(itemId: string) {
    setEditItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  async function handleSave() {
    if (saving) return;
    if (editItems.length === 0) {
      Alert.alert('Erro', 'A refeição precisa de ao menos um ingrediente (ou exclua a refeição).');
      return;
    }
    setSaving(true);

    // Existing items → update with recomputed macros; new items → insert.
    for (const item of editItems) {
      const m = macrosOf(item);
      if (originalIds.includes(item.id)) {
        await supabase
          .from('meal_items')
          .update({ grams: item.grams, ...m })
          .eq('id', item.id);
      } else {
        await supabase
          .from('meal_items')
          .insert({ meal_id: id, name: item.name, grams: item.grams, ...m });
      }
    }

    // Delete items removed locally.
    const removed = originalIds.filter((oid) => !editItems.some((i) => i.id === oid));
    if (removed.length > 0) {
      await supabase.from('meal_items').delete().in('id', removed);
    }

    // Recompute the parent meal totals.
    const { error } = await supabase
      .from('meals')
      .update({
        kcal: totals.kcal,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
      })
      .eq('id', id);

    setSaving(false);
    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Salvo!');
    router.back();
  }

  async function handleRepeat() {
    if (saving || !meal) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    const { data: newMeal, error } = await supabase
      .from('meals')
      .insert({
        user_id: user.id,
        type: meal.type,
        description: meal.description,
        image_url: meal.image_url,
        kcal: totals.kcal,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
      })
      .select()
      .single();
    if (error) {
      setSaving(false);
      Alert.alert('Erro', error.message);
      return;
    }
    await supabase.from('meal_items').insert(
      editItems.map((it) => ({
        meal_id: newMeal.id,
        name: it.name,
        grams: it.grams,
        ...macrosOf(it),
      })),
    );
    setSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Refeição repetida!', 'Adicionada ao seu dia de hoje.');
    router.back();
  }

  async function shareToFeed() {
    if (!meal) return;
    const ok = await shareMeal({
      id: id!,
      description: meal.description,
      type: meal.type,
      kcal: totals.kcal,
      image_url: meal.image_url,
    });
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Compartilhado!', 'Sua refeição apareceu no feed dos amigos.');
    } else {
      Alert.alert('Erro', 'Não foi possível compartilhar.');
    }
  }

  function handleShare() {
    if (!meal) return;
    Alert.alert('Compartilhar refeição', 'Para onde?', [
      { text: 'Feed dos amigos', onPress: shareToFeed },
      {
        text: 'Enviar para conversa',
        onPress: () =>
          router.push(
            `/share-to-chat?kind=meal&refId=${id}` +
              `&title=${encodeURIComponent(meal.description ?? meal.type)}` +
              `&image=${encodeURIComponent(meal.image_url ?? '')}` +
              `&kcal=${totals.kcal}`,
          ),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  function handleDelete() {
    Alert.alert('Excluir refeição', 'Tem certeza? Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('meals').delete().eq('id', id);
          if (error) {
            Alert.alert('Erro', error.message);
            return;
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, styles.center, { backgroundColor: palette.background }]}
        edges={['top', 'left', 'right']}>
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    );
  }

  if (!meal) {
    return (
      <SafeAreaView
        style={[styles.container, styles.center, { backgroundColor: palette.background }]}
        edges={['top', 'left', 'right']}>
        <Text style={{ color: palette.textMuted }}>Refeição não encontrada.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: palette.primary }}>Voltar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
            {meal.type}
          </Text>
          <View style={styles.headerActions}>
            <Pressable onPress={handleShare} hitSlop={8}>
              <Ionicons name="share-social-outline" size={21} color={palette.text} />
            </Pressable>
            <Pressable onPress={handleDelete} hitSlop={8}>
              <Ionicons name="trash-outline" size={22} color={palette.danger} />
            </Pressable>
          </View>
        </View>

        {/* Photo */}
        {meal.image_url ? (
          <Image source={{ uri: meal.image_url }} style={styles.photo} resizeMode="cover" />
        ) : null}

        {/* Totals */}
        <View style={[styles.summaryCard, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
          <Text style={[styles.summaryKcal, { color: palette.text }]}>
            {totals.kcal} kcal
          </Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryMacro, { color: palette.textMuted }]}>
              P {totals.protein}g
            </Text>
            <Text style={[styles.summaryMacro, { color: palette.textMuted }]}>
              C {totals.carbs}g
            </Text>
            <Text style={[styles.summaryMacro, { color: palette.textMuted }]}>
              G {totals.fat}g
            </Text>
          </View>
        </View>

        {/* Ingredients */}
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Ingredientes</Text>
        <View style={[styles.listCard, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
          {editItems.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                index < editItems.length - 1 && {
                  borderBottomWidth: 0.5,
                  borderBottomColor: palette.border,
                },
              ]}>
              <Pressable
                style={[styles.itemInfo, replaceTargetId === item.id && { opacity: 0.5 }]}
                onPress={() => startReplace(item)}>
                <View style={styles.itemNameRow}>
                  <Text style={[styles.itemName, { color: palette.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Ionicons name="swap-horizontal" size={14} color={palette.textMuted} />
                </View>
                <Text style={[styles.itemMacros, { color: palette.textMuted }]}>
                  {macrosOf(item).kcal} kcal
                </Text>
              </Pressable>
              <View style={styles.gramsWrap}>
                <TextInput
                  style={[
                    styles.gramsInput,
                    { backgroundColor: palette.surface, color: palette.text },
                  ]}
                  value={String(item.grams)}
                  onChangeText={(t) => updateGrams(item.id, t)}
                  keyboardType="numeric"
                  textAlign="center"
                />
                <Text style={[styles.gramsUnit, { color: palette.textMuted }]}>g</Text>
              </View>
              <Pressable onPress={() => removeItem(item.id)} hitSlop={8} style={styles.removeButton}>
                <Ionicons name="trash-outline" size={20} color={palette.danger} />
              </Pressable>
            </View>
          ))}
          {editItems.length === 0 ? (
            <Text style={[styles.emptyItems, { color: palette.textMuted }]}>
              Nenhum ingrediente.
            </Text>
          ) : null}
        </View>

        {/* Food search (replace / add) */}
        <View
          style={styles.searchBlock}
          onLayout={(e) => {
            searchY.current = e.nativeEvent.layout.y;
          }}>
          {searchOpen ? (
            <>
              {replaceTarget ? (
                <View style={[styles.replaceBanner, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
                  <Ionicons name="swap-horizontal" size={14} color={palette.primary} />
                  <Text style={[styles.replaceText, { color: palette.text }]} numberOfLines={1}>
                    Trocando: {replaceTarget.name}
                  </Text>
                  <Pressable onPress={() => setReplaceTargetId(null)} hitSlop={8}>
                    <Ionicons name="close" size={16} color={palette.textMuted} />
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.searchRow}>
                <TextInput
                  style={[
                    styles.searchInput,
                    { backgroundColor: palette.card, borderColor: palette.border, color: palette.text },
                  ]}
                  value={query}
                  onChangeText={setQuery}
                  onFocus={scrollToSearch}
                  placeholder="Buscar alimento..."
                  placeholderTextColor={palette.textMuted}
                  onSubmitEditing={() => doSearch(query)}
                  returnKeyType="search"
                  autoCapitalize="none"
                />
                <Pressable style={[styles.searchButton, { backgroundColor: palette.primary }]} onPress={() => doSearch(query)}>
                  {searching ? (
                    <ActivityIndicator color={palette.onPrimary} />
                  ) : (
                    <Ionicons name="search" size={18} color={palette.onPrimary} />
                  )}
                </Pressable>
              </View>

              {results.map((food) => (
                <Pressable
                  key={food.id}
                  style={[styles.resultRow, { borderBottomColor: palette.border }]}
                  onPress={() => addFood(food)}>
                  <View style={styles.resultInfo}>
                    <Text style={[styles.resultName, { color: palette.text }]} numberOfLines={1}>
                      {food.name}
                    </Text>
                    <Text style={[styles.resultMacros, { color: palette.textMuted }]}>
                      {food.kcal100} kcal · P {food.protein100} C {food.carbs100} G {food.fat100} /100g
                    </Text>
                  </View>
                  <Ionicons
                    name={replaceTarget ? 'swap-horizontal' : 'add-circle'}
                    size={22}
                    color={palette.text}
                  />
                </Pressable>
              ))}

              {!searching && query.trim() && results.length === 0 ? (
                <Text style={[styles.emptyItems, { color: palette.textMuted }]}>
                  Nenhum resultado.
                </Text>
              ) : null}
            </>
          ) : (
            <Pressable
              style={[styles.addSearchButton, { borderColor: palette.primary }]}
              onPress={() => setSearchOpen(true)}>
              <Ionicons name="add" size={16} color={palette.primary} />
              <Text style={[styles.addSearchText, { color: palette.primary }]}>
                Adicionar alimento
              </Text>
            </Pressable>
          )}
        </View>

        {/* Repeat */}
        <Pressable
          style={[styles.repeatButton, { borderColor: palette.primary }]}
          onPress={handleRepeat}
          disabled={saving}>
          <Ionicons name="repeat" size={18} color={palette.primary} />
          <Text style={[styles.repeatText, { color: palette.primary }]}>
            Repetir hoje
          </Text>
        </Pressable>

        {/* Save */}
        <Pressable
          style={[styles.saveButton, { backgroundColor: palette.primary }, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color={palette.onPrimary} />
          ) : (
            <Text style={[styles.saveText, { color: palette.onPrimary }]}>Salvar alterações</Text>
          )}
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginTop: 12,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  summaryKcal: {
    fontSize: 24,
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  summaryMacro: {
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 8,
  },
  listCard: {
    borderRadius: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemInfo: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  itemMacros: {
    fontSize: 12,
    marginTop: 2,
  },
  gramsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gramsInput: {
    width: 56,
    borderRadius: 8,
    paddingVertical: 6,
    fontSize: 14,
  },
  gramsUnit: {
    fontSize: 13,
  },
  removeButton: {
    marginLeft: 2,
  },
  emptyItems: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  repeatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 99,
    borderWidth: 1.5,
    paddingVertical: 14,
    marginTop: 24,
  },
  repeatText: {
    fontSize: 15,
    fontWeight: '500',
  },
  saveButton: {
    borderRadius: 99,
    paddingVertical: 14,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '500',
  },
  searchBlock: {
    marginTop: 12,
  },
  replaceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  replaceText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 0.5,
    fontSize: 15,
  },
  searchButton: {
    width: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultMacros: {
    fontSize: 12,
    marginTop: 2,
  },
  addSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 99,
    borderWidth: 1.5,
    paddingVertical: 12,
  },
  addSearchText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
