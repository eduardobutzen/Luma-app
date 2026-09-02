/** Dados exibidos no widget de tela inicial (compartilhado entre plataformas). */
export interface WidgetData {
  kcal: number;
  goalKcal: number;
  waterMl: number;
  goalWaterMl: number;
  streak: number;
}

export const WIDGET_STORAGE_KEY = 'luma.widget.data';

export const EMPTY_WIDGET: WidgetData = {
  kcal: 0,
  goalKcal: 2000,
  waterMl: 0,
  goalWaterMl: 2000,
  streak: 0,
};
