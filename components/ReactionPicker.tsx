import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { REACTION_EMOJIS } from '@/lib/engagement';

/** Folha flutuante com os emojis de reação (❤️🔥💪👏). */
export function ReactionPicker({
  visible,
  onPick,
  onClose,
}: {
  visible: boolean;
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  const palette = colors[useScheme()];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.bar, { backgroundColor: palette.card }]} onPress={() => {}}>
          {REACTION_EMOJIS.map((e) => (
            <Pressable
              key={e}
              style={styles.emojiBtn}
              onPress={() => {
                onPick(e);
                onClose();
              }}>
              <Text style={styles.emoji}>{e}</Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  bar: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 99,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  emojiBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  emoji: { fontSize: 32 },
});
