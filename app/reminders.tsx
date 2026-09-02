import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import {
  DEFAULT_REMINDERS,
  MEAL_REMINDERS,
  loadReminders,
  saveReminders,
  type ReminderSettings,
} from '@/lib/notifications';

function toDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function fmt(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

export default function RemindersScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();

  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDERS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<keyof ReminderSettings['times'] | null>(null);

  useEffect(() => {
    loadReminders().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  function onPickTime(event: DateTimePickerEvent, date?: Date) {
    const key = picker;
    setPicker(null);
    if (event.type === 'dismissed' || !date || !key) return;
    setSettings((prev) => ({
      ...prev,
      times: { ...prev.times, [key]: fmt(date) },
    }));
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    const ok = await saveReminders(settings);
    setSaving(false);
    if (!ok) {
      Alert.alert(
        'Permissão necessária',
        'Ative as notificações nas configurações do dispositivo para receber lembretes.',
      );
      return;
    }
    Alert.alert('Salvo!');
    router.back();
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, styles.center, { backgroundColor: palette.background }]}
        edges={['top', 'left', 'right']}>
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <Text style={[styles.title, { color: palette.text }]}>Lembretes</Text>
        </View>

        {/* Toggle */}
        <View style={[styles.toggleRow, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
          <Text style={[styles.toggleLabel, { color: palette.text }]}>
            Lembretes de refeição
          </Text>
          <Switch
            value={settings.enabled}
            onValueChange={(enabled) => setSettings((prev) => ({ ...prev, enabled }))}
            trackColor={{ true: palette.primary }}
          />
        </View>

        {/* Times */}
        {settings.enabled
          ? MEAL_REMINDERS.map((meal) => (
              <Pressable
                key={meal.key}
                style={[styles.timeRow, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
                onPress={() => setPicker(meal.key)}>
                <Text style={[styles.timeLabel, { color: palette.text }]}>
                  {meal.label}
                </Text>
                <Text style={[styles.timeValue, { color: palette.primary }]}>
                  {settings.times[meal.key]}
                </Text>
              </Pressable>
            ))
          : null}

        {picker ? (
          <DateTimePicker
            value={toDate(settings.times[picker])}
            mode="time"
            is24Hour
            onChange={onPickTime}
          />
        ) : null}

        {/* Water reminders */}
        <View style={[styles.toggleRow, { backgroundColor: palette.card, boxShadow: neo[scheme].raised, marginTop: 24 }]}>
          <Text style={[styles.toggleLabel, { color: palette.text }]}>
            Lembretes de água
          </Text>
          <Switch
            value={settings.waterEnabled}
            onValueChange={(waterEnabled) => setSettings((prev) => ({ ...prev, waterEnabled }))}
            trackColor={{ true: palette.primary }}
          />
        </View>

        {/* Daily summary */}
        <View style={[styles.toggleRow, { backgroundColor: palette.card, boxShadow: neo[scheme].raised, marginTop: 10 }]}>
          <Text style={[styles.toggleLabel, { color: palette.text }]}>
            Resumo do dia (21h)
          </Text>
          <Switch
            value={settings.summaryEnabled}
            onValueChange={(summaryEnabled) => setSettings((prev) => ({ ...prev, summaryEnabled }))}
            trackColor={{ true: palette.primary }}
          />
        </View>

        {/* Save */}
        <Pressable
          style={[styles.saveButton, { backgroundColor: palette.primary }, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color={palette.onPrimary} />
          ) : (
            <Text style={[styles.saveText, { color: palette.onPrimary }]}>Salvar</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 16,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
  },
  timeLabel: {
    fontSize: 15,
  },
  timeValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  saveButton: {
    borderRadius: 99,
    paddingVertical: 14,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
