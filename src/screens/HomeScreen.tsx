import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell, Zap, Users, Plus, Check, Trophy, ChevronRight } from 'lucide-react-native';
import SoccerBallIcon from '../components/ui/SoccerBallIcon';
import { AppTabParamList, RootStackParamList } from '../navigation/types';
import { getMyTeam } from '../services/teams';
import { getTeamMatches, confirmAttendance, MatchWithTeams } from '../services/matches';
import { getUnreadCount, getUpcomingAcceptedMatches } from '../services/notifications';
import { getUserTournamentRegistrations } from '../services/tournaments';
import { getMyLeagueMatches, leagueMatchLabel, LeagueMatchView } from '../services/league';
import { Team, Tournament } from '../types';
import { useAuth } from '../context/AuthContext';
import Monogram from '../components/ui/Monogram';
import CreamButton from '../components/ui/CreamButton';
import ScreenIntro from '../components/ui/ScreenIntro';
import { colors, font, space, radius } from '../theme/tokens';

// The next upcoming event can be a team/guest match, a registered daily match,
// or a scheduled league match.
type NextEvent =
  | { kind: 'match'; match: MatchWithTeams; isGuest: boolean }
  | { kind: 'daily'; tournament: Tournament }
  | { kind: 'league'; match: LeagueMatchView };

const homeBg = require('../../assets/textures/Night_Pitch_Dew_Bokeh.png');
const grain   = require('../../assets/textures/grain.png');

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function formatMatchDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatMatchTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${minutes} ${ampm}`;
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const { session, isGuest } = useAuth();
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [nextEvent, setNextEvent] = useState<NextEvent | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    getUnreadCount().then(setUnreadCount).catch(() => {});
    if (!session) return;
    try {
      const team = await getMyTeam(session.user.id);
      setMyTeam(team);

      // Gather every upcoming event the user has — team matches, accepted
      // one-match guest spots, and registered daily matches — then pick the
      // soonest one by date and time.
      const now = new Date();
      const [teamMatches, guestMatches, dailyTournaments, leagueMatches] = await Promise.all([
        team ? getTeamMatches(team.id) : Promise.resolve([]),
        getUpcomingAcceptedMatches().catch(() => []),
        getUserTournamentRegistrations(session.user.id).catch(() => []),
        getMyLeagueMatches(session.user.id).catch(() => []),
      ]);

      const guestIds = new Set(guestMatches.map((m) => m.id));
      const seen = new Set<string>();
      const entries: { time: number; event: NextEvent }[] = [];

      // The user's own league fixtures arrive via getMyLeagueMatches below, so
      // drop their mirror rows here to avoid showing the same match twice.
      for (const m of [...teamMatches.filter((tm) => !tm.leagueMatchId), ...guestMatches]) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        const dt = new Date(`${m.date}T${m.time}`);
        if (dt <= now) continue;
        entries.push({ time: dt.getTime(), event: { kind: 'match', match: m, isGuest: guestIds.has(m.id) } });
      }
      for (const tour of dailyTournaments) {
        const dt = new Date(`${tour.startDate}T${tour.startTime ?? '00:00'}`);
        if (dt <= now) continue;
        entries.push({ time: dt.getTime(), event: { kind: 'daily', tournament: tour } });
      }
      for (const lm of leagueMatches) {
        const dt = new Date(`${lm.date}T${lm.time ?? '00:00'}`);
        if (dt <= now) continue;
        entries.push({ time: dt.getTime(), event: { kind: 'league', match: lm } });
      }

      entries.sort((a, b) => a.time - b.time);
      const next = entries[0]?.event ?? null;
      setNextEvent(next);

      if (next?.kind === 'match') {
        if (next.isGuest) {
          setConfirmed(true);
        } else {
          const saved = await AsyncStorage.getItem(`@confirmed_${session.user.id}_${next.match.id}`);
          const isAlreadyConfirmed = (next.match.confirmedPlayerIds ?? []).includes(session.user.id);
          setConfirmed(saved !== null ? saved === 'true' : isAlreadyConfirmed);
        }
      } else if (next?.kind === 'league' && next.match.matchId) {
        const saved = await AsyncStorage.getItem(`@confirmed_${session.user.id}_${next.match.matchId}`);
        const isAlreadyConfirmed = next.match.confirmedPlayerIds.includes(session.user.id);
        setConfirmed(saved !== null ? saved === 'true' : isAlreadyConfirmed);
      }
    } catch { /* silently fail */ }
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleCreateTeam = () => {
    if (myTeam) {
      Alert.alert(t('team.alreadyMemberTitle'), t('team.cantCreateAlreadyMember'));
      return;
    }
    navigation.navigate('CreateTeam');
  };

  const handleConfirm = async () => {
    // Works for regular team matches and for league matches (via their mirror).
    let matchId: string;
    let dateStr: string;
    let timeStr: string;
    if (nextEvent?.kind === 'match') {
      matchId = nextEvent.match.id;
      dateStr = nextEvent.match.date;
      timeStr = nextEvent.match.time;
    } else if (nextEvent?.kind === 'league' && nextEvent.match.matchId) {
      matchId = nextEvent.match.matchId;
      dateStr = nextEvent.match.date;
      timeStr = nextEvent.match.time ?? '00:00';
    } else {
      return;
    }

    if (confirmed) {
      const matchDateTime = new Date(`${dateStr}T${timeStr}`);
      const hoursUntilMatch = (matchDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilMatch <= 24) {
        Alert.alert(t('home.cancelLockTitle'), t('home.cancelLockMessage'));
        return;
      }
    }
    const next = !confirmed;
    setConfirmed(next);
    const storageKey = `@confirmed_${session!.user.id}_${matchId}`;
    await AsyncStorage.setItem(storageKey, next.toString());
    try {
      await confirmAttendance(matchId, next);
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
      // Revert local state if DB sync failed
      setConfirmed(!next);
      await AsyncStorage.setItem(storageKey, (!next).toString());
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Background */}
      <ImageBackground source={homeBg} style={styles.bg} resizeMode="cover">
        <View style={styles.scrim} pointerEvents="none" />
        <View style={styles.grainWrap} pointerEvents="none">
          <Image source={grain} style={styles.grain} resizeMode="repeat" />
        </View>
      </ImageBackground>

      {/* Nav bar */}
      <View style={styles.navBar}>
        <View style={styles.wordmarkWrap}>
          <View style={styles.leagueRow}>
            <Text style={styles.wordmarkTitle}>{'Comuna'}</Text>
          </View>
          <View style={styles.leagueRow}>
            <Text style={styles.wordmarkTitle}>{'League'}</Text>
            <SoccerBallIcon size={16} color={colors.cream2} />
          </View>
          <Text style={styles.wordmarkTagline}>pibes de barrio.</Text>
        </View>
        <TouchableOpacity
          hitSlop={12}
          style={styles.bellWrap}
          onPress={() => navigation.navigate('Notifications')}
          disabled={isGuest}
        >
          <Bell size={20} color={isGuest ? colors.cream25 : colors.cream45} strokeWidth={2} />
          {!isGuest && unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickBtn, styles.ctaBtn]}
          onPress={() => navigation.navigate('JoinTeam')}
          activeOpacity={0.75}
        >
          <Users size={17} color={colors.cream} strokeWidth={2} />
          <Text style={styles.ctaLabel}>{t('home.joinTeamCta')}</Text>
        </TouchableOpacity>

        <View style={styles.quickActionsRow}>
          {([
            { Icon: Zap,  labelKey: 'home.playSolo',   route: 'OneGame'    },
            { Icon: Plus, labelKey: 'home.createTeam', route: 'CreateTeam' },
          ] as const).map(({ Icon, labelKey, route }) => (
            <TouchableOpacity
              key={route}
              style={styles.quickBtn}
              onPress={() => route === 'CreateTeam' ? handleCreateTeam() : navigation.navigate(route as never)}
              activeOpacity={0.75}
            >
              <Icon size={18} color={colors.cream} strokeWidth={2} />
              <Text style={styles.quickBtnLabel}>{t(labelKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Next match card */}
        <View style={styles.nextMatchCard}>
          <Text style={styles.nextMatchEyebrow}>{t('home.nextMatch').toUpperCase()}</Text>

          {nextEvent?.kind === 'match' ? (
            <>
              <View style={styles.teamsRow}>
                <View style={styles.teamCol}>
                  <Monogram
                    name={nextEvent.match.homeTeam.name}
                    size={52}
                    shape="square"
                    imageUri={nextEvent.match.homeTeam.badgeUrl}
                  />
                  <Text style={styles.teamName} numberOfLines={2}>
                    {nextEvent.match.homeTeam.name}
                  </Text>
                </View>
                <Text style={styles.vsText}>vs</Text>
                <View style={styles.teamCol}>
                  <Monogram
                    name={nextEvent.match.awayTeam.name}
                    size={52}
                    shape="square"
                    imageUri={nextEvent.match.awayTeam.badgeUrl}
                  />
                  <Text style={styles.teamName} numberOfLines={2}>
                    {nextEvent.match.awayTeam.name}
                  </Text>
                </View>
              </View>

              <View style={styles.matchMeta}>
                <Text style={styles.matchMetaText}>
                  {formatMatchDate(nextEvent.match.date, i18n.language)} · {formatMatchTime(nextEvent.match.time)}
                </Text>
                {nextEvent.match.location ? (
                  <Text style={styles.matchMetaLocation}>{nextEvent.match.location}</Text>
                ) : null}
              </View>

              {nextEvent.isGuest ? (
                <View style={styles.confirmedPill}>
                  <Check size={15} color={colors.black} strokeWidth={2.5} />
                  <Text style={styles.confirmedText}>{t('home.attendanceConfirmed')}</Text>
                </View>
              ) : confirmed ? (
                <TouchableOpacity style={styles.confirmedPill} onPress={handleConfirm} activeOpacity={0.8}>
                  <Check size={15} color={colors.black} strokeWidth={2.5} />
                  <Text style={styles.confirmedText}>{t('home.attendanceConfirmed')}</Text>
                </TouchableOpacity>
              ) : (
                <CreamButton label={t('home.confirmAttendance')} full onPress={handleConfirm} />
              )}
            </>
          ) : nextEvent?.kind === 'daily' ? (
            <>
              <Text style={styles.dailyName} numberOfLines={2}>{nextEvent.tournament.name}</Text>

              <View style={styles.matchMeta}>
                <Text style={styles.matchMetaText}>
                  {formatMatchDate(nextEvent.tournament.startDate, i18n.language)}
                  {nextEvent.tournament.startTime ? ` · ${formatMatchTime(nextEvent.tournament.startTime)}` : ''}
                </Text>
                {nextEvent.tournament.location ? (
                  <Text style={styles.matchMetaLocation}>{nextEvent.tournament.location}</Text>
                ) : null}
              </View>

              <View style={styles.confirmedPill}>
                <Check size={15} color={colors.black} strokeWidth={2.5} />
                <Text style={styles.confirmedText}>{t('onegame.registered')}</Text>
              </View>
            </>
          ) : nextEvent?.kind === 'league' ? (
            <>
              <Text style={styles.leagueTag}>{leagueMatchLabel(nextEvent.match, t)}</Text>
              <View style={styles.teamsRow}>
                <View style={styles.teamCol}>
                  <Monogram
                    name={nextEvent.match.homeTeam.name}
                    size={52}
                    shape="square"
                    imageUri={nextEvent.match.homeTeam.badgeUrl}
                  />
                  <Text style={styles.teamName} numberOfLines={2}>
                    {nextEvent.match.homeTeam.name}
                  </Text>
                </View>
                <Text style={styles.vsText}>vs</Text>
                <View style={styles.teamCol}>
                  <Monogram
                    name={nextEvent.match.awayTeam.name}
                    size={52}
                    shape="square"
                    imageUri={nextEvent.match.awayTeam.badgeUrl}
                  />
                  <Text style={styles.teamName} numberOfLines={2}>
                    {nextEvent.match.awayTeam.name}
                  </Text>
                </View>
              </View>

              <View style={styles.matchMeta}>
                <Text style={styles.matchMetaText}>
                  {formatMatchDate(nextEvent.match.date, i18n.language)}
                  {nextEvent.match.time ? ` · ${formatMatchTime(nextEvent.match.time)}` : ''}
                </Text>
                {nextEvent.match.location ? (
                  <Text style={styles.matchMetaLocation}>{nextEvent.match.location}</Text>
                ) : null}
              </View>

              {nextEvent.match.matchId ? (
                confirmed ? (
                  <TouchableOpacity style={styles.confirmedPill} onPress={handleConfirm} activeOpacity={0.8}>
                    <Check size={15} color={colors.black} strokeWidth={2.5} />
                    <Text style={styles.confirmedText}>{t('home.attendanceConfirmed')}</Text>
                  </TouchableOpacity>
                ) : (
                  <CreamButton label={t('home.confirmAttendance')} full onPress={handleConfirm} />
                )
              ) : null}
            </>
          ) : (
            <Text style={styles.noMatchText}>{t('match.noMatches')}</Text>
          )}
        </View>

        {/* League window entry point */}
        <TouchableOpacity
          style={styles.leagueBtn}
          onPress={() => navigation.navigate('Tournaments')}
          activeOpacity={0.8}
        >
          <View style={styles.leagueBtnIcon}>
            <Trophy size={20} color={colors.cream} strokeWidth={2} />
          </View>
          <View style={styles.leagueBtnText}>
            <Text style={styles.leagueBtnTitle}>{t('home.leagueTitle')}</Text>
            <Text style={styles.leagueBtnSub}>{t('home.leagueSub')}</Text>
          </View>
          <ChevronRight size={18} color={colors.cream45} strokeWidth={2} />
        </TouchableOpacity>

        {/* Spacer for floating tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      <ScreenIntro id="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },

  bg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.68)' },
  grainWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  grain: { width: '100%', height: '100%', opacity: 0.07 },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: space.md,
  },
  wordmarkWrap: { gap: -2 },
  leagueRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  wordmarkTitle: {
    fontFamily: font.sansXBold,
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: -1.2,
    color: colors.cream,
  },
  wordmarkTagline: {
    fontFamily: font.serifItalic,
    fontSize: 12,
    color: colors.cream45,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  bellWrap: { position: 'relative' },
  bellBadge: {
    position: 'absolute',
    top: -5, right: -7,
    minWidth: 16, height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    fontFamily: font.sansBold,
    fontSize: 9,
    color: colors.cream,
    lineHeight: 11,
  },

  content: { paddingHorizontal: 18, paddingTop: space.sm, flexGrow: 1, justifyContent: 'center' },

  nextMatchCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.md,
    marginBottom: space.xl,
    alignItems: 'center',
  },
  nextMatchEyebrow: {
    fontFamily: font.sansBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.cream45,
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.sm,
    alignSelf: 'stretch',
  },
  teamCol: { alignItems: 'center', gap: space.xs, flex: 1 },
  teamName: { fontFamily: font.sansBold, fontSize: 12, color: colors.cream70, textAlign: 'center' },
  dailyName: { fontFamily: font.sansXBold, fontSize: 18, color: colors.cream, textAlign: 'center', alignSelf: 'stretch', lineHeight: 24 },
  leagueTag: {
    fontFamily: font.sansBold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#F2B366',
    textTransform: 'uppercase',
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  vsText: { fontFamily: font.serifItalic, fontSize: 22, color: colors.cream45, textAlign: 'center' },
  matchMeta: { alignItems: 'center', alignSelf: 'stretch', gap: 4 },
  matchMetaText: { fontFamily: font.sans, fontSize: 12.5, color: colors.cream45 },
  matchMetaLocation: { fontFamily: font.sans, fontSize: 11.5, color: colors.cream25 },
  noMatchText: { fontFamily: font.sans, fontSize: 14, color: colors.cream45, textAlign: 'center', paddingVertical: space.md },
  confirmedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignSelf: 'stretch',
    gap: space.sm,
  },
  confirmedText: { fontFamily: font.sansBold, fontSize: 15, color: colors.black },

  leagueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: 'rgba(242,179,102,0.30)',
  },
  leagueBtnIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.cardSm,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leagueBtnText: { flex: 1, gap: 2 },
  leagueBtnTitle: { fontFamily: font.sansXBold, fontSize: 15, color: colors.cream },
  leagueBtnSub: { fontFamily: font.sans, fontSize: 12, color: colors.cream45 },

  quickActions: {
    paddingHorizontal: 18,
    paddingTop: space.md,
    paddingBottom: space.sm,
    gap: space.sm,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    paddingVertical: space.md,
    alignItems: 'center',
    gap: space.xs,
    borderWidth: 1,
    borderColor: 'rgba(222,219,200,0.08)',
  },
  ctaBtn: {
    flex: 0,
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.sm,
    // Match the two quick cards' height (~60px). minHeight beats flex-shrink,
    // which was collapsing this row button to ~31px.
    minHeight: 60,
    borderWidth: 1.5,
    borderColor: colors.green,
  },
  ctaLabel: {
    fontFamily: font.sansBold,
    fontSize: 12.5,
    letterSpacing: 0.2,
    color: colors.cream,
  },
  quickBtnLabel: {
    fontFamily: font.sansBold,
    fontSize: 10.5,
    color: colors.cream70,
    textAlign: 'center',
  },
});
