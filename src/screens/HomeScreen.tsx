import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../navigation/types';
import { colors, spacing, fontSizes } from '../utils/theme';

type Props = BottomTabScreenProps<AppTabParamList, 'Home'>;

export default function HomeScreen({ navigation: _navigation }: Props) {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>{t('home.welcome')}</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  pageHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pageTitle: { fontSize: fontSizes.xxl, fontWeight: 'bold', color: colors.darkGray },
  scrollView: { flex: 1 },
  content: { padding: spacing.lg },
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
