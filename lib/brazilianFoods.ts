import type { FoodResult } from '@/lib/foodSearch';

/**
 * Curated list of common Brazilian foods with approximate macros per 100g
 * (cooked where typical). Searched locally so staples like arroz/feijão/batata
 * show instantly and relevantly — Open Food Facts is product-centric and weak
 * for whole foods.
 */
interface LocalFood {
  name: string;
  protein100: number;
  carbs100: number;
  fat100: number;
  kcal100: number;
}

const BRAZILIAN_FOODS: LocalFood[] = [
  // Básicos / acompanhamentos
  { name: 'Arroz branco cozido', protein100: 2.5, carbs100: 28, fat100: 0.2, kcal100: 128 },
  { name: 'Arroz integral cozido', protein100: 2.6, carbs100: 26, fat100: 1, kcal100: 124 },
  { name: 'Feijão carioca cozido', protein100: 4.8, carbs100: 14, fat100: 0.5, kcal100: 76 },
  { name: 'Feijão preto cozido', protein100: 4.5, carbs100: 14, fat100: 0.5, kcal100: 77 },
  { name: 'Batata cozida', protein100: 1.7, carbs100: 20, fat100: 0.1, kcal100: 86 },
  { name: 'Batata frita', protein100: 3.4, carbs100: 41, fat100: 15, kcal100: 312 },
  { name: 'Batata doce cozida', protein100: 1.6, carbs100: 20, fat100: 0.1, kcal100: 86 },
  { name: 'Purê de batata', protein100: 2, carbs100: 17, fat100: 4, kcal100: 113 },
  { name: 'Mandioca cozida', protein100: 0.6, carbs100: 30, fat100: 0.3, kcal100: 125 },
  { name: 'Macarrão cozido', protein100: 5.8, carbs100: 31, fat100: 0.9, kcal100: 158 },
  { name: 'Farofa', protein100: 2, carbs100: 79, fat100: 9, kcal100: 406 },
  { name: 'Cuscuz de milho', protein100: 2.5, carbs100: 24, fat100: 0.7, kcal100: 113 },
  { name: 'Tapioca', protein100: 0.5, carbs100: 60, fat100: 0, kcal100: 240 },
  { name: 'Polenta', protein100: 2.3, carbs100: 17, fat100: 1, kcal100: 85 },
  // Proteínas
  { name: 'Peito de frango grelhado', protein100: 31, carbs100: 0, fat100: 3.6, kcal100: 165 },
  { name: 'Coxa de frango', protein100: 26, carbs100: 0, fat100: 11, kcal100: 209 },
  { name: 'Carne moída cozida', protein100: 27, carbs100: 0, fat100: 11, kcal100: 212 },
  { name: 'Bife grelhado', protein100: 27, carbs100: 0, fat100: 12, kcal100: 219 },
  { name: 'Ovo cozido', protein100: 13, carbs100: 1.1, fat100: 11, kcal100: 155 },
  { name: 'Ovo frito', protein100: 13, carbs100: 0.8, fat100: 15, kcal100: 196 },
  { name: 'Tilápia grelhada', protein100: 26, carbs100: 0, fat100: 2.7, kcal100: 128 },
  { name: 'Salmão grelhado', protein100: 22, carbs100: 0, fat100: 13, kcal100: 208 },
  { name: 'Atum em lata', protein100: 26, carbs100: 0, fat100: 1, kcal100: 116 },
  { name: 'Sardinha', protein100: 25, carbs100: 0, fat100: 11, kcal100: 208 },
  { name: 'Whey protein', protein100: 80, carbs100: 8, fat100: 6, kcal100: 400 },
  // Pães / café da manhã
  { name: 'Pão francês', protein100: 8, carbs100: 59, fat100: 3, kcal100: 300 },
  { name: 'Pão de forma integral', protein100: 9, carbs100: 43, fat100: 4, kcal100: 253 },
  { name: 'Pão de queijo', protein100: 5, carbs100: 38, fat100: 14, kcal100: 300 },
  { name: 'Aveia em flocos', protein100: 17, carbs100: 66, fat100: 7, kcal100: 389 },
  { name: 'Granola', protein100: 10, carbs100: 64, fat100: 13, kcal100: 419 },
  // Laticínios
  { name: 'Leite integral', protein100: 3.2, carbs100: 4.8, fat100: 3.3, kcal100: 61 },
  { name: 'Leite desnatado', protein100: 3.4, carbs100: 5, fat100: 0.2, kcal100: 35 },
  { name: 'Iogurte natural', protein100: 3.5, carbs100: 4.7, fat100: 3.3, kcal100: 61 },
  { name: 'Queijo minas', protein100: 17, carbs100: 3, fat100: 20, kcal100: 264 },
  { name: 'Queijo mussarela', protein100: 22, carbs100: 2, fat100: 21, kcal100: 280 },
  { name: 'Requeijão', protein100: 10, carbs100: 4, fat100: 23, kcal100: 257 },
  // Frutas
  { name: 'Banana', protein100: 1.1, carbs100: 23, fat100: 0.3, kcal100: 89 },
  { name: 'Maçã', protein100: 0.3, carbs100: 14, fat100: 0.2, kcal100: 52 },
  { name: 'Laranja', protein100: 0.9, carbs100: 12, fat100: 0.1, kcal100: 47 },
  { name: 'Mamão', protein100: 0.5, carbs100: 11, fat100: 0.3, kcal100: 43 },
  { name: 'Manga', protein100: 0.8, carbs100: 15, fat100: 0.4, kcal100: 60 },
  { name: 'Abacate', protein100: 2, carbs100: 9, fat100: 15, kcal100: 160 },
  // Vegetais
  { name: 'Alface', protein100: 1.4, carbs100: 2.9, fat100: 0.2, kcal100: 15 },
  { name: 'Tomate', protein100: 0.9, carbs100: 3.9, fat100: 0.2, kcal100: 18 },
  { name: 'Cenoura', protein100: 0.9, carbs100: 10, fat100: 0.2, kcal100: 41 },
  { name: 'Brócolis cozido', protein100: 2.4, carbs100: 7, fat100: 0.4, kcal100: 35 },
  { name: 'Feijoada', protein100: 9, carbs100: 9, fat100: 5, kcal100: 116 },
  // Carnes e embutidos
  { name: 'Picanha grelhada', protein100: 26, carbs100: 0, fat100: 22, kcal100: 290 },
  { name: 'Costela bovina', protein100: 19, carbs100: 0, fat100: 30, kcal100: 350 },
  { name: 'Lombo de porco', protein100: 27, carbs100: 0, fat100: 8, kcal100: 180 },
  { name: 'Frango desfiado', protein100: 25, carbs100: 0, fat100: 5, kcal100: 150 },
  { name: 'Hambúrguer bovino', protein100: 15, carbs100: 3, fat100: 20, kcal100: 250 },
  { name: 'Linguiça', protein100: 15, carbs100: 2, fat100: 30, kcal100: 330 },
  { name: 'Bacon', protein100: 37, carbs100: 1, fat100: 42, kcal100: 541 },
  { name: 'Presunto', protein100: 18, carbs100: 1, fat100: 5, kcal100: 145 },
  { name: 'Peito de peru', protein100: 22, carbs100: 1, fat100: 1, kcal100: 104 },
  { name: 'Mortadela', protein100: 12, carbs100: 2, fat100: 25, kcal100: 311 },
  { name: 'Salsicha', protein100: 12, carbs100: 3, fat100: 25, kcal100: 300 },
  { name: 'Carne seca', protein100: 32, carbs100: 0, fat100: 18, kcal100: 313 },
  { name: 'Camarão cozido', protein100: 24, carbs100: 0, fat100: 0.3, kcal100: 99 },
  { name: 'Ovo mexido', protein100: 10, carbs100: 1, fat100: 12, kcal100: 154 },
  { name: 'Clara de ovo cozida', protein100: 11, carbs100: 0, fat100: 0, kcal100: 52 },
  // Leguminosas e grãos
  { name: 'Lentilha cozida', protein100: 9, carbs100: 20, fat100: 0.4, kcal100: 116 },
  { name: 'Grão-de-bico cozido', protein100: 9, carbs100: 27, fat100: 2.6, kcal100: 164 },
  { name: 'Ervilha cozida', protein100: 5, carbs100: 14, fat100: 0.4, kcal100: 84 },
  { name: 'Milho cozido', protein100: 3.3, carbs100: 19, fat100: 1.3, kcal100: 96 },
  { name: 'Soja cozida', protein100: 17, carbs100: 10, fat100: 9, kcal100: 173 },
  { name: 'Quinoa cozida', protein100: 4.4, carbs100: 21, fat100: 1.9, kcal100: 120 },
  // Carboidratos e pães
  { name: 'Pão integral', protein100: 9, carbs100: 43, fat100: 3.4, kcal100: 247 },
  { name: 'Pão sírio', protein100: 9, carbs100: 58, fat100: 1.2, kcal100: 275 },
  { name: 'Biscoito cream cracker', protein100: 9, carbs100: 68, fat100: 14, kcal100: 430 },
  { name: 'Biscoito recheado', protein100: 5, carbs100: 70, fat100: 20, kcal100: 470 },
  { name: 'Panqueca', protein100: 6, carbs100: 28, fat100: 8, kcal100: 220 },
  { name: 'Crepioca', protein100: 12, carbs100: 20, fat100: 8, kcal100: 200 },
  { name: 'Inhame cozido', protein100: 1.5, carbs100: 26, fat100: 0.2, kcal100: 116 },
  { name: 'Abóbora cozida', protein100: 1, carbs100: 8, fat100: 0.1, kcal100: 40 },
  // Vegetais
  { name: 'Couve refogada', protein100: 3, carbs100: 6, fat100: 4, kcal100: 90 },
  { name: 'Espinafre cozido', protein100: 3, carbs100: 4, fat100: 0.3, kcal100: 23 },
  { name: 'Beterraba cozida', protein100: 1.7, carbs100: 10, fat100: 0.2, kcal100: 44 },
  { name: 'Abobrinha', protein100: 1.2, carbs100: 3, fat100: 0.3, kcal100: 17 },
  { name: 'Berinjela', protein100: 1, carbs100: 6, fat100: 0.2, kcal100: 25 },
  { name: 'Pepino', protein100: 0.7, carbs100: 3.6, fat100: 0.1, kcal100: 16 },
  { name: 'Pimentão', protein100: 1, carbs100: 6, fat100: 0.3, kcal100: 31 },
  { name: 'Cebola', protein100: 1.1, carbs100: 9, fat100: 0.1, kcal100: 40 },
  { name: 'Vagem cozida', protein100: 1.8, carbs100: 7, fat100: 0.2, kcal100: 35 },
  { name: 'Repolho', protein100: 1.3, carbs100: 6, fat100: 0.1, kcal100: 25 },
  { name: 'Couve-flor cozida', protein100: 1.9, carbs100: 4, fat100: 0.3, kcal100: 25 },
  { name: 'Chuchu cozido', protein100: 0.6, carbs100: 4, fat100: 0.1, kcal100: 19 },
  // Frutas
  { name: 'Melancia', protein100: 0.6, carbs100: 8, fat100: 0.2, kcal100: 30 },
  { name: 'Melão', protein100: 0.8, carbs100: 8, fat100: 0.2, kcal100: 34 },
  { name: 'Uva', protein100: 0.7, carbs100: 18, fat100: 0.2, kcal100: 69 },
  { name: 'Abacaxi', protein100: 0.5, carbs100: 13, fat100: 0.1, kcal100: 50 },
  { name: 'Morango', protein100: 0.7, carbs100: 8, fat100: 0.3, kcal100: 32 },
  { name: 'Goiaba', protein100: 2.6, carbs100: 14, fat100: 1, kcal100: 68 },
  { name: 'Pêra', protein100: 0.4, carbs100: 15, fat100: 0.1, kcal100: 57 },
  { name: 'Açaí polpa', protein100: 1, carbs100: 6, fat100: 5, kcal100: 70 },
  { name: 'Maracujá', protein100: 2, carbs100: 13, fat100: 0.7, kcal100: 68 },
  { name: 'Tangerina', protein100: 0.8, carbs100: 13, fat100: 0.3, kcal100: 53 },
  { name: 'Coco', protein100: 3, carbs100: 15, fat100: 33, kcal100: 354 },
  // Laticínios e gorduras
  { name: 'Queijo prato', protein100: 25, carbs100: 2, fat100: 26, kcal100: 360 },
  { name: 'Queijo coalho', protein100: 24, carbs100: 2, fat100: 25, kcal100: 330 },
  { name: 'Cream cheese', protein100: 6, carbs100: 5, fat100: 34, kcal100: 342 },
  { name: 'Iogurte grego', protein100: 9, carbs100: 4, fat100: 5, kcal100: 97 },
  { name: 'Manteiga', protein100: 0.9, carbs100: 0.1, fat100: 81, kcal100: 717 },
  { name: 'Leite condensado', protein100: 8, carbs100: 55, fat100: 8, kcal100: 321 },
  { name: 'Creme de leite', protein100: 2.5, carbs100: 4, fat100: 20, kcal100: 200 },
  // Oleaginosas e óleos
  { name: 'Castanha de caju', protein100: 18, carbs100: 30, fat100: 44, kcal100: 553 },
  { name: 'Castanha do Pará', protein100: 14, carbs100: 12, fat100: 66, kcal100: 656 },
  { name: 'Amendoim', protein100: 26, carbs100: 16, fat100: 49, kcal100: 567 },
  { name: 'Pasta de amendoim', protein100: 25, carbs100: 20, fat100: 50, kcal100: 588 },
  { name: 'Azeite de oliva', protein100: 0, carbs100: 0, fat100: 100, kcal100: 884 },
  { name: 'Chia', protein100: 17, carbs100: 42, fat100: 31, kcal100: 486 },
  { name: 'Linhaça', protein100: 18, carbs100: 29, fat100: 42, kcal100: 534 },
  // Bebidas
  { name: 'Suco de laranja natural', protein100: 0.7, carbs100: 10, fat100: 0.2, kcal100: 45 },
  { name: 'Água de coco', protein100: 0.7, carbs100: 4, fat100: 0.2, kcal100: 19 },
  { name: 'Refrigerante cola', protein100: 0, carbs100: 11, fat100: 0, kcal100: 42 },
  { name: 'Achocolatado pronto', protein100: 3, carbs100: 11, fat100: 3, kcal100: 83 },
  // Pratos prontos
  { name: 'Pizza de mussarela', protein100: 11, carbs100: 30, fat100: 10, kcal100: 266 },
  { name: 'Lasanha', protein100: 8, carbs100: 14, fat100: 9, kcal100: 170 },
  { name: 'Strogonoff de frango', protein100: 11, carbs100: 6, fat100: 9, kcal100: 150 },
  { name: 'Escondidinho', protein100: 6, carbs100: 15, fat100: 7, kcal100: 145 },
  { name: 'Coxinha', protein100: 6, carbs100: 25, fat100: 14, kcal100: 260 },
  { name: 'Pastel de carne', protein100: 8, carbs100: 30, fat100: 20, kcal100: 320 },
  { name: 'Misto quente', protein100: 15, carbs100: 30, fat100: 15, kcal100: 310 },
  { name: 'Sopa de legumes', protein100: 2, carbs100: 7, fat100: 1, kcal100: 45 },
  { name: 'Macarrão à bolonhesa', protein100: 7, carbs100: 20, fat100: 6, kcal100: 165 },
  // Doces e snacks
  { name: 'Chocolate ao leite', protein100: 7, carbs100: 59, fat100: 30, kcal100: 535 },
  { name: 'Brigadeiro', protein100: 4, carbs100: 55, fat100: 13, kcal100: 360 },
  { name: 'Pudim', protein100: 5, carbs100: 25, fat100: 6, kcal100: 170 },
  { name: 'Sorvete de creme', protein100: 3.5, carbs100: 24, fat100: 11, kcal100: 207 },
  { name: 'Bolo de chocolate', protein100: 5, carbs100: 50, fat100: 15, kcal100: 370 },
  { name: 'Doce de leite', protein100: 6, carbs100: 55, fat100: 7, kcal100: 315 },
  { name: 'Mel', protein100: 0.3, carbs100: 82, fat100: 0, kcal100: 304 },
  // Condimentos
  { name: 'Maionese', protein100: 1, carbs100: 2, fat100: 75, kcal100: 680 },
  { name: 'Ketchup', protein100: 1.2, carbs100: 26, fat100: 0.2, kcal100: 110 },
  { name: 'Molho de tomate', protein100: 1.6, carbs100: 7, fat100: 1, kcal100: 45 },
  { name: 'Tapioca com queijo', protein100: 6, carbs100: 45, fat100: 8, kcal100: 280 },
];

// Strip combining diacritics (built via RegExp to avoid literal combining chars).
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');

function normalize(s: string): string {
  return s.normalize('NFD').replace(DIACRITICS, '').toLowerCase();
}

/** Synchronous local search over the Brazilian foods list (accent-insensitive). */
export function searchLocalFoods(query: string): FoodResult[] {
  const q = normalize(query.trim());
  if (!q) return [];
  return BRAZILIAN_FOODS.filter((f) => normalize(f.name).includes(q))
    .sort((a, b) => {
      // Names starting with the query rank first.
      const aStarts = normalize(a.name).startsWith(q) ? 0 : 1;
      const bStarts = normalize(b.name).startsWith(q) ? 0 : 1;
      return aStarts - bStarts || a.name.length - b.name.length;
    })
    .map((f) => ({ id: `local-${f.name}`, ...f }));
}
