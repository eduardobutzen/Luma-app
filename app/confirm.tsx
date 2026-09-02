import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, macroPalette, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { searchLocalFoods } from '@/lib/brazilianFoods';
import { shareMeal } from '@/lib/feed';
import { getFoodByBarcode, searchFoods, type FoodResult } from '@/lib/foodSearch';
import { saveMealTemplate } from '@/lib/templates';
import { MEAL_TYPES, suggestMealType, type MealType } from '@/lib/mealType';
import { supabase } from '@/lib/supabase';
import { uploadPhoto } from '@/lib/storage';
import { analyzeFood, type DetectedItem } from '@/services/analyzeFood';

const ICON_NAMES = new Set<string>([
  'fish-outline', 'nutrition-outline', 'leaf-outline', 'restaurant-outline',
  'egg-outline', 'fast-food-outline', 'pizza-outline', 'cafe-outline',
]);

/** Converte um item absoluto da IA no formato de densidade por-100g do editor. */
function toIngredient(d: DetectedItem): Ingredient {
  const grams = d.grams > 0 ? d.grams : 100;
  const per100 = (v: number) => Math.round((v / grams) * 100);
  return {
    id: d.id,
    name: d.name,
    grams,
    icon: (ICON_NAMES.has(d.icon) ? d.icon : 'nutrition-outline') as IconName,
    protein100: per100(d.protein),
    carbs100: per100(d.carbs),
    fat100: per100(d.fat),
    kcal100: per100(d.kcal),
  };
}

const AVATAR = require('@/assets/icon.png');

type IconName = keyof typeof Ionicons.glyphMap;

interface SavedTemplate {
  id: string;
  name: string;
  type: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Ingredient {
  id: string;
  name: string;
  grams: number;
  icon: IconName;
  // Macro densities per 100g — the per-serving values are derived from grams.
  protein100: number;
  carbs100: number;
  fat100: number;
  kcal100: number;
}

/** Macros for an ingredient's current grams, derived from its per-100g density. */
function macrosFor(item: Ingredient) {
  const factor = item.grams / 100;
  return {
    protein: Math.round(item.protein100 * factor),
    carbs: Math.round(item.carbs100 * factor),
    fat: Math.round(item.fat100 * factor),
    kcal: Math.round(item.kcal100 * factor),
  };
}

export default function ConfirmScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const macros = macroPalette[scheme];
  const router = useRouter();
  const { uri, scan, barcode } = useLocalSearchParams<{ uri: string; scan: string; barcode: string }>();
  // No photo param → manual entry mode (reached from "Adicionar manualmente").
  const isManual = !uri;

  const [items, setItems] = useState<Ingredient[]>([]);
  const [editing, setEditing] = useState(isManual);
  // Status só importa no fluxo da câmera (IA). No manual já entra como sucesso.
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    uri ? 'loading' : 'success',
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  // Foto da refeição (da câmera no fluxo IA, ou adicionada manualmente).
  const [photoUri, setPhotoUri] = useState<string | null>(uri ?? null);
  // Compartilhar a refeição no feed dos amigos ao salvar.
  const [shareToFeed, setShareToFeed] = useState(false);

  function pickPhoto() {
    Alert.alert('Adicionar foto', 'De onde você quer a foto?', [
      {
        text: 'Câmera',
        onPress: async () => {
          const p = await ImagePicker.requestCameraPermissionsAsync();
          if (!p.granted) return;
          const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
          if (!r.canceled) setPhotoUri(r.assets[0].uri);
        },
      },
      {
        text: 'Galeria',
        onPress: async () => {
          const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!p.granted) return;
          const r = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
          if (!r.canceled) setPhotoUri(r.assets[0].uri);
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  // Animação dos skeletons enquanto a IA analisa.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Roda a análise da IA ao montar (e ao tentar novamente).
  useEffect(() => {
    if (!uri) return;
    setStatus('loading');
    setErrorMsg(null);
    analyzeFood(uri)
      .then((detected) => {
        if (detected.length === 0) {
          setErrorMsg('Nenhum alimento reconhecido na foto.');
          setStatus('error');
          return;
        }
        setItems(detected.map(toIngredient));
        setStatus('success');
      })
      .catch((e) => {
        setErrorMsg(e instanceof Error ? e.message : 'Falha na análise.');
        setStatus('error');
      });
  }, [uri, retry]);
  const [saving, setSaving] = useState(false);
  const [mealType, setMealType] = useState<MealType>(suggestMealType());

  const [searchOpen, setSearchOpen] = useState(isManual);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FoodResult[]>([]);
  // When set, picking a search result REPLACES this item instead of adding one.
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);

  const replaceTarget = items.find((i) => i.id === replaceTargetId) ?? null;

  const searchSeq = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const searchY = useRef(0);

  const [scanOpen, setScanOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<FoodResult | null>(null);
  const [scanGrams, setScanGrams] = useState('100');
  const scannedRef = useRef(false);

  // Refeições salvas (templates) para adicionar no registro manual.
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedList, setSavedList] = useState<SavedTemplate[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  async function openSaved() {
    setSavedOpen(true);
    setSavedLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSavedLoading(false);
      return;
    }
    const { data } = await supabase
      .from('meal_templates')
      .select('id, name, type, kcal, protein, carbs, fat')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSavedList((data ?? []) as SavedTemplate[]);
    setSavedLoading(false);
  }

  async function addSaved(t: SavedTemplate) {
    setSavedOpen(false);
    const { data } = await supabase
      .from('meal_template_items')
      .select('name, grams, protein, carbs, fat, kcal')
      .eq('template_id', t.id);
    const rows = data ?? [];
    const newItems: Ingredient[] =
      rows.length > 0
        ? rows.map((r, i) => {
            const g = r.grams > 0 ? r.grams : 100;
            return {
              id: `saved-${t.id}-${i}-${Date.now()}`,
              name: r.name,
              grams: g,
              icon: 'nutrition-outline' as IconName,
              protein100: (r.protein / g) * 100,
              carbs100: (r.carbs / g) * 100,
              fat100: (r.fat / g) * 100,
              kcal100: (r.kcal / g) * 100,
            };
          })
        : [
            // Template sem itens: adiciona como um item único com os totais.
            {
              id: `saved-${t.id}-${Date.now()}`,
              name: t.name,
              grams: 100,
              icon: 'nutrition-outline' as IconName,
              protein100: t.protein,
              carbs100: t.carbs,
              fat100: t.fat,
              kcal100: t.kcal,
            },
          ];
    setItems((prev) => [...prev, ...newItems]);
    Haptics.selectionAsync();
  }
  const [permission, requestPermission] = useCameraPermissions();

  async function openScanner() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Permissão necessária', 'Permita o acesso à câmera para escanear.');
        return;
      }
    }
    scannedRef.current = false;
    setScanOpen(true);
  }

  // Abre o scanner direto quando chega via atalho "Escanear" (?scan=1).
  const scanAuto = useRef(false);
  useEffect(() => {
    if (scan === '1' && !scanAuto.current) {
      scanAuto.current = true;
      openScanner();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scan]);

  // Código de barras já lido na tela de câmera (?barcode=...): busca e confirma.
  const barcodeAuto = useRef(false);
  useEffect(() => {
    if (barcode && !barcodeAuto.current) {
      barcodeAuto.current = true;
      handleBarcode(barcode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcode]);

  async function handleBarcode(code: string) {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScanLoading(true);
    const food = await getFoodByBarcode(code);
    setScanLoading(false);
    setScanOpen(false);
    if (!food) {
      Alert.alert('Produto não encontrado', 'Tente buscar pelo nome.');
      return;
    }
    // Abre a confirmação com a porção real detectada (gramas editáveis).
    setScanGrams(String(food.servingQty ?? 100));
    setScanResult(food);
    Haptics.selectionAsync();
  }

  function confirmScanned() {
    if (!scanResult) return;
    const grams = Math.max(1, Math.round(Number(scanGrams.replace(',', '.')) || scanResult.servingQty || 100));
    addFood(scanResult, grams);
    setScanResult(null);
  }

  function scrollToSearch() {
    // Wait for the keyboard animation, then bring the search panel up.
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(searchY.current - 80, 0), animated: true });
    }, 250);
  }

  // Local Brazilian foods show instantly; Open Food Facts results merge in after.
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
    if (seq !== searchSeq.current) return; // a newer search superseded this one
    const localNames = new Set(local.map((l) => l.name.toLowerCase()));
    setResults([...local, ...off.filter((o) => !localNames.has(o.name.toLowerCase()))]);
    setSearching(false);
  }, []);

  // Debounced live search as the user types.
  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 350);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  function startReplace(item: Ingredient) {
    setReplaceTargetId(item.id);
    setSearchOpen(true);
    setQuery(item.name);
    setResults([]);
    scrollToSearch();
  }

  function addFood(food: FoodResult, grams = 100) {
    setItems((prev) => {
      // Replace mode: swap the targeted item but keep its current grams.
      if (replaceTargetId) {
        return prev.map((item) =>
          item.id === replaceTargetId
            ? {
                ...item,
                name: food.name,
                icon: 'nutrition-outline',
                protein100: food.protein100,
                carbs100: food.carbs100,
                fat100: food.fat100,
                kcal100: food.kcal100,
              }
            : item,
        );
      }
      return [
        ...prev,
        {
          id: `${food.id}-${Date.now()}`,
          name: food.name,
          grams,
          icon: 'nutrition-outline',
          protein100: food.protein100,
          carbs100: food.carbs100,
          fat100: food.fat100,
          kcal100: food.kcal100,
        },
      ];
    });
    setReplaceTargetId(null);
    setQuery('');
    setResults([]);
  }

  const totals = items.reduce(
    (acc, i) => {
      const m = macrosFor(i);
      return {
        kcal: acc.kcal + m.kcal,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
      };
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const summary = [
    { label: 'Proteína', value: `${totals.protein}g` },
    { label: 'Carbos', value: `${totals.carbs}g` },
    { label: 'Gordura', value: `${totals.fat}g` },
  ];

  function updateGrams(id: string, text: string) {
    const grams = Number(text.replace(/[^0-9]/g, '')) || 0;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, grams } : item)),
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleSaveTemplate() {
    if (items.length === 0) {
      Alert.alert('Erro', 'Adicione ao menos um ingrediente.');
      return;
    }
    const name = items.map((i) => i.name).join(', ');
    const ok = await saveMealTemplate(
      name,
      mealType,
      items.map((it) => ({ name: it.name, grams: it.grams, ...macrosFor(it) })),
    );
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Salvo!', 'Adicionada às suas refeições padrão.');
    } else {
      Alert.alert('Erro', 'Não foi possível salvar a refeição padrão.');
    }
  }

  async function handleConfirm() {
    if (saving) return;
    if (items.length === 0) {
      Alert.alert('Erro', 'Adicione ao menos um ingrediente.');
      return;
    }
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado');
      setSaving(false);
      return;
    }

    // Upload the photo to Storage so it persists across devices; fall back to
    // the local URI if the upload fails.
    let imageUrl = photoUri ?? null;
    if (photoUri) {
      const ext = photoUri.split('.').pop() ?? 'jpg';
      const uploaded = await uploadPhoto(photoUri, `${user.id}/${Date.now()}.${ext}`);
      if (uploaded) imageUrl = uploaded;
    }

    const { data: meal, error } = await supabase
      .from('meals')
      .insert({
        user_id: user.id,
        type: mealType,
        description: items.map((i) => i.name).join(', '),
        image_url: imageUrl,
        kcal: totals.kcal,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
      })
      .select()
      .single();

    if (error) {
      Alert.alert('Erro', error.message);
      setSaving(false);
      return;
    }

    const { error: itemsError } = await supabase.from('meal_items').insert(
      items.map((item) => ({
        meal_id: meal.id,
        name: item.name,
        grams: item.grams,
        ...macrosFor(item),
      })),
    );

    if (itemsError) {
      Alert.alert('Erro', itemsError.message);
      setSaving(false);
      return;
    }

    if (shareToFeed) {
      await shareMeal({
        id: meal.id,
        description: meal.description,
        type: mealType,
        kcal: totals.kcal,
        image_url: imageUrl,
      });
    }

    setSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      '✅ Refeição registrada!',
      `${totals.kcal} kcal adicionadas ao seu dia.`,
    );
    router.back();
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
          <Image source={AVATAR} style={styles.avatar} />
          <Text style={[styles.brand, { color: palette.text }]}>Luma</Text>
          <Ionicons name="flame-outline" size={22} color={palette.text} />
        </View>

        {/* Subtitle */}
        <View style={styles.subtitleBlock}>
          <Text style={[styles.title, { color: palette.text }]}>
            {isManual ? 'Adicionar Refeição' : 'Análise da Refeição'}
          </Text>
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>
            {isManual
              ? 'Busque e adicione os alimentos da sua refeição.'
              : 'Confirme os itens detectados pela nossa IA.'}
          </Text>
        </View>

        {/* Meal type selector */}
        <View style={styles.typeRow}>
          {MEAL_TYPES.map((t) => {
            const active = mealType === t.value;
            return (
              <Pressable
                key={t.value}
                onPress={() => setMealType(t.value)}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: active ? palette.primary : palette.card,
                    borderColor: active ? palette.primary : palette.border,
                  },
                ]}>
                <Ionicons
                  name={t.icon}
                  size={14}
                  color={active ? palette.onPrimary : palette.textMuted}
                />
                <Text
                  style={[styles.typeChipText, { color: active ? palette.onPrimary : palette.text }]}>
                  {t.value}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Photo */}
        <View style={styles.photoWrap}>
          {photoUri ? (
            <>
              <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
              {uri ? (
                <View style={styles.aiBadge}>
                  <Ionicons name="sparkles" size={13} color={palette.onPrimary} />
                  <Text style={styles.aiBadgeText}>IA Detectada</Text>
                </View>
              ) : null}
              <Pressable style={styles.photoChange} onPress={pickPhoto}>
                <Ionicons name="camera-reverse-outline" size={15} color={palette.onPrimary} />
                <Text style={styles.photoChangeText}>Trocar</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={[styles.photoPlaceholder, { borderColor: palette.border, backgroundColor: palette.card }]}
              onPress={pickPhoto}>
              <Ionicons name="camera-outline" size={28} color={palette.textMuted} />
              <Text style={[styles.photoPlaceholderText, { color: palette.textMuted }]}>
                Adicionar foto
              </Text>
            </Pressable>
          )}
        </View>

        {/* Ingredient list / AI status */}
        {status === 'loading' ? (
          <>
            <View style={[styles.listCard, styles.skeletonCard, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
              {[0, 1, 2].map((i) => (
                <Animated.View
                  key={i}
                  style={[styles.skeleton, { backgroundColor: palette.border, opacity: pulseAnim }]}
                />
              ))}
            </View>
            <Text style={[styles.analyzing, { color: palette.textMuted }]}>
              Analisando sua refeição com IA...
            </Text>
          </>
        ) : status === 'error' ? (
          <View style={[styles.listCard, styles.errorCard, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
            <Ionicons name="alert-circle-outline" size={36} color={palette.text} />
            <Text style={[styles.errorText, { color: palette.textMuted }]}>
              Não foi possível identificar os alimentos.
            </Text>
            {errorMsg ? (
              <Text style={[styles.errorDetail, { color: palette.textMuted }]} numberOfLines={3}>
                {errorMsg}
              </Text>
            ) : null}
            <Pressable
              style={[styles.retryButton, { borderColor: palette.primary }]}
              onPress={() => setRetry((r) => r + 1)}>
              <Text style={[styles.retryText, { color: palette.primary }]}>Tentar novamente</Text>
            </Pressable>
            <Pressable
              style={styles.manualFallback}
              onPress={() => {
                setStatus('success');
                setEditing(true);
                setSearchOpen(true);
              }}>
              <Text style={[styles.manualFallbackText, { color: palette.primary }]}>
                Adicionar manualmente
              </Text>
            </Pressable>
          </View>
        ) : (
        <View style={[styles.listCard, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
          {items.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                index < items.length - 1 && {
                  borderBottomWidth: 0.5,
                  borderBottomColor: palette.border,
                },
              ]}>
              <Ionicons name={item.icon} size={22} color={palette.text} />
              {editing ? (
                <Pressable
                  onPress={() => startReplace(item)}
                  style={[
                    styles.itemNameWrap,
                    replaceTargetId === item.id && { opacity: 0.5 },
                  ]}>
                  <Text style={[styles.itemName, { color: palette.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Ionicons name="swap-horizontal" size={14} color={palette.textMuted} />
                </Pressable>
              ) : (
                <Text style={[styles.itemName, { color: palette.text }]}>
                  {item.name}
                </Text>
              )}
              <View style={styles.gramsWrap}>
                <TextInput
                  style={[
                    styles.gramsInput,
                    { backgroundColor: palette.surface, color: palette.text },
                  ]}
                  value={String(item.grams)}
                  onChangeText={(text) => updateGrams(item.id, text)}
                  keyboardType="numeric"
                  textAlign="center"
                />
                <Text style={[styles.gramsUnit, { color: palette.textMuted }]}>g</Text>
              </View>
              {editing ? (
                <Pressable onPress={() => removeItem(item.id)} hitSlop={8} style={styles.removeButton}>
                  <Ionicons name="trash-outline" size={20} color="#DC2626" />
                </Pressable>
              ) : null}
            </View>
          ))}
          {items.length === 0 ? (
            <Text style={[styles.emptyItems, { color: palette.textMuted }]}>
              Nenhum ingrediente.
            </Text>
          ) : null}
        </View>
        )}

        {/* Manual food search (edit mode) */}
        {editing ? (
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
                    placeholder="Buscar alimento..."
                    placeholderTextColor={palette.textMuted}
                    onSubmitEditing={() => doSearch(query)}
                    onFocus={scrollToSearch}
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
                  <Pressable
                    style={[styles.scanButton, { borderColor: palette.border }]}
                    onPress={openScanner}>
                    <Ionicons name="barcode-outline" size={20} color={palette.primary} />
                  </Pressable>
                  <Pressable
                    style={[styles.scanButton, { borderColor: palette.border }]}
                    onPress={openSaved}>
                    <Ionicons name="bookmark-outline" size={19} color={palette.primary} />
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
              <View style={styles.addRowButtons}>
                <Pressable
                  style={[styles.addSearchButton, { borderColor: palette.primary, flex: 1 }]}
                  onPress={() => setSearchOpen(true)}>
                  <Ionicons name="search" size={16} color={palette.primary} />
                  <Text style={[styles.addSearchText, { color: palette.primary }]}>
                    Buscar alimento
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.addSearchButton, { borderColor: palette.primary, flex: 1 }]}
                  onPress={openSaved}>
                  <Ionicons name="bookmark-outline" size={16} color={palette.primary} />
                  <Text style={[styles.addSearchText, { color: palette.primary }]}>Salvos</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : null}

        {/* Nutrition summary */}
        <View style={[styles.summaryCard, { backgroundColor: palette.primary }]}>
          <View style={styles.summaryTop}>
            <Text style={[styles.summaryLabel, { color: palette.onPrimary }]}>RESUMO NUTRICIONAL</Text>
            <Text style={[styles.summaryKcal, { color: palette.onPrimary }]}>{totals.kcal} Kcal</Text>
          </View>
          <View style={styles.summaryRow}>
            {summary.map((macro) => (
              <View key={macro.label} style={styles.summaryCol}>
                <Text style={[styles.summaryValue, { color: palette.onPrimary }]}>{macro.value}</Text>
                <Text style={styles.summaryMacroLabel}>{macro.label}</Text>
                <View style={styles.summaryBar} />
              </View>
            ))}
          </View>
        </View>

        {/* Share to feed */}
        <Pressable style={styles.shareToggle} onPress={() => setShareToFeed((v) => !v)}>
          <Ionicons
            name={shareToFeed ? 'checkbox' : 'square-outline'}
            size={20}
            color={shareToFeed ? palette.primary : palette.textMuted}
          />
          <Text style={[styles.shareToggleText, { color: palette.text }]}>
            Compartilhar no feed dos amigos
          </Text>
        </Pressable>

        {/* Action buttons */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.confirmButton, { backgroundColor: palette.primary }, saving && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={saving}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}>
            {saving ? (
              <ActivityIndicator color={palette.onPrimary} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={palette.onPrimary} />
                <Text style={[styles.confirmText, { color: palette.onPrimary }]}>Confirmar</Text>
              </>
            )}
          </Pressable>
          <Pressable
            style={[styles.editButton, { borderColor: palette.border }]}
            onPress={() => setEditing((prev) => !prev)}>
            <Text style={[styles.editText, { color: palette.text }]}>{editing ? 'Concluir' : 'Editar'}</Text>
          </Pressable>
          <Pressable style={styles.templateButton} onPress={handleSaveTemplate}>
            <Ionicons name="bookmark-outline" size={16} color={palette.primary} />
            <Text style={[styles.templateText, { color: palette.primary }]}>
              Salvar como refeição padrão
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={scanOpen} animationType="slide" onRequestClose={() => setScanOpen(false)}>
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
            }}
            onBarcodeScanned={({ data }) => handleBarcode(data)}
          />
          <SafeAreaView style={styles.scannerOverlay} edges={['top', 'bottom']}>
            <View style={styles.scannerHeader}>
              <Pressable onPress={() => setScanOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={28} color={palette.onPrimary} />
              </Pressable>
              <Text style={styles.scannerTitle}>Escanear código</Text>
              <View style={{ width: 28 }} />
            </View>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerHint}>
              {scanLoading ? 'Buscando produto...' : 'Aponte para o código de barras'}
            </Text>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Refeições salvas (adicionar ao registro manual) */}
      <Modal
        visible={savedOpen}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => setSavedOpen(false)}>
        <Pressable style={styles.scanBackdrop} onPress={() => setSavedOpen(false)}>
          <Pressable style={[styles.scanSheet, { backgroundColor: palette.card }]} onPress={() => {}}>
            <View style={styles.scanHandle} />
            <Text style={[styles.scanName, { color: palette.text }]}>Refeições salvas</Text>
            {savedLoading ? (
              <ActivityIndicator color={palette.primary} style={{ marginVertical: 24 }} />
            ) : savedList.length === 0 ? (
              <Text style={[styles.savedEmpty, { color: palette.textMuted }]}>
                Você ainda não salvou refeições. Ao confirmar uma refeição, toque em
                {' “Salvar como refeição padrão”.'}
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 380, marginTop: 12 }} showsVerticalScrollIndicator={false}>
                {savedList.map((t) => (
                  <Pressable
                    key={t.id}
                    style={[styles.savedRow, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
                    onPress={() => addSaved(t)}>
                    <View style={[styles.savedIcon, { backgroundColor: palette.trackBg }]}>
                      <Ionicons name="bookmark" size={17} color={palette.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.savedName, { color: palette.text }]} numberOfLines={1}>
                        {t.name}
                      </Text>
                      <Text style={[styles.savedSub, { color: palette.textMuted }]}>
                        {t.type} · {t.kcal} kcal · P {t.protein} C {t.carbs} G {t.fat}
                      </Text>
                    </View>
                    <Ionicons name="add-circle" size={24} color={palette.primary} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Confirmação do produto escaneado (porção real + gramas editáveis) */}
      <Modal
        visible={scanResult !== null}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => setScanResult(null)}>
        <KeyboardAvoidingView
          style={styles.scanBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              // 1º toque fora fecha o teclado; 2º fecha a folha.
              if (Keyboard.isVisible()) Keyboard.dismiss();
              else setScanResult(null);
            }}
          />
          <View style={[styles.scanSheet, { backgroundColor: palette.card }]}>
            <View style={styles.scanHandle} />
            {scanResult
              ? (() => {
                  const g = Math.max(0, Number(scanGrams.replace(',', '.')) || 0);
                  const f = g / 100;
                  return (
                    <>
                      <Text style={[styles.scanName, { color: palette.text }]} numberOfLines={2}>
                        {scanResult.name}
                      </Text>
                      <Text style={[styles.scanPortion, { color: palette.textMuted }]}>
                        Porção detectada: {scanResult.servingSize}
                      </Text>

                      <View style={styles.scanQtyRow}>
                        <Text style={[styles.scanQtyLabel, { color: palette.text }]}>Quantidade</Text>
                        <View style={styles.scanQtyInputWrap}>
                          <TextInput
                            style={[styles.scanQtyInput, { backgroundColor: palette.card, color: palette.text }]}
                            value={scanGrams}
                            onChangeText={setScanGrams}
                            keyboardType="numeric"
                            textAlign="center"
                          />
                          <Text style={[styles.scanQtyUnit, { color: palette.textMuted }]}>g</Text>
                        </View>
                      </View>

                      <View style={[styles.scanMacroCard, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
                        <Text style={[styles.scanKcal, { color: palette.text }]}>
                          {Math.round(scanResult.kcal100 * f)} kcal
                        </Text>
                        <View style={styles.scanMacroRow}>
                          <Text style={[styles.scanMacro, { color: macros.protein }]}>
                            P {Math.round(scanResult.protein100 * f)}g
                          </Text>
                          <Text style={[styles.scanMacro, { color: macros.carbs }]}>
                            C {Math.round(scanResult.carbs100 * f)}g
                          </Text>
                          <Text style={[styles.scanMacro, { color: macros.fat }]}>
                            G {Math.round(scanResult.fat100 * f)}g
                          </Text>
                        </View>
                        <Text style={[styles.scan100, { color: palette.textMuted }]}>
                          por 100g: {scanResult.kcal100} kcal · P {scanResult.protein100} · C{' '}
                          {scanResult.carbs100} · G {scanResult.fat100}
                        </Text>
                      </View>

                      <View style={styles.scanBtns}>
                        <Pressable
                          style={[styles.scanCancel, { borderColor: palette.border }]}
                          onPress={() => setScanResult(null)}>
                          <Text style={{ color: palette.text, fontWeight: '600' }}>Cancelar</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.scanAdd, { backgroundColor: palette.primary }]}
                          onPress={confirmScanned}>
                          <Text style={{ color: palette.onPrimary, fontWeight: '700' }}>Adicionar</Text>
                        </Pressable>
                      </View>
                    </>
                  );
                })()
              : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scanBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  scanSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  scanHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#9993', marginBottom: 14 },
  scanName: { fontSize: 18, fontWeight: '700' },
  scanPortion: { fontSize: 13, marginTop: 4 },
  scanQtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  scanQtyLabel: { fontSize: 15, fontWeight: '500' },
  scanQtyInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scanQtyInput: { width: 90, borderRadius: 10, paddingVertical: 10, fontSize: 16, fontWeight: '600' },
  scanQtyUnit: { fontSize: 15 },
  scanMacroCard: { borderRadius: 14, padding: 16, marginTop: 16, alignItems: 'center', gap: 8 },
  scanKcal: { fontSize: 26, fontWeight: '800' },
  scanMacroRow: { flexDirection: 'row', gap: 18 },
  scanMacro: { fontSize: 15, fontWeight: '700' },
  scan100: { fontSize: 12, marginTop: 4 },
  scanBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  scanCancel: { flex: 1, borderWidth: 1, borderRadius: 99, paddingVertical: 14, alignItems: 'center' },
  scanAdd: { flex: 2, borderRadius: 99, paddingVertical: 14, alignItems: 'center' },
  addRowButtons: { flexDirection: 'row', gap: 8 },
  savedEmpty: { fontSize: 14, lineHeight: 20, marginTop: 16, marginBottom: 8 },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  savedIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedName: { fontSize: 15, fontWeight: '600' },
  savedSub: { fontSize: 12, marginTop: 2 },
  container: {
    flex: 1,
  },
  scroll: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  brand: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitleBlock: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  photoWrap: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  photo: {
    width: '100%',
    height: 220,
    borderRadius: 16,
  },
  aiBadge: {
    position: 'absolute',
    // RN absolute insets are relative to the parent's padding box, so this is
    // measured from the photo's edge (photoWrap padding already applied).
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  photoChange: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  photoChangeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  photoPlaceholder: {
    height: 120,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoPlaceholderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    marginTop: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemNameWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
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
    marginLeft: 4,
  },
  emptyItems: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  skeletonCard: {
    padding: 12,
  },
  skeleton: {
    height: 52,
    borderRadius: 8,
    marginBottom: 8,
  },
  analyzing: {
    fontSize: 13,
    textAlign: 'center',
    marginHorizontal: 16,
    marginTop: 12,
  },
  errorCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  errorDetail: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    opacity: 0.8,
  },
  manualFallback: {
    marginTop: 12,
    paddingVertical: 6,
  },
  manualFallbackText: {
    fontSize: 13,
    fontWeight: '500',
  },
  retryButton: {
    marginTop: 16,
    borderRadius: 99,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchBlock: {
    marginHorizontal: 16,
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
  scanButton: {
    width: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scannerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  scannerFrame: {
    width: 260,
    height: 160,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 16,
  },
  scannerHint: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 32,
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
  summaryCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
  },
  summaryKcal: {
    fontSize: 20,
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  summaryCol: {
    flex: 1,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  summaryMacroLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  summaryBar: {
    height: 3,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginTop: 6,
  },
  shareToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 18,
  },
  shareToggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 14,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 99,
    paddingVertical: 14,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '500',
  },
  editButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 99,
    borderWidth: 1.5,
    paddingVertical: 14,
  },
  editText: {
    fontSize: 15,
    fontWeight: '500',
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  templateText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
