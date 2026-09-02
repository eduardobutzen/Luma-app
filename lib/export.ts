import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { currentUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';

function csvCell(value: unknown): string {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: (string | number)[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

/**
 * Exports the user's meals and weight logs as a CSV file and opens the share
 * sheet. Returns false if sharing is unavailable.
 */
export async function exportData(): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;

  const uid = await currentUserId();
  if (!uid) return false;

  const [{ data: meals }, { data: weights }] = await Promise.all([
    supabase.from('meals').select('*').eq('user_id', uid).order('eaten_at', { ascending: true }),
    supabase.from('weight_logs').select('*').eq('user_id', uid).order('logged_at', { ascending: true }),
  ]);

  const mealsCsv = toCsv(
    ['data', 'tipo', 'descricao', 'kcal', 'proteina', 'carbo', 'gordura'],
    (meals ?? []).map((m) => [
      m.eaten_at,
      m.type,
      m.description ?? '',
      m.kcal,
      m.protein,
      m.carbs,
      m.fat,
    ]),
  );

  const weightCsv = toCsv(
    ['data', 'peso_kg'],
    (weights ?? []).map((w) => [w.logged_at, w.weight_kg]),
  );

  const content = `REFEICOES\n${mealsCsv}\n\nPESO\n${weightCsv}\n`;
  const uri = `${FileSystem.cacheDirectory}luma-dados.csv`;
  await FileSystem.writeAsStringAsync(uri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Exportar dados' });
  return true;
}

/** Shares a captured image (e.g. a progress card) via the OS share sheet. */
export async function shareImage(uri: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartilhar progresso' });
  return true;
}
