import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSizes } from '../utils/theme';

export default function CreateTeamScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('team.createTeam')}</Text>
      {/* TODO: Formik form — name, badge, format (5|11), invite players, submit + payment */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { fontSize: fontSizes.xl, fontWeight: 'bold', color: colors.darkGray },
});
