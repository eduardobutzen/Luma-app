import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';

export interface FilterChip<T extends string> {
  key: T;
  label: string;
}

/** Fila rolável de filtros: o ativo vai em tinta cheia, o resto em superfície. */
export default function FilterChipRow<T extends string>({
  items,
  value,
  onChange,
}: {
  items: readonly FilterChip<T>[];
  value: T;
  onChange: (key: T) => void;
}) {
  const scheme = useScheme();
  const palette = colors[scheme];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={[
              styles.chip,
              { backgroundColor: active ? palette.primary : palette.surface },
            ]}>
            <Text
              style={[
                styles.label,
                { color: active ? palette.onPrimary : palette.textMuted },
              ]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  label: { fontSize: 13, fontWeight: '600' },
});
