import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, type ThemeColors, neo } from '@/constants/theme';
import { useFriends } from '@/hooks/useFriends';
import { useScheme } from '@/hooks/useScheme';
import { getOrCreateDm, sendShare, type MessageKind, type ShareTarget } from '@/lib/chat';
import { listStreakGroups, type StreakGroup } from '@/lib/streaks';

function Avatar({ uri, name, palette }: { uri: string | null; name: string; palette: ThemeColors }) {
  if (uri) return <Image source={{ uri }} style={styles.avatar} />;
  return (
    <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: palette.primary }]}>
      <Text style={[styles.avatarInitial, { color: palette.onPrimary }]}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export default function ShareToChatScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();
  const params = useLocalSearchParams<{
    kind: string;
    refId?: string;
    title: string;
    image?: string;
    kcal?: string;
    source?: string;
  }>();

  const { friends, refetch } = useFriends();
  const [groups, setGroups] = useState<StreakGroup[]>([]);
  const [sending, setSending] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
      listStreakGroups().then((g) => setGroups(g.filter((x) => x.my_status === 'active')));
    }, [refetch]),
  );

  const share: ShareTarget = {
    kind: (params.kind as MessageKind) ?? 'recipe',
    refId: params.refId ?? null,
    title: params.title ?? 'Compartilhado',
    image_url: params.image ?? null,
    kcal: params.kcal ? Number(params.kcal) : null,
  };

  async function shareToFriend(friendId: string) {
    if (sending) return;
    setSending(true);
    const dmId = await getOrCreateDm(friendId);
    if (!dmId) {
      setSending(false);
      Alert.alert('Erro', 'Não foi possível abrir a conversa.');
      return;
    }
    const ok = await sendShare({ dmId }, share);
    setSending(false);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/chat/dm/${friendId}`);
    } else {
      Alert.alert('Erro', 'Não foi possível enviar.');
    }
  }

  async function shareToGroup(gid: string) {
    if (sending) return;
    setSending(true);
    const ok = await sendShare({ groupId: gid }, share);
    setSending(false);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/chat/group/${gid}`);
    } else {
      Alert.alert('Erro', 'Não foi possível enviar.');
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={26} color={palette.text} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>Enviar para</Text>
        <View style={{ width: 26 }} />
      </View>

      {sending ? <ActivityIndicator color={palette.primary} style={{ marginVertical: 12 }} /> : null}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.preview, { color: palette.textMuted }]} numberOfLines={1}>
          {share.title}
        </Text>

        {groups.length > 0 ? (
          <>
            <Text style={[styles.section, { color: palette.text }]}>Grupos</Text>
            {groups.map((g) => (
              <Pressable
                key={g.id}
                style={[styles.row, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
                onPress={() => shareToGroup(g.id)}>
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: palette.trackBg }]}>
                  <Ionicons name="people" size={20} color={palette.primary} />
                </View>
                <Text style={[styles.rowName, { color: palette.text }]}>{g.name}</Text>
                <Ionicons name="send" size={18} color={palette.primary} />
              </Pressable>
            ))}
          </>
        ) : null}

        <Text style={[styles.section, { color: palette.text }]}>Amigos</Text>
        {friends.length === 0 ? (
          <Text style={[styles.hint, { color: palette.textMuted }]}>
            Você ainda não tem amigos para compartilhar.
          </Text>
        ) : (
          friends.map((f) => (
            <Pressable
              key={f.id}
              style={[styles.row, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
              onPress={() => shareToFriend(f.id)}>
              <Avatar uri={f.avatar_url} name={f.name} palette={palette} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, { color: palette.text }]}>{f.name}</Text>
                {f.username ? (
                  <Text style={[styles.rowSub, { color: palette.textMuted }]}>@{f.username}</Text>
                ) : null}
              </View>
              <Ionicons name="send" size={18} color={palette.primary} />
            </Pressable>
          ))
        )}
      </ScrollView>
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
  scroll: { padding: 16, paddingBottom: 40 },
  preview: { fontSize: 13, marginBottom: 16 },
  section: { fontSize: 14, fontWeight: '700', marginTop: 12, marginBottom: 8 },
  hint: { fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  rowName: { flex: 1, fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 13, marginTop: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 18, fontWeight: '700' },
});
