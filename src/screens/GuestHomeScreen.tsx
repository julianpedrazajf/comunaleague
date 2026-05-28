import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { AuthStackParamList } from '../navigation/types';
import { colors, spacing, fontSizes } from '../utils/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'GuestHome'>;

export default function GuestHomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const redirectToLogin = () => navigation.navigate('Login');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.appName}>ComunaLeague</Text>
        <Text style={styles.tagline}>{t('guest.tagline')}</Text>
      </View>

      {/* Preview tiles — visually accessible, tap redirects to login */}
      <TouchableOpacity style={styles.previewTile} onPress={redirectToLogin} activeOpacity={0.8}>
        <Text style={styles.tileTitle}>{t('home.myTeam')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.previewTile} onPress={redirectToLogin} activeOpacity={0.8}>
        <Text style={styles.tileTitle}>{t('home.matchSchedule')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.previewTile} onPress={redirectToLogin} activeOpacity={0.8}>
        <Text style={styles.tileTitle}>{t('home.inbox')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cta} onPress={redirectToLogin}>
        <Text style={styles.ctaText}>{t('guest.signIn')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  hero: { alignItems: 'center', paddingVertical: spacing.xl },
  appName: { fontSize: fontSizes.xxl, fontWeight: 'bold', color: colors.primary },
  tagline: { fontSize: fontSizes.md, color: colors.darkGray, textAlign: 'center', marginTop: spacing.sm },
  previewTile: {
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  tileTitle: { fontSize: fontSizes.lg, fontWeight: '600', color: colors.darkGray },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  ctaText: { color: colors.white, fontSize: fontSizes.md, fontWeight: 'bold' },
});
