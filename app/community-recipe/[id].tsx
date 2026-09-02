import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, macroPalette, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { MEAL_TYPES } from '@/lib/mealType';
import {
  deleteRecipe,
  getRecipeFull,
  getRecipeIngredients,
  registerUserRecipeAsMeal,
  type RecipeDetailFull,
  type RecipeIngredient,
} from '@/lib/userRecipes';

export default function CommunityRecipeScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const macroInk = macroPalette[scheme];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [recipe, setRecipe] = useState<RecipeDetailFull | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [r, ing] = await Promise.all([getRecipeFull(id), getRecipeIngredients(id)]);
    setRecipe(r);
    setIngredients(ing);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function handleRegister() {
    if (!recipe) return;
    Alert.alert('Registrar como refeição', 'Em qual refeição?', [
      ...MEAL_TYPES.map((m) => ({
        text: m.value,
        onPress: async () => {
          setRegistering(true);
          const ok = await registerUserRecipeAsMeal(
            {
              title: recipe.title,
              image_url: recipe.image_url,
              kcal: recipe.kcal,
              protein: recipe.protein,
              carbs: recipe.carbs,
              fat: recipe.fat,
            },
            m.value,
          );
          setRegistering(false);
          if (ok) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Pronto!', 'Receita registrada nas suas refeições de hoje.');
          } else {
            Alert.alert('Erro', 'Não foi possível registrar.');
          }
        },
      })),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  }

  function handleSendToChat() {
    if (!recipe) return;
    router.push(
      `/share-to-chat?kind=recipe&refId=${recipe.id}` +
        `&title=${encodeURIComponent(recipe.title)}` +
        `&image=${encodeURIComponent(recipe.image_url ?? '')}` +
        `&kcal=${recipe.kcal}`,
    );
  }

  function handleDelete() {
    if (!id) return;
    Alert.alert('Excluir receita', 'Esta receita será removida permanentemente.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteRecipe(id);
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.headerFloat}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backCircle}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
        <View style={[styles.center, { flex: 1 }]}>
          <Text style={{ color: palette.textMuted }}>Receita indisponível.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const macros = [
    { label: 'Proteína', value: recipe.protein, color: macroInk.protein },
    { label: 'Carbo', value: recipe.carbs, color: macroInk.carbs },
    { label: 'Gordura', value: recipe.fat, color: macroInk.fat },
  ];

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View>
          {recipe.image_url ? (
            <Image source={{ uri: recipe.image_url }} style={styles.hero} />
          ) : (
            <View style={[styles.hero, styles.heroEmpty, { backgroundColor: palette.trackBg }]}>
              <Ionicons name="restaurant-outline" size={48} color={palette.primary} />
            </View>
          )}
          <SafeAreaView style={styles.headerFloat} edges={['top']}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backCircle}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </Pressable>
            <View style={styles.headerActions}>
              <Pressable onPress={handleSendToChat} hitSlop={8} style={styles.backCircle}>
                <Ionicons name="paper-plane-outline" size={19} color="#FFFFFF" />
              </Pressable>
              {recipe.is_mine ? (
                <>
                  <Pressable onPress={() => router.push(`/recipe-edit?id=${recipe.id}`)} hitSlop={8} style={styles.backCircle}>
                    <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                  </Pressable>
                  <Pressable onPress={handleDelete} hitSlop={8} style={styles.backCircle}>
                    <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                  </Pressable>
                </>
              ) : null}
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          <Text style={[styles.recipeTitle, { color: palette.text }]}>{recipe.title}</Text>

          <Pressable
            style={styles.authorRow}
            disabled={recipe.is_mine}
            onPress={() => router.push(`/user/${recipe.user_id}`)}>
            {recipe.author_avatar ? (
              <Image source={{ uri: recipe.author_avatar }} style={styles.authorAvatar} />
            ) : (
              <View style={[styles.authorAvatar, styles.authorFallback, { backgroundColor: palette.primary }]}>
                <Text style={[styles.authorInitial, { color: palette.onPrimary }]}>{recipe.author_name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={[styles.authorName, { color: palette.textMuted }]}>
              {recipe.is_mine ? 'Sua receita' : `por ${recipe.author_name}`}
            </Text>
            {!recipe.is_mine ? <Ionicons name="chevron-forward" size={14} color={palette.textMuted} /> : null}
          </Pressable>

          {recipe.description ? (
            <Text style={[styles.description, { color: palette.text }]}>{recipe.description}</Text>
          ) : null}

          {/* Nutrition per serving */}
          <View style={[styles.nutriCard, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
            <View style={styles.nutriHead}>
              <Text style={[styles.kcalBig, { color: palette.text }]}>{recipe.kcal}</Text>
              <Text style={[styles.kcalUnit, { color: palette.textMuted }]}>kcal por porção</Text>
              <Text style={[styles.servings, { color: palette.textMuted }]}>{recipe.servings} porções</Text>
            </View>
            <View style={styles.macroRow}>
              {macros.map((m) => (
                <View key={m.label} style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: m.color }]}>{m.value}g</Text>
                  <Text style={[styles.macroLabel, { color: palette.textMuted }]}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {ingredients.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Ingredientes</Text>
              {ingredients.map((ing, i) => (
                <View key={ing.id ?? i} style={styles.ingRow}>
                  <View style={[styles.dot, { backgroundColor: palette.primary }]} />
                  <Text style={[styles.ingText, { color: palette.text }]}>
                    {ing.name}
                    {ing.grams ? ` · ${ing.grams}g` : ''}
                  </Text>
                </View>
              ))}
            </>
          ) : null}

          {recipe.steps.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Modo de preparo</Text>
              {recipe.steps.map((s, i) => (
                <View key={i} style={styles.stepRow}>
                  <Text style={[styles.stepNum, { color: palette.primary }]}>{i + 1}</Text>
                  <Text style={[styles.stepText, { color: palette.text }]}>{s}</Text>
                </View>
              ))}
            </>
          ) : null}
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={[styles.footer, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
        <Pressable style={[styles.registerBtn, { backgroundColor: palette.primary }]} onPress={handleRegister} disabled={registering}>
          {registering ? (
            <ActivityIndicator color={palette.onPrimary} />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={20} color={palette.onPrimary} />
              <Text style={[styles.registerText, { color: palette.onPrimary }]}>Registrar como refeição</Text>
            </>
          )}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 24 },
  hero: { width: '100%', height: 240 },
  heroEmpty: { alignItems: 'center', justifyContent: 'center' },
  headerFloat: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  backCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 16 },
  recipeTitle: { fontSize: 24, fontWeight: '700' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  authorAvatar: { width: 28, height: 28, borderRadius: 14 },
  authorFallback: { alignItems: 'center', justifyContent: 'center' },
  authorInitial: { fontSize: 13, fontWeight: '700' },
  authorName: { fontSize: 14 },
  description: { fontSize: 15, lineHeight: 21, marginTop: 14 },
  nutriCard: { borderRadius: 16, padding: 16, marginTop: 18 },
  nutriHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  kcalBig: { fontSize: 30, fontWeight: '800' },
  kcalUnit: { fontSize: 13 },
  servings: { fontSize: 13, marginLeft: 'auto' },
  macroRow: { flexDirection: 'row', marginTop: 16 },
  macroItem: { flex: 1, alignItems: 'center' },
  macroValue: { fontSize: 17, fontWeight: '700' },
  macroLabel: { fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  ingText: { fontSize: 15, flex: 1 },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  stepNum: { fontSize: 16, fontWeight: '700' },
  stepText: { fontSize: 15, lineHeight: 21, flex: 1 },
  footer: { borderTopWidth: 0.5, paddingHorizontal: 16, paddingTop: 10 },
  registerBtn: {
    borderRadius: 99,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  registerText: { fontSize: 16, fontWeight: '600' },
});
