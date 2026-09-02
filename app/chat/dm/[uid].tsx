import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatRoom } from '@/components/ChatRoom';
import { colors } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { getOrCreateDm } from '@/lib/chat';
import { currentUserId } from '@/lib/session';
import { getProfileCard } from '@/lib/social';
import type { Participants } from '@/hooks/useMessages';

export default function DmChatScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();
  const { uid } = useLocalSearchParams<{ uid: string }>();

  const [loading, setLoading] = useState(true);
  const [dmId, setDmId] = useState<string | null>(null);
  const [title, setTitle] = useState('Conversa');
  const [myId, setMyId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participants>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!uid) return;
      const me = await currentUserId();
      const card = await getProfileCard(uid);
      const dm = await getOrCreateDm(uid);
      if (!active) return;
      setMyId(me);
      if (card) {
        setTitle(card.name);
        setParticipants({ [uid]: { name: card.name, avatar: card.avatar_url } });
      }
      if (!dm) setError('Vocês precisam ser amigos para conversar.');
      else setDmId(dm);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [uid]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    );
  }

  if (error || !dmId) {
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
      dmId={dmId}
      title={title}
      myId={myId}
      participants={participants}
      onTitlePress={() => router.push(`/user/${uid}`)}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
});
