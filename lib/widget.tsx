// Implementação padrão (iOS / Expo Go): no-op.
// O widget de tela inicial é Android-only (react-native-android-widget); a
// versão real vive em widget.android.tsx e o Metro resolve por plataforma.
import type { WidgetData } from '@/lib/widgetTypes';

export async function updateMacroWidget(_data: WidgetData): Promise<void> {
  // Sem widget nativo nesta plataforma.
}
