import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSizes } from '../utils/theme';

export default function InboxScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('inbox.title')}</Text>
      <Text style={styles.empty}>{t('inbox.noMessages')}</Text>
      {/* TODO: Message list from organizers + team */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { fontSize: fontSizes.xl, fontWeight: 'bold', color: colors.darkGray },
  empty: { fontSize: fontSizes.md, color: colors.gray, marginTop: spacing.lg },
});
