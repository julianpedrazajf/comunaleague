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

type Member = Pick<User, 'id' | 'name' | 'lastName' | 'position' | 'skillLevel'>;

export default function MyTeamScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigation = useNavigation<NavProp>();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const [found] = await Promise.all([getMyTeam(session.user.id)]);
      setTeam(found);
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.navBar}>
        <Text style={styles.pageTitle}>{t('team.myTeam')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Team header */}
        <View style={styles.teamHeader}>
          <Monogram name={team.name} size={72} shape="square" />
          <Text style={styles.teamName}>{team.name}</Text>
          <Chip label={formatLabel} />
        </View>

        {/* Stats */}
        <StatTriple
          stats={[
            { value: '3°', label: 'Posición' },
            { value: '4', label: 'Victorias' },
            { value: '12', label: 'Puntos' },
          ]}
        />

        {/* Squad */}
        <View style={styles.section}>
          <SectionHeader
            label={t('team.squad')}
            actionLabel="Invitar"
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
