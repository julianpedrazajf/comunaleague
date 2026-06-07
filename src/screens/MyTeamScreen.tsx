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
import { getMyTeam, getTeamMembers, leaveTeam, transferOwnership, deleteTeam, updateTeamBadge } from '../services/teams';
import { getTeamStanding } from '../services/standings';
import { getTeamMatches, MatchWithTeams } from '../services/matches';
import { createPlayerRequest, cancelPlayerRequest, getTeamOpenRequest } from '../services/playerRequests';
import { uploadTeamBadge } from '../services/storage';
import { Team, User, Standing, PlayerRequest } from '../types';
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
  const [nextMatch, setNextMatch] = useState<MatchWithTeams | null>(null);
  const [playerRequest, setPlayerRequest] = useState<PlayerRequest | null>(null);
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
        const [m, s, matches] = await Promise.all([
          getTeamMembers(found.playerIds),
          getTeamStanding(found.id),
          getTeamMatches(found.id),
        ]);
        setMembers(m);
        setStanding(s);
        const next = matches[0] ?? null;
        setNextMatch(next);
        if (next) {
          const req = await getTeamOpenRequest(found.id, next.id);
          setPlayerRequest(req);
        }
      }
    } catch (e: any) {
      setError(e?.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [session, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleTransferOwnership = (member: Member) => {
    if (!team || !session) return;
    const fullName = `${member.name} ${member.lastName}`;
    Alert.alert(
      t('team.transferTitle'),
      t('team.transferMessage', { name: fullName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('team.makeCaptain'),
          onPress: async () => {
            try {
              await transferOwnership(team.id, member.id);
              setTeam((prev) => prev ? { ...prev, ownerId: member.id } : prev);
            } catch (e: any) {
              Alert.alert(t('common.error'), e?.message ?? t('common.error'));
            }
          },
        },
      ],
    );
  };

  const handleDeleteTeam = () => {
    if (!team || !session) return;
    const otherMembers = members.filter((m) => m.id !== session.user.id);
    if (otherMembers.length > 0) {
      Alert.alert(t('team.deleteTeam'), t('team.deleteTeamHasMembers'));
      return;
    }
    if (nextMatch) {
      Alert.alert(t('team.deleteTeam'), t('team.deleteTeamHasMatches'));
      return;
    }
    Alert.alert(
      t('team.deleteTeamTitle'),
      t('team.deleteTeamMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('team.deleteTeam'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTeam(team.id);
              setTeam(null);
              setMembers([]);
              setStanding(null);
            } catch (e: any) {
              Alert.alert(t('common.error'), e?.message ?? t('common.error'));
            }
          },
        },
      ],
    );
  };

  const handleLeaveTeam = () => {
    if (!team || !session) return;
    if (team.ownerId === session.user.id) {
      Alert.alert(t('team.leaveTeamOwnerTitle'), t('team.leaveTeamOwnerMessage'));
      return;
    }
    Alert.alert(
      t('team.leaveTeamConfirmTitle'),
      t('team.leaveTeamConfirmMessage', { name: team.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('team.leaveTeam'),
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveTeam(team.id);
              setTeam(null);
              setMembers([]);
              setStanding(null);
            } catch (e: any) {
              Alert.alert(t('common.error'), e?.message ?? t('common.error'));
            }
          },
        },
      ],
    );
  };

  const handleTogglePlayerRequest = () => {
    if (!team || !session || !nextMatch) return;
    if (session.user.id !== team.ownerId) {
      Alert.alert(t('team.needPlayerCaptainOnlyTitle'), t('team.needPlayerCaptainOnlyMessage'));
      return;
    }
    if (playerRequest) {
      Alert.alert(
        t('team.cancelPlayerRequestTitle'),
        t('team.cancelPlayerRequestMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            style: 'destructive',
            onPress: async () => {
              try {
                await cancelPlayerRequest(playerRequest.id);
                setPlayerRequest(null);
              } catch (e: any) {
                Alert.alert(t('common.error'), e?.message ?? t('common.error'));
              }
            },
          },
        ],
      );
    } else {
      Alert.alert(
        t('team.needPlayerTitle'),
        t('team.needPlayerMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('team.postRequest'),
            onPress: async () => {
              try {
                const id = await createPlayerRequest(team.id, nextMatch.id);
                setPlayerRequest({ id, teamId: team.id, matchId: nextMatch.id, createdAt: new Date().toISOString(), status: 'open' });
              } catch (e: any) {
                Alert.alert(t('common.error'), e?.message ?? t('common.error'));
              }
            },
          },
        ],
      );
    }
  };

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

        {nextMatch && (
          <TouchableOpacity
            style={[styles.needPlayerBtn, !!playerRequest && styles.needPlayerBtnActive]}
            onPress={handleTogglePlayerRequest}
            activeOpacity={0.75}
          >
            <Text style={[styles.needPlayerBtnText, !!playerRequest && styles.needPlayerBtnTextActive]}>
              {playerRequest ? t('team.cancelPlayerRequest') : t('team.needPlayer')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Squad */}
        <View style={styles.section}>
          <SectionHeader label={t('team.squad')} />
          <View style={styles.playerList}>
            {members.map((m) => {
              const isCaptain = m.id === team.ownerId;
              const viewerIsCaptain = session?.user.id === team.ownerId;
              return (
                <View key={m.id}>
                  <PlayerRow
                    name={m.name}
                    lastName={m.lastName}
                    position={t(`positions.${m.position}`)}
                    isCaptain={isCaptain}
                    avatarUrl={m.avatarUrl}
                    attendanceConfirmed={nextMatch ? (nextMatch.confirmedPlayerIds ?? []).includes(m.id) : undefined}
                    actionLabel={viewerIsCaptain && !isCaptain ? t('team.makeCaptain') : undefined}
                    onAction={viewerIsCaptain && !isCaptain ? () => handleTransferOwnership(m) : undefined}
                  />
                  <View style={styles.divider} />
                </View>
              );
            })}
          </View>
        </View>

        {session?.user.id === team.ownerId ? (
          <View style={styles.captainSection}>
            <Text style={styles.captainSectionTitle}>{t('team.captainSection')}</Text>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteTeam} activeOpacity={0.75}>
              <Text style={styles.deleteBtnText}>{t('team.deleteTeam')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveTeam} activeOpacity={0.75}>
            <Text style={styles.leaveBtnText}>{t('team.leaveTeam')}</Text>
          </TouchableOpacity>
        )}

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

  leaveBtn: {
    alignItems: 'center',
    paddingVertical: space.md,
  },
  leaveBtnText: {
    fontFamily: font.sansBold,
    fontSize: 14,
    color: '#EF4444',
  },

  captainSection: {
    gap: space.md,
  },
  needPlayerBtn: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  needPlayerBtnActive: {
    backgroundColor: 'rgba(242,177,102,0.10)',
    borderColor: 'rgba(242,177,102,0.40)',
  },
  needPlayerBtnText: {
    fontFamily: font.sansBold,
    fontSize: 14,
    color: colors.cream70,
  },
  needPlayerBtnTextActive: {
    color: '#F2B366',
  },
  captainSectionTitle: {
    fontFamily: font.sansBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.cream45,
    textTransform: 'uppercase',
  },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: space.md,
  },
  deleteBtnText: {
    fontFamily: font.sansBold,
    fontSize: 14,
    color: '#EF4444',
  },
});
