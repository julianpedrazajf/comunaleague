import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { AuthStackParamList } from '../navigation/types';
import { colors, spacing, fontSizes } from '../utils/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'ProfileSetup'>;

export default function ProfileSetupScreen({ navigation: _navigation }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('profile.setup')}</Text>
      {/* TODO: Multi-step Formik form */}
      {/* Fields: name, lastName, age, country, city, position, foot, height, skillLevel, favoriteTeam, avatar */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center' },
  title: { fontSize: fontSizes.xxl, fontWeight: 'bold', color: colors.darkGray },
});
