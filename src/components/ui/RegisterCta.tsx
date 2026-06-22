import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import CreamButton from './CreamButton';
import { colors, font, space } from '../../theme/tokens';

/**
 * Guest-mode call to action: a "Register" button that leaves guest mode and
 * sends the user to the sign-up screen. Used wherever a guest hits a feature
 * that needs an account.
 */
export default function RegisterCta({ style, prompt = true }: { style?: ViewStyle; prompt?: boolean }) {
  const { t } = useTranslation();
  const { registerFromGuest } = useAuth();
  return (
    <View style={[styles.wrap, style]}>
      {prompt ? <Text style={styles.prompt}>{t('guest.registerPrompt')}</Text> : null}
      <CreamButton label={t('guest.register')} full onPress={registerFromGuest} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 18, paddingVertical: space.lg, gap: space.md },
  prompt: { fontFamily: font.sans, fontSize: 13.5, color: colors.cream70, textAlign: 'center', lineHeight: 19 },
});
