import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { WidgetData } from '@/lib/widgetTypes';

/** Widget de tela inicial (Android) com o resumo diário do Luma. */
export function MacroWidget({ data }: { data: WidgetData }) {
  const kcalPct =
    data.goalKcal > 0 ? Math.round(Math.min(data.kcal / data.goalKcal, 1) * 100) : 0;
  const waterPct =
    data.goalWaterMl > 0 ? Math.round(Math.min(data.waterMl / data.goalWaterMl, 1) * 100) : 0;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#000000',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
      <FlexWidget
        style={{
          flexDirection: 'row',
          width: 'match_parent',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        <TextWidget text="Luma" style={{ fontSize: 14, fontWeight: 'bold', color: '#E7E9EA' }} />
        <TextWidget text={`🔥 ${data.streak}d`} style={{ fontSize: 12, color: '#71767B' }} />
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <TextWidget text={`${data.kcal}`} style={{ fontSize: 30, fontWeight: 'bold', color: '#E7E9EA' }} />
        <TextWidget
          text={` / ${data.goalKcal} kcal`}
          style={{ fontSize: 12, color: '#71767B', marginBottom: 5 }}
        />
      </FlexWidget>

      <FlexWidget
        style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between' }}>
        <TextWidget text={`🎯 ${kcalPct}% da meta`} style={{ fontSize: 12, color: '#E7E9EA' }} />
        <TextWidget
          text={`💧 ${(data.waterMl / 1000).toFixed(1)}L · ${waterPct}%`}
          style={{ fontSize: 12, color: '#71767B' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
