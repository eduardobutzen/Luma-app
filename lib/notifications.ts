import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const KEY = 'luma.reminders';

export interface ReminderSettings {
  enabled: boolean;
  times: { breakfast: string; lunch: string; dinner: string };
  waterEnabled: boolean;
  summaryEnabled: boolean;
}

export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: false,
  times: { breakfast: '08:00', lunch: '12:30', dinner: '19:00' },
  waterEnabled: false,
  summaryEnabled: false,
};

const WATER_HOURS = [10, 13, 16, 19];
const SUMMARY_HOUR = 21;

export const MEAL_REMINDERS: {
  key: keyof ReminderSettings['times'];
  label: string;
  body: string;
}[] = [
  { key: 'breakfast', label: 'Café da manhã', body: 'Hora do café da manhã 🍳' },
  { key: 'lunch', label: 'Almoço', body: 'Hora do almoço 🥗' },
  { key: 'dinner', label: 'Jantar', body: 'Hora do jantar 🍽️' },
];

export async function loadReminders(): Promise<ReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_REMINDERS, ...JSON.parse(raw) };
  } catch {
    // ignore and fall back to defaults
  }
  return DEFAULT_REMINDERS;
}

async function ensurePermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

const DAILY_SUMMARY_ID = 'daily-summary-invite';

/**
 * Agenda (idempotente) a notificação diária das 22:00 convidando o usuário a
 * postar o resumo do dia. Usa identifier fixo, então pode ser chamada a cada
 * abertura do app sem duplicar.
 */
export async function scheduleDailySummaryInvite(): Promise<void> {
  const granted = await ensurePermissions();
  if (!granted) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Lembretes',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_SUMMARY_ID,
    content: {
      title: 'Resumo do dia 🌙',
      body: 'Como foi seu dia? Compartilhe seu resumo com os amigos.',
      data: { action: 'post-daily-summary' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 22, minute: 0 },
  });
}

/**
 * Persists settings and (re)schedules local daily reminders. Returns false if
 * reminders were enabled but notification permission was denied.
 */
export async function saveReminders(settings: ReminderSettings): Promise<boolean> {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings));
  await Notifications.cancelAllScheduledNotificationsAsync();

  // O convite de resumo das 22:00 é independente dos lembretes — re-agenda se já
  // houver permissão (cancelAll acima o removeu).
  if ((await Notifications.getPermissionsAsync()).granted) {
    await scheduleDailySummaryInvite();
  }

  const anyEnabled = settings.enabled || settings.waterEnabled || settings.summaryEnabled;
  if (!anyEnabled) return true;

  const granted = await ensurePermissions();
  if (!granted) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Lembretes',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const daily = (hour: number, minute: number, title: string, body: string) =>
    Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });

  if (settings.enabled) {
    for (const meal of MEAL_REMINDERS) {
      const [hour, minute] = settings.times[meal.key].split(':').map(Number);
      await daily(hour, minute, 'Luma', meal.body);
    }
  }

  if (settings.waterEnabled) {
    for (const hour of WATER_HOURS) {
      await daily(hour, 0, 'Hora de se hidratar 💧', 'Que tal registrar um copo de água?');
    }
  }

  if (settings.summaryEnabled) {
    await daily(SUMMARY_HOUR, 0, 'Resumo do dia 📊', 'Confira como foi seu dia no Luma.');
  }

  return true;
}
