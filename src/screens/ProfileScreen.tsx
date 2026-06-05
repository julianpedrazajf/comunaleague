import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Globe, Bell, Settings, ChevronRight } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { getFullProfile, updateAvatarUrl } from '../services/users';
import { getPlayerStats } from '../services/player_stats';
import { uploadAvatar } from '../services/storage';
import { User, PlayerStats } from '../types';
import { AppTabParamList, RootStackParamList } from '../navigation/types';
import Monogram from '../components/ui/Monogram';
import StatTriple from '../components/ui/StatTriple';
import GhostButton from '../components/ui/GhostButton';
import { colors, font, space, radius } from '../theme/tokens';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { session, signOut } = useAuth();
  const navigation = useNavigation<NavProp>();
  const [profile, setProfile] = useState<User | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [data, playerStats] = await Promise.all([
        getFullProfile(session.user.id),
        getPlayerStats(session.user.id),
      ]);
      setProfile(data);
      setStats(playerStats);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !session) return;
    setUploading(true);
    try {
      const uri = result.assets[0].uri;
      const url = await uploadAvatar(session.user.id, uri);
      await updateAvatarUrl(session.user.id, url);
      setProfile((p) => p ? { ...p, avatarUrl: url } : p);
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
    } finally {
      setUploading(false);
    }
  };

  const attrRows = profile
    ? [
        { label: t('profile.position'), value: t(`positions.${profile.position}`) },
        { label: t('profile.foot'), value: t(`foot.${profile.foot}`) },
        { label: t('profile.skillLevel'), value: t(`skillLevel.${profile.skillLevel}`) },
        ...(profile.favoriteTeam ? [{ label: t('profile.favoriteTeam'), value: profile.favoriteTeam }] : []),
      ]
    : [];

  const settingsRows: { label: string; icon: React.ComponentType<any>; route: 'Language' | 'Notifications' | 'Preferences' }[] = [
    { label: t('profile.language'), icon: Globe, route: 'Language' },
    { label: t('profile.notifications'), icon: Bell, route: 'Notifications' },
    { label: t('profile.preferences'), icon: Settings, route: 'Preferences' },
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
            <View>
              <Monogram
                name={profile?.name ?? '?'}
                lastName={profile?.lastName}
                size={80}
                imageUri={profile?.avatarUrl}
                onPress={uploading ? undefined : handlePickAvatar}
              />
              {uploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator size="small" color={colors.cream} />
                </View>
              )}
            </View>
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

          {/* Stats — managed from Supabase dashboard (player_stats table) */}
          <StatTriple
            stats={[
              { value: stats ? String(stats.matches) : '—', label: t('profile.statsMatches') },
              { value: stats ? String(stats.goals)   : '—', label: t('profile.statsGoals')    },
              { value: stats ? String(stats.assists)  : '—', label: t('profile.statsAssists') },
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
                  <TouchableOpacity style={styles.settingsRow} onPress={() => navigation.navigate(row.route)} activeOpacity={0.7}>
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
  uploadOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
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
