import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { getMyTeam, getTeamMembers, updateTeamBadge } from '../services/teams';
import { getTeamStanding } from '../services/standings';
import { uploadTeamBadge } from '../services/storage';
import { Team, User, Standing } from '../types';
import { AppTabParamList, RootStackParamList } from '../navigation/types';
import SectionHeader from '../components/ui/SectionHeader';
import StatTriple from '../components/ui/StatTriple';
import PlayerRow from '../components/ui/PlayerRow';
import Monogram from '../components/ui/Monogram';
import Chip from '../components/ui/Chip';
import CreamButton from '../components/ui/CreamButton';
import GhostButton from '../components/ui/GhostButton';
import { colors, font, space, radius } from '../theme/tokens';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'MyTeam'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Member = Pick<User, 'id' | 'name' | 'lastName' | 'position' | 'skillLevel' | 'avatarUrl'>;

export default function MyTeamScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigation = useNavigation<NavProp>();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [standing, setStanding] = useState<Standing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const found = await getMyTeam(session.user.id);
      setTeam(found);
      if (found) {
        const [m, s] = await Promise.all([
          getTeamMembers(found.playerIds),
          getTeamStanding(found.id),
        ]);
        setMembers(m);
        setStanding(s);
      }
    } catch (e: any) {
      setError(e?.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [session, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handlePickBadge = async () => {
    if (!team || !session || team.ownerId !== session.user.id) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const uri = result.assets[0].uri;
      const url = await uploadTeamBadge(team.id, uri);
      await updateTeamBadge(team.id, url);
      setTeam((t) => t ? { ...t, badgeUrl: url } : t);
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.cream45} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!team) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.navBar}>
          <Text style={styles.pageTitle}>{t('team.myTeam')}</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>{t('team.noTeam')}</Text>
          <Text style={styles.emptySub}>{t('team.noTeamSub')}</Text>
          <View style={styles.emptyActions}>
            <CreamButton
              label={t('team.createTeam')}
              full
              onPress={() => navigation.navigate('CreateTeam')}
            />
            <GhostButton
              label={t('team.joinTeam')}
              full
              onPress={() => navigation.navigate('JoinTeam')}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const formatLabel = team.format === 5 ? t('team.format5') : t('team.format11');
  const pos = standing ? `${standing.position}°` : '—';
  const wins = standing ? String(standing.wins) : '—';
  const points = standing ? String(standing.points) : '—';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.navBar}>
        <Text style={styles.pageTitle}>{t('team.myTeam')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Team header */}
        <View style={styles.teamHeader}>
          <Monogram
            name={team.name}
            size={72}
            shape="square"
            imageUri={team.badgeUrl}
            onPress={!uploading && team.ownerId === session?.user.id ? handlePickBadge : undefined}
          />
          <Text style={styles.teamName}>{team.name}</Text>
          <Chip label={formatLabel} />
        </View>

        {/* Stats — set from Supabase dashboard (standings table) */}
        <StatTriple
          stats={[
            { value: pos,    label: t('team.statsPosition') },
            { value: wins,   label: t('team.statsWins')     },
            { value: points, label: t('team.statsPoints')   },
          ]}
        />

        {/* Squad */}
        <View style={styles.section}>
          <SectionHeader
            label={t('team.squad')}
            actionLabel={t('team.invite')}
            onAction={() => {}}
          />
          <View style={styles.playerList}>
            {members.map((m) => (
              <View key={m.id}>
                <PlayerRow
                  name={m.name}
                  lastName={m.lastName}
                  position={t(`positions.${m.position}`)}
                  isCaptain={m.id === team.ownerId}
                  avatarUrl={m.avatarUrl}
                />
                <View style={styles.divider} />
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  navBar: { paddingHorizontal: 18, paddingVertical: space.md },
  pageTitle: { fontFamily: font.sansXBold, fontSize: 27, letterSpacing: -0.5, color: colors.cream },

  errorText: { fontFamily: font.sans, fontSize: 14, color: '#EF4444', textAlign: 'center', marginBottom: space.md },
  retryText: { fontFamily: font.sansBold, fontSize: 13, color: colors.cream70 },

  emptyTitle: { fontFamily: font.sansBold, fontSize: 18, color: colors.cream, textAlign: 'center', marginBottom: space.sm },
  emptySub: { fontFamily: font.sans, fontSize: 14, color: colors.cream70, textAlign: 'center', marginBottom: space.xl },
  emptyActions: { width: '100%', gap: space.md },

  content: { paddingHorizontal: 18, paddingTop: space.md, gap: space.xl },

  teamHeader: { alignItems: 'center', gap: space.md },
  teamName: { fontFamily: font.sansXBold, fontSize: 22, color: colors.cream, textAlign: 'center' },

  section: {},
  playerList: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    paddingHorizontal: space.lg,
  },
  divider: { height: 1, backgroundColor: colors.hairline },
});
