import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

export type CardFormat = 'story' | 'square';

/** Resolução final de export (alta resolução para redes sociais). */
export const FORMAT_SIZE: Record<CardFormat, { w: number; h: number; ratio: number }> = {
  story: { w: 1080, h: 1920, ratio: 1920 / 1080 },
  square: { w: 1080, h: 1080, ratio: 1 },
};

/** Captura o card referenciado como PNG em alta resolução (tmpfile). */
export async function captureCard(
  ref: RefObject<View | null>,
  format: CardFormat,
): Promise<string> {
  const { w, h } = FORMAT_SIZE[format];
  // PNG + view raiz sem fundo (modo transparente) preservam o alpha no export.
  return captureRef(ref, { format: 'png', quality: 1, width: w, height: h, result: 'tmpfile' });
}

/** Abre o share sheet nativo com a imagem do card. */
export async function shareCard(
  ref: RefObject<View | null>,
  format: CardFormat,
): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const uri = await captureCard(ref, format);
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartilhar' });
  return true;
}

/** Salva a imagem do card na galeria do dispositivo. */
export async function saveCard(
  ref: RefObject<View | null>,
  format: CardFormat,
): Promise<boolean> {
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) return false;
  const uri = await captureCard(ref, format);
  await MediaLibrary.saveToLibraryAsync(uri);
  return true;
}
