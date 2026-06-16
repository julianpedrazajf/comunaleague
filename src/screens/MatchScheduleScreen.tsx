import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Calendar, Clock, MapPin, Check, Users, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { getMyTeam } from '../services/teams';
import { getTeamMatches, MatchWithTeams } from '../services/matches';
import { createPlayerRequest, cancelPlayerRequest, getTeamOpenRequests } from '../services/playerRequests';
import { hasPendingApplicants, getUpcomingAcceptedMatches } from '../services/notifications';
import { getUserTournamentRegistrations } from '../services/tournaments';
import { getMyLeagueMatches, leagueMatchLabel, LeagueMatchView } from '../services/league';
import { Team, PlayerRequest, Tournament } from '../types';
import { AppTabParamList, RootStackParamList } from '../navigation/types';
import MatchRow from '../components/ui/MatchRow';
import CreamButton from '../components/ui/CreamButton';
import MonthCalendar from '../components/ui/MonthCalendar';
import Chip from '../components/ui/Chip';
import SectionHeader from '../components/ui/SectionHeader';
import { colors, font, space, radius } from '../theme/tokens';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'MatchSchedule'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${minutes} ${ampm}`;
}


export default function MatchScheduleScreen() {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const navigation = useNavigation<NavProp>();

  const [team, setTeam] = useState<Team | null>(null);
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [soloMatches, setSoloMatches] = useState<Tournament[]>([]);
  const [leagueMatches, setLeagueMatches] = useState<LeagueMatchView[]>([]);
  const [requestMap, setRequestMap] = useState<Map<string, PlayerRequest>>(new Map());
  const [guestMatchIds, setGuestMatchIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (session) {
        const found = await getMyTeam(session.user.id);
        setTeam(found);
        const [teamMatches, guestMatches, openReqs, registeredTournaments, leagueData] = await Promise.all([
          found ? getTeamMatches(found.id) : Promise.resolve([]),
          getUpcomingAcceptedMatches().catch(() => []),
          found ? getTeamOpenRequests(found.id) : Promise.resolve([]),
          getUserTournamentRegistrations(session.user.id).catch(() => []),
          getMyLeagueMatches(session.user.id).catch(() => []),
        ]);

        // Combine team + guest matches, deduplicate, sort by date+time
        // The team's own league fixtures are shown in the league section below,
        // so keep them out of the team-matches list (guest league matches stay).
        const seen = new Set<string>();
        const combined = [...teamMatches.filter((m) => !m.leagueMatchId), ...guestMatches].filter((m) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
        combined.sort((a, b) =>
          new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime(),
        );
        setMatches(combined);
        setSoloMatches(registeredTournaments);
        setLeagueMatches(leagueData);
        setGuestMatchIds(new Set(guestMatches.map((m) => m.id)));
        setRequestMap(new Map(openReqs.map((r) => [r.matchId, r])));
      }
    } catch (e: any) {
      setError(e?.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [session, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const matchDateSet = useMemo(
    () => new Set([
      ...matches.map(m => m.date),
      ...soloMatches.map(m => m.startDate),
      ...leagueMatches.map(m => m.date),
    ]),
    [matches, soloMatches, leagueMatches],
  );

  const filteredMatches = useMemo(() =>
    selectedDate ? matches.filter(m => m.date === selectedDate) : matches,
    [matches, selectedDate]
  );

  const filteredSoloMatches = useMemo(() =>
    selectedDate ? soloMatches.filter(m => m.startDate === selectedDate) : soloMatches,
    [soloMatches, selectedDate]
  );

  const filteredLeagueMatches = useMemo(() =>
    selectedDate ? leagueMatches.filter(m => m.date === selectedDate) : leagueMatches,
    [leagueMatches, selectedDate]
  );

  const handleTogglePlayerRequest = async (matchId: string) => {
    if (!team || !session) return;
    const existingReq = requestMap.get(matchId);
    if (session.user.id !== team.ownerId) {
      if (existingReq) {
        Alert.alert(t('team.cancelPlayerRequestCaptainOnlyTitle'), t('team.cancelPlayerRequestCaptainOnlyMessage'));
      } else {
        Alert.alert(t('team.needPlayerCaptainOnlyTitle'), t('team.needPlayerCaptainOnlyMessage'));
      }
      return;
    }
    if (existingReq) {
      const pending = await hasPendingApplicants(existingReq.id);
      if (pending) {
        Alert.alert(t('team.cancelRequestHasPendingTitle'), t('team.cancelRequestHasPendingMessage'));
        return;
      }
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
                await cancelPlayerRequest(existingReq.id);
                setRequestMap((prev) => {
                  const next = new Map(prev);
                  next.delete(matchId);
                  return next;
                });
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
                const id = await createPlayerRequest(team.id, matchId);
                const newReq: PlayerRequest = { id, teamId: team.id, matchId, createdAt: new Date().toISOString(), status: 'open' };
                setRequestMap((prev) => new Map(prev).set(matchId, newReq));
              } catch (e: any) {
                Alert.alert(t('common.error'), e?.message ?? t('common.error'));
              }
            },
          },
        ],
      );
    }
  };

  const isCaptain = !!team && !!session && session.user.id === team.ownerId;

  const renderSoloMatch = (item: Tournament) => (
    <TouchableOpacity
      key={item.id}
      style={styles.soloCard}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('DailyMatchPlayers', {
        tournamentId: item.id,
        tournamentName: item.name,
      })}
    >
      <View style={styles.soloCardTop}>
        <Text style={styles.soloCardName} numberOfLines={2}>{item.name}</Text>
        <Chip label={item.format === 5 ? t('team.format5') : t('team.format11')} />
      </View>
      <View style={styles.soloCardMeta}>
        <View style={styles.metaRow}>
          <Calendar size={11} color={colors.gray500} strokeWidth={2} />
          <Text style={styles.metaText}>{formatDate(item.startDate, i18n.language)}</Text>
        </View>
        {item.startTime ? (
          <View style={styles.metaRow}>
            <Clock size={11} color={colors.gray500} strokeWidth={2} />
            <Text style={styles.metaText}>{formatTime(item.startTime)}</Text>
          </View>
        ) : null}
        {item.location ? (
          <View style={styles.metaRow}>
            <MapPin size={11} color={colors.gray500} strokeWidth={2} />
            <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.soloCardFooter}>
        <View style={styles.registeredBadge}>
          <Check size={12} color={colors.green} strokeWidth={2.5} />
          <Text style={styles.registeredText}>{t('onegame.registered')}</Text>
        </View>
        <View style={styles.viewPlayersRow}>
          <Users size={12} color={colors.cream45} strokeWidth={2} />
          <Text style={styles.viewPlayersText}>{t('dailyplayers.viewPlayers')}</Text>
          <ChevronRight size={13} color={colors.cream45} strokeWidth={2} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderLeagueMatch = (m: LeagueMatchView) => {
    const isUpcoming = !m.played;
    const hasRequest = m.matchId ? requestMap.has(m.matchId) : false;
    const userConfirmed = session ? m.confirmedPlayerIds.includes(session.user.id) : undefined;
    return (
      <MatchRow
        key={m.id}
        label={leagueMatchLabel(m, t)}
        homeTeam={{ name: m.homeTeam.name, badgeUrl: m.homeTeam.badgeUrl, score: m.played ? (m.homeGoals ?? 0) : undefined }}
        awayTeam={{ name: m.awayTeam.name, badgeUrl: m.awayTeam.badgeUrl, score: m.played ? (m.awayGoals ?? 0) : undefined }}
        date={formatDate(m.date, i18n.language)}
        time={m.time ? formatTime(m.time) : ''}
        location={m.location ?? undefined}
        status={m.played ? 'final' : 'upcoming'}
        attendanceConfirmed={isUpcoming ? userConfirmed : undefined}
        captainAction={isUpcoming && isCaptain && m.matchId ? {
          label: hasRequest ? t('team.cancelPlayerRequest') : t('team.needPlayer'),
          active: hasRequest,
          onPress: () => handleTogglePlayerRequest(m.matchId!),
        } : undefined}
      />
    );
  };

  const renderMatch = ({ item }: { item: MatchWithTeams }) => {
    const hasRequest = requestMap.has(item.id);
    const isUpcoming = !item.result;
    const userConfirmed = session
      ? (item.confirmedPlayerIds ?? []).includes(session.user.id)
      : undefined;
    return (
      <MatchRow
        homeTeam={{ name: item.homeTeam.name, badgeUrl: item.homeTeam.badgeUrl }}
        awayTeam={{ name: item.awayTeam.name, badgeUrl: item.awayTeam.badgeUrl }}
        date={formatDate(item.date, i18n.language)}
        time={formatTime(item.time)}
        location={item.location}
        status={item.result ? 'final' : 'upcoming'}
        attendanceConfirmed={isUpcoming ? userConfirmed : undefined}
        captainAction={isUpcoming && !!team && !guestMatchIds.has(item.id) ? {
          label: hasRequest ? t('team.cancelPlayerRequest') : t('team.needPlayer'),
          active: hasRequest,
          onPress: () => handleTogglePlayerRequest(item.id),
        } : undefined}
        onViewPlayers={guestMatchIds.has(item.id) ? () => navigation.navigate('DailyMatchPlayers', {
          matchId: item.id,
          tournamentName: `${item.homeTeam.name} vs ${item.awayTeam.name}`,
        }) : undefined}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <Text style={styles.pageTitle}>{t('match.myMatches')}</Text>
      </View>

      {/* Calendar — always visible */}
      <View style={styles.calendarWrap}>
        <MonthCalendar
          markedDates={matchDateSet}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      </View>

      {/* Content below calendar */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.cream45} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : !team && matches.length === 0 && soloMatches.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>{t('match.noTeamForSchedule')}</Text>
          <View style={{ marginTop: space.lg }}>
            <CreamButton
              label={t('team.myTeam')}
              onPress={() => navigation.navigate('MyTeam')}
            />
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredMatches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            filteredMatches.length === 0 && filteredSoloMatches.length === 0 && filteredLeagueMatches.length === 0
              ? styles.emptyContainer
              : styles.listContent
          }
          ListHeaderComponent={
            <>
              {filteredLeagueMatches.length > 0 ? (
                <View style={styles.soloSection}>
                  <SectionHeader label={t('match.leagueMatches')} />
                  <View style={styles.soloList}>
                    {filteredLeagueMatches.map(renderLeagueMatch)}
                  </View>
                </View>
              ) : null}
              {filteredSoloMatches.length > 0 ? (
                <View style={styles.soloSection}>
                  <SectionHeader label={t('match.soloMatches')} />
                  <View style={styles.soloList}>
                    {filteredSoloMatches.map(renderSoloMatch)}
                  </View>
                </View>
              ) : null}
              {filteredMatches.length > 0 ? (
                <SectionHeader label={t('match.teamMatches')} />
              ) : null}
            </>
          }
          ListEmptyComponent={
            filteredSoloMatches.length === 0 && filteredLeagueMatches.length === 0 ? (
              <View style={styles.centered}>
                <Text style={styles.emptyTitle}>{t('match.noMatches')}</Text>
              </View>
            ) : null
          }
          renderItem={renderMatch}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  navBar: { paddingHorizontal: 18, paddingVertical: space.md, gap: 4 },
  pageTitle: { fontFamily: font.sansXBold, fontSize: 27, letterSpacing: -0.5, color: colors.cream },

  errorText: { fontFamily: font.sans, fontSize: 13, color: '#EF4444', textAlign: 'center', marginBottom: space.md },
  retryText: { fontFamily: font.sansBold, fontSize: 13, color: colors.cream70 },
  emptyTitle: { fontFamily: font.sans, fontSize: 15, color: colors.cream70, textAlign: 'center' },

  listContent: { padding: 18, gap: space.md, paddingBottom: 120 },

  calendarWrap: {
    marginHorizontal: 18,
    marginBottom: space.md,
  },

  soloSection: { marginBottom: space.xl },
  soloList: { gap: space.md },
  soloCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.md,
  },
  soloCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.sm },
  soloCardName: { fontFamily: font.sansBold, fontSize: 16, color: colors.cream, flex: 1, lineHeight: 22 },
  soloCardMeta: { gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: font.sans, fontSize: 12, color: colors.gray500 },
  registeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: space.md,
  },
  registeredText: { fontFamily: font.sansBold, fontSize: 12, color: colors.green },
  soloCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewPlayersRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewPlayersText: { fontFamily: font.sansBold, fontSize: 12, color: colors.cream45 },
});
