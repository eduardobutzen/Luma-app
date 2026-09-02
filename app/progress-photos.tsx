import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
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

import { colors, neo } from '@/constants/theme';
import { useProgressPhotos, type ProgressPhoto } from '@/hooks/useProgressPhotos';
import { useScheme } from '@/hooks/useScheme';
import { shareProgressPhoto } from '@/lib/feed';

const GAP = 12;
const PADDING = 16;
const COL_WIDTH = (Dimensions.get('window').width - PADDING * 2 - GAP) / 2;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function ProgressPhotosScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();

  const { photos, loading, refetch, add, remove } = useProgressPhotos();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [viewer, setViewer] = useState<ProgressPhoto | null>(null);
  // Composição ao adicionar: foto escolhida + descrição + compartilhar.
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [composeShare, setComposeShare] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  function handlePicked(uri: string) {
    // Abre a composição (descrição + compartilhar) antes de salvar.
    setNoteText('');
    setComposeShare(false);
    setPendingUri(uri);
  }

  async function handleSaveCompose() {
    if (!pendingUri || saving) return;
    setSaving(true);
    const res = await add(pendingUri, { note: noteText.trim() || null });
    if (res.ok && composeShare && res.photo) {
      await shareProgressPhoto({
        id: res.photo.id,
        image_url: res.photo.image_url,
        note: res.photo.note,
      });
    }
    setSaving(false);
    if (res.ok) {
      setPendingUri(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert('Erro ao salvar', res.error ?? 'Não foi possível salvar a foto.');
    }
  }

  function handleAdd() {
    Alert.alert('Adicionar foto', 'De onde você quer a foto?', [
      {
        text: 'Câmera',
        onPress: async () => {
          const p = await ImagePicker.requestCameraPermissionsAsync();
          if (!p.granted) return;
          const r = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!r.canceled) handlePicked(r.assets[0].uri);
        },
      },
      {
        text: 'Galeria',
        onPress: async () => {
          const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!p.granted) return;
          const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
          if (!r.canceled) handlePicked(r.assets[0].uri);
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  function handleShare(photo: ProgressPhoto) {
    Alert.alert(
      'Compartilhar no feed',
      'Esta foto ficará visível para seus amigos no feed. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Compartilhar',
          onPress: async () => {
            const ok = await shareProgressPhoto({
              id: photo.id,
              image_url: photo.image_url,
              note: photo.note,
            });
            if (ok) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Compartilhado!', 'Sua foto apareceu no feed dos amigos.');
            } else {
              Alert.alert('Erro', 'Não foi possível compartilhar.');
            }
          },
        },
      ],
    );
  }

  function handleDelete(photo: ProgressPhoto) {
    Alert.alert('Excluir foto', 'Esta foto será removida permanentemente.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setViewer(null);
          await remove(photo.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>Fotos de progresso</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={photos}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>
            Registre fotos do seu corpo de tempos em tempos e acompanhe sua evolução. São
            privadas — só você vê.
          </Text>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={palette.primary} style={{ marginTop: 48 }} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={48} color={palette.textMuted} />
              <Text style={[styles.emptyText, { color: palette.textMuted }]}>
                Nenhuma foto ainda. Adicione a primeira para começar a acompanhar.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.cell, { width: COL_WIDTH, backgroundColor: palette.card }]}
            onPress={() => setViewer(item)}>
            <Image source={{ uri: item.image_url }} style={styles.thumb} resizeMode="cover" />
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>{formatDate(item.taken_at)}</Text>
            </View>
          </Pressable>
        )}
      />

      {/* Add button */}
      <Pressable
        style={[styles.fab, { backgroundColor: palette.primary }]}
        onPress={handleAdd}
        disabled={saving}>
        {saving ? (
          <ActivityIndicator color={palette.onPrimary} />
        ) : (
          <>
            <Ionicons name="camera" size={20} color={palette.onPrimary} />
            <Text style={[styles.fabText, { color: palette.onPrimary }]}>Adicionar foto</Text>
          </>
        )}
      </Pressable>

      {/* Fullscreen viewer */}
      <Modal
        visible={!!viewer}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setViewer(null)}>
        <View style={[styles.viewerBackdrop, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.viewerSafe}>
            <View style={styles.viewerHeader}>
              <Pressable onPress={() => setViewer(null)} hitSlop={8}>
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </Pressable>
              {viewer ? (
                <View style={styles.viewerActions}>
                  <Pressable onPress={() => handleShare(viewer)} hitSlop={8}>
                    <Ionicons name="share-social-outline" size={24} color="#FFFFFF" />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(viewer)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={24} color={palette.danger} />
                  </Pressable>
                </View>
              ) : null}
            </View>
            {viewer ? (
              <>
                <Image source={{ uri: viewer.image_url }} style={styles.viewerImage} resizeMode="contain" />
                <Text style={styles.viewerDate}>{formatDate(viewer.taken_at)}</Text>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Compor nova foto: descrição + compartilhar */}
      <Modal
        visible={!!pendingUri}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => setPendingUri(null)}>
        <KeyboardAvoidingView
          style={styles.composeBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.composeSheet, { backgroundColor: palette.card, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.composeTitle, { color: palette.text }]}>Nova foto de progresso</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {pendingUri ? (
                <Image source={{ uri: pendingUri }} style={styles.composePreview} resizeMode="cover" />
              ) : null}
              <TextInput
                style={[styles.composeInput, { backgroundColor: palette.card, color: palette.text }]}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Descrição (opcional) — ex.: semana 1, pós-treino..."
                placeholderTextColor={palette.textMuted}
                multiline
              />
              <Pressable style={styles.composeToggle} onPress={() => setComposeShare((v) => !v)}>
                <Ionicons
                  name={composeShare ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={composeShare ? palette.primary : palette.textMuted}
                />
                <Text style={[styles.composeToggleText, { color: palette.text }]}>
                  Compartilhar no feed dos amigos
                </Text>
              </Pressable>
            </ScrollView>
            <View style={styles.composeBtns}>
              <Pressable
                style={[styles.composeCancel, { borderColor: palette.border }]}
                onPress={() => setPendingUri(null)}
                disabled={saving}>
                <Text style={{ color: palette.text, fontWeight: '600' }}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.composeSave, { backgroundColor: palette.primary }]}
                onPress={handleSaveCompose}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={palette.onPrimary} />
                ) : (
                  <Text style={{ color: palette.onPrimary, fontWeight: '700' }}>Salvar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PADDING,
    paddingVertical: 12,
  },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  list: { paddingHorizontal: PADDING, paddingBottom: 120 },
  cell: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: GAP,
  },
  thumb: { width: '100%', height: COL_WIDTH * 1.3 },
  dateBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  dateBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '500' },
  empty: { alignItems: 'center', marginTop: 64, paddingHorizontal: 32, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  fab: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 99,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: { fontSize: 15, fontWeight: '600' },
  viewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  viewerSafe: { flex: 1 },
  viewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: PADDING,
    paddingVertical: 8,
  },
  viewerActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  viewerImage: { flex: 1, width: '100%' },
  viewerDate: { color: '#FFFFFF', textAlign: 'center', paddingVertical: 16, fontSize: 15 },
  composeBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  composeSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '90%' },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#9993', marginBottom: 14 },
  composeTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  composePreview: { width: '100%', height: 180, borderRadius: 14, marginBottom: 12 },
  composeInput: { borderRadius: 12, padding: 14, fontSize: 15, minHeight: 56, textAlignVertical: 'top' },
  composeToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  composeToggleText: { fontSize: 14, fontWeight: '500' },
  composeBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  composeCancel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 99,
    paddingVertical: 14,
    alignItems: 'center',
  },
  composeSave: { flex: 2, borderRadius: 99, paddingVertical: 14, alignItems: 'center' },
});
