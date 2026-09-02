import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';

export interface TabItem<T extends string> {
  key: T;
  label: string;
}

/**
 * Abas internas de uma tela: rótulo com sublinhado curto sob a ativa.
 * É o único padrão de troca de seção do app — nada de pílulas ou botões
 * preenchidos, para que Histórico, Receitas e Social se comportem igual.
 */
export default function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (key: T) => void;
}) {
  const scheme = useScheme();
  const palette = colors[scheme];

  return (
    <View style={[styles.tabs, { borderBottomColor: palette.border }]}>
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Pressable key={item.key} onPress={() => onChange(item.key)} style={styles.tab}>
            <Text
              style={[
                styles.label,
                {
                  color: active ? palette.text : palette.textMuted,
                  fontWeight: active ? '700' : '500',
                },
              ]}
              numberOfLines={1}>
              {item.label}
            </Text>
            {active ? (
              <View style={[styles.indicator, { backgroundColor: palette.text }]} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 15 },
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: 56,
    borderRadius: 999,
  },
});
