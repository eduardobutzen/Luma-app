import { useFocusEffect } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/** Movimento mínimo (px) para trocar de estado — evita tremer com o dedo parado. */
const THRESHOLD = 6;
/** Faixa do topo onde as barras ficam sempre visíveis. */
const TOP_ZONE = 12;
const DURATION = 220;

interface ScrollHideValue {
  /** 0 = barras visíveis, 1 = escondidas. */
  hidden: SharedValue<number>;
}

const ScrollHideContext = createContext<ScrollHideValue | null>(null);

/**
 * Estado compartilhado do "esconder ao rolar". Fica acima das abas porque o
 * cabeçalho vive dentro de cada tela, mas a barra inferior é do navegador — as
 * duas precisam ler o mesmo valor para se mover juntas.
 *
 * Só a visibilidade é global. A altura do cabeçalho é medida por tela, já que
 * cada aba tem a sua (a Home tem avatar, o Histórico tem abas, etc.).
 */
export function ScrollHideProvider({ children }: { children: ReactNode }) {
  const hidden = useSharedValue(0);
  const value = useMemo(() => ({ hidden }), [hidden]);
  return <ScrollHideContext.Provider value={value}>{children}</ScrollHideContext.Provider>;
}

export function useScrollHide(): ScrollHideValue {
  const ctx = useContext(ScrollHideContext);
  if (!ctx) throw new Error('useScrollHide exige um <ScrollHideProvider> acima na árvore.');
  return ctx;
}

/**
 * Handler de rolagem que esconde as barras ao descer e as traz de volta ao
 * subir. Passe em `onScroll` de um componente `Animated.*`, com
 * `scrollEventThrottle={16}`.
 */
export function useHideOnScroll(headerHeight = 0) {
  const { hidden } = useScrollHide();
  const lastY = useSharedValue(0);
  // Alvo atual da animação: sem ele, cada frame de rolagem reiniciaria o
  // withTiming e o movimento nunca chegaria ao fim.
  const target = useSharedValue(0);

  const reveal = useCallback(() => {
    target.value = 0;
    hidden.value = withTiming(0, { duration: DURATION });
    lastY.value = 0;
  }, [hidden, lastY, target]);

  // Ao entrar (ou voltar) numa aba, as barras reaparecem.
  useFocusEffect(reveal);

  const onScroll = useAnimatedScrollHandler(
    {
      onScroll: (e) => {
        const y = e.contentOffset.y;
        const dy = y - lastY.value;
        lastY.value = y;

        // No topo, ou quando mal há o que rolar, as barras ficam sempre à vista.
        const scrollable = e.contentSize.height - e.layoutMeasurement.height;
        if (y <= TOP_ZONE || scrollable <= headerHeight) {
          if (target.value !== 0) {
            target.value = 0;
            hidden.value = withTiming(0, { duration: DURATION });
          }
          return;
        }

        const next = dy > THRESHOLD ? 1 : dy < -THRESHOLD ? 0 : target.value;
        if (next !== target.value) {
          target.value = next;
          hidden.value = withTiming(next, { duration: DURATION });
        }
      },
    },
    [headerHeight],
  );

  return onScroll;
}

/**
 * Conveniência para uma tela com cabeçalho colapsável: devolve o handler de
 * rolagem, a altura medida do cabeçalho (para reservar espaço na lista) e o
 * callback que o <CollapsibleHeader> usa para reportá-la.
 */
export function useCollapsibleHeader() {
  const [headerHeight, setHeaderHeight] = useState(0);
  const onScroll = useHideOnScroll(headerHeight);
  return { headerHeight, onHeaderHeight: setHeaderHeight, onScroll };
}
