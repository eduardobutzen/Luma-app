import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { localDateKey } from '@/lib/date';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

interface CalendarModalProps {
  visible: boolean;
  selectedKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}

function firstOfMonth(key: string): Date {
  const d = new Date(`${key}T00:00:00`);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Themed in-app month calendar (replaces the native date picker). */
export default function CalendarModal({ visible, selectedKey, onSelect, onClose }: CalendarModalProps) {
  const isDark = useScheme() === 'dark';
  const palette = colors[isDark ? 'dark' : 'light'];

  const [view, setView] = useState(() => firstOfMonth(selectedKey));

  useEffect(() => {
    if (visible) setView(firstOfMonth(selectedKey));
  }, [visible, selectedKey]);

  const todayKey = localDateKey();
  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const now = new Date();
  const canNext = !(year === now.getFullYear() && month === now.getMonth());

  function keyFor(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: palette.card, boxShadow: neo[isDark ? 'dark' : 'light'].raised }]}
          onPress={() => {}}>
          {/* Month header */}
          <View style={styles.headerRow}>
            <Text style={[styles.monthLabel, { color: palette.text }]}>
              {MONTHS[month]} {year}
            </Text>
            <View style={styles.nav}>
              <Pressable onPress={() => setView(new Date(year, month - 1, 1))} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color={palette.primary} />
              </Pressable>
              <Pressable
                onPress={() => canNext && setView(new Date(year, month + 1, 1))}
                disabled={!canNext}
                hitSlop={8}>
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={canNext ? palette.primary : palette.border}
                />
              </Pressable>
            </View>
          </View>

          {/* Weekday labels */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => (
              <Text key={i} style={[styles.weekday, { color: palette.textMuted }]}>
                {w}
              </Text>
            ))}
          </View>

          {/* Day grid */}
          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (day === null) return <View key={idx} style={styles.cell} />;
              const key = keyFor(day);
              const isFuture = key > todayKey;
              const isSelected = key === selectedKey;
              const isToday = key === todayKey;
              return (
                <Pressable
                  key={idx}
                  style={styles.cell}
                  disabled={isFuture}
                  onPress={() => {
                    onSelect(key);
                    onClose();
                  }}>
                  <View style={[styles.dayCircle, isSelected && { backgroundColor: palette.primary }]}>
                    <Text
                      style={[
                        styles.dayText,
                        {
                          color: isFuture
                            ? palette.border
                            : isSelected
                              ? palette.onPrimary
                              : isToday
                                ? palette.primary
                                : palette.text,
                          fontWeight: isToday || isSelected ? '600' : '400',
                        },
                      ]}>
                      {day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  nav: {
    flexDirection: 'row',
    gap: 20,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 15,
  },
});
