import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { colors } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';

interface LineChartProps {
  values: number[];
  height?: number;
  color?: string;
}

const PAD = 14;

/** Minimal responsive line chart (e.g. weight trend) using react-native-svg. */
export default function LineChart({ values, height = 160, color }: LineChartProps) {
  const scheme = useScheme();
  const stroke = color ?? colors[scheme].text;
  const [width, setWidth] = useState(0);

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = PAD + (values.length === 1 ? 0 : (i / (values.length - 1)) * (width - 2 * PAD));
    const y = PAD + (1 - (v - min) / range) * (height - 2 * PAD);
    return { x, y };
  });

  return (
    <View
      style={{ height }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && values.length >= 2 ? (
        <Svg width={width} height={height}>
          <Polyline
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={stroke}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === points.length - 1 ? 5 : 3}
              fill={stroke}
            />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
