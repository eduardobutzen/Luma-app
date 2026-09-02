import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';

export default function AboutScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const links: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] = [
    { icon: 'document-text-outline', label: 'Termos de uso', onPress: () => Linking.openURL('https://luma.app/termos') },
    { icon: 'shield-outline', label: 'Política de privacidade', onPress: () => Linking.openURL('https://luma.app/privacidade') },
    { icon: 'star-outline', label: 'Avaliar o app', onPress: () => Linking.openURL('https://luma.app') },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>Sobre</Text>
      </View>

      <View style={styles.brandBlock}>
        <View style={[styles.logo, { backgroundColor: palette.primary }]}>
          <Ionicons name="flame" size={32} color={palette.onPrimary} />
        </View>
        <Text style={[styles.appName, { color: palette.text }]}>Luma</Text>
        <Text style={[styles.version, { color: palette.textMuted }]}>Versão {version}</Text>
        <Text style={[styles.tagline, { color: palette.textMuted }]}>
          Monitore seus macros com IA.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
        {links.map((link, i) => (
          <Pressable
            key={link.label}
            onPress={link.onPress}
            style={[
              styles.row,
              i < links.length - 1 && {
                borderBottomWidth: 0.5,
                borderBottomColor: palette.border,
              },
            ]}>
            <Ionicons name={link.icon} size={20} color={palette.text} />
            <Text style={[styles.rowLabel, { color: palette.text }]}>{link.label}</Text>
            <Ionicons name="open-outline" size={16} color={palette.textMuted} />
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  brandBlock: { alignItems: 'center', marginTop: 24, marginBottom: 32 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: { fontSize: 22, fontWeight: '600', marginTop: 12 },
  version: { fontSize: 13, marginTop: 2 },
  tagline: { fontSize: 14, marginTop: 8 },
  card: { borderRadius: 16, marginHorizontal: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: { flex: 1, fontSize: 15 },
});
