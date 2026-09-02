import { currentUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export interface RecipeIngredient {
  id?: string;
  name: string;
  grams: number;
  protein: number;
  carbs: number;
  fat: number;
  kcal: number;
}

export interface MyRecipe {
  id: string;
  title: string;
  image_url: string | null;
  servings: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  visibility: 'private' | 'public';
  created_at: string;
}

export interface CommunityRecipe {
  id: string;
  title: string;
  image_url: string | null;
  servings: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  author_id: string;
  author_name: string;
  author_username: string | null;
  author_avatar: string | null;
  /** Receita curada pela equipe (perfil oficial), destacada no Descobrir. */
  curated: boolean;
  created_at: string;
}

export interface RecipeDetailFull {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  servings: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  steps: string[];
  visibility: 'private' | 'public';
  created_at: string;
  author_name: string;
  author_username: string | null;
  author_avatar: string | null;
  is_mine: boolean;
}

export interface RecipeInput {
  title: string;
  description: string;
  image_url: string | null;
  servings: number;
  steps: string[];
  visibility: 'private' | 'public';
  ingredients: RecipeIngredient[];
}

export async function listMyRecipes(): Promise<MyRecipe[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data } = await supabase
    .from('recipes')
    .select('id, title, image_url, servings, kcal, protein, carbs, fat, visibility, created_at')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  return (data ?? []) as MyRecipe[];
}

/**
 * Catálogo do "Descobrir": receitas curadas pela equipe + públicas da
 * comunidade, curadas primeiro. A busca acontece no servidor — a RPC limita o
 * retorno, então filtrar no cliente só enxergaria as primeiras linhas.
 */
export async function listDiscoverRecipesResult(
  q: string,
): Promise<{ items: CommunityRecipe[]; error: string | null }> {
  const { data, error } = await supabase.rpc('discover_recipes', { q });
  if (error) return { items: [], error: error.message };
  return { items: (data ?? []) as CommunityRecipe[], error: null };
}

export async function listDiscoverRecipes(q: string): Promise<CommunityRecipe[]> {
  const { items } = await listDiscoverRecipesResult(q);
  return items;
}

export async function getRecipeFull(rid: string): Promise<RecipeDetailFull | null> {
  const { data, error } = await supabase.rpc('recipe_with_author', { rid });
  if (error || !data || data.length === 0) return null;
  return data[0] as RecipeDetailFull;
}

export async function getRecipeIngredients(rid: string): Promise<RecipeIngredient[]> {
  const { data } = await supabase
    .from('recipe_ingredients')
    .select('id, name, grams, protein, carbs, fat, kcal')
    .eq('recipe_id', rid);
  return (data ?? []) as RecipeIngredient[];
}

function perServing(ingredients: RecipeIngredient[], servings: number) {
  const s = Math.max(servings, 1);
  const sum = ingredients.reduce(
    (acc, i) => ({
      kcal: acc.kcal + i.kcal,
      protein: acc.protein + i.protein,
      carbs: acc.carbs + i.carbs,
      fat: acc.fat + i.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return {
    kcal: Math.round(sum.kcal / s),
    protein: Math.round(sum.protein / s),
    carbs: Math.round(sum.carbs / s),
    fat: Math.round(sum.fat / s),
  };
}

/** Cria a receita + ingredientes. Macros gravados por porção. */
export async function createRecipe(input: RecipeInput): Promise<string | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const macros = perServing(input.ingredients, input.servings);
  const { data: recipe, error } = await supabase
    .from('recipes')
    .insert({
      user_id: uid,
      title: input.title,
      description: input.description || null,
      image_url: input.image_url,
      servings: input.servings,
      steps: input.steps,
      visibility: input.visibility,
      ...macros,
    })
    .select('id')
    .single();
  if (error || !recipe) return null;

  if (input.ingredients.length > 0) {
    await supabase.from('recipe_ingredients').insert(
      input.ingredients.map((i) => ({
        recipe_id: recipe.id,
        name: i.name,
        grams: i.grams,
        protein: i.protein,
        carbs: i.carbs,
        fat: i.fat,
        kcal: i.kcal,
      })),
    );
  }
  return recipe.id as string;
}

/** Atualiza a receita: regrava macros, passos e ingredientes (substitui). */
export async function updateRecipe(rid: string, input: RecipeInput): Promise<boolean> {
  const macros = perServing(input.ingredients, input.servings);
  const { error } = await supabase
    .from('recipes')
    .update({
      title: input.title,
      description: input.description || null,
      image_url: input.image_url,
      servings: input.servings,
      steps: input.steps,
      visibility: input.visibility,
      ...macros,
    })
    .eq('id', rid);
  if (error) return false;

  await supabase.from('recipe_ingredients').delete().eq('recipe_id', rid);
  if (input.ingredients.length > 0) {
    await supabase.from('recipe_ingredients').insert(
      input.ingredients.map((i) => ({
        recipe_id: rid,
        name: i.name,
        grams: i.grams,
        protein: i.protein,
        carbs: i.carbs,
        fat: i.fat,
        kcal: i.kcal,
      })),
    );
  }
  return true;
}

export async function deleteRecipe(rid: string): Promise<boolean> {
  const { error } = await supabase.from('recipes').delete().eq('id', rid);
  return !error;
}

/** Registra a receita como refeição de hoje (macros por porção). */
export async function registerUserRecipeAsMeal(
  recipe: { title: string; image_url: string | null; kcal: number; protein: number; carbs: number; fat: number },
  type: string,
): Promise<boolean> {
  const uid = await currentUserId();
  if (!uid) return false;
  const { data: meal, error } = await supabase
    .from('meals')
    .insert({
      user_id: uid,
      type,
      description: recipe.title,
      image_url: recipe.image_url,
      kcal: recipe.kcal,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
    })
    .select('id')
    .single();
  if (error || !meal) return false;
  await supabase.from('meal_items').insert({
    meal_id: meal.id,
    name: recipe.title,
    grams: 0,
    protein: recipe.protein,
    carbs: recipe.carbs,
    fat: recipe.fat,
    kcal: recipe.kcal,
  });
  return true;
}
