import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { useAchievements } from '@/hooks/useAchievements';
import { CATEGORY_LABELS } from '@/lib/achievements';

export default function AchievementsScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();

  const { achievements, loading, refetch } = useAchievements();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const categories = Object.keys(CATEGORY_LABELS).filter((cat) =>
    achievements.some((a) => a.category === cat),
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <Text style={[styles.title, { color: palette.text }]}>Conquistas</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={palette.primary} style={{ marginTop: 32 }} />
        ) : (
          <>
            <Text style={[styles.counter, { color: palette.textMuted }]}>
              {unlockedCount} de {achievements.length} desbloqueadas
            </Text>

            {categories.map((cat) => {
              const items = achievements.filter((a) => a.category === cat);
              const done = items.filter((a) => a.unlocked).length;
              return (
                <View key={cat}>
                  <View style={styles.sectionRow}>
                    <Text style={[styles.sectionTitle, { color: palette.text }]}>
                      {CATEGORY_LABELS[cat]}
                    </Text>
                    <Text style={[styles.sectionCount, { color: palette.textMuted }]}>
                      {done}/{items.length}
                    </Text>
                  </View>
                  <View style={styles.grid}>
                    {items.map((a) => (
                      <View
                        key={a.id}
                        style={[
                          styles.badge,
                          { backgroundColor: palette.card, opacity: a.unlocked ? 1 : 0.55 },
                        ]}>
                        <View
                          style={[
                            styles.badgeIcon,
                            { backgroundColor: a.unlocked ? palette.primary : palette.border },
                          ]}>
                          <Ionicons
                            name={a.unlocked ? a.icon : 'lock-closed'}
                            size={22}
                            color={a.unlocked ? palette.onPrimary : palette.textMuted}
                          />
                        </View>
                        <Text style={[styles.badgeLabel, { color: palette.text }]}>{a.label}</Text>
                        <Text style={[styles.badgeDesc, { color: palette.textMuted }]}>
                          {a.description}
                        </Text>
                        <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${(a.progress / a.target) * 100}%`,
                                backgroundColor: a.unlocked ? palette.primary : palette.textMuted,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.progressText, { color: palette.textMuted }]}>
                          {a.progress}/{a.target}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  counter: {
    fontSize: 13,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badge: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  badgeLabel: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  progressTrack: {
    width: '100%',
    height: 5,
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  progressText: {
    fontSize: 11,
    marginTop: 4,
  },
});

