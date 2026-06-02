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
import { useFocusEffect } from '@react-navigation/native';
import { Globe, Bell, Settings, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { getFullProfile } from '../services/users';
import { User } from '../types';
import { AppTabParamList } from '../navigation/types';
import Monogram from '../components/ui/Monogram';
import StatTriple from '../components/ui/StatTriple';
import GhostButton from '../components/ui/GhostButton';
import { colors, font, space, radius } from '../theme/tokens';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { session, signOut } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const data = await getFullProfile(session.user.id);
      setProfile(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const attrRows = profile
    ? [
        { label: t('profile.position'), value: t(`positions.${profile.position}`) },
        { label: t('profile.foot'), value: t(`foot.${profile.foot}`) },
        { label: t('profile.skillLevel'), value: t(`skillLevel.${profile.skillLevel}`) },
        ...(profile.favoriteTeam ? [{ label: t('profile.favoriteTeam'), value: profile.favoriteTeam }] : []),
      ]
    : [];

  const settingsRows = [
    { label: t('profile.language'), icon: Globe },
    { label: t('profile.notifications'), icon: Bell },
    { label: t('profile.preferences'), icon: Settings },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.navBar}>
        <Text style={styles.pageTitle}>{t('profile.title')}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.cream45} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Avatar header */}
          <View style={styles.avatarSection}>
            <Monogram
              name={profile?.name ?? '?'}
              lastName={profile?.lastName}
              size={80}
            />
            <View style={styles.nameBlock}>
              <Text style={styles.fullName}>
                {profile?.name} {profile?.lastName}
              </Text>
              {profile && (
                <Text style={styles.positionEyebrow}>
                  {t(`positions.${profile.position}`)}
                </Text>
              )}
            </View>
          </View>

          {/* Stats */}
          <StatTriple
            stats={[
              { value: '24', label: 'Partidos' },
              { value: '8', label: 'Goles' },
              { value: '5', label: 'Asist.' },
            ]}
          />

          {/* Attributes card */}
          {attrRows.length > 0 && (
            <View style={styles.infoCard}>
              <Text style={styles.cardEyebrow}>{t('profile.attributes')}</Text>
              {attrRows.map((row, i) => (
                <View key={row.label}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{row.label}</Text>
                    <Text style={styles.infoValue}>{row.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Settings card */}
          <View style={styles.infoCard}>
            <Text style={styles.cardEyebrow}>{t('profile.settingsTitle')}</Text>
            {settingsRows.map((row, i) => {
              const Icon = row.icon;
              return (
                <View key={row.label}>
                  {i > 0 && <View style={styles.divider} />}
                  <TouchableOpacity style={styles.settingsRow}>
                    <Icon size={15} color={colors.cream45} strokeWidth={2} />
                    <Text style={styles.settingsLabel}>{row.label}</Text>
                    <ChevronRight size={14} color={colors.cream25} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          <GhostButton label={t('auth.logout')} full onPress={signOut} />

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  navBar: { paddingHorizontal: 18, paddingVertical: space.md },
  pageTitle: { fontFamily: font.sansXBold, fontSize: 27, letterSpacing: -0.5, color: colors.cream },

  content: { paddingHorizontal: 18, gap: space.xl },

  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  nameBlock: { flex: 1, gap: 4 },
  fullName: { fontFamily: font.sansXBold, fontSize: 20, color: colors.cream },
  positionEyebrow: {
    fontFamily: font.sansBold,
    fontSize: 10.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.cream70,
  },

  infoCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.xs,
    gap: 0,
  },
  cardEyebrow: {
    fontFamily: font.sansBold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.cream45,
    marginBottom: space.sm,
  },
  divider: { height: 1, backgroundColor: colors.hairline },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
  },
  infoLabel: { fontFamily: font.sans, fontSize: 14, color: colors.cream70 },
  infoValue: { fontFamily: font.sansBold, fontSize: 14, color: colors.cream },

  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: space.md,
  },
  settingsLabel: { fontFamily: font.sans, fontSize: 14, color: colors.cream70, flex: 1 },
});
