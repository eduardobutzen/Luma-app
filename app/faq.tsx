import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';

const FAQ = [
  {
    q: 'Como registro uma refeição?',
    a: 'Na Home, toque em "Registrar refeição" para usar a câmera, ou "Adicionar manualmente" para buscar alimentos.',
  },
  {
    q: 'Como a meta de calorias é calculada?',
    a: 'Usamos a fórmula de Mifflin-St Jeor com seus dados (peso, altura, idade, atividade e objetivo). Você pode ajustar as metas em Editar perfil.',
  },
  {
    q: 'De onde vêm os dados nutricionais?',
    a: 'De uma base local de alimentos brasileiros e da API pública Open Food Facts. Você pode editar as gramas e trocar os alimentos.',
  },
  {
    q: 'Como funciona o streak?',
    a: 'É o número de dias consecutivos em que você registrou ao menos uma refeição, atualizado automaticamente.',
  },
  {
    q: 'Meus dados estão seguros?',
    a: 'Sim. Cada usuário só acessa os próprios dados (Row Level Security). Você pode exportá-los ou excluir a conta quando quiser.',
  },
];

export default function FaqScreen() {
  const scheme = useScheme();
  const palette = colors[scheme];
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <Text style={[styles.title, { color: palette.text }]}>FAQ</Text>
        </View>

        {FAQ.map((item, i) => {
          const expanded = open === i;
          return (
            <Pressable
              key={item.q}
              onPress={() => setOpen(expanded ? null : i)}
              style={[styles.card, { backgroundColor: palette.card, boxShadow: neo[scheme].raised }]}>
              <View style={styles.qRow}>
                <Text style={[styles.q, { color: palette.text }]}>{item.q}</Text>
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={palette.textMuted}
                />
              </View>
              {expanded ? (
                <Text style={[styles.a, { color: palette.textMuted }]}>{item.a}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700' },
  card: { borderRadius: 16, padding: 16, marginTop: 10 },
  qRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  q: { flex: 1, fontSize: 15, fontWeight: '500' },
  a: { fontSize: 14, marginTop: 10, lineHeight: 20 },
});
