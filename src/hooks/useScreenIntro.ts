import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

/**
 * One-time per-screen onboarding. The first time a user opens a screen its intro
 * shows, then it's remembered (scoped per user) so it never auto-shows again.
 *
 * `autoShow = false` is for intros triggered manually (e.g. a button) — they
 * ignore the "seen" flag and open only when open() is called.
 */
export function useScreenIntro(id: string, autoShow = true) {
  const { session } = useAuth();
  const key = `@intro_${id}_${session?.user.id ?? 'guest'}`;
  const [visible, setVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!autoShow) return;
      let active = true;
      AsyncStorage.getItem(key)
        .then((seen) => { if (active && !seen) setVisible(true); })
        .catch(() => {});
      return () => { active = false; };
    }, [key, autoShow]),
  );

  const open = useCallback(() => setVisible(true), []);

  // Closes and remembers it so it won't auto-show again.
  const dismiss = useCallback(() => {
    setVisible(false);
    AsyncStorage.setItem(key, '1').catch(() => {});
  }, [key]);

  return { visible, open, dismiss };
}
