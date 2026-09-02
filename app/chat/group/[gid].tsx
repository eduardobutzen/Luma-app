import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatRoom } from '@/components/ChatRoom';
import { colors } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { getGroupMembers, listStreakGroups } from '@/lib/streaks';
import { currentUserId } from '@/lib/session';
import type { Participants } from '@/hooks/useMessages';

export default function GroupChatScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();
  const { gid } = useLocalSearchParams<{ gid: string }>();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('Grupo');
  const [myId, setMyId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participants>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!gid) return;
      const me = await currentUserId();
      const [groups, members] = await Promise.all([listStreakGroups(), getGroupMembers(gid)]);
      if (!active) return;
      setMyId(me);
      const g = groups.find((x) => x.id === gid);
      setTitle(g?.name ?? 'Grupo');
      if (!g || g.my_status !== 'active') {
        setError('Entre no grupo para participar da conversa.');
      }
      const map: Participants = {};
      members.forEach((m) => {
        map[m.user_id] = { name: m.name, avatar: m.avatar_url };
      });
      setParticipants(map);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [gid]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    );
  }

  if (error || !gid) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
        </View>
        <View style={styles.center}>
          <Text style={{ color: palette.textMuted, textAlign: 'center', paddingHorizontal: 32 }}>
            {error ?? 'Conversa indisponível.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ChatRoom
      groupId={gid}
      title={title}
      myId={myId}
      participants={participants}
      onTitlePress={() => router.push(`/streak-group/${gid}`)}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
});
