import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { supabase } from '@/lib/supabase';

export default function SecurityScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setEmail(user?.email ?? null));
  }, []);

  async function handleChangePassword() {
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    Alert.alert('E-mail enviado', `Enviamos um link para redefinir sua senha em ${email}.`);
  }

  function handleSignOutAll() {
    Alert.alert('Encerrar sessões', 'Sair de todos os dispositivos conectados?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Encerrar',
        style: 'destructive',
        onPress: () => supabase.auth.signOut({ scope: 'global' }),
      },
    ]);
  }

  const rows: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] = [
    { icon: 'mail-outline', label: 'Alterar e-mail', onPress: () => router.push('/change-email') },
    { icon: 'key-outline', label: 'Alterar senha', onPress: handleChangePassword },
    { icon: 'phone-portrait-outline', label: 'Encerrar todas as sessões', onPress: handleSignOutAll },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>Segurança</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.email, { color: palette.textMuted }]}>
          Conta: {email ?? '—'}
        </Text>
        <View style={[styles.card, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
          {rows.map((row, i) => (
            <Pressable
              key={row.label}
              onPress={row.onPress}
              style={[
                styles.row,
                i < rows.length - 1 && {
                  borderBottomWidth: 0.5,
                  borderBottomColor: palette.border,
                },
              ]}>
              <Ionicons name={row.icon} size={20} color={palette.text} />
              <Text style={[styles.rowLabel, { color: palette.text }]}>{row.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  content: { paddingHorizontal: 16 },
  email: { fontSize: 13, marginBottom: 12 },
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
