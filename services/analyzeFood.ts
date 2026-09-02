// Análise de refeição por IA (GPT-4o Vision).
// SDK 54: readAsStringAsync/EncodingType vivem na API legacy do expo-file-system.
// ATENÇÃO: a chave em EXPO_PUBLIC_* fica exposta no bundle — ok para dev, mas em
// produção migrar esta chamada para uma Edge Function (chave no servidor).
import * as FileSystem from 'expo-file-system/legacy';

export interface DetectedItem {
  id: string;
  name: string;
  grams: number;
  protein: number;
  carbs: number;
  fat: number;
  kcal: number;
  icon: string;
}

export async function analyzeFood(uri: string): Promise<DetectedItem[]> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1000,
      // Força JSON válido (sem markdown/prosa) — evita falhas de parsing.
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a professional nutritionist and food recognition expert.
          Identify EVERY food item visible in the photo — including single, raw or
          unprepared items (e.g. a raw egg, a fruit, a slice of bread). Estimate the
          portion in grams from visual cues and compute the macronutrients.

          Always return at least one item if any food is visible. Only return an
          empty list if there is truly no food in the image.

          Return a JSON object exactly in this shape:
          { "items": [ { "name": string, "grams": number, "protein": number,
          "carbs": number, "fat": number, "kcal": number, "icon": string } ] }

          - name: food name in Portuguese
          - protein/carbs/fat: grams for the estimated portion
          - kcal: total calories for the portion
          - icon: one of fish-outline, nutrition-outline, leaf-outline,
            restaurant-outline, egg-outline, fast-food-outline, pizza-outline, cafe-outline`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'high' },
            },
            {
              type: 'text',
              text: 'Analyze this meal photo and return the nutritional breakdown as JSON.',
            },
          ],
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message ?? `Erro ${response.status} na análise da IA`);
  }

  const text: string = data.choices?.[0]?.message?.content ?? '';
  const items = parseItems(text);
  return items.map((item, i) => ({
    id: String(i + 1),
    name: String(item.name ?? 'Alimento'),
    grams: Number(item.grams) || 0,
    protein: Number(item.protein) || 0,
    carbs: Number(item.carbs) || 0,
    fat: Number(item.fat) || 0,
    kcal: Number(item.kcal) || 0,
    icon: String(item.icon ?? 'nutrition-outline'),
  }));
}

type RawItem = Record<string, unknown>;

/** Parsing tolerante: aceita {items:[...]}, array direto ou JSON dentro de texto. */
function parseItems(text: string): RawItem[] {
  const clean = text.replace(/```json|```/g, '').trim();
  const tryParse = (s: string): unknown => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  let parsed = tryParse(clean);
  if (parsed === null) {
    // Tenta extrair o primeiro objeto/array JSON embutido no texto.
    const match = clean.match(/[[{][\s\S]*[\]}]/);
    if (match) parsed = tryParse(match[0]);
  }
  if (!parsed) return [];

  if (Array.isArray(parsed)) return parsed as RawItem[];
  const obj = parsed as Record<string, unknown>;
  for (const key of ['items', 'foods', 'alimentos', 'result', 'data']) {
    if (Array.isArray(obj[key])) return obj[key] as RawItem[];
  }
  // Se veio um único objeto de alimento, embrulha em array.
  if (typeof obj.name === 'string') return [obj];
  return [];
}
