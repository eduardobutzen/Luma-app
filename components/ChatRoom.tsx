import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
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
import { useMessages, type Participants } from '@/hooks/useMessages';
import { useScheme } from '@/hooks/useScheme';
import {
  getProgressPhotos,
  getRecentMeals,
  markChatRead,
  sendMessage,
  sendShare,
  type ChatMessage,
  type ProgressPhotoLite,
  type RecentMeal,
} from '@/lib/chat';
import {
  listDiscoverRecipesResult,
  listMyRecipes,
  type CommunityRecipe,
  type MyRecipe,
} from '@/lib/userRecipes';

const KIND_LABEL: Record<string, string> = {
  recipe: 'Receita',
  meal: 'Refeição',
  progress: 'Foto de progresso',
};

type AttachTab = 'recipe' | 'community' | 'meal' | 'progress';

const ATTACH_PLACEHOLDER: Record<AttachTab, string> = {
  recipe: 'Buscar nas minhas receitas...',
  community: 'Buscar receitas do app...',
  meal: 'Buscar refeição (nome ou tipo)...',
  progress: 'Buscar foto (nota ou data)...',
};

/** Compara ignorando acentos e caixa — buscar "cafe" acha "café". */
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .toLowerCase();
}

export function ChatRoom({
  dmId,
  groupId,
  title,
  myId,
  participants,
  onTitlePress,
}: {
  dmId?: string;
  groupId?: string;
  title: string;
  myId: string | null;
  participants: Participants;
  onTitlePress?: () => void;
}) {
  const scheme = useScheme();
  const palette = colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { messages, loading } = useMessages({ dmId, groupId }, participants);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Anexar receita/refeição.
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachTab, setAttachTab] = useState<AttachTab>('recipe');
  const [myRecipes, setMyRecipes] = useState<MyRecipe[]>([]);
  const [community, setCommunity] = useState<CommunityRecipe[]>([]);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [attachQuery, setAttachQuery] = useState('');
  const [recentMeals, setRecentMeals] = useState<RecentMeal[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhotoLite[]>([]);
  const [attachLoading, setAttachLoading] = useState(false);

  const isGroup = !!groupId;
  const target = dmId ? { dmId } : { groupId };

  function openAttach() {
    setAttachOpen(true);
    setAttachLoading(true);
    setAttachQuery('');
    Promise.all([listMyRecipes(), getRecentMeals(), getProgressPhotos()])
      .then(([r, m, p]) => {
        setMyRecipes(r);
        setRecentMeals(m);
        setProgressPhotos(p);
      })
      .finally(() => setAttachLoading(false));
  }

  function switchAttachTab(t: AttachTab) {
    setAttachTab(t);
    setAttachQuery('');
  }

  // A comunidade é buscada no servidor: a RPC devolve no máximo 40 linhas, então
  // filtrar no cliente esconderia todo o resto do acervo.
  useEffect(() => {
    if (!attachOpen || attachTab !== 'community') return;
    let alive = true;
    setCommunityLoading(true);
    const t = setTimeout(async () => {
      const { items, error } = await listDiscoverRecipesResult(attachQuery.trim());
      if (!alive) return;
      setCommunity(items);
      setCommunityError(error);
      setCommunityLoading(false);
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [attachOpen, attachTab, attachQuery]);

  const q = norm(attachQuery.trim());
  const shownRecipes = myRecipes.filter((r) => norm(r.title).includes(q));
  const shownMeals = recentMeals.filter((m) =>
    norm(`${m.description ?? ''} ${m.type}`).includes(q),
  );
  const shownPhotos = progressPhotos.filter((p) =>
    norm(`${p.note ?? ''} ${new Date(p.taken_at).toLocaleDateString('pt-BR')}`).includes(q),
  );

  async function sendProgress(p: ProgressPhotoLite) {
    setAttachOpen(false);
    await sendShare(target, {
      kind: 'progress',
      refId: p.id,
      title: p.note ?? 'Foto de progresso',
      image_url: p.image_url,
    });
  }

  async function sendRecipe(r: { id: string; title: string; image_url: string | null; kcal: number }) {
    setAttachOpen(false);
    await sendShare(target, {
      kind: 'recipe',
      refId: r.id,
      title: r.title,
      image_url: r.image_url,
      kcal: r.kcal,
    });
  }

  async function sendMeal(m: RecentMeal) {
    setAttachOpen(false);
    await sendShare(target, {
      kind: 'meal',
      refId: m.id,
      title: m.description ?? m.type,
      image_url: m.image_url,
      kcal: m.kcal,
    });
  }

  // Com o teclado aberto a barra encosta nele: aí a área segura inferior já não
  // existe, e mantê-la deixaria um vão morto entre o campo e o teclado.
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Marca a conversa como lida ao abrir e sempre que chegam novas mensagens.
  useEffect(() => {
    if (dmId) markChatRead('dm', dmId);
    else if (groupId) markChatRead('group', groupId);
  }, [dmId, groupId, messages.length]);

  async function handleSend() {
    const body = text.trim();
    if (!body || sending) return;
    setText('');
    setSending(true);
    await sendMessage({ dmId, groupId, kind: 'text', body });
    setSending(false);
  }

  function renderBubble(m: ChatMessage) {
    const mine = m.sender_id === myId;
    const meta = m.meta as { title?: string; image_url?: string; kcal?: number; source?: string };
    const isShare = m.kind !== 'text';
    // Receitas antigas vindas da API externa não têm tela: só as do app abrem.
    const tappable = m.kind === 'recipe' && !!m.ref_id && meta.source !== 'spoonacular';
    const recipeHref = `/community-recipe/${m.ref_id}`;

    return (
      <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowOther]}>
        <View
          style={[
            styles.bubble,
            mine
              ? { backgroundColor: palette.primary }
              : { backgroundColor: palette.surface },
          ]}>
          {isGroup && !mine ? (
            <Text style={[styles.sender, { color: palette.text }]}>{m.sender_name}</Text>
          ) : null}

          {isShare ? (
            <Pressable
              disabled={!tappable}
              onPress={() => tappable && router.push(recipeHref)}
              style={[styles.shareCard, { backgroundColor: mine ? 'rgba(127,127,127,0.25)' : palette.background }]}>
              {meta.image_url ? (
                <Image source={{ uri: meta.image_url }} style={styles.shareThumb} />
              ) : (
                <View style={[styles.shareThumb, styles.shareThumbEmpty, { backgroundColor: palette.trackBg }]}>
                  <Ionicons name="restaurant-outline" size={18} color={palette.primary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.shareKind, { color: mine ? palette.onPrimary : palette.textMuted }]}>
                  {KIND_LABEL[m.kind] ?? 'Compartilhado'}
                </Text>
                <Text style={[styles.shareTitle, { color: mine ? palette.onPrimary : palette.text }]} numberOfLines={2}>
                  {meta.title ?? '—'}
                </Text>
                {typeof meta.kcal === 'number' ? (
                  <Text style={[styles.shareKcal, { color: mine ? palette.onPrimary : palette.textMuted }]}>
                    {meta.kcal} kcal
                  </Text>
                ) : null}
              </View>
              {tappable ? (
                <Ionicons name="chevron-forward" size={16} color={mine ? palette.onPrimary : palette.textMuted} />
              ) : null}
            </Pressable>
          ) : (
            <Text style={[styles.bubbleText, { color: mine ? palette.onPrimary : palette.text }]}>{m.body}</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Pressable>
        <Pressable style={styles.headerTitleWrap} onPress={onTitlePress} disabled={!onTitlePress}>
          <Text style={[styles.headerTitle, { color: palette.text }]} numberOfLines={1}>
            {title}
          </Text>
        </Pressable>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <ActivityIndicator color={palette.primary} style={{ marginTop: 32 }} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: palette.textMuted }]}>
                Nenhuma mensagem ainda. Diga oi! 👋
              </Text>
            }
            renderItem={({ item }) => renderBubble(item)}
          />
        )}

        {/* A tela não reserva a área segura inferior (o teclado precisa colar na
            barra), então a folga da home indicator entra aqui. */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: palette.card,
              borderTopColor: palette.border,
              paddingBottom: keyboardOpen ? 10 : Math.max(insets.bottom, 10),
            },
          ]}>
          <Pressable style={styles.attachBtn} onPress={openAttach} hitSlop={6}>
            <Ionicons name="add-circle" size={30} color={palette.primary} />
          </Pressable>
          <TextInput
            style={[styles.input, { color: palette.text, backgroundColor: palette.surface }]}
            value={text}
            onChangeText={setText}
            placeholder="Mensagem..."
            placeholderTextColor={palette.textMuted}
            multiline
          />
          <Pressable
            style={[styles.sendBtn, { backgroundColor: text.trim() ? palette.primary : palette.border }]}
            onPress={handleSend}
            disabled={!text.trim()}>
            <Ionicons name="send" size={18} color={palette.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Anexar receita/refeição */}
      <Modal visible={attachOpen} transparent animationType="slide" onRequestClose={() => setAttachOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setAttachOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: palette.background }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={[styles.attachTabs, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
              {(['recipe', 'community', 'meal', 'progress'] as const).map((t) => {
                const on = attachTab === t;
                const label =
                  t === 'recipe'
                    ? 'Minhas'
                    : t === 'community'
                      ? 'Descobrir'
                      : t === 'meal'
                        ? 'Refeições'
                        : 'Progresso';
                return (
                  <Pressable
                    key={t}
                    onPress={() => switchAttachTab(t)}
                    style={[styles.attachTab, on && { backgroundColor: palette.primary }]}>
                    <Text style={[styles.attachTabText, { color: on ? palette.onPrimary : palette.textMuted }]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Busca disponível nas quatro abas */}
            <View style={[styles.attachSearch, { backgroundColor: palette.surface }]}>
              <Ionicons name="search" size={16} color={palette.textMuted} />
              <TextInput
                style={[styles.attachInput, { color: palette.text }]}
                value={attachQuery}
                onChangeText={setAttachQuery}
                placeholder={ATTACH_PLACEHOLDER[attachTab]}
                placeholderTextColor={palette.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {attachQuery.length > 0 ? (
                <Pressable onPress={() => setAttachQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={palette.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {attachLoading ? (
              <ActivityIndicator color={palette.primary} style={{ marginVertical: 24 }} />
            ) : (
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                {attachTab === 'recipe' ? (
                  shownRecipes.length === 0 ? (
                    <Text style={[styles.attachEmpty, { color: palette.textMuted }]}>
                      {myRecipes.length === 0
                        ? 'Você ainda não criou receitas.'
                        : 'Nenhuma receita sua com esse termo.'}
                    </Text>
                  ) : (
                    shownRecipes.map((r) => (
                      <Pressable
                        key={r.id}
                        style={[styles.attachRow, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
                        onPress={() => sendRecipe(r)}>
                        {r.image_url ? (
                          <Image source={{ uri: r.image_url }} style={styles.attachThumb} />
                        ) : (
                          <View style={[styles.attachThumb, styles.attachThumbEmpty, { backgroundColor: palette.trackBg }]}>
                            <Ionicons name="restaurant-outline" size={18} color={palette.primary} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.attachTitle, { color: palette.text }]} numberOfLines={1}>
                            {r.title}
                          </Text>
                          <Text style={[styles.attachSub, { color: palette.textMuted }]}>
                            {r.kcal} kcal/porção
                          </Text>
                        </View>
                        <Ionicons name="send" size={18} color={palette.primary} />
                      </Pressable>
                    ))
                  )
                ) : attachTab === 'community' ? (
                  communityLoading ? (
                    <ActivityIndicator color={palette.primary} style={{ marginVertical: 24 }} />
                  ) : communityError ? (
                    <Text style={[styles.attachEmpty, { color: palette.danger }]}>
                      Não foi possível carregar a comunidade: {communityError}
                    </Text>
                  ) : community.length === 0 ? (
                    <Text style={[styles.attachEmpty, { color: palette.textMuted }]}>
                      {attachQuery.trim()
                        ? 'Nenhuma receita pública com esse termo.'
                        : 'Ainda não há receitas públicas.'}
                    </Text>
                  ) : (
                    community.map((c) => (
                      <Pressable
                        key={c.id}
                        style={[styles.attachRow, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
                        onPress={() => sendRecipe(c)}>
                        {c.image_url ? (
                          <Image source={{ uri: c.image_url }} style={styles.attachThumb} />
                        ) : (
                          <View style={[styles.attachThumb, styles.attachThumbEmpty, { backgroundColor: palette.trackBg }]}>
                            <Ionicons name="restaurant-outline" size={18} color={palette.textMuted} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.attachTitle, { color: palette.text }]} numberOfLines={1}>
                            {c.title}
                          </Text>
                          <Text style={[styles.attachSub, { color: palette.textMuted }]}>
                            {c.kcal} kcal · por {c.author_name}
                          </Text>
                        </View>
                        <Ionicons name="send" size={18} color={palette.primary} />
                      </Pressable>
                    ))
                  )
                ) : attachTab === 'meal' ? (
                  shownMeals.length === 0 ? (
                    <Text style={[styles.attachEmpty, { color: palette.textMuted }]}>
                      {recentMeals.length === 0
                        ? 'Nenhuma refeição registrada ainda.'
                        : 'Nenhuma refeição com esse termo.'}
                    </Text>
                  ) : (
                    shownMeals.map((m) => (
                      <Pressable
                        key={m.id}
                        style={[styles.attachRow, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
                        onPress={() => sendMeal(m)}>
                        {m.image_url ? (
                          <Image source={{ uri: m.image_url }} style={styles.attachThumb} />
                        ) : (
                          <View style={[styles.attachThumb, styles.attachThumbEmpty, { backgroundColor: palette.trackBg }]}>
                            <Ionicons name="fast-food-outline" size={18} color={palette.primary} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.attachTitle, { color: palette.text }]} numberOfLines={1}>
                            {m.description ?? m.type}
                          </Text>
                          <Text style={[styles.attachSub, { color: palette.textMuted }]}>
                            {m.type} · {m.kcal} kcal
                          </Text>
                        </View>
                        <Ionicons name="send" size={18} color={palette.primary} />
                      </Pressable>
                    ))
                  )
                ) : shownPhotos.length === 0 ? (
                  <Text style={[styles.attachEmpty, { color: palette.textMuted }]}>
                    {progressPhotos.length === 0
                      ? 'Nenhuma foto de progresso ainda.'
                      : 'Nenhuma foto com esse termo.'}
                  </Text>
                ) : (
                  shownPhotos.map((p) => (
                    <Pressable
                      key={p.id}
                      style={[styles.attachRow, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
                      onPress={() => sendProgress(p)}>
                      <Image source={{ uri: p.image_url }} style={styles.attachThumb} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.attachTitle, { color: palette.text }]} numberOfLines={1}>
                          {p.note ?? 'Foto de progresso'}
                        </Text>
                        <Text style={[styles.attachSub, { color: palette.textMuted }]}>
                          {new Date(p.taken_at).toLocaleDateString('pt-BR')}
                        </Text>
                      </View>
                      <Ionicons name="send" size={18} color={palette.primary} />
                    </Pressable>
                  ))
                )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  headerTitleWrap: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  list: { padding: 12, gap: 4 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 14 },
  bubbleRow: { flexDirection: 'row', marginVertical: 3 },
  rowMine: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9 },
  sender: { fontSize: 12, fontWeight: '700', marginBottom: 3 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  shareCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 8, minWidth: 200 },
  shareThumb: { width: 44, height: 44, borderRadius: 8 },
  shareThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  shareKind: { fontSize: 11 },
  shareTitle: { fontSize: 14, fontWeight: '600', marginTop: 1 },
  shareKcal: { fontSize: 11, marginTop: 1 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 15, maxHeight: 120 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  attachBtn: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#9993', marginBottom: 14 },
  attachTabs: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4, marginBottom: 12 },
  attachTab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  attachTabText: { fontSize: 13, fontWeight: '600' },
  attachSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  attachInput: { flex: 1, fontSize: 14, padding: 0 },
  attachEmpty: { textAlign: 'center', paddingVertical: 24, fontSize: 14 },
  attachRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 10, marginBottom: 8 },
  attachThumb: { width: 44, height: 44, borderRadius: 8 },
  attachThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  attachTitle: { fontSize: 15, fontWeight: '600' },
  attachSub: { fontSize: 12, marginTop: 1 },
});
