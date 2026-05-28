import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../navigation/types';
import { colors, spacing, fontSizes } from '../utils/theme';

type Props = BottomTabScreenProps<AppTabParamList, 'Home'>;

export default function HomeScreen({ navigation: _navigation }: Props) {
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.welcome}>{t('home.welcome')}</Text>

      <View style={styles.row}>
        <TouchableOpacity style={styles.tile}>
          <Text style={styles.tileText}>{t('home.myTeam')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tile}>
          <Text style={styles.tileText}>{t('home.matchSchedule')}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TouchableOpacity style={styles.tile}>
          <Text style={styles.tileText}>{t('home.inbox')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tile}>
          <Text style={styles.tileText}>{t('home.playSolo')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>{t('home.topScorers')}</Text>
      {/* TODO: Stats section — read-only scrollable tiles */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  welcome: { fontSize: fontSizes.xl, fontWeight: 'bold', color: colors.darkGray, marginBottom: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  tile: {
    flex: 1,
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
  },
  tileText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.darkGray, textAlign: 'center' },
  sectionTitle: { fontSize: fontSizes.lg, fontWeight: 'bold', color: colors.darkGray, marginTop: spacing.lg },
});
