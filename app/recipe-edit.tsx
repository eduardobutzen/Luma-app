import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { currentUserId } from '@/lib/session';
import { uploadPhoto } from '@/lib/storage';
import {
  createRecipe,
  getRecipeFull,
  getRecipeIngredients,
  updateRecipe,
  type RecipeIngredient,
} from '@/lib/userRecipes';

const num = (v: string) => Number(v.replace(',', '.')) || 0;

export default function RecipeEditScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState('1');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const load = useCallback(async () => {
    if (!id || loadedOnce) return;
    const r = await getRecipeFull(id);
    if (r) {
      setTitle(r.title);
      setDescription(r.description ?? '');
      setServings(String(r.servings));
      setImageUri(r.image_url);
      setVisibility(r.visibility);
      setSteps(r.steps ?? []);
      setIngredients(await getRecipeIngredients(id));
    }
    setLoading(false);
    setLoadedOnce(true);
  }, [id, loadedOnce]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function pickPhoto() {
    Alert.alert('Foto da receita', 'De onde você quer a foto?', [
      {
        text: 'Câmera',
        onPress: async () => {
          const p = await ImagePicker.requestCameraPermissionsAsync();
          if (!p.granted) return;
          const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
          if (!r.canceled) setImageUri(r.assets[0].uri);
        },
      },
      {
        text: 'Galeria',
        onPress: async () => {
          const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!p.granted) return;
          const r = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
          if (!r.canceled) setImageUri(r.assets[0].uri);
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, { name: '', grams: 0, protein: 0, carbs: 0, fat: 0, kcal: 0 }]);
  }
  function updateIngredient(i: number, patch: Partial<RecipeIngredient>) {
    setIngredients((prev) => prev.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing)));
  }
  function removeIngredient(i: number) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addStep() {
    setSteps((prev) => [...prev, '']);
  }
  function updateStep(i: number, v: string) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? v : s)));
  }
  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }

  const totals = ingredients.reduce(
    (acc, i) => ({
      kcal: acc.kcal + i.kcal,
      protein: acc.protein + i.protein,
      carbs: acc.carbs + i.carbs,
      fat: acc.fat + i.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const sv = Math.max(num(servings), 1);
  const perKcal = Math.round(totals.kcal / sv);

  async function handleSave() {
    if (saving) return;
    if (title.trim().length < 2) {
      Alert.alert('Título', 'Dê um nome à receita.');
      return;
    }
    setSaving(true);

    let finalImage = imageUri;
    // Faz upload se a imagem é um arquivo local (não uma URL http já salva).
    if (imageUri && !imageUri.startsWith('http')) {
      const uid = await currentUserId();
      if (uid) {
        const ext = (imageUri.split('.').pop() ?? 'jpg').toLowerCase();
        const url = await uploadPhoto(imageUri, `${uid}/recipes/${Date.now()}.${ext}`);
        if (url) finalImage = url;
      }
    }

    const input = {
      title: title.trim(),
      description: description.trim(),
      image_url: finalImage,
      servings: Math.round(sv),
      steps: steps.map((s) => s.trim()).filter(Boolean),
      visibility,
      ingredients: ingredients.filter((i) => i.name.trim()),
    };

    const ok = editing ? await updateRecipe(id!, input) : !!(await createRecipe(input));
    setSaving(false);
    if (!ok) {
      Alert.alert('Erro', 'Não foi possível salvar a receita.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  const inputStyle = [styles.input, { backgroundColor: palette.card, color: palette.text }];

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>
          {editing ? 'Editar receita' : 'Nova receita'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Photo */}
          <Pressable style={styles.photoWrap} onPress={pickPhoto}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.photo} />
            ) : (
              <View style={[styles.photoEmpty, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <Ionicons name="camera-outline" size={28} color={palette.textMuted} />
                <Text style={{ color: palette.textMuted, marginTop: 6 }}>Adicionar foto</Text>
              </View>
            )}
          </Pressable>

          <TextInput style={inputStyle} value={title} onChangeText={setTitle} placeholder="Nome da receita" placeholderTextColor={palette.textMuted} />
          <TextInput
            style={[inputStyle, styles.multiline, { marginTop: 10 }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Descrição (opcional)"
            placeholderTextColor={palette.textMuted}
            multiline
          />

          <View style={styles.rowBetween}>
            <Text style={[styles.label, { color: palette.text }]}>Porções</Text>
            <TextInput
              style={[inputStyle, styles.servingsInput]}
              value={servings}
              onChangeText={setServings}
              keyboardType="numeric"
              textAlign="center"
            />
          </View>

          {/* Visibility */}
          <View style={[styles.visToggle, { backgroundColor: palette.card }]}>
            {(['private', 'public'] as const).map((v) => {
              const active = visibility === v;
              return (
                <Pressable
                  key={v}
                  style={[styles.visOption, active && { backgroundColor: palette.primary }]}
                  onPress={() => setVisibility(v)}>
                  <Ionicons
                    name={v === 'public' ? 'earth' : 'lock-closed'}
                    size={15}
                    color={active ? palette.onPrimary : palette.textMuted}
                  />
                  <Text style={[styles.visOptText, { color: active ? palette.onPrimary : palette.textMuted }]}>
                    {v === 'public' ? 'Pública (comunidade)' : 'Privada'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Ingredients */}
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Ingredientes</Text>
            <Text style={[styles.totalsText, { color: palette.textMuted }]}>
              {totals.kcal} kcal total · {perKcal}/porção
            </Text>
          </View>
          {ingredients.map((ing, i) => (
            <View key={i} style={[styles.ingCard, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
              <View style={styles.ingTop}>
                <TextInput
                  style={[styles.ingName, { color: palette.text }]}
                  value={ing.name}
                  onChangeText={(v) => updateIngredient(i, { name: v })}
                  placeholder="Ingrediente"
                  placeholderTextColor={palette.textMuted}
                />
                <Pressable onPress={() => removeIngredient(i)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </Pressable>
              </View>
              <View style={styles.ingGrid}>
                {([
                  ['g', 'grams'],
                  ['kcal', 'kcal'],
                  ['P', 'protein'],
                  ['C', 'carbs'],
                  ['G', 'fat'],
                ] as const).map(([lbl, key]) => (
                  <View key={key} style={styles.miniField}>
                    <Text style={[styles.miniLabel, { color: palette.textMuted }]}>{lbl}</Text>
                    <TextInput
                      style={[styles.miniInput, { backgroundColor: palette.surface, color: palette.text }]}
                      value={String(ing[key] || '')}
                      onChangeText={(v) => updateIngredient(i, { [key]: Math.round(num(v)) } as Partial<RecipeIngredient>)}
                      keyboardType="numeric"
                      textAlign="center"
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}
          <Pressable style={[styles.addRow, { borderColor: palette.border }]} onPress={addIngredient}>
            <Ionicons name="add" size={18} color={palette.primary} />
            <Text style={[styles.addRowText, { color: palette.primary }]}>Adicionar ingrediente</Text>
          </Pressable>

          {/* Steps */}
          <Text style={[styles.sectionTitle, { color: palette.text, marginTop: 24 }]}>Modo de preparo</Text>
          {steps.map((s, i) => (
            <View key={i} style={[styles.stepRow, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
              <Text style={[styles.stepNum, { color: palette.primary }]}>{i + 1}</Text>
              <TextInput
                style={[styles.stepInput, { color: palette.text }]}
                value={s}
                onChangeText={(v) => updateStep(i, v)}
                placeholder={`Passo ${i + 1}`}
                placeholderTextColor={palette.textMuted}
                multiline
              />
              <Pressable onPress={() => removeStep(i)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </Pressable>
            </View>
          ))}
          <Pressable style={[styles.addRow, { borderColor: palette.border }]} onPress={addStep}>
            <Ionicons name="add" size={18} color={palette.primary} />
            <Text style={[styles.addRowText, { color: palette.primary }]}>Adicionar passo</Text>
          </Pressable>

          <Pressable style={[styles.saveButton, { backgroundColor: palette.primary }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={palette.onPrimary} /> : <Text style={[styles.saveText, { color: palette.onPrimary }]}>Salvar receita</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 18, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },
  photoWrap: { marginBottom: 14 },
  photo: { width: '100%', height: 180, borderRadius: 16 },
  photoEmpty: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: { borderRadius: 12, padding: 14, fontSize: 15 },
  multiline: { minHeight: 60, textAlignVertical: 'top' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  label: { fontSize: 15, fontWeight: '500' },
  servingsInput: { width: 80 },
  visToggle: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4, marginTop: 14 },
  visOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9,
  },
  visOptText: { fontSize: 13, fontWeight: '600' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  totalsText: { fontSize: 12 },
  ingCard: { borderRadius: 12, padding: 12, marginBottom: 8 },
  ingTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ingName: { flex: 1, fontSize: 15, fontWeight: '500' },
  ingGrid: { flexDirection: 'row', gap: 6, marginTop: 10 },
  miniField: { flex: 1, alignItems: 'center' },
  miniLabel: { fontSize: 11, marginBottom: 4 },
  miniInput: { width: '100%', borderRadius: 8, paddingVertical: 7, fontSize: 13 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  addRowText: { fontSize: 14, fontWeight: '600' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, padding: 12, marginBottom: 8 },
  stepNum: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  stepInput: { flex: 1, fontSize: 15, minHeight: 24 },
  saveButton: {
    borderRadius: 99,
    paddingVertical: 15,
    marginTop: 28,
    alignItems: 'center',
  },
  saveText: { fontSize: 16, fontWeight: '600' },
});
