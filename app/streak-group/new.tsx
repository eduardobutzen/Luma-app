import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, neo } from '@/constants/theme';
import { useFriends } from '@/hooks/useFriends';
import { useScheme } from '@/hooks/useScheme';
import { createStreakGroup } from '@/lib/streaks';

export default function NewStreakGroupScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();
  const { friends, refetch } = useFriends();

  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  function toggle(id: string) {
    Haptics.selectionAsync();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    if (saving) return;
    if (name.trim().length < 2) {
      Alert.alert('Nome', 'Dê um nome ao grupo (mín. 2 caracteres).');
      return;
    }
    setSaving(true);
    const gid = await createStreakGroup(name.trim(), Array.from(selected));
    setSaving(false);
    if (!gid) {
      Alert.alert('Erro', 'Não foi possível criar o grupo.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(`/streak-group/${gid}`);
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>Novo grupo</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={friends}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <TextInput
              style={[styles.nameInput, { backgroundColor: palette.card, color: palette.text }]}
              value={name}
              onChangeText={setName}
              placeholder="Nome do grupo (ex.: Foco Total)"
              placeholderTextColor={palette.textMuted}
              maxLength={40}
            />
            <Text style={[styles.hint, { color: palette.textMuted }]}>
              O streak do grupo só avança nos dias em que TODOS cumprem a meta de calorias.
            </Text>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              Convidar amigos {selected.size > 0 ? `· ${selected.size}` : ''}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.hint, { color: palette.textMuted }]}>
            Você ainda não tem amigos para convidar. Adicione amigos primeiro.
          </Text>
        }
        renderItem={({ item }) => {
          const on = selected.has(item.id);
          return (
            <Pressable
              style={[styles.row, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
              onPress={() => toggle(item.id)}>
              <View style={styles.rowLeft}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: palette.primary }]}>
                    <Text style={[styles.avatarInitial, { color: palette.onPrimary }]}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View>
                  <Text style={[styles.rowName, { color: palette.text }]}>{item.name}</Text>
                  {item.username ? (
                    <Text style={[styles.rowSub, { color: palette.textMuted }]}>@{item.username}</Text>
                  ) : null}
                </View>
              </View>
              <Ionicons
                name={on ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={on ? palette.primary : palette.textMuted}
              />
            </Pressable>
          );
        }}
      />

      <Pressable
        style={[styles.createBtn, { backgroundColor: palette.primary }]}
        onPress={handleCreate}
        disabled={saving}>
        {saving ? <ActivityIndicator color={palette.onPrimary} /> : <Text style={[styles.createText, { color: palette.onPrimary }]}>Criar grupo</Text>}
      </Pressable>
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
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  nameInput: { borderRadius: 12, padding: 14, fontSize: 15 },
  hint: { fontSize: 13, lineHeight: 19, marginTop: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginTop: 20, marginBottom: 8 },
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
  createBtn: {
    position: 'absolute',
    bottom: 28,
    left: 16,
    right: 16,
    paddingVertical: 15,
    borderRadius: 99,
    alignItems: 'center',
  },
  createText: { fontSize: 16, fontWeight: '600' },
});
