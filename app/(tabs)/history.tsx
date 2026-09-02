import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { CalendarModal, CollapsibleHeader, ScreenHeader, SegmentedTabs, type TabItem } from '@/components';
import ProgressView from '@/components/ProgressView';
import { colors, macroPalette, neo, type ThemeColors } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { useCollapsibleHeader } from '@/hooks/useScrollHide';
import { useMeals } from '@/hooks/useMeals';
import { useWater } from '@/hooks/useWater';
import { localDateKey } from '@/lib/date';
import { MEAL_TYPES, mealTypeIcon } from '@/lib/mealType';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function norm(s: string): string {
  return s.normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '').toLowerCase();
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type HistoryTab = 'history' | 'progress';
const HISTORY_TABS: TabItem<HistoryTab>[] = [
  { key: 'history', label: 'Histórico' },
  { key: 'progress', label: 'Progresso' },
];

const RANGE_DAYS = 60;

// Last RANGE_DAYS days ending today (oldest → today), keyed by LOCAL date.
const DATES = Array.from({ length: RANGE_DAYS }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (RANGE_DAYS - 1 - i));
  return {
    key: localDateKey(d),
    weekday: WEEKDAYS[d.getDay()],
    dayNum: d.getDate(),
  };
});

const RING_SIZE = 70;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

function MiniRing({
  value,
  goal,
  color,
  label,
  isDark,
  palette,
}: {
  value: number;
  goal: number;
  color: string;
  label: string;
  isDark: boolean;
  palette: ThemeColors;
}) {
  const ratio = goal > 0 ? Math.min(value / goal, 1) : 0;
  const offset = RING_CIRC * (1 - ratio);
  const trackColor = palette.trackBg;

  return (
    <View style={styles.ringCol}>
      <View style={styles.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={trackColor}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={color}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={offset}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={[styles.ringValue, { color: palette.text }]}>{value}g</Text>
        </View>
      </View>
      <Text style={[styles.ringLabel, { color: palette.textMuted }]}>{label}</Text>
    </View>
  );
}

export default function HistoryScreen() {
  const isDark = useScheme() === 'dark';
  const palette = colors[isDark ? 'dark' : 'light'];
  const macros = macroPalette[isDark ? 'dark' : 'light'];
  const router = useRouter();

  const [tab, setTab] = useState<HistoryTab>('history');
  const [selectedKey, setSelectedKey] = useState(localDateKey());
  const [refreshing, setRefreshing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const dateScrollRef = useRef<ScrollView>(null);
  const { headerHeight, onHeaderHeight, onScroll } = useCollapsibleHeader();
  const { meals, refetch } = useMeals(selectedKey);
  const { totalMl, refetch: refetchWater } = useWater(selectedKey);

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchWater();
    }, [refetch, refetchWater]),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refetch(), refetchWater()]);
    setRefreshing(false);
  }

  const selectedDate = new Date(`${selectedKey}T00:00:00`);
  const monthLabel = `${MONTHS[selectedDate.getMonth()]}, ${selectedDate.getFullYear()}`;

  const totals = meals.reduce(
    (acc, m) => ({
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { protein: 0, carbs: 0, fat: 0 },
  );

  const daySummary = [
    { label: 'Proteína', value: totals.protein, goal: 120, color: macros.protein },
    { label: 'Carbos', value: totals.carbs, goal: 120, color: macros.carbs },
    { label: 'Gorduras', value: totals.fat, goal: 120, color: macros.fat },
  ];

  // Filtered list for display (totals/summary still reflect the whole day).
  const q = norm(searchText.trim());
  const filteredMeals = meals.filter((m) => {
    if (typeFilter && m.type !== typeFilter) return false;
    if (!q) return true;
    return norm(`${m.type} ${m.description ?? ''}`).includes(q);
  });

  const topSection = (
    <View>
      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Ionicons name="search" size={16} color={palette.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: palette.text }]}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Buscar refeição..."
            placeholderTextColor={palette.textMuted}
            autoCapitalize="none"
          />
          {searchText ? (
            <Pressable onPress={() => setSearchText('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={palette.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Type filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}>
        {[{ value: null, label: 'Todos' }, ...MEAL_TYPES.map((t) => ({ value: t.value, label: t.value }))].map(
          (f) => {
            const active = typeFilter === f.value;
            return (
              <Pressable
                key={f.label}
                onPress={() => setTypeFilter(f.value)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? palette.primary : palette.card,
                    borderColor: active ? palette.primary : palette.border,
                  },
                ]}>
                <Text style={[styles.filterText, { color: active ? palette.onPrimary : palette.text }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          },
        )}
      </ScrollView>

      {/* Date selector */}
      <ScrollView
        ref={dateScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateRow}
        style={styles.dateScroll}
        onContentSizeChange={() => dateScrollRef.current?.scrollToEnd({ animated: false })}>
        {DATES.map((date) => {
          const selected = date.key === selectedKey;
          return (
            <Pressable
              key={date.key}
              onPress={() => setSelectedKey(date.key)}
              style={[
                styles.dateItem,
                {
                  backgroundColor: selected ? palette.primary : palette.card,
                  boxShadow: neo[isDark ? 'dark' : 'light'].raisedSm,
                },
              ]}>
              <Text
                style={[
                  styles.dateWeekday,
                  { color: selected ? palette.onPrimary : palette.textMuted },
                ]}>
                {date.weekday}
              </Text>
              <Text
                style={[
                  styles.dateNum,
                  { color: selected ? palette.onPrimary : palette.text },
                ]}>
                {date.dayNum}
              </Text>
              {selected ? (
                <View style={[styles.dateBullet, { backgroundColor: palette.onPrimary }]} />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const footer = (
    <View style={[styles.summaryCard, { backgroundColor: palette.card, boxShadow: neo[isDark ? 'dark' : 'light'].raised }]}>
      <Text style={[styles.summaryTitle, { color: palette.textMuted }]}>
        RESUMO DO DIA
      </Text>
      <View style={styles.ringsRow}>
        {daySummary.map((macro) => (
          <MiniRing
            key={macro.label}
            value={macro.value}
            goal={macro.goal}
            color={macro.color}
            label={macro.label}
            isDark={isDark}
            palette={palette}
          />
        ))}
      </View>
      <View style={[styles.waterRow, { borderTopColor: palette.border }]}>
        <Ionicons name="water" size={16} color={palette.text} />
        <Text style={[styles.waterRowText, { color: palette.textMuted }]}>
          Água: {totalMl} ml
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['left', 'right']}>
      <CollapsibleHeader onHeight={onHeaderHeight}>
        <ScreenHeader
          title="Histórico"
          right={
            tab === 'history' ? (
              <>
                <Text style={[styles.month, { color: palette.textMuted }]}>{monthLabel}</Text>
                <Pressable onPress={() => setShowPicker(true)} hitSlop={8}>
                  <Ionicons name="calendar-outline" size={22} color={palette.text} />
                </Pressable>
              </>
            ) : null
          }
        />
        <SegmentedTabs items={HISTORY_TABS} value={tab} onChange={setTab} />
      </CollapsibleHeader>

      {tab === 'progress' ? (
        <ProgressView headerHeight={headerHeight} onScroll={onScroll} />
      ) : (
        <>
      <Animated.FlatList
        data={filteredMeals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: 120 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={topSection}
        ListFooterComponent={meals.length > 0 ? footer : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="restaurant-outline" size={40} color={palette.textMuted} />
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              {meals.length === 0
                ? 'Nenhuma refeição neste dia.'
                : 'Nenhuma refeição encontrada.'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            progressViewOffset={headerHeight}
            tintColor={palette.textMuted}
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 50).duration(250)}>
          <Pressable
            style={[styles.mealCard, { backgroundColor: palette.card, boxShadow: neo[isDark ? 'dark' : 'light'].raised }]}
            onPress={() => router.push(`/meal/${item.id}`)}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.mealImage} />
            ) : (
              <View
                style={[
                  styles.mealImage,
                  styles.mealImagePlaceholder,
                  { backgroundColor: palette.surface },
                ]}>
                <Ionicons name={mealTypeIcon(item.type)} size={26} color={palette.textMuted} />
              </View>
            )}
            <View style={styles.mealRight}>
              <View style={styles.mealTopRow}>
                <Ionicons name={mealTypeIcon(item.type)} size={15} color={palette.primary} />
                <Text style={[styles.mealName, { color: palette.text }]}>
                  {item.type}
                </Text>
                <Text style={[styles.mealTime, { color: palette.textMuted }]}>
                  {formatTime(item.eaten_at)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
              </View>
              {item.description ? (
                <Text
                  style={[styles.mealDescription, { color: palette.textMuted }]}
                  numberOfLines={1}>
                  {item.description}
                </Text>
              ) : null}
              <View style={styles.chipsRow}>
                <Text
                  style={[
                    styles.chip,
                    styles.chipProtein,
                    { backgroundColor: palette.surface, color: macros.protein },
                  ]}>
                  P: {item.protein}g
                </Text>
                <Text
                  style={[
                    styles.chip,
                    styles.chipCarbs,
                    { backgroundColor: palette.surface, color: macros.carbs },
                  ]}>
                  C: {item.carbs}g
                </Text>
                <Text
                  style={[
                    styles.chip,
                    styles.chipFat,
                    { backgroundColor: palette.surface, color: macros.fat },
                  ]}>
                  G: {item.fat}g
                </Text>
              </View>
            </View>
          </Pressable>
          </Animated.View>
        )}
      />

      <CalendarModal
        visible={showPicker}
        selectedKey={selectedKey}
        onSelect={setSelectedKey}
        onClose={() => setShowPicker(false)}
      />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  month: {
    fontSize: 13,
  },
  searchWrap: {
    paddingTop: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 0.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    borderWidth: 0.5,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dateScroll: {
    marginBottom: 8,
  },
  // O ScrollView horizontal encolhe até a altura dos itens; sem esta folga
  // vertical a sombra dos cartões é desenhada fora dele e sai cortada.
  dateRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dateItem: {
    width: 48,
    minHeight: 66,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginRight: 8,
  },
  dateWeekday: {
    fontSize: 11,
  },
  dateNum: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  dateBullet: {
    width: 6,
    height: 6,
    borderRadius: 999,
    marginTop: 4,
  },
  mealCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  mealImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  mealImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealRight: {
    flex: 1,
  },
  mealDescription: {
    fontSize: 12,
    marginTop: 4,
  },
  mealTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  mealTime: {
    fontSize: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    overflow: 'hidden',
  },
  // Os três chips compartilham a mesma superfície; o macro é dito pelo texto.
  chipProtein: {
    fontWeight: '700',
  },
  chipCarbs: {
    fontWeight: '700',
  },
  chipFat: {
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: 16,
    margin: 16,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
    marginBottom: 16,
  },
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  waterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 0.5,
  },
  waterRowText: {
    fontSize: 13,
  },
  ringCol: {
    alignItems: 'center',
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSvg: {
    transform: [{ rotate: '-90deg' }],
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  ringLabel: {
    fontSize: 12,
    marginTop: 6,
  },
});
