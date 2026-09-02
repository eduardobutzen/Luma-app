import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';

const PREMIUM_PERKS = [
  'Análise de refeições por IA ilimitada',
  'Relatórios avançados e tendências mensais',
  'Sem anúncios',
];

export default function SubscriptionScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <Text style={[styles.title, { color: palette.text }]}>Assinatura</Text>
        </View>

        {/* Current plan */}
        <View style={[styles.planCard, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
          <Text style={[styles.planLabel, { color: palette.textMuted }]}>Plano atual</Text>
          <Text style={[styles.planName, { color: palette.text }]}>Gratuito</Text>
          <Text style={[styles.planNote, { color: palette.textMuted }]}>
            Você tem acesso a todas as funcionalidades essenciais.
          </Text>
        </View>

        {/* Premium */}
        <View style={[styles.premiumCard, { backgroundColor: palette.primary }]}>
          <Text style={[styles.premiumTitle, { color: palette.onPrimary }]}>Luma Premium</Text>
          {PREMIUM_PERKS.map((perk) => (
            <View key={perk} style={styles.perkRow}>
              <Ionicons name="checkmark-circle" size={18} color={palette.onPrimary} />
              <Text style={[styles.perkText, { color: palette.onPrimary }]}>{perk}</Text>
            </View>
          ))}
          <Pressable
            style={[styles.upgradeButton, { backgroundColor: palette.onPrimary }]}
            onPress={() => Alert.alert('Em breve', 'O plano Premium estará disponível em breve.')}>
            <Text style={[styles.upgradeText, { color: palette.primary }]}>Assinar (em breve)</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.restore}
          onPress={() => Alert.alert('Restaurar compras', 'Nenhuma compra encontrada.')}>
          <Text style={[styles.restoreText, { color: palette.primary }]}>Restaurar compras</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  planCard: { borderRadius: 16, padding: 16 },
  planLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  planName: { fontSize: 22, fontWeight: '600', marginTop: 4 },
  planNote: { fontSize: 13, marginTop: 6 },
  premiumCard: { borderRadius: 16, padding: 20, marginTop: 16, },
  premiumTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  perkText: { fontSize: 14, flex: 1 },
  upgradeButton: {
    marginTop: 12,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  upgradeText: { fontSize: 15, fontWeight: '700' },
  restore: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  restoreText: { fontSize: 14, fontWeight: '500' },
});
