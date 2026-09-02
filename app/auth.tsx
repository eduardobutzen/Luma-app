import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import { colors } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { supabase } from '@/lib/supabase';

// ───────────────────────────────────────────────────────────────────────────
// LOGIN SOCIAL (Apple / Google) — PAUSADO
// Exige Apple Developer Account, credenciais OAuth e um dev build (EAS); não
// funciona no Expo Go. O código está pronto em lib/socialAuth.ts. Para reativar
// na publicação nas lojas, descomente o import, o handler e os botões abaixo:
//
// import { Ionicons } from '@expo/vector-icons';
// import { useEffect } from 'react';
// import { Pressable, View } from 'react-native';
// import {
//   AuthCancelled,
//   isAppleAuthAvailable,
//   signInWithApple,
//   signInWithGoogle,
// } from '@/lib/socialAuth';
// ───────────────────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // --- Login social (pausado) -------------------------------------------------
  // const [appleAvailable, setAppleAvailable] = useState(false);
  // useEffect(() => {
  //   isAppleAuthAvailable().then(setAppleAvailable);
  // }, []);
  // async function handleSocial(provider: 'google' | 'apple') {
  //   try {
  //     if (provider === 'google') await signInWithGoogle();
  //     else await signInWithApple();
  //   } catch (e) {
  //     if (e instanceof AuthCancelled) return;
  //     Alert.alert('Erro', e instanceof Error ? e.message : 'Falha no login social.');
  //   }
  // }
  // ----------------------------------------------------------------------------

  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const passwordValid = password.length >= 6;
  const canSubmit = emailValid && passwordValid && !loading;

  const hint = !email && !password
    ? null
    : !emailValid
      ? 'Informe um e-mail válido.'
      : !passwordValid
        ? 'A senha deve ter ao menos 6 caracteres.'
        : null;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    const { error } = isLogin
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      Alert.alert('Erro', error.message);
    }
  }

  async function handleForgot() {
    if (!emailValid) {
      Alert.alert('Informe seu e-mail', 'Digite o e-mail da sua conta para receber o link.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    Alert.alert('E-mail enviado', 'Enviamos um link para redefinir sua senha. Confira sua caixa de entrada.');
  }

  const inputStyle = [
    styles.input,
    {
      backgroundColor: palette.card,
      borderColor: palette.border,
      color: palette.text,
    },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ backgroundColor: palette.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={[styles.logo, { color: palette.text }]}>Luma</Text>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          Monitore seus macros com IA
        </Text>

        <TextInput
          style={inputStyle}
          placeholder="E-mail"
          placeholderTextColor={palette.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={inputStyle}
          placeholder="Senha"
          placeholderTextColor={palette.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {hint ? <Text style={styles.hint}>{hint}</Text> : null}

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: palette.primary }, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}>
          {loading ? (
            <ActivityIndicator color={palette.onPrimary} />
          ) : (
            <Text style={[styles.submitText, { color: palette.onPrimary }]}>
              {isLogin ? 'Entrar' : 'Criar conta'}
            </Text>
          )}
        </TouchableOpacity>

        {isLogin ? (
          <TouchableOpacity style={styles.forgot} onPress={handleForgot}>
            <Text style={[styles.forgotText, { color: palette.text }]}>Esqueci minha senha</Text>
          </TouchableOpacity>
        ) : null}

        {/*
          LOGIN SOCIAL (PAUSADO) — reativar na publicação nas lojas (dev build):

          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <Text style={[styles.dividerText, { color: palette.textMuted }]}>ou</Text>
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
          </View>

          <Pressable
            style={[styles.socialButton, { backgroundColor: palette.card, borderColor: palette.border }]}
            onPress={() => handleSocial('google')}>
            <Ionicons name="logo-google" size={18} color={palette.text} />
            <Text style={[styles.socialText, { color: palette.text }]}>Continuar com Google</Text>
          </Pressable>

          {appleAvailable ? (
            <Pressable
              style={[styles.socialButton, styles.appleButton]}
              onPress={() => handleSocial('apple')}>
              <Ionicons name="logo-apple" size={18} color={palette.onPrimary} />
              <Text style={[styles.socialText, { color: '#FFFFFF' }]}>Continuar com Apple</Text>
            </Pressable>
          ) : null}
        */}

        <TouchableOpacity
          style={styles.toggle}
          onPress={() => setIsLogin((prev) => !prev)}>
          <Text style={[styles.toggleText, { color: palette.text }]}>
            {isLogin ? 'Não tem conta? Criar conta' : 'Já tenho conta? Entrar'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingTop: 80,
  },
  logo: {
    fontSize: 40,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 48,
  },
  input: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 0.5,
    fontSize: 15,
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 8,
    marginLeft: 4,
  },
  submitButton: {
    borderRadius: 99,
    paddingVertical: 14,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '500',
  },
  forgot: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 13,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 99,
    borderWidth: 1,
    paddingVertical: 14,
    marginBottom: 10,
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  socialText: {
    fontSize: 15,
    fontWeight: '500',
  },
  toggle: {
    marginTop: 24,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 13,
  },
});
