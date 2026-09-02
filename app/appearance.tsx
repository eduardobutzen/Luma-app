import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, neo } from '@/constants/theme';
import { useScheme, useThemePref, type ThemePref } from '@/hooks/useScheme';

const OPTIONS: { value: ThemePref; label: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }[] = [
  { value: 'system', label: 'Sistema', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Claro', icon: 'sunny-outline' },
  { value: 'dark', label: 'Escuro', icon: 'moon-outline' },
];

export default function AppearanceScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();
  const { pref, setPref } = useThemePref();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>Aparência</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.label, { color: palette.textMuted }]}>Tema</Text>
        <View style={[styles.card, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
          {OPTIONS.map((opt, i) => {
            const active = pref === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setPref(opt.value)}
                style={[
                  styles.row,
                  i < OPTIONS.length - 1 && {
                    borderBottomWidth: 0.5,
                    borderBottomColor: palette.border,
                  },
                ]}>
                <Ionicons name={opt.icon} size={20} color={palette.text} />
                <Text style={[styles.rowLabel, { color: palette.text }]}>{opt.label}</Text>
                {active ? (
                  <Ionicons name="checkmark" size={20} color={palette.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  title: { fontSize: 18, fontWeight: '700' },
  content: { paddingHorizontal: 16 },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: { borderRadius: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: { flex: 1, fontSize: 15 },
});
