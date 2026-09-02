import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, neo } from '@/constants/theme';
import { useScheme, useThemePref } from '@/hooks/useScheme';
import { exportData } from '@/lib/export';
import { supabase } from '@/lib/supabase';

type IconName = keyof typeof Ionicons.glyphMap;

const THEME_LABEL: Record<string, string> = {
  system: 'Sistema',
  light: 'Claro',
  dark: 'Escuro',
};

export default function SettingsScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();
  const { pref } = useThemePref();

  function endAllSessions() {
    Alert.alert('Encerrar sessões', 'Sair de todos os dispositivos conectados?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Encerrar',
        style: 'destructive',
        onPress: () => supabase.auth.signOut({ scope: 'global' }),
      },
    ]);
  }

  function deleteAccount() {
    Alert.alert(
      'Excluir conta',
      'Isso apaga permanentemente sua conta e todos os seus dados. Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.functions.invoke('delete-account');
            if (error) {
              Alert.alert('Erro', 'Não foi possível excluir a conta. Tente novamente.');
              return;
            }
            await supabase.auth.signOut();
          },
        },
      ],
    );
  }

  const soon = () => Alert.alert('Em breve', 'Essa funcionalidade chegará em uma próxima versão.');

  async function handleExport() {
    const ok = await exportData();
    if (!ok) Alert.alert('Indisponível', 'Compartilhamento não disponível neste dispositivo.');
  }

  const sections: {
    title: string;
    rows: { icon: IconName; label: string; value?: string; onPress: () => void; danger?: boolean }[];
  }[] = [
    {
      title: 'Conta',
      rows: [
        { icon: 'person-outline', label: 'Perfil', onPress: () => router.push('/edit-profile') },
        { icon: 'shield-checkmark-outline', label: 'Segurança', onPress: () => router.push('/security') },
        { icon: 'phone-portrait-outline', label: 'Sessões', onPress: endAllSessions },
        { icon: 'download-outline', label: 'Exportar dados', onPress: handleExport },
        { icon: 'trash-outline', label: 'Excluir conta', onPress: deleteAccount, danger: true },
      ],
    },
    {
      title: 'Assinatura',
      rows: [
        { icon: 'star-outline', label: 'Plano atual', value: 'Gratuito', onPress: () => router.push('/subscription') },
        { icon: 'card-outline', label: 'Cobrança', onPress: () => router.push('/subscription') },
        { icon: 'refresh-outline', label: 'Restaurar compras', onPress: () => Alert.alert('Restaurar compras', 'Nenhuma compra encontrada.') },
      ],
    },
    {
      title: 'Preferências',
      rows: [
        { icon: 'color-palette-outline', label: 'Tema', value: THEME_LABEL[pref], onPress: () => router.push('/appearance') },
        { icon: 'language-outline', label: 'Idioma', value: 'Português', onPress: () => Alert.alert('Idioma', 'Português (Brasil). Mais idiomas em breve.') },
        { icon: 'notifications-outline', label: 'Notificações', onPress: () => router.push('/reminders') },
        { icon: 'lock-closed-outline', label: 'Privacidade', onPress: () => Alert.alert('Privacidade', 'Seus dados são privados e protegidos por Row Level Security. Você pode exportá-los ou excluir sua conta a qualquer momento.') },
      ],
    },
    {
      title: 'Integrações',
      rows: [
        { icon: 'logo-google', label: 'Google', value: 'Conectar', onPress: soon },
        { icon: 'logo-apple', label: 'Apple', value: 'Conectar', onPress: soon },
      ],
    },
    {
      title: 'Suporte',
      rows: [
        { icon: 'help-circle-outline', label: 'FAQ', onPress: () => router.push('/faq') },
        { icon: 'bug-outline', label: 'Reportar bug', onPress: () => Linking.openURL('mailto:suporte@luma.app?subject=Bug%20no%20Luma') },
        { icon: 'information-circle-outline', label: 'Sobre', onPress: () => router.push('/about') },
      ],
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <Text style={[styles.title, { color: palette.text }]}>Configurações</Text>
        </View>

        {sections.map((section) => (
          <View key={section.title}>
            <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>
              {section.title}
            </Text>
            <View style={[styles.card, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
              {section.rows.map((row, i) => (
                <Pressable
                  key={row.label}
                  onPress={row.onPress}
                  style={[
                    styles.row,
                    i < section.rows.length - 1 && {
                      borderBottomWidth: 0.5,
                      borderBottomColor: palette.border,
                    },
                  ]}>
                  <Ionicons
                    name={row.icon}
                    size={20}
                    color={row.danger ? palette.danger : palette.text}
                  />
                  <Text
                    style={[styles.rowLabel, { color: row.danger ? palette.danger : palette.text }]}>
                    {row.label}
                  </Text>
                  {row.value ? (
                    <Text style={[styles.rowValue, { color: palette.textMuted }]}>{row.value}</Text>
                  ) : null}
                  <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Pressable style={styles.logout} onPress={() => supabase.auth.signOut()}>
          <Ionicons name="log-out-outline" size={18} color={palette.danger} />
          <Text style={styles.logoutText}>Sair</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '700' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 20,
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
  rowValue: { fontSize: 13 },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: '#F4212E',
  },
  logoutText: { fontSize: 15, fontWeight: '500', color: '#F4212E' },
});
