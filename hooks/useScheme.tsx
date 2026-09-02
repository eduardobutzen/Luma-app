import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemePref = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'luma.theme';

interface ThemeContextValue {
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  pref: 'system',
  setPref: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setPrefState(v);
    });
  }, []);

  const setPref = (p: ThemePref) => {
    setPrefState(p);
    AsyncStorage.setItem(STORAGE_KEY, p);
  };

  return <ThemeContext.Provider value={{ pref, setPref }}>{children}</ThemeContext.Provider>;
}

/** The user's theme preference + setter (for the settings UI). */
export function useThemePref() {
  return useContext(ThemeContext);
}

/** Effective color scheme: the manual override, or the system scheme. */
export function useScheme(): 'light' | 'dark' {
  const { pref } = useContext(ThemeContext);
  const system = useSystemColorScheme();
  if (pref === 'light' || pref === 'dark') return pref;
  return system === 'dark' ? 'dark' : 'light';
}
