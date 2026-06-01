import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { getMyTeam, getTeamMembers } from '../services/teams';
import { getProfile } from '../services/users';
import { Team, User } from '../types';
import { colors, spacing, fontSizes } from '../utils/theme';
import { AppTabParamList, RootStackParamList } from '../navigation/types';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'MyTeam'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Member = Pick<User, 'id' | 'name' | 'lastName' | 'position' | 'skillLevel'>;
type ProfileSummary = Pick<User, 'id' | 'name' | 'lastName'>;

const AVATAR_COLORS = [colors.teal, colors.primary, colors.orange, colors.accent, '#7B68EE', '#20B2AA'];

export default function MyTeamScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigation = useNavigation<NavProp>();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const [found, prof] = await Promise.all([
        getMyTeam(session.user.id),
        getProfile(session.user.id),
      ]);
      setTeam(found);
      setProfile(prof);
      if (found) {
        const m = await getTeamMembers(found.playerIds);
        setMembers(m);
      }
    } catch (e: any) {
      setError(e?.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [session, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!team) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.pageHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.backBtnText}>← {t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>{t('team.myTeam')}</Text>
          {profile && (
            <Text style={styles.greeting}>{t('common.hello')}, {profile.name}</Text>
          )}
        </View>
        <View style={styles.centered}>
          <Text style={styles.noTeamTitle}>{t('team.noTeam')}</Text>
          <Text style={styles.noTeamSub}>{t('team.noTeamSub')}</Text>
          <TouchableOpacity
            style={styles.ctaPrimary}
            onPress={() => navigation.navigate('CreateTeam')}
          >
            <Text style={styles.ctaPrimaryText}>{t('team.createTeam')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ctaSecondary}
            onPress={() => navigation.navigate('JoinTeam')}
          >
            <Text style={styles.ctaSecondaryText}>{t('team.joinTeam')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.pageHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backBtnText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>{t('team.myTeam')}</Text>
        {profile && (
          <Text style={styles.greeting}>{t('common.hello')}, {profile.name}</Text>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.teamCard}>
          <Text style={styles.teamName}>{team.name}</Text>
          <View style={styles.formatBadge}>
            <Text style={styles.formatText}>
              {team.format === 5 ? t('team.format5') : t('team.format11')}
            </Text>
          </View>
          <Text style={styles.memberCount}>
            {members.length} {t('team.squad').toLowerCase()}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{t('team.squad')}</Text>

        {members.map((m, i) => (
          <View key={m.id} style={styles.memberRow}>
            <View style={[styles.avatar, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }]}>
              <Text style={styles.avatarInitials}>
                {m.name[0]}{m.lastName[0]}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.memberName} numberOfLines={1}>{m.name} {m.lastName}</Text>
                {m.id === team.ownerId && (
                  <View style={styles.captainBadge}>
                    <Text style={styles.captainText}>{t('team.captain')}</Text>
                  </View>
                )}
              </View>
              <View style={styles.memberMeta}>
                <Text style={styles.memberPosition}>{t(`positions.${m.position}`)}</Text>
                <Text style={styles.memberDot}>·</Text>
                <Text style={styles.memberSkill}>{t(`skillLevel.${m.skillLevel}`)}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  scrollView: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  // Page header
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
  greeting: { fontSize: fontSizes.sm, color: colors.gray, marginTop: spacing.xs },

  // Error state
  errorText: { color: colors.primary, fontSize: fontSizes.sm, textAlign: 'center', marginBottom: spacing.md },
  retryBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  retryText: { color: colors.primary, fontWeight: '600' },

  // No team state
  noTeamTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  noTeamSub: {
    fontSize: fontSizes.sm,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  ctaPrimary: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  ctaPrimaryText: { color: colors.white, fontWeight: 'bold', fontSize: fontSizes.md },
  ctaSecondary: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    width: '100%',
    alignItems: 'center',
  },
  ctaSecondaryText: { color: colors.primary, fontWeight: 'bold', fontSize: fontSizes.md },

  // Team card
  teamCard: {
    backgroundColor: colors.teal,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  teamName: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: spacing.sm,
  },
  formatBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  formatText: { color: colors.white, fontSize: fontSizes.xs, fontWeight: '600' },
  memberCount: { color: 'rgba(255,255,255,0.7)', fontSize: fontSizes.sm },

  // Squad
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.darkGray,
    marginBottom: spacing.md,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarInitials: { color: colors.white, fontWeight: 'bold', fontSize: fontSizes.sm },
  memberInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  memberName: { fontSize: fontSizes.md, fontWeight: '600', color: colors.darkGray, flex: 1 },
  captainBadge: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  captainText: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.darkGray },
  memberMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  memberPosition: { fontSize: fontSizes.sm, color: colors.gray },
  memberDot: { fontSize: fontSizes.xs, color: colors.gray },
  memberSkill: { fontSize: fontSizes.sm, color: colors.gray },
});
