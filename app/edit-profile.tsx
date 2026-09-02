import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { useProfile } from '@/hooks/useProfile';
import type { PrivacyLevel } from '@/lib/social';
import { supabase } from '@/lib/supabase';
import { uploadPhoto } from '@/lib/storage';

type VisKey = 'streak' | 'weight' | 'meals' | 'achievements' | 'photos';
const VIS_FIELDS: { key: VisKey; label: string }[] = [
  { key: 'streak', label: 'Sequência' },
  { key: 'weight', label: 'Peso' },
  { key: 'meals', label: 'Refeições' },
  { key: 'achievements', label: 'Conquistas' },
  { key: 'photos', label: 'Fotos de progresso' },
];
const PRIVACY_OPTIONS: { value: PrivacyLevel; label: string }[] = [
  { value: 'private', label: 'Privado' },
  { value: 'friends', label: 'Amigos' },
  { value: 'public', label: 'Público' },
];

export default function EditProfileScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();

  const { profile } = useProfile();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [discoverable, setDiscoverable] = useState(true);
  const [vis, setVis] = useState<Record<VisKey, PrivacyLevel>>({
    streak: 'friends',
    weight: 'private',
    meals: 'friends',
    achievements: 'public',
    photos: 'private',
  });
  const [goalKcal, setGoalKcal] = useState('');
  const [goalProtein, setGoalProtein] = useState('');
  const [goalCarbs, setGoalCarbs] = useState('');
  const [goalFat, setGoalFat] = useState('');
  const [goalWater, setGoalWater] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setUsername(profile.username ?? '');
      setBio(profile.bio ?? '');
      setDiscoverable(profile.discoverable ?? true);
      setVis({
        streak: profile.vis_streak ?? 'friends',
        weight: profile.vis_weight ?? 'private',
        meals: profile.vis_meals ?? 'friends',
        achievements: profile.vis_achievements ?? 'public',
        photos: profile.vis_photos ?? 'private',
      });
      setGoalKcal(String(profile.goal_kcal ?? ''));
      setGoalProtein(String(profile.goal_protein ?? ''));
      setGoalCarbs(String(profile.goal_carbs ?? ''));
      setGoalFat(String(profile.goal_fat ?? ''));
      setGoalWater(String(profile.goal_water_ml ?? ''));
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';

  async function handleChangePhoto() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    const url = await uploadPhoto(result.assets[0].uri, `${user.id}/avatar.jpg`, {
      upsert: true,
    });
    if (!url) {
      Alert.alert('Erro', 'Não foi possível enviar a foto.');
      return;
    }
    // Cache-bust so the overwritten avatar shows immediately.
    const busted = `${url}?t=${Date.now()}`;
    await supabase.from('profiles').update({ avatar_url: busted }).eq('id', user.id);
    setAvatarUrl(busted);
  }

  async function handleSave() {
    if (saving) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const cleanUsername = username.trim().replace(/^@/, '').toLowerCase();
    if (cleanUsername && !/^[a-z0-9_.]{3,20}$/.test(cleanUsername)) {
      Alert.alert(
        'Username inválido',
        'Use de 3 a 20 caracteres: letras, números, ponto ou underline.',
      );
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        name,
        username: cleanUsername || null,
        bio: bio.trim() || null,
        discoverable,
        vis_streak: vis.streak,
        vis_weight: vis.weight,
        vis_meals: vis.meals,
        vis_achievements: vis.achievements,
        vis_photos: vis.photos,
        goal_kcal: Number(goalKcal) || 0,
        goal_protein: Number(goalProtein) || 0,
        goal_carbs: Number(goalCarbs) || 0,
        goal_fat: Number(goalFat) || 0,
        goal_water_ml: Number(goalWater) || 0,
      })
      .eq('id', user.id);
    setSaving(false);

    if (error) {
      if (error.code === '23505') {
        Alert.alert('Username em uso', 'Esse @username já foi escolhido. Tente outro.');
      } else {
        Alert.alert('Erro', error.message);
      }
      return;
    }
    Alert.alert('Salvo!');
    router.back();
  }

  const inputStyle = [
    styles.input,
    {
      backgroundColor: palette.card,
      borderColor: palette.border,
      color: palette.text,
    },
  ];

  function field(
    label: string,
    value: string,
    setter: (v: string) => void,
    numeric = false,
  ) {
    return (
      <View style={styles.fieldBlock}>
        <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>{label}</Text>
        <TextInput
          style={inputStyle}
          value={value}
          onChangeText={setter}
          keyboardType={numeric ? 'numeric' : 'default'}
          placeholderTextColor={palette.textMuted}
        />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="arrow-back" size={24} color={palette.text} />
            </Pressable>
            <Text style={[styles.title, { color: palette.text }]}>Editar Perfil</Text>
          </View>

          {/* Avatar */}
          <View style={styles.avatarBlock}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: palette.primary }]}>
                <Text style={[styles.avatarInitial, { color: palette.onPrimary }]}>{initial}</Text>
              </View>
            )}
            <Pressable onPress={handleChangePhoto} hitSlop={8}>
              <Text style={[styles.changePhoto, { color: palette.text }]}>Alterar foto</Text>
            </Pressable>
          </View>

          {/* Fields */}
          {field('Nome', name, setName)}

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>Username</Text>
            <TextInput
              style={inputStyle}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="seu_username"
              placeholderTextColor={palette.textMuted}
            />
            <Text style={[styles.fieldHint, { color: palette.textMuted }]}>
              Como amigos te encontram. 3–20 caracteres (letras, números, . ou _).
            </Text>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>Bio</Text>
            <TextInput
              style={[inputStyle, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={150}
              placeholder="Conte um pouco sobre você"
              placeholderTextColor={palette.textMuted}
            />
          </View>

          {/* Privacy */}
          <Text style={[styles.privacyHeader, { color: palette.text }]}>Privacidade</Text>

          <Pressable
            style={[styles.toggleRow, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}
            onPress={() => setDiscoverable((d) => !d)}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleTitle, { color: palette.text }]}>
                Aparecer na busca
              </Text>
              <Text style={[styles.fieldHint, { color: palette.textMuted, marginTop: 2 }]}>
                Permite que outros te encontrem por username/nome.
              </Text>
            </View>
            <View
              style={[
                styles.switch,
                { backgroundColor: discoverable ? palette.primary : palette.border },
              ]}>
              <View
                style={[
                  styles.switchKnob,
                  { backgroundColor: discoverable ? palette.onPrimary : palette.background },
                  discoverable && styles.switchKnobOn,
                ]}
              />
            </View>
          </Pressable>

          {VIS_FIELDS.map((f) => (
            <View key={f.key} style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>{f.label}</Text>
              <View style={[styles.privacyPills, { backgroundColor: palette.card }]}>
                {PRIVACY_OPTIONS.map((opt) => {
                  const active = vis[f.key] === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setVis((v) => ({ ...v, [f.key]: opt.value }))}
                      style={[styles.privacyPill, active && { backgroundColor: palette.primary }]}>
                      <Text
                        style={[
                          styles.privacyPillText,
                          { color: active ? palette.onPrimary : palette.textMuted },
                        ]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Goals */}
          <Text style={[styles.privacyHeader, { color: palette.text }]}>Metas</Text>
          {field('Meta de calorias (kcal)', goalKcal, setGoalKcal, true)}
          {field('Meta de proteína (g)', goalProtein, setGoalProtein, true)}
          {field('Meta de carbos (g)', goalCarbs, setGoalCarbs, true)}
          {field('Meta de gordura (g)', goalFat, setGoalFat, true)}
          {field('Meta de água (ml)', goalWater, setGoalWater, true)}

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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
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
  avatarBlock: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '500',
  },
  changePhoto: {
    fontSize: 14,
    fontWeight: '500',
  },
  fieldBlock: {
    marginTop: 12,
  },
  fieldLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: 11,
    marginTop: 6,
    lineHeight: 15,
  },
  input: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 0.5,
    fontSize: 15,
  },
  bioInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  privacyHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 28,
    marginBottom: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  toggleTitle: { fontSize: 15, fontWeight: '500' },
  switch: {
    width: 46,
    height: 28,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
  },
  switchKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  switchKnobOn: { alignSelf: 'flex-end' },
  privacyPills: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  privacyPill: { flex: 1, paddingVertical: 8, borderRadius: 7, alignItems: 'center' },
  privacyPillText: { fontSize: 13, fontWeight: '600' },
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
