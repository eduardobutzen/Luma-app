import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { supabase } from '@/lib/supabase';

export default function ChangeEmailScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();

  const [current, setCurrent] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrent(user?.email ?? null));
  }, []);

  const valid = /^\S+@\S+\.\S+$/.test(email.trim()) && email.trim() !== current;

  async function handleSave() {
    if (!valid || saving) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setSaving(false);
    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    Alert.alert(
      'Confirme a alteração',
      'Enviamos um link de confirmação para o e-mail atual e o novo. A troca só é efetivada após confirmar.',
    );
    router.back();
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <Text style={[styles.title, { color: palette.text }]}>Alterar e-mail</Text>
        </View>

        <View style={styles.content}>
          <Text style={[styles.label, { color: palette.textMuted }]}>
            E-mail atual: {current ?? '—'}
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: palette.card, borderColor: palette.border, color: palette.text },
            ]}
            value={email}
            onChangeText={setEmail}
            placeholder="Novo e-mail"
            placeholderTextColor={palette.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={[styles.saveButton, { backgroundColor: palette.primary }, !valid && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!valid || saving}>
            {saving ? (
              <ActivityIndicator color={palette.onPrimary} />
            ) : (
              <Text style={[styles.saveText, { color: palette.onPrimary }]}>Salvar</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  content: { paddingHorizontal: 16 },
  label: { fontSize: 13, marginBottom: 12 },
  input: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 0.5,
    fontSize: 15,
  },
  saveButton: {
    borderRadius: 99,
    paddingVertical: 14,
    marginTop: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveText: { fontSize: 15, fontWeight: '500' },
});
