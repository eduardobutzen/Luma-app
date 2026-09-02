/** Manual food lookup backed by the public Open Food Facts API. */

export interface FoodResult {
  id: string;
  name: string;
  protein100: number;
  carbs100: number;
  fat100: number;
  kcal100: number;
  // Porção real do produto — preenchido apenas pelo scan de código de barras.
  servingSize?: string; // ex.: "350 ml", "1 fatia (30 g)"
  servingQty?: number; // g/ml de uma porção
  protein?: number; // macros da porção real
  carbs?: number;
  fat?: number;
  kcal?: number;
}

/** Looks up a single product by barcode (EAN) via Open Food Facts. */
export async function getFoodByBarcode(barcode: string): Promise<FoodResult | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json` +
        '?fields=code,product_name,nutriments,serving_size,serving_quantity,product_quantity',
      { headers: { 'User-Agent': 'LumaApp/1.0 (nutrition tracker)' } },
    );
    const json = await res.json();
    if (json?.status !== 1 || !json.product) return null;
    const p = json.product as {
      code?: string;
      product_name?: string;
      nutriments?: Record<string, unknown>;
      serving_size?: string;
      serving_quantity?: number | string;
      product_quantity?: number | string;
    };
    const name = (p.product_name ?? '').trim();
    const n = p.nutriments ?? {};
    const kcal100 = Number(n['energy-kcal_100g']);
    if (!name || !Number.isFinite(kcal100) || kcal100 <= 0) return null;

    const protein100 = Math.round(Number(n.proteins_100g) || 0);
    const carbs100 = Math.round(Number(n.carbohydrates_100g) || 0);
    const fat100 = Math.round(Number(n.fat_100g) || 0);

    // Quantidade da porção: serving_quantity → product_quantity → 100 (g/ml).
    const qtyRaw = Number(p.serving_quantity) || Number(p.product_quantity) || 0;
    const servingQty = qtyRaw > 0 ? Math.round(qtyRaw) : 100;
    const servingSize =
      typeof p.serving_size === 'string' && p.serving_size.trim()
        ? p.serving_size.trim()
        : `${servingQty} g`;

    // Macros da porção: usa os valores "_serving" da API quando existem;
    // senão, calcula a partir do por-100g.
    const perServing = (per100: number, servingKey: string): number => {
      const direct = Number(n[servingKey]);
      if (Number.isFinite(direct)) return Math.round(direct);
      return Math.round((per100 * servingQty) / 100);
    };

    return {
      id: String(p.code ?? barcode),
      name,
      protein100,
      carbs100,
      fat100,
      kcal100: Math.round(kcal100),
      servingSize,
      servingQty,
      protein: perServing(protein100, 'proteins_serving'),
      carbs: perServing(carbs100, 'carbohydrates_serving'),
      fat: perServing(fat100, 'fat_serving'),
      kcal: perServing(Math.round(kcal100), 'energy-kcal_serving'),
    };
  } catch {
    return null;
  }
}

export async function searchFoods(query: string): Promise<FoodResult[]> {
  const q = query.trim();
  if (!q) return [];

  // Brazilian subdomain + Portuguese + popularity sort to surface products
  // relevant to Brazilian users first.
  const url =
    'https://br.openfoodfacts.org/cgi/search.pl' +
    `?search_terms=${encodeURIComponent(q)}` +
    '&search_simple=1&action=process&json=1&page_size=20' +
    '&sort_by=unique_scans_n&lc=pt' +
    '&fields=code,product_name,nutriments';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'LumaApp/1.0 (nutrition tracker)' },
    });
    const json = await res.json();
    const products: unknown[] = Array.isArray(json?.products) ? json.products : [];

    const results: FoodResult[] = [];
    for (const raw of products) {
      const p = raw as { code?: string; product_name?: string; nutriments?: Record<string, unknown> };
      const name = (p.product_name ?? '').trim();
      const n = p.nutriments ?? {};
      const kcal = Number(n['energy-kcal_100g']);
      if (!name || !Number.isFinite(kcal) || kcal <= 0) continue;

      results.push({
        id: String(p.code ?? name),
        name,
        protein100: Math.round(Number(n.proteins_100g) || 0),
        carbs100: Math.round(Number(n.carbohydrates_100g) || 0),
        fat100: Math.round(Number(n.fat_100g) || 0),
        kcal100: Math.round(kcal),
      });
      if (results.length >= 15) break;
    }
    return results;
  } catch {
    return [];
  }
}
