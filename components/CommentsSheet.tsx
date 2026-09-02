import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { addComment, listComments, type Comment } from '@/lib/engagement';

function Avatar({ uri, name, size = 36 }: { uri: string | null; name: string; size?: number }) {
  const palette = colors[useScheme()];
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: palette.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ color: palette.onPrimary, fontWeight: '700', fontSize: size * 0.4 }}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export function CommentsSheet({
  activityId,
  visible,
  onClose,
  onChanged,
}: {
  activityId: string | null;
  visible: boolean;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const palette = colors[useScheme()];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible || !activityId) return;
    setLoading(true);
    listComments(activityId).then((c) => {
      setComments(c);
      setLoading(false);
    });
  }, [visible, activityId]);

  async function handleSend() {
    const body = text.trim();
    if (!body || !activityId || sending) return;
    setText('');
    setSending(true);
    const ok = await addComment(activityId, body);
    if (ok) {
      setComments(await listComments(activityId));
      onChanged?.();
    }
    setSending(false);
  }

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView
            edges={['bottom']}
            style={[styles.sheet, { backgroundColor: palette.background }]}>
            <View style={styles.handle} />
            <Text style={[styles.title, { color: palette.text }]}>Comentários</Text>
            {loading ? (
              <ActivityIndicator color={palette.primary} style={{ marginVertical: 24 }} />
            ) : (
              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                {comments.length === 0 ? (
                  <Text style={[styles.empty, { color: palette.textMuted }]}>
                    Seja o primeiro a comentar.
                  </Text>
                ) : (
                  comments.map((c) => (
                    <View key={c.id} style={styles.row}>
                      <Pressable onPress={() => { onClose(); router.push(`/user/${c.user_id}`); }}>
                        <Avatar uri={c.author_avatar} name={c.author_name} />
                      </Pressable>
                      <View style={[styles.bubble, { backgroundColor: palette.card }]}>
                        <Text style={[styles.author, { color: palette.text }]}>{c.author_name}</Text>
                        <Text style={[styles.body, { color: palette.text }]}>{c.body}</Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
            <View style={[styles.inputBar, { borderTopColor: palette.border, paddingBottom: insets.bottom > 0 ? 0 : 8 }]}>
              <TextInput
                style={[styles.input, { backgroundColor: palette.card, color: palette.text }]}
                value={text}
                onChangeText={setText}
                placeholder="Escreva um comentário..."
                placeholderTextColor={palette.textMuted}
                multiline
              />
              <Pressable
                style={[styles.sendBtn, { backgroundColor: text.trim() ? palette.primary : palette.border }]}
                onPress={handleSend}
                disabled={!text.trim() || sending}>
                <Ionicons name="send" size={18} color={palette.onPrimary} />
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#9993', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  empty: { textAlign: 'center', paddingVertical: 24, fontSize: 14 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 12, alignItems: 'flex-start' },
  bubble: { flex: 1, borderRadius: 14, padding: 10 },
  author: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  body: { fontSize: 15, lineHeight: 20 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 10, borderTopWidth: 0.5 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
