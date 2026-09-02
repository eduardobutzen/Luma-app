import { supabase } from '@/lib/supabase';

export interface TemplateItemInput {
  name: string;
  grams: number;
  protein: number;
  carbs: number;
  fat: number;
  kcal: number;
}

function sumItems(items: TemplateItemInput[]) {
  return items.reduce(
    (acc, i) => ({
      kcal: acc.kcal + i.kcal,
      protein: acc.protein + i.protein,
      carbs: acc.carbs + i.carbs,
      fat: acc.fat + i.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/** Saves a reusable meal template (name + type + ingredients). */
export async function saveMealTemplate(
  name: string,
  type: string,
  items: TemplateItemInput[],
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || items.length === 0) return false;

  const totals = sumItems(items);
  const { data: template, error } = await supabase
    .from('meal_templates')
    .insert({ user_id: user.id, name, type, ...totals })
    .select()
    .single();
  if (error || !template) return false;

  const { error: itemsError } = await supabase.from('meal_template_items').insert(
    items.map((i) => ({
      template_id: template.id,
      name: i.name,
      grams: i.grams,
      protein: i.protein,
      carbs: i.carbs,
      fat: i.fat,
      kcal: i.kcal,
    })),
  );
  return !itemsError;
}

/** Registers a template as a meal for today (copies its items). */
export async function registerTemplate(templateId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const [{ data: template }, { data: items }] = await Promise.all([
    supabase.from('meal_templates').select('*').eq('id', templateId).single(),
    supabase.from('meal_template_items').select('*').eq('template_id', templateId),
  ]);
  if (!template) return false;

  const { data: meal, error } = await supabase
    .from('meals')
    .insert({
      user_id: user.id,
      type: template.type,
      description: (items ?? []).map((i) => i.name).join(', '),
      image_url: null,
      kcal: template.kcal,
      protein: template.protein,
      carbs: template.carbs,
      fat: template.fat,
    })
    .select()
    .single();
  if (error || !meal) return false;

  if (items && items.length > 0) {
    await supabase.from('meal_items').insert(
      items.map((i) => ({
        meal_id: meal.id,
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
