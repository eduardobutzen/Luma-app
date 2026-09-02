import { Ionicons } from '@expo/vector-icons';
import { Tabs, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HidingTabBar } from '@/components';
import { colors } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import { useScheme } from '@/hooks/useScheme';
import { ScrollHideProvider } from '@/hooks/useScrollHide';

/** Ícone da tab: contorno quando inativo, sólido quando ativo (padrão X/Twitter). */
function tabIcon(name: string) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons
      name={(focused ? name : `${name}-outline`) as keyof typeof Ionicons.glyphMap}
      color={color}
      size={size}
    />
  );
}

/**
 * A aba de perfil mostra o avatar do usuário; o anel marca a aba ativa, já que
 * uma foto não muda de contorno para sólido como os outros ícones.
 */
function AvatarTabIcon({
  uri,
  color,
  size,
  focused,
}: {
  uri: string | null | undefined;
  color: string;
  size: number;
  focused: boolean;
}) {
  if (!uri) {
    return (
      <Ionicons
        name={focused ? 'person' : 'person-outline'}
        color={color}
        size={size}
      />
    );
  }
  const d = size + 4;
  return (
    <View
      style={{
        width: d,
        height: d,
        borderRadius: d / 2,
        borderWidth: focused ? 2 : 0,
        borderColor: color,
        padding: focused ? 1 : 0,
      }}>
      <Image source={{ uri }} style={styles.avatar} />
    </View>
  );
}

export default function TabsLayout() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const insets = useSafeAreaInsets();
  const { profile, refetch } = useProfile();

  // O avatar da aba precisa refletir a troca de foto — recarrega ao sair da
  // edição de perfil, que é o único lugar onde ele muda.
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  useEffect(() => {
    if (prevPath.current === '/edit-profile' && pathname !== '/edit-profile') refetch();
    prevPath.current = pathname;
  }, [pathname, refetch]);

  return (
    <ScrollHideProvider>
      <TabsNav palette={palette} insets={insets} avatarUri={profile?.avatar_url} />
    </ScrollHideProvider>
  );
}

function TabsNav({
  palette,
  insets,
  avatarUri,
}: {
  palette: (typeof colors)['light' | 'dark'];
  insets: { bottom: number };
  avatarUri: string | null | undefined;
}) {
  return (
    <Tabs
      // A barra é envolvida para poder deslizar junto com o cabeçalho.
      tabBar={(props) => <HidingTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: palette.text,
        tabBarInactiveTintColor: palette.textMuted,
        // Cada aba desenha o próprio cabeçalho com <ScreenHeader>; manter o
        // header nativo deixava dois títulos empilhados.
        headerShown: false,
        // Barra sólida separada por um traço de 1px — sem relevo, sem flutuar.
        // O posicionamento fica com o wrapper animado.
        tabBarStyle: {
          backgroundColor: palette.card,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: palette.border,
          elevation: 0,
          height: 52 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        // Sem rótulos: só o ícone, como no X.
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: tabIcon('home') }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'Histórico', tabBarIcon: tabIcon('time') }}
      />
      <Tabs.Screen
        name="recipes"
        options={{ title: 'Receitas', tabBarIcon: tabIcon('book') }}
      />
      <Tabs.Screen
        name="social"
        options={{ title: 'Amigos', tabBarIcon: tabIcon('people') }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size, focused }) => (
            <AvatarTabIcon uri={avatarUri} color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  avatar: { flex: 1, borderRadius: 999 },
});
