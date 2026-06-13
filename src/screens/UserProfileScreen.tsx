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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { X, MessageCircle } from 'lucide-react-native';
import { getPublicProfile, PublicProfile } from '../services/users';
import { getPlayerStats } from '../services/player_stats';
import { PlayerStats } from '../types';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import Monogram from '../components/ui/Monogram';
import StatTriple from '../components/ui/StatTriple';
import { colors, font, space, radius } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

export default function UserProfileScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { userId } = route.params;
  const isOwnProfile = session?.user.id === userId;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, playerStats] = await Promise.all([
        getPublicProfile(userId),
        getPlayerStats(userId).catch(() => null),
      ]);
      setProfile(data);
      setStats(playerStats);
    } catch (e: any) {
      setError(e?.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [userId, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const attrRows = profile
    ? [
        { label: t('profile.position'), value: t(`positions.${profile.position}`) },
        { label: t('profile.foot'), value: t(`foot.${profile.foot}`) },
        { label: t('profile.skillLevel'), value: t(`skillLevel.${profile.skillLevel}`) },
        ...(profile.height ? [{ label: t('profile.height'), value: `${profile.height} cm` }] : []),
        ...(profile.city ? [{ label: t('profile.city'), value: profile.city }] : []),
        ...(profile.favoriteTeam ? [{ label: t('profile.favoriteTeam'), value: profile.favoriteTeam }] : []),
      ]
    : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.navBar}>
        <Text style={styles.pageTitle}>{t('profile.playerTitle')}</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <X size={20} color={colors.cream45} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.cream45} />
        </View>
      ) : error || !profile ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? t('common.error')}</Text>
          <TouchableOpacity onPress={load} style={{ marginTop: space.md }}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.avatarSection}>
            <Monogram
              name={profile.name}
              lastName={profile.lastName}
              size={80}
              imageUri={profile.avatarUrl}
            />
            <View style={styles.nameBlock}>
              <Text style={styles.fullName}>
                {profile.name} {profile.lastName}
              </Text>
              <Text style={styles.positionEyebrow}>
                {t(`positions.${profile.position}`)}
              </Text>
            </View>
          </View>

          {!isOwnProfile && (
            <TouchableOpacity
              style={styles.messageBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Chat', {
                peerId: profile.id,
                peerName: `${profile.name} ${profile.lastName}`,
              })}
            >
              <MessageCircle size={17} color={colors.black} strokeWidth={2.2} />
              <Text style={styles.messageBtnText}>{t('profile.message')}</Text>
            </TouchableOpacity>
          )}

          <StatTriple
            stats={[
              { value: stats ? String(stats.matches) : '—', label: t('profile.statsMatches') },
              { value: stats ? String(stats.goals)   : '—', label: t('profile.statsGoals')    },
              { value: stats ? String(stats.assists)  : '—', label: t('profile.statsAssists') },
            ]}
          />

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

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: space.md,
  },
  pageTitle: { fontFamily: font.sansXBold, fontSize: 27, letterSpacing: -0.5, color: colors.cream },
  closeBtn: { padding: 4 },

  errorText: { fontFamily: font.sans, fontSize: 13, color: '#EF4444', textAlign: 'center' },
  retryText: { fontFamily: font.sansBold, fontSize: 13, color: colors.cream70 },

  content: { paddingHorizontal: 18, gap: space.xl, paddingTop: space.sm },

  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.cream2,
    borderRadius: radius.pill,
    paddingVertical: 14,
  },
  messageBtnText: { fontFamily: font.sansBold, fontSize: 15, color: colors.black },
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
});
