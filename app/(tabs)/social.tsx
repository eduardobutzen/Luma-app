import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, type useAnimatedScrollHandler } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, neo, streakColor } from '@/constants/theme';
import { useFeed } from '@/hooks/useFeed';
import { useFriends } from '@/hooks/useFriends';
import { useUnreadNotifications } from '@/hooks/useNotifications';
import { useScheme } from '@/hooks/useScheme';
import { useCollapsibleHeader } from '@/hooks/useScrollHide';
import { useStreaks } from '@/hooks/useStreaks';
import {
  getDmOverviews,
  getGroupChatOverviews,
  previewText,
  type DmOverview,
  type GroupChatOverview,
} from '@/lib/chat';
import { CollapsibleHeader, ScreenHeader, SegmentedTabs, type TabItem } from '@/components';
import {
  MediaBody,
  PostCard,
  PostFooter,
  PostHeader,
  StatBody,
  SummaryBody,
  ThumbBody,
  type PostType,
} from '@/components/feed/PostCard';
import { CommentsSheet } from '@/components/CommentsSheet';
import { ReactionPicker } from '@/components/ReactionPicker';
import { postDailySummary } from '@/lib/feed';
import { toggleReaction } from '@/lib/engagement';
import { searchUsers, type UserSearchResult } from '@/lib/social';

type Segment = 'feed' | 'friends' | 'streaks';

/** Os segmentos rolam sob o cabeçalho da tela, que mede e controla os dois. */
interface SegmentProps {
  headerHeight: number;
  onScroll: ReturnType<typeof useAnimatedScrollHandler>;
}
const SEGMENTS: TabItem<Segment>[] = [
  { key: 'feed', label: 'Feed' },
  { key: 'friends', label: 'Amigos' },
  { key: 'streaks', label: 'Streaks' },
];

function Avatar({ uri, name, size = 44 }: { uri: string | null; name: string; size?: number }) {
  const scheme = useScheme();
  const palette = colors[scheme];
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: palette.primary },
      ]}>
      <Text style={[styles.avatarInitial, { fontSize: size * 0.4, color: palette.onPrimary }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export default function SocialScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: Segment }>();

  const [segment, setSegment] = useState<Segment>(params.tab ?? 'friends');
  const { friends, incoming, outgoing, loading, refetch, add, accept, reject, remove } =
    useFriends();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dmOv, setDmOv] = useState<Record<string, DmOverview>>({});
  const { count: unread } = useUnreadNotifications();
  const { headerHeight, onHeaderHeight, onScroll } = useCollapsibleHeader();

  useFocusEffect(
    useCallback(() => {
      refetch();
      getDmOverviews().then((rows) => {
        const map: Record<string, DmOverview> = {};
        rows.forEach((r) => {
          map[r.other_id] = r;
        });
        setDmOv(map);
      });
    }, [refetch]),
  );

  // Busca por username/nome com debounce.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchUsers(q);
        setResults(r);
        setSearchError(null);
      } catch (e) {
        setResults([]);
        setSearchError(e instanceof Error ? e.message : 'Erro na busca');
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  async function handleAdd(user: UserSearchResult) {
    Haptics.selectionAsync();
    try {
      await add(user.id);
      setResults(await searchUsers(query.trim()));
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Erro ao adicionar');
    }
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['left', 'right']}>
      <CollapsibleHeader onHeight={onHeaderHeight}>
        <ScreenHeader
          title="Social"
          right={
            <Pressable onPress={() => router.push('/notifications')} hitSlop={8}>
              <Ionicons name="notifications-outline" size={24} color={palette.text} />
              {unread > 0 ? (
                <View style={[styles.bellBadge, { backgroundColor: palette.danger }]}>
                  <Text style={styles.bellBadgeText}>{unread > 9 ? '9+' : unread}</Text>
                </View>
              ) : null}
            </Pressable>
          }
        />

        <SegmentedTabs items={SEGMENTS} value={segment} onChange={setSegment} />
      </CollapsibleHeader>

      {segment === 'friends' ? (
        <Animated.FlatList
          data={friends}
          keyExtractor={(f) => f.id}
          contentContainerStyle={[styles.list, { paddingTop: headerHeight }]}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              {/* Search */}
              <View style={[styles.searchBox, { backgroundColor: palette.surface }]}>
                <Ionicons name="search" size={18} color={palette.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: palette.text }]}
                  placeholder="Adicionar por @username ou nome"
                  placeholderTextColor={palette.textMuted}
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {query.length > 0 ? (
                  <Pressable onPress={() => setQuery('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={palette.textMuted} />
                  </Pressable>
                ) : null}
              </View>

              {/* Search results */}
              {query.trim().length >= 2 ? (
                <View style={styles.section}>
                  {searching ? (
                    <ActivityIndicator color={palette.primary} style={{ marginVertical: 16 }} />
                  ) : results.length === 0 ? (
                    <Text style={[styles.emptyHint, { color: searchError ? palette.danger : palette.textMuted }]}>
                      {searchError ? `Erro: ${searchError}` : 'Nenhum usuário encontrado.'}
                    </Text>
                  ) : (
                    results.map((u) => (
                      <View key={u.id} style={[styles.row, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
                        <Pressable
                          style={styles.rowLeft}
                          onPress={() => router.push(`/user/${u.id}`)}>
                          <Avatar uri={u.avatar_url} name={u.name} />
                          <View style={styles.rowText}>
                            <Text style={[styles.rowName, { color: palette.text }]}>{u.name}</Text>
                            {u.username ? (
                              <Text style={[styles.rowSub, { color: palette.textMuted }]}>
                                @{u.username}
                              </Text>
                            ) : null}
                          </View>
                        </Pressable>
                        <FriendActionButton status={u.friend_status} onAdd={() => handleAdd(u)} />
                      </View>
                    ))
                  )}
                </View>
              ) : null}

              {/* Incoming requests */}
              {incoming.length > 0 ? (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>
                    Pedidos recebidos
                  </Text>
                  {incoming.map((r) => (
                    <View key={r.friendship_id} style={[styles.row, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
                      <Pressable style={styles.rowLeft} onPress={() => router.push(`/user/${r.id}`)}>
                        <Avatar uri={r.avatar_url} name={r.name} />
                        <View style={styles.rowText}>
                          <Text style={[styles.rowName, { color: palette.text }]}>{r.name}</Text>
                          {r.username ? (
                            <Text style={[styles.rowSub, { color: palette.textMuted }]}>
                              @{r.username}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>
                      <View style={styles.reqActions}>
                        <Pressable
                          style={[styles.iconBtn, { backgroundColor: palette.primary }]}
                          onPress={() => accept(r.friendship_id)}>
                          <Ionicons name="checkmark" size={18} color={palette.onPrimary} />
                        </Pressable>
                        <Pressable
                          style={[styles.iconBtn, { backgroundColor: palette.border }]}
                          onPress={() => reject(r.friendship_id)}>
                          <Ionicons name="close" size={18} color={palette.text} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Outgoing requests */}
              {outgoing.length > 0 ? (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>
                    Pedidos enviados
                  </Text>
                  {outgoing.map((r) => (
                    <View key={r.friendship_id} style={[styles.row, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
                      <Pressable style={styles.rowLeft} onPress={() => router.push(`/user/${r.id}`)}>
                        <Avatar uri={r.avatar_url} name={r.name} />
                        <View style={styles.rowText}>
                          <Text style={[styles.rowName, { color: palette.text }]}>{r.name}</Text>
                          <Text style={[styles.rowSub, { color: palette.textMuted }]}>Pendente</Text>
                        </View>
                      </Pressable>
                      <Pressable
                        style={[styles.textBtn, { borderColor: palette.border }]}
                        onPress={() => reject(r.friendship_id)}>
                        <Text style={[styles.textBtnLabel, { color: palette.textMuted }]}>
                          Cancelar
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Friends header */}
              {friends.length > 0 ? (
                <Text style={[styles.sectionTitle, { color: palette.text, marginTop: 8 }]}>
                  Amigos · {friends.length}
                </Text>
              ) : null}
            </View>
          }
          renderItem={({ item }) => {
            const ov = dmOv[item.id];
            const preview = ov ? previewText(ov.last_kind, ov.last_body) : null;
            return (
              <Pressable
                style={[styles.row, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
                onPress={() => router.push(`/chat/dm/${item.id}`)}>
                {/* bloco inteiro abre a conversa; o perfil é acessível pelo nome no header do chat */}
                <View style={styles.rowLeft}>
                  <Avatar uri={item.avatar_url} name={item.name} />
                  <View style={styles.rowText}>
                    <Text style={[styles.rowName, { color: palette.text }]}>{item.name}</Text>
                    {preview ? (
                      <Text
                        style={[
                          styles.rowSub,
                          { color: ov && ov.unread > 0 ? palette.text : palette.textMuted },
                        ]}
                        numberOfLines={1}>
                        {preview}
                      </Text>
                    ) : item.username ? (
                      <Text style={[styles.rowSub, { color: palette.textMuted }]}>
                        @{item.username}
                      </Text>
                    ) : null}
                  </View>
                </View>
                {ov && ov.unread > 0 ? (
                  <View style={[styles.unreadBadge, { backgroundColor: palette.primary }]}>
                    <Text style={[styles.unreadText, { color: palette.onPrimary }]}>
                      {ov.unread > 9 ? '9+' : ov.unread}
                    </Text>
                  </View>
                ) : item.streak !== null ? (
                  <View style={[styles.streakChip, { backgroundColor: palette.surface }]}>
                    <Ionicons name="flame" size={14} color={streakColor[scheme]} />
                    <Text style={[styles.streakText, { color: palette.text }]}>{item.streak}</Text>
                  </View>
                ) : null}
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={20}
                  color={palette.textMuted}
                  style={{ marginLeft: 10 }}
                />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={palette.primary} style={{ marginTop: 32 }} />
            ) : query.trim().length >= 2 ? null : (
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={48} color={palette.textMuted} />
                <Text style={[styles.emptyText, { color: palette.textMuted }]}>
                  Você ainda não tem amigos. Busque por username acima para adicionar.
                </Text>
              </View>
            )
          }
        />
      ) : segment === 'streaks' ? (
        <StreaksSegment headerHeight={headerHeight} onScroll={onScroll} />
      ) : (
        <FeedSegment headerHeight={headerHeight} onScroll={onScroll} />
      )}
    </SafeAreaView>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function FeedSegment({ headerHeight, onScroll }: SegmentProps) {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();
  const { items, loading, refetch } = useFeed();
  const [posting, setPosting] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  async function react(activityId: string, emoji: string) {
    await toggleReaction('activity', activityId, emoji);
    refetch();
  }

  async function handlePostSummary() {
    if (posting) return;
    setPosting(true);
    const res = await postDailySummary();
    setPosting(false);
    if (res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetch();
      Alert.alert('Resumo publicado!', 'Seu resumo do dia apareceu no feed dos amigos.');
    } else {
      Alert.alert('Erro', res.error ?? 'Não foi possível publicar o resumo.');
    }
  }

  if (loading) {
    return <ActivityIndicator color={palette.primary} style={{ marginTop: 32 }} />;
  }

  return (
    <>
    <Animated.FlatList
      data={items}
      keyExtractor={(it) => it.id}
      contentContainerStyle={[styles.list, { paddingTop: headerHeight }]}
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <Pressable
          style={[styles.summaryCta, { backgroundColor: palette.primary }]}
          onPress={handlePostSummary}
          disabled={posting}>
          {posting ? (
            <ActivityIndicator color={palette.onPrimary} />
          ) : (
            <>
              <Ionicons name="sparkles-outline" size={18} color={palette.onPrimary} />
              <Text style={[styles.summaryCtaText, { color: palette.onPrimary }]}>
                Compartilhar resumo de hoje
              </Text>
            </>
          )}
        </Pressable>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="newspaper-outline" size={48} color={palette.textMuted} />
          <Text style={[styles.emptyText, { color: palette.textMuted }]}>
            Sem atividades ainda. Adicione amigos e publique receitas para o feed ganhar vida.
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const meta = item.meta as {
          title?: string;
          image_url?: string;
          kcal?: number;
          meal_type?: string;
          goal_kcal?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
          water_ml?: number;
          streak?: number;
        };
        const type = item.type as PostType;
        const openRecipe =
          type === 'recipe_published' && item.ref_id
            ? () => router.push(`/community-recipe/${item.ref_id}`)
            : undefined;

        // O corpo muda por tipo; a moldura, o cabeçalho e o rodapé não.
        let body: React.ReactNode = null;
        if (type === 'daily_summary') {
          body = (
            <SummaryBody
              kcal={meta.kcal ?? 0}
              goalKcal={meta.goal_kcal ?? 0}
              protein={meta.protein ?? 0}
              carbs={meta.carbs ?? 0}
              fat={meta.fat ?? 0}
              waterMl={meta.water_ml ?? 0}
              streak={meta.streak ?? 0}
            />
          );
        } else if (type === 'progress_shared') {
          body = <MediaBody uri={meta.image_url} caption={meta.title} />;
        } else if (type === 'recipe_published' || type === 'meal_shared') {
          body = meta.title || meta.image_url ? (
            <ThumbBody
              title={meta.title ?? '—'}
              image={meta.image_url}
              kcal={meta.kcal}
              protein={meta.protein}
              perServing={type === 'recipe_published'}
              actionLabel={openRecipe ? 'Abrir receita' : undefined}
              onPress={openRecipe}
            />
          ) : null;
        } else if (type === 'streak_milestone') {
          body = (
            <StatBody
              icon="flame"
              text={`${item.is_mine ? 'Você chegou' : `${item.author_name} chegou`} a ${meta.streak ?? 0} dias seguidos`}
            />
          );
        } else {
          body = <StatBody icon="trophy-outline" text={meta.title ?? 'Nova conquista desbloqueada'} />;
        }

        return (
          <Animated.View entering={FadeInDown.duration(300)}>
            <PostCard onPress={openRecipe}>
              <PostHeader
                name={item.is_mine ? 'Você' : item.author_name}
                avatar={item.author_avatar}
                timeAgo={timeAgo(item.created_at)}
                type={type}
                onPressAuthor={
                  item.is_mine ? undefined : () => router.push(`/user/${item.user_id}`)
                }
              />
              {body}
              <PostFooter
                reactions={item.reactions}
                myReaction={item.my_reaction}
                commentCount={item.comment_count}
                onReact={() => react(item.id, item.my_reaction ?? '❤️')}
                onPickReaction={() => setPickerFor(item.id)}
                onComment={() => setCommentsFor(item.id)}
              />
            </PostCard>
          </Animated.View>
        );
      }}
    />
    <ReactionPicker
      visible={pickerFor !== null}
      onPick={(e) => {
        if (pickerFor) react(pickerFor, e);
      }}
      onClose={() => setPickerFor(null)}
    />
    <CommentsSheet
      activityId={commentsFor}
      visible={commentsFor !== null}
      onClose={() => setCommentsFor(null)}
      onChanged={refetch}
    />
    </>
  );
}

function StreaksSegment({ headerHeight, onScroll }: SegmentProps) {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();
  const { pairs, groups, loading, refetch } = useStreaks();
  const [grpUnread, setGrpUnread] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      refetch();
      getGroupChatOverviews().then((rows) => {
        const map: Record<string, number> = {};
        rows.forEach((r) => {
          map[r.group_id] = r.unread;
        });
        setGrpUnread(map);
      });
    }, [refetch]),
  );

  if (loading) {
    return <ActivityIndicator color={palette.primary} style={{ marginTop: 32 }} />;
  }

  return (
    <Animated.FlatList
      data={pairs}
      keyExtractor={(p) => p.friend_id}
      contentContainerStyle={[styles.list, { paddingTop: headerHeight }]}
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View>
          <Pressable
            style={[styles.createBtn, { backgroundColor: palette.primary }]}
            onPress={() => router.push('/streak-group/new')}>
            <Ionicons name="add" size={20} color={palette.onPrimary} />
            <Text style={[styles.createBtnText, { color: palette.onPrimary }]}>
              Criar grupo de streak
            </Text>
          </Pressable>

          {groups.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: palette.text, marginTop: 20 }]}>
                Grupos
              </Text>
              {groups.map((g) => (
                <Pressable
                  key={g.id}
                  style={[styles.row, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
                  onPress={() => router.push(`/streak-group/${g.id}`)}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.groupIcon, { backgroundColor: palette.trackBg }]}>
                      <Ionicons name="people" size={20} color={palette.primary} />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={[styles.rowName, { color: palette.text }]}>{g.name}</Text>
                      <Text style={[styles.rowSub, { color: palette.textMuted }]}>
                        {g.member_count} membros
                        {g.my_status === 'invited' ? ' · convite pendente' : ''}
                      </Text>
                    </View>
                  </View>
                  {g.my_status === 'invited' ? (
                    <View style={[styles.inviteBadge, { backgroundColor: palette.primary }]}>
                      <Text style={[styles.inviteBadgeText, { color: palette.onPrimary }]}>
                        Convite
                      </Text>
                    </View>
                  ) : grpUnread[g.id] > 0 ? (
                    <View style={[styles.unreadBadge, { backgroundColor: palette.primary }]}>
                      <Text style={styles.unreadText}>
                        {grpUnread[g.id] > 9 ? '9+' : grpUnread[g.id]}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.streakChip, { backgroundColor: palette.surface }]}>
                      <Ionicons name="flame" size={14} color={streakColor[scheme]} />
                      <Text style={[styles.streakText, { color: palette.text }]}>{g.streak}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </>
          ) : null}

          <Text style={[styles.sectionTitle, { color: palette.text, marginTop: 20 }]}>
            Com seus amigos
          </Text>
          {pairs.length === 0 ? (
            <Text style={[styles.emptyHint, { color: palette.textMuted }]}>
              Adicione amigos para começar streaks 1:1. O streak sobe nos dias em que vocês dois
              cumprem a meta.
            </Text>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={[styles.row, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
          onPress={() => router.push(`/user/${item.friend_id}`)}>
          <View style={styles.rowLeft}>
            <Avatar uri={item.avatar_url} name={item.name} />
            <View style={styles.rowText}>
              <Text style={[styles.rowName, { color: palette.text }]}>{item.name}</Text>
              {item.username ? (
                <Text style={[styles.rowSub, { color: palette.textMuted }]}>@{item.username}</Text>
              ) : null}
            </View>
          </View>
          <View style={[styles.streakChip, { backgroundColor: palette.surface }]}>
            <Ionicons
              name="flame"
              size={14}
              color={item.streak === 0 ? palette.textMuted : streakColor[scheme]}
            />
            <Text
              style={[
                styles.streakText,
                { color: item.streak === 0 ? palette.textMuted : palette.text },
              ]}>
              {item.streak}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}

function FriendActionButton({
  status,
  onAdd,
}: {
  status: UserSearchResult['friend_status'];
  onAdd: () => void;
}) {
  const scheme = useScheme();
  const palette = colors[scheme];
  if (status === 'friends') {
    return (
      <View style={styles.statusChip}>
        <Ionicons name="checkmark-circle" size={16} color={palette.primary} />
        <Text style={[styles.statusText, { color: palette.primary }]}>Amigos</Text>
      </View>
    );
  }
  if (status === 'pending_out') {
    return <Text style={[styles.statusText, { color: palette.textMuted }]}>Pendente</Text>;
  }
  return (
    <Pressable style={[styles.addBtn, { backgroundColor: palette.primary }]} onPress={onAdd}>
      <Ionicons name={status === 'pending_in' ? 'checkmark' : 'person-add'} size={16} color={palette.onPrimary} />
      <Text style={[styles.addBtnText, { color: palette.onPrimary }]}>
        {status === 'pending_in' ? 'Aceitar' : 'Adicionar'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bellBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Único ponto de cor do app: o contador do sino, sobre o vermelho de alerta.
  bellBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 120 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 16,
  },
  searchInput: { flex: 1, fontSize: 15 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8, marginTop: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowText: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 13, marginTop: 1 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontWeight: '700' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
  },
  addBtnText: { fontSize: 13, fontWeight: '700' },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 13, fontWeight: '600' },
  reqActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  textBtn: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 },
  textBtnLabel: { fontSize: 13, fontWeight: '500' },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  streakText: { fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 48, paddingHorizontal: 32, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyHint: { fontSize: 13, textAlign: 'left', marginVertical: 8, lineHeight: 19 },
  comingSoon: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 999,
    marginTop: 16,
  },
  createBtnText: { fontSize: 15, fontWeight: '700' },
  groupIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  inviteBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
  inviteBadgeText: { fontSize: 12, fontWeight: '700' },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { fontSize: 12, fontWeight: '700' },
  summaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    paddingVertical: 13,
    borderRadius: 999,
    marginTop: 16,
    marginBottom: 16,
  },
  summaryCtaText: { fontSize: 15, fontWeight: '700' },
});
