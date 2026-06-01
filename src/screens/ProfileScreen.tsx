import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { getFullProfile } from '../services/users';
import { User } from '../types';
import { colors, spacing, fontSizes } from '../utils/theme';

type NavProp = BottomTabNavigationProp<AppTabParamList, 'Profile'>;

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { session, signOut } = useAuth();
  const navigation = useNavigation<NavProp>();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const data = await getFullProfile(session.user.id);
      setProfile(data);
    } catch {
      // silently fail — user still sees the logout button
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const initials = profile
    ? `${profile.name[0]}${profile.lastName[0]}`.toUpperCase()
    : '';

  const rows = profile
    ? [
        { label: t('auth.email'), value: profile.email },
        { label: t('profile.age'), value: String(profile.age) },
        { label: t('profile.country'), value: profile.country },
        { label: t('profile.city'), value: profile.city },
        { label: t('profile.position'), value: t(`positions.${profile.position}`) },
        { label: t('profile.foot'), value: t(`foot.${profile.foot}`) },
        { label: t('profile.height'), value: `${profile.height} cm` },
        { label: t('profile.skillLevel'), value: t(`skillLevel.${profile.skillLevel}`) },
        ...(profile.favoriteTeam
          ? [{ label: t('profile.favoriteTeam'), value: profile.favoriteTeam }]
          : []),
      ]
    : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.pageHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backBtnText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>{t('home.profile')}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
            {profile && (
              <>
                <Text style={styles.fullName}>
                  {profile.name} {profile.lastName}
                </Text>
                <View style={styles.skillBadge}>
                  <Text style={styles.skillBadgeText}>
                    {t(`skillLevel.${profile.skillLevel}`)}
                  </Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.infoCard}>
            {rows.map((row, i) => (
              <View
                key={row.label}
                style={[styles.infoRow, i < rows.length - 1 && styles.infoRowBorder]}
              >
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <TouchableOpacity style={styles.logout} onPress={signOut}>
        <Text style={styles.logoutText}>{t('auth.logout')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  pageHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { marginBottom: spacing.xs },
  backBtnText: { fontSize: fontSizes.sm, color: colors.gray, fontWeight: '500' },
  pageTitle: { fontSize: fontSizes.xxl, fontWeight: 'bold', color: colors.darkGray },

  scrollContent: { padding: spacing.lg, gap: spacing.lg },

  avatarSection: { alignItems: 'center', gap: spacing.sm },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontSize: fontSizes.xl, fontWeight: '700', color: colors.white },
  fullName: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.darkGray },
  skillBadge: {
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  skillBadgeText: { fontSize: fontSizes.xs, color: colors.gray, fontWeight: '600' },

  infoCard: {
    backgroundColor: colors.lightGray,
    borderRadius: 14,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: fontSizes.sm, color: colors.gray },
  infoValue: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.darkGray, textAlign: 'right', flex: 1, marginLeft: spacing.md },

  logout: {
    margin: spacing.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  logoutText: { color: colors.primary, fontSize: fontSizes.md, fontWeight: '600' },
});
