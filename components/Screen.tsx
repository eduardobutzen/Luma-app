import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';

interface ScreenProps {
  title?: string;
  children?: ReactNode;
}

/** Themed, safe-area aware container shared by the app's screens. */
export default function Screen({ title, children }: ScreenProps) {
  const scheme = useScheme();
  const palette = colors[scheme];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['bottom', 'left', 'right']}>
      <View style={styles.content}>
        {title ? (
          <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        ) : null}
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
});
