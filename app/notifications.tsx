import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { listNotifications, markNotificationsRead, type AppNotification } from '@/lib/engagement';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function describe(n: AppNotification): string {
  const actor = n.actor_name ?? 'Alguém';
  switch (n.type) {
    case 'friend_request':
      return `${actor} enviou um pedido de amizade`;
    case 'friend_accept':
      return `${actor} aceitou seu pedido de amizade`;
    case 'reaction':
      return `${actor} reagiu ${(n.meta as { emoji?: string }).emoji ?? '❤️'}`;
    case 'comment': {
      const preview = (n.meta as { preview?: string }).preview;
      return `${actor} comentou${preview ? `: "${preview}"` : ''}`;
    }
    case 'group_invite':
      return `${actor} te convidou para um grupo`;
    default:
      return `${actor}`;
  }
}

const ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  friend_request: 'person-add',
  friend_accept: 'people',
  reaction: 'heart',
  comment: 'chatbubble',
  group_invite: 'flame',
};

export default function NotificationsScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await listNotifications();
    setItems(data);
    setLoading(false);
    markNotificationsRead(); // marca tudo como lido ao abrir
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function open(n: AppNotification) {
    if (n.type === 'reaction' || n.type === 'comment') {
      // posts não têm tela própria; leva ao perfil do autor da ação por ora
      if (n.actor_id) router.push(`/user/${n.actor_id}`);
    } else if (n.type === 'friend_request' || n.type === 'friend_accept') {
      if (n.ref_id) router.push(`/user/${n.ref_id}`);
    } else if (n.type === 'group_invite') {
      if (n.ref_id) router.push(`/streak-group/${n.ref_id}`);
    }
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>Notificações</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={palette.primary} style={{ marginTop: 48 }} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="notifications-outline" size={48} color={palette.textMuted} />
              <Text style={[styles.emptyText, { color: palette.textMuted }]}>
                Sem notificações por enquanto.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.row,
              { backgroundColor: item.read ? palette.background : palette.card },
            ]}
            onPress={() => open(item)}>
            {item.actor_avatar ? (
              <Image source={{ uri: item.actor_avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: palette.primary }]}>
                <Ionicons name={ICON[item.type] ?? 'notifications'} size={18} color={palette.onPrimary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.text, { color: palette.text }]}>{describe(item)}</Text>
              <Text style={[styles.time, { color: palette.textMuted }]}>{timeAgo(item.created_at)}</Text>
            </View>
            {!item.read ? <View style={[styles.dot, { backgroundColor: palette.primary }]} /> : null}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 18, fontWeight: '700' },
  list: { padding: 16, gap: 8 },
  empty: { alignItems: 'center', marginTop: 64, gap: 12 },
  emptyText: { fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 14, lineHeight: 19 },
  time: { fontSize: 12, marginTop: 2 },
  dot: { width: 9, height: 9, borderRadius: 99 },
});
