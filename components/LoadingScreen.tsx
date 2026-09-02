import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Skeleton from '@/components/Skeleton';
import { colors } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';

/** Generic skeleton placeholder shown during a screen's first load. */
export default function LoadingScreen() {
  const isDark = useScheme() === 'dark';
  const palette = colors[isDark ? 'dark' : 'light'];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <Skeleton width={160} height={22} />
        <Skeleton height={180} radius={16} style={styles.mt16} />
        <View style={styles.row}>
          <Skeleton height={80} radius={16} style={styles.flex} />
          <Skeleton height={80} radius={16} style={styles.flex} />
          <Skeleton height={80} radius={16} style={styles.flex} />
        </View>
        <Skeleton height={64} radius={16} style={styles.mt12} />
        <Skeleton height={64} radius={16} style={styles.mt12} />
        <Skeleton height={64} radius={16} style={styles.mt12} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  mt16: { marginTop: 16 },
  mt12: { marginTop: 12 },
  row: { flexDirection: 'row', gap: 8, marginTop: 12 },
  flex: { flex: 1 },
});
