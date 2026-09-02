import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PressableScale from '@/components/PressableScale';
import { colors, neo } from '@/constants/theme';
import { useScheme } from '@/hooks/useScheme';
import { useScrollHide } from '@/hooks/useScrollHide';

export interface RegisterOption {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}

const FAB = 60;

/**
 * FAB "+" que sobe uma folha (bottom sheet) com as opções de registro.
 * Posicionar como último filho da tela.
 */
export default function RegisterSheet({ options }: { options: RegisterOption[] }) {
  const scheme = useScheme();
  const palette = colors[scheme];
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  // Acima da tab bar (52px úteis + área segura).
  const tabBarHeight = 52 + insets.bottom;
  const fabBottom = tabBarHeight + 14;

  const { hidden } = useScrollHide();
  // Desce junto com a tab bar, para não ficar boiando quando ela sai.
  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hidden.value * (tabBarHeight + 14) }],
  }));

  function pick(o: RegisterOption) {
    setOpen(false);
    Haptics.selectionAsync();
    o.onPress();
  }

  return (
    <>
      {/* FAB */}
      <Animated.View
        style={[styles.anchor, { bottom: fabBottom }, fabStyle]}
        pointerEvents="box-none">
        <PressableScale
          style={[styles.fab, { backgroundColor: palette.primary, boxShadow: neo[scheme].fab }]}
          scaleTo={0.9}
          onPress={() => {
            Haptics.selectionAsync();
            setOpen(true);
          }}>
          <Ionicons name="add" size={32} color={palette.onPrimary} />
        </PressableScale>
      </Animated.View>

      {/* Bottom sheet */}
      <Modal visible={open} transparent statusBarTranslucent animationType="none" onRequestClose={() => setOpen(false)}>
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        </Animated.View>

        <View style={styles.sheetWrap} pointerEvents="box-none">
          <Animated.View
            entering={SlideInDown.duration(220)}
            exiting={SlideOutDown.duration(160)}
            style={[
              styles.sheet,
              { backgroundColor: palette.card, paddingBottom: insets.bottom + 20 },
            ]}>
            <View style={[styles.handle, { backgroundColor: palette.textMuted }]} />
            <Text style={[styles.title, { color: palette.text }]}>Registrar refeição</Text>
            <Text style={[styles.subtitle, { color: palette.textMuted }]}>
              Como você quer adicionar?
            </Text>

            {options.map((o) => (
              <PressableScale
                key={o.title}
                style={[styles.option, { backgroundColor: palette.surface }]}
                onPress={() => pick(o)}>
                <View style={[styles.optionIcon, { backgroundColor: palette.surface }]}>
                  <Ionicons name={o.icon} size={24} color={palette.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: palette.text }]}>{o.title}</Text>
                  <Text style={[styles.optionSubtitle, { color: palette.textMuted }]}>
                    {o.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
              </PressableScale>
            ))}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    right: 16,
  },
  fab: {
    width: FAB,
    height: FAB,
    borderRadius: FAB / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  optionSubtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
});
