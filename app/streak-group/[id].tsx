import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, neo, streakColor } from '@/constants/theme';
import { useFriends } from '@/hooks/useFriends';
import { useScheme } from '@/hooks/useScheme';
import {
  acceptGroupInvite,
  getGroupMembers,
  inviteToGroup,
  leaveGroup,
  listStreakGroups,
  type GroupMember,
  type StreakGroup,
} from '@/lib/streaks';

function MemberAvatar({ uri, name }: { uri: string | null; name: string }) {
  const palette = colors[useScheme()];
  if (uri) return <Image source={{ uri }} style={styles.avatar} />;
  return (
    <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: palette.primary }]}>
      <Text style={[styles.avatarInitial, { color: palette.onPrimary }]}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export default function StreakGroupScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { friends } = useFriends();

  const [group, setGroup] = useState<StreakGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [groups, m] = await Promise.all([listStreakGroups(), getGroupMembers(id)]);
    setGroup(groups.find((g) => g.id === id) ?? null);
    setMembers(m);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleAccept() {
    if (!id) return;
    await acceptGroupInvite(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await load();
  }

  function handleLeave() {
    if (!id) return;
    const isOwner = group?.owner_id && members.find((mm) => mm.user_id === group.owner_id);
    Alert.alert(
      group?.my_status === 'invited' ? 'Recusar convite' : 'Sair do grupo',
      group?.my_status === 'invited'
        ? 'Deseja recusar o convite?'
        : 'Você deixará de participar deste grupo de streak.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: group?.my_status === 'invited' ? 'Recusar' : 'Sair',
          style: 'destructive',
          onPress: async () => {
            await leaveGroup(id);
            router.back();
          },
        },
      ],
    );
    void isOwner;
  }

  async function handleInvite(friendId: string) {
    if (!id) return;
    await inviteToGroup(id, friendId);
    Haptics.selectionAsync();
    setInviteOpen(false);
    await load();
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
        </View>
        <View style={[styles.center, { flex: 1 }]}>
          <Text style={{ color: palette.textMuted }}>Grupo indisponível.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const active = members.filter((m) => m.status === 'active');
  const invited = members.filter((m) => m.status === 'invited');
  const missingToday = active.filter((m) => !m.completed_today).length;
  const memberIds = new Set(members.map((m) => m.user_id));
  const invitable = friends.filter((f) => !memberIds.has(f.id));

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
          {group.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          {group.my_status === 'active' ? (
            <Pressable onPress={() => router.push(`/chat/group/${group.id}`)} hitSlop={8}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={palette.text} />
            </Pressable>
          ) : null}
          <Pressable onPress={handleLeave} hitSlop={8}>
            <Ionicons name="exit-outline" size={22} color={palette.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {group.my_status === 'invited' ? (
          <View style={[styles.inviteCard, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
            <Text style={[styles.inviteText, { color: palette.text }]}>
              Você foi convidado para este grupo.
            </Text>
            <Pressable style={[styles.acceptBtn, { backgroundColor: palette.primary }]} onPress={handleAccept}>
              <Text style={[styles.acceptText, { color: palette.onPrimary }]}>Entrar no grupo</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Streak counter */}
        <View style={[styles.streakCard, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
          <Ionicons name="flame" size={36} color={streakColor[scheme]} />
          <Text style={[styles.streakBig, { color: palette.text }]}>{group.streak}</Text>
          <Text style={[styles.streakLabel, { color: palette.textMuted }]}>
            {group.streak === 1 ? 'dia de streak coletivo' : 'dias de streak coletivo'}
          </Text>
          {group.my_status === 'active' ? (
            <Text style={[styles.todayHint, { color: missingToday === 0 ? palette.text : palette.textMuted }]}>
              {missingToday === 0
                ? 'Todos cumpriram hoje! 🎉'
                : `Faltam ${missingToday} de ${active.length} cumprirem hoje`}
            </Text>
          ) : null}
        </View>

        {/* Today's status */}
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Hoje</Text>
        {active.map((m) => (
          <Pressable
            key={m.user_id}
            style={[styles.row, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
            onPress={() => router.push(`/user/${m.user_id}`)}>
            <View style={styles.rowLeft}>
              <MemberAvatar uri={m.avatar_url} name={m.name} />
              <View>
                <Text style={[styles.rowName, { color: palette.text }]}>{m.name}</Text>
                {m.username ? (
                  <Text style={[styles.rowSub, { color: palette.textMuted }]}>@{m.username}</Text>
                ) : null}
              </View>
            </View>
            <Ionicons
              name={m.completed_today ? 'checkmark-circle' : 'ellipse-outline'}
              size={26}
              color={m.completed_today ? palette.text : palette.textMuted}
            />
          </Pressable>
        ))}

        {invited.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Convites pendentes</Text>
            {invited.map((m) => (
              <View key={m.user_id} style={[styles.row, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
                <View style={styles.rowLeft}>
                  <MemberAvatar uri={m.avatar_url} name={m.name} />
                  <Text style={[styles.rowName, { color: palette.text }]}>{m.name}</Text>
                </View>
                <Text style={[styles.rowSub, { color: palette.textMuted }]}>Pendente</Text>
              </View>
            ))}
          </>
        ) : null}

        {group.my_status === 'active' ? (
          <Pressable
            style={[styles.inviteMoreBtn, { borderColor: palette.primary }]}
            onPress={() => setInviteOpen(true)}>
            <Ionicons name="person-add-outline" size={18} color={palette.primary} />
            <Text style={[styles.inviteMoreText, { color: palette.primary }]}>Convidar amigos</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Invite modal */}
      <Modal visible={inviteOpen} transparent animationType="slide" onRequestClose={() => setInviteOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setInviteOpen(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: palette.card }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Convidar amigos</Text>
            {invitable.length === 0 ? (
              <Text style={[styles.rowSub, { color: palette.textMuted, padding: 16 }]}>
                Todos os seus amigos já estão no grupo (ou convidados).
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 360 }}>
                {invitable.map((f) => (
                  <Pressable
                    key={f.id}
                    style={[styles.row, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
                    onPress={() => handleInvite(f.id)}>
                    <View style={styles.rowLeft}>
                      <MemberAvatar uri={f.avatar_url} name={f.name} />
                      <Text style={[styles.rowName, { color: palette.text }]}>{f.name}</Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={24} color={palette.primary} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '700', flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  inviteCard: { borderRadius: 16, padding: 16, marginBottom: 16, gap: 12 },
  inviteText: { fontSize: 15, fontWeight: '500' },
  acceptBtn: { paddingVertical: 12, borderRadius: 99, alignItems: 'center' },
  acceptText: { fontSize: 15, fontWeight: '600' },
  streakCard: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 4 },
  streakBig: { fontSize: 56, fontWeight: '800' },
  streakLabel: { fontSize: 14 },
  todayHint: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginTop: 24, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 18, fontWeight: '700' },
  rowName: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 13, marginTop: 1 },
  inviteMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 99,
    paddingVertical: 13,
    marginTop: 16,
  },
  inviteMoreText: { fontSize: 15, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
});
