// Entry do app. Mantém o expo-router e registra o task handler do widget Android
// (necessário para atualizações do widget, inclusive em background/headless).
import 'expo-router/entry';
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  // require condicional: o módulo nativo só existe no Android.
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./lib/widget.android');
  registerWidgetTaskHandler(widgetTaskHandler);
}
