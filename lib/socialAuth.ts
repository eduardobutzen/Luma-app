import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { supabase } from '@/lib/supabase';

let googleConfigured = false;

function configureGoogle() {
  if (googleConfigured) return;
  GoogleSignin.configure({
    // Web client ID (OAuth) é obrigatório para obter o idToken aceito pelo Supabase.
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
  googleConfigured = true;
}

/** Erro lançado quando o usuário cancela o fluxo (para a UI ignorar). */
export class AuthCancelled extends Error {}

/** Login com Google → troca o idToken por uma sessão Supabase. */
export async function signInWithGoogle(): Promise<void> {
  configureGoogle();
  try {
    await GoogleSignin.hasPlayServices();
    const result = await GoogleSignin.signIn();
    // Compatível com v13+ ({ data }) e versões anteriores (campos no topo).
    const idToken =
      (result as { data?: { idToken?: string | null } }).data?.idToken ??
      (result as { idToken?: string | null }).idToken ??
      null;
    if (!idToken) throw new Error('Não foi possível obter o token do Google.');

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) throw error;
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === statusCodes.SIGN_IN_CANCELLED) throw new AuthCancelled();
    throw e;
  }
}

/** Login com Apple (iOS) → troca o identityToken por uma sessão Supabase. */
export async function signInWithApple(): Promise<void> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      throw new Error('Não foi possível obter o token da Apple.');
    }
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) throw error;
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new AuthCancelled();
    throw e;
  }
}

/** Apple Sign In só está disponível em iOS 13+. */
export async function isAppleAuthAvailable(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync();
}
