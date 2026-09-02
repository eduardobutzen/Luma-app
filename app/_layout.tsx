import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider, useScheme } from '@/hooks/useScheme';
import { supabase } from '@/lib/supabase';

type Route = 'loading' | 'auth' | 'onboarding' | 'tabs';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootNav />
    </ThemeProvider>
  );
}

function RootNav() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();
  const { session, loading } = useAuth();

  const [route, setRoute] = useState<Route>('loading');

  // Decide destination from the session + the profile's onboarding flag.
  useEffect(() => {
    if (loading) return;
    if (!session) {
      setRoute('auth');
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('onboarded')
        .eq('id', session.user.id)
        .single();
      if (!active) return;
      setRoute(data?.onboarded ? 'tabs' : 'onboarding');
    })();
    return () => {
      active = false;
    };
  }, [session, loading]);

  useEffect(() => {
    if (route === 'auth') router.replace('/auth');
    else if (route === 'onboarding') router.replace('/onboarding');
    else if (route === 'tabs') router.replace('/(tabs)');
  }, [route]);

  if (loading || route === 'loading') {
    return (
      <View style={[styles.loader, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          // Evita o flash claro entre telas no tema escuro.
          contentStyle: { backgroundColor: palette.background },
          headerStyle: { backgroundColor: palette.card },
          headerTintColor: palette.text,
          headerShadowVisible: false,
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="reminders" options={{ headerShown: false }} />
        <Stack.Screen name="meal/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="achievements" options={{ headerShown: false }} />
        <Stack.Screen name="weight" options={{ headerShown: false }} />
        <Stack.Screen name="progress-photos" options={{ headerShown: false }} />
        <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="streak-group/new" options={{ headerShown: false }} />
        <Stack.Screen name="streak-group/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="chat/dm/[uid]" options={{ headerShown: false }} />
        <Stack.Screen name="chat/group/[gid]" options={{ headerShown: false }} />
        <Stack.Screen name="share-to-chat" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="report" options={{ headerShown: false }} />
        <Stack.Screen name="security" options={{ headerShown: false }} />
        <Stack.Screen name="change-email" options={{ headerShown: false }} />
        <Stack.Screen name="templates" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="recipe-edit" options={{ headerShown: false }} />
        <Stack.Screen name="community-recipe/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="fasting" options={{ headerShown: false }} />
        <Stack.Screen name="share-card" options={{ headerShown: false }} />
        <Stack.Screen name="subscription" options={{ headerShown: false }} />
        <Stack.Screen name="appearance" options={{ headerShown: false }} />
        <Stack.Screen name="faq" options={{ headerShown: false }} />
        <Stack.Screen name="about" options={{ headerShown: false }} />
        <Stack.Screen
          name="confirm"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen name="camera" options={{ headerShown: false, animation: 'fade' }} />
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </GestureHandlerRootView>
  );
}

const styles = {
  loader: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
