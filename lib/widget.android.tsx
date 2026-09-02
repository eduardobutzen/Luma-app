import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestWidgetUpdate,
  type WidgetTaskHandlerProps,
} from 'react-native-android-widget';

import { MacroWidget } from '@/components/widgets/MacroWidget';
import { EMPTY_WIDGET, WIDGET_STORAGE_KEY, type WidgetData } from '@/lib/widgetTypes';

const WIDGET_NAME = 'Macro';

async function readData(): Promise<WidgetData> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_STORAGE_KEY);
    if (raw) return { ...EMPTY_WIDGET, ...JSON.parse(raw) };
  } catch {
    // ignora — usa default
  }
  return EMPTY_WIDGET;
}

/** Handler chamado pelo SO em add/update/resize do widget (inclusive headless). */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const data = await readData();
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(<MacroWidget data={data} />);
      break;
    default:
      break;
  }
}

/** Persiste os dados e re-renderiza o widget (se estiver na tela inicial). */
export async function updateMacroWidget(data: WidgetData): Promise<void> {
  try {
    await AsyncStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(data));
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: () => <MacroWidget data={data} />,
      widgetNotFound: () => {
        // Widget ainda não foi adicionado à tela inicial — nada a fazer.
      },
    });
  } catch {
    // falha silenciosa — não impacta o app
  }
}
