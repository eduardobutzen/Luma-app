import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CollapsibleHeader,
  FilterChipRow,
  RecipeCard,
  ScreenHeader,
  SegmentedTabs,
  Skeleton,
  type FilterChip,
  type TabItem,
} from '@/components';
import { colors, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { useCollapsibleHeader, useScrollHide } from '@/hooks/useScrollHide';
import {
  listDiscoverRecipesResult,
  listMyRecipes,
  type CommunityRecipe,
  type MyRecipe,
} from '@/lib/userRecipes';

type Segment = 'discover' | 'mine';
const SEGMENTS: TabItem<Segment>[] = [
  { key: 'discover', label: 'Descobrir' },
  { key: 'mine', label: 'Minhas' },
];

/** Filtros de Descobrir — aplicados sobre o resultado da busca, no cliente. */
type DiscoverFilter = 'all' | 'protein' | 'light';
const DISCOVER_FILTERS: FilterChip<DiscoverFilter>[] = [
  { key: 'all', label: 'Tudo' },
  { key: 'protein', label: 'Alta proteína' },
  { key: 'light', label: '≤ 400 kcal' },
];

/** Ordenação de "Minhas". */
type SortKey = 'recent' | 'name' | 'kcal';
const SORT_LABEL: Record<SortKey, string> = {
  recent: 'mais recentes',
  name: 'nome',
  kcal: 'calorias',
};
const SORT_ORDER: SortKey[] = ['recent', 'name', 'kcal'];

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/** Item da lista de "Minhas": cabeçalho de grupo ou receita. */
type MineRow =
  | { kind: 'section'; id: string; label: string; count: number }
  | { kind: 'recipe'; id: string; recipe: MyRecipe };

export default function RecipesScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();

  const [segment, setSegment] = useState<Segment>('discover');
  const [query, setQuery] = useState('');
  const [discoverFilter, setDiscoverFilter] = useState<DiscoverFilter>('all');
  const [sort, setSort] = useState<SortKey>('recent');

  const [discover, setDiscover] = useState<CommunityRecipe[]>([]);
  const [mine, setMine] = useState<MyRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const seq = useRef(0);

  const { headerHeight, onHeaderHeight, onScroll } = useCollapsibleHeader();
  const { hidden } = useScrollHide();
  const insets = useSafeAreaInsets();
  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hidden.value * (52 + insets.bottom + 20) }],
  }));

  const run = useCallback(async (seg: Segment, term: string) => {
    const s = ++seq.current;
    setLoading(true);
    if (seg === 'discover') {
      const { items, error } = await listDiscoverRecipesResult(term);
      if (s === seq.current) {
        setDiscover(items);
        setDiscoverError(error);
      }
    } else {
      const data = await listMyRecipes();
      if (s === seq.current) setMine(data);
    }
    if (s === seq.current) setLoading(false);
  }, []);

  // Busca com debounce (discover/community); "minhas" filtra no cliente.
  useEffect(() => {
    const t = setTimeout(() => run(segment, query), segment === 'mine' ? 0 : 350);
    return () => clearTimeout(t);
  }, [query, segment, run]);

  useFocusEffect(
    useCallback(() => {
      run(segment, query);
    }, [segment, query, run]),
  );

  // Toda receita agora é do app: uma rota de detalhe só.
  function openRecipe(id: string) {
    router.push(`/community-recipe/${id}`);
  }

  // ── Dados prontos para render ────────────────────────────────────────────
  const shownDiscover = useMemo(() => {
    if (discoverFilter === 'protein') {
      // "Alta proteína": ao menos 30 % das calorias vindas de proteína.
      return discover.filter((r) => r.kcal > 0 && (r.protein * 4) / r.kcal >= 0.3);
    }
    if (discoverFilter === 'light') return discover.filter((r) => r.kcal <= 400);
    return discover;
  }, [discover, discoverFilter]);

  const mineRows = useMemo<MineRow[]>(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? mine.filter((r) => r.title.toLowerCase().includes(q)) : mine;
    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'name') return a.title.localeCompare(b.title, 'pt-BR');
      if (sort === 'kcal') return b.kcal - a.kcal;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const rows: MineRow[] = [];
    // A visibilidade sai do cartão e vira o título do grupo — repetir o selo em
    // cada receita diria doze vezes o que o agrupamento já diz.
    for (const vis of ['public', 'private'] as const) {
      const group = sorted.filter((r) => r.visibility === vis);
      if (group.length === 0) continue;
      rows.push({
        kind: 'section',
        id: `section-${vis}`,
        label: vis === 'public' ? 'Públicas' : 'Privadas',
        count: group.length,
      });
      group.forEach((r) => rows.push({ kind: 'recipe', id: r.id, recipe: r }));
    }
    return rows;
  }, [mine, query, sort]);

  const searchPlaceholder =
    segment === 'discover' ? 'Buscar receita (ex: frango, salada)...' : 'Buscar nas minhas';

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: palette.surface }]}>
          <Ionicons name="search" size={16} color={palette.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: palette.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={palette.textMuted}
            autoCapitalize="none"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={palette.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {segment === 'mine' ? (
          <Pressable
            style={[styles.sortButton, { backgroundColor: palette.surface }]}
            onPress={() => setSort(SORT_ORDER[(SORT_ORDER.indexOf(sort) + 1) % SORT_ORDER.length])}
            hitSlop={6}>
            <Ionicons name="swap-vertical" size={18} color={palette.text} />
          </Pressable>
        ) : null}
      </View>

      {segment === 'discover' ? (
        <FilterChipRow
          items={DISCOVER_FILTERS}
          value={discoverFilter}
          onChange={setDiscoverFilter}
        />
      ) : null}

      {segment === 'mine' && mineRows.length > 0 ? (
        <Text style={[styles.sortHint, { color: palette.textMuted }]}>
          Ordenado por {SORT_LABEL[sort]}
        </Text>
      ) : null}
    </View>
  );

  const emptyText =
    segment === 'discover'
      ? (discoverError ??
        (query.trim()
          ? 'Nenhuma receita com esse termo.'
          : 'Ainda não há receitas publicadas. Crie a sua em Minhas.'))
      : 'Você ainda não criou receitas. Toque em + para começar.';

  const emptyState = loading ? (
    <View style={styles.skeletonGrid}>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} height={190} radius={16} style={styles.skeletonCard} />
      ))}
    </View>
  ) : (
    <View style={styles.empty}>
      <Ionicons
        name={segment === 'discover' && discoverError ? 'cloud-offline-outline' : 'restaurant-outline'}
        size={40}
        color={segment === 'discover' && discoverError ? palette.danger : palette.textMuted}
      />
      <Text
        style={[
          styles.emptyText,
          { color: segment === 'discover' && discoverError ? palette.danger : palette.textMuted },
        ]}>
        {emptyText}
      </Text>
      {segment === 'discover' && discoverError ? (
        <Text style={[styles.emptyHint, { color: palette.textMuted }]}>
          As abas Comunidade e Minhas não dependem dessa API.
        </Text>
      ) : null}
    </View>
  );

  const listProps = {
    contentContainerStyle: [styles.content, { paddingTop: headerHeight + 12 }],
    ListHeaderComponent: listHeader,
    onScroll,
    scrollEventThrottle: 16,
    showsVerticalScrollIndicator: false,
    keyboardShouldPersistTaps: 'handled' as const,
    ListEmptyComponent: emptyState,
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['left', 'right']}>
      <CollapsibleHeader onHeight={onHeaderHeight}>
        <ScreenHeader title="Receitas" />
        <SegmentedTabs
          items={SEGMENTS}
          value={segment}
          onChange={(key) => {
            setSegment(key);
            setQuery('');
            setDiscoverFilter('all');
          }}
        />
      </CollapsibleHeader>

      {segment === 'mine' ? (
        // Uma lista só, com os cabeçalhos de grupo ocupando a linha inteira.
        <Animated.FlatList<MineRow>
          {...listProps}
          data={loading ? [] : mineRows}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item, index }) => {
            if (item.kind === 'section') {
              return (
                <View style={styles.sectionWrap}>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>
                    {item.label}{' '}
                    <Text style={[styles.sectionCount, { color: palette.textMuted }]}>
                      {item.count}
                    </Text>
                  </Text>
                </View>
              );
            }
            const r = item.recipe;
            return (
              <Animated.View entering={FadeInDown.delay(index * 30).duration(260)} style={styles.cell}>
                <RecipeCard
                  title={r.title}
                  image={r.image_url}
                  kcal={r.kcal}
                  macros={{ protein: r.protein, carbs: r.carbs, fat: r.fat }}
                  date={formatShortDate(r.created_at)}
                  compact
                  onPress={() => openRecipe(r.id)}
                />
              </Animated.View>
            );
          }}
        />
      ) : (
        <Animated.FlatList<CommunityRecipe>
          {...listProps}
          data={loading ? [] : shownDiscover}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 30).duration(260)} style={styles.cell}>
              <RecipeCard
                title={item.title}
                image={item.image_url}
                kcal={item.kcal}
                macros={{ protein: item.protein, carbs: item.carbs, fat: item.fat }}
                // Curadas assinam como "Luma"; as da comunidade mostram o autor.
                author={item.curated ? undefined : item.author_name}
                authorAvatar={item.author_avatar}
                date={formatShortDate(item.created_at)}
                badge={item.curated ? 'Luma' : undefined}
                onPress={() => openRecipe(item.id)}
              />
            </Animated.View>
          )}
        />
      )}

      <Animated.View style={[styles.fab, { backgroundColor: palette.primary }, fabStyle]}>
        <Pressable style={styles.fabPress} onPress={() => router.push('/recipe-edit')}>
          <Ionicons name="add" size={28} color={palette.onPrimary} />
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 150 },
  listHeader: { gap: 12, marginBottom: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  sortButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortHint: { fontSize: 12 },
  sectionWrap: { width: '100%', paddingTop: 8, paddingBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionCount: { fontSize: 15, fontWeight: '400' },
  // `alignItems: flex-start` deixa cada cartão com a própria altura: sem macros
  // (Descobrir às vezes não traz) o cartão fica com uma linha a menos.
  columnWrapper: { gap: 12, alignItems: 'flex-start' },
  cell: { flex: 1 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  skeletonCard: { width: '47%', flexGrow: 1 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 24, lineHeight: 20 },
  emptyHint: { fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 104,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabPress: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
