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
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { getMyTeam } from '../services/teams';
import { getTeamMatches, MatchWithTeams } from '../services/matches';
import { createPlayerRequest, cancelPlayerRequest, getTeamOpenRequests } from '../services/playerRequests';
import { hasPendingApplicants, getUpcomingAcceptedMatches } from '../services/notifications';
import { Team, PlayerRequest } from '../types';
import { AppTabParamList, RootStackParamList } from '../navigation/types';
import MatchRow from '../components/ui/MatchRow';
import CreamButton from '../components/ui/CreamButton';
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

function buildCalendarDays(year: number, month: number): (number | null)[] {
  const firstWeekDay = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstWeekDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const _today = new Date();
const todayStr = toDateStr(_today.getFullYear(), _today.getMonth(), _today.getDate());

export default function MatchScheduleScreen() {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const navigation = useNavigation<NavProp>();

  const [team, setTeam] = useState<Team | null>(null);
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [requestMap, setRequestMap] = useState<Map<string, PlayerRequest>>(new Map());
  const [guestMatchIds, setGuestMatchIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState({ year: _today.getFullYear(), month: _today.getMonth() });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (session) {
        const found = await getMyTeam(session.user.id);
        setTeam(found);
        const [teamMatches, guestMatches, openReqs] = await Promise.all([
          found ? getTeamMatches(found.id) : Promise.resolve([]),
          getUpcomingAcceptedMatches().catch(() => []),
          found ? getTeamOpenRequests(found.id) : Promise.resolve([]),
        ]);

        // Combine team + guest matches, deduplicate, sort by date+time
        const seen = new Set<string>();
        const combined = [...teamMatches, ...guestMatches].filter((m) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
        combined.sort((a, b) =>
          new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime(),
        );
        setMatches(combined);
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

  const matchDateSet = useMemo(() => new Set(matches.map(m => m.date)), [matches]);

  const filteredMatches = useMemo(() =>
    selectedDate ? matches.filter(m => m.date === selectedDate) : matches,
    [matches, selectedDate]
  );

  const calDays = useMemo(() => buildCalendarDays(calMonth.year, calMonth.month), [calMonth]);

  const monthLabel = useMemo(() =>
    new Date(calMonth.year, calMonth.month, 1)
      .toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' }),
    [calMonth, i18n.language]
  );

  const weekDayLabels = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2025, 0, 6 + i); // Jan 6 2025 = Monday
      return d.toLocaleDateString(i18n.language, { weekday: 'narrow' });
    }),
    [i18n.language]
  );

  const prevMonth = useCallback(() =>
    setCalMonth(m => {
      const d = new Date(m.year, m.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    }), []);

  const nextMonth = useCallback(() =>
    setCalMonth(m => {
      const d = new Date(m.year, m.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    }), []);

  const handleTogglePlayerRequest = async (match: MatchWithTeams) => {
    if (!team || !session) return;
    if (session.user.id !== team.ownerId) {
      Alert.alert(t('team.needPlayerCaptainOnlyTitle'), t('team.needPlayerCaptainOnlyMessage'));
      return;
    }
    const existingReq = requestMap.get(match.id);
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
                  next.delete(match.id);
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
                const id = await createPlayerRequest(team.id, match.id);
                const newReq: PlayerRequest = { id, teamId: team.id, matchId: match.id, createdAt: new Date().toISOString(), status: 'open' };
                setRequestMap((prev) => new Map(prev).set(match.id, newReq));
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
          onPress: () => handleTogglePlayerRequest(item),
        } : undefined}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <Text style={styles.pageTitle}>{t('match.title')}</Text>
        {team && <Text style={styles.teamName}>{team.name}</Text>}
      </View>

      {/* Calendar — always visible */}
      <View style={styles.calendar}>
        <View style={styles.calHeader}>
          <TouchableOpacity hitSlop={12} onPress={prevMonth}>
            <ChevronLeft size={18} color={colors.cream45} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.calMonthLabel}>{monthLabel}</Text>
          <TouchableOpacity hitSlop={12} onPress={nextMonth}>
            <ChevronRight size={18} color={colors.cream45} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.calWeekRow}>
          {weekDayLabels.map((d, i) => (
            <Text key={i} style={styles.calWeekDay}>{d}</Text>
          ))}
        </View>

        <View style={styles.calGrid}>
          {calDays.map((day, idx) => {
            if (!day) return <View key={`e-${idx}`} style={styles.calCell} />;
            const dateStr = toDateStr(calMonth.year, calMonth.month, day);
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === todayStr;
            const hasMatch = matchDateSet.has(dateStr);
            return (
              <TouchableOpacity
                key={dateStr}
                style={styles.calCell}
                onPress={() => setSelectedDate(isSelected ? null : dateStr)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.calCellCircle,
                  isSelected && styles.calCellCircleActive,
                  isToday && !isSelected && styles.calCellCircleToday,
                ]}>
                  <Text style={[styles.calDayText, isSelected && styles.calDayTextActive]}>
                    {day}
                  </Text>
                </View>
                {hasMatch
                  ? <View style={[styles.calDot, isSelected && styles.calDotActive]} />
                  : <View style={styles.calDotEmpty} />
                }
              </TouchableOpacity>
            );
          })}
        </View>
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
      ) : !team && matches.length === 0 ? (
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
            filteredMatches.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyTitle}>{t('match.noMatches')}</Text>
            </View>
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
  teamName: { fontFamily: font.sans, fontSize: 13, color: colors.cream70 },

  errorText: { fontFamily: font.sans, fontSize: 13, color: '#EF4444', textAlign: 'center', marginBottom: space.md },
  retryText: { fontFamily: font.sansBold, fontSize: 13, color: colors.cream70 },
  emptyTitle: { fontFamily: font.sans, fontSize: 15, color: colors.cream70, textAlign: 'center' },

  listContent: { padding: 18, gap: space.md, paddingBottom: 120 },

  calendar: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    marginHorizontal: 18,
    marginBottom: space.md,
    padding: 16,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  calMonthLabel: {
    fontFamily: font.sansBold,
    fontSize: 14,
    color: colors.cream,
    textTransform: 'capitalize',
  },
  calWeekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontFamily: font.sansBold,
    fontSize: 10,
    color: colors.cream45,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: '14.2857%',
    alignItems: 'center',
    paddingVertical: 3,
    gap: 2,
  },
  calCellCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCellCircleActive: {
    backgroundColor: colors.cream,
  },
  calCellCircleToday: {
    borderWidth: 1,
    borderColor: 'rgba(222,219,200,0.35)',
  },
  calDayText: {
    fontFamily: font.sans,
    fontSize: 13,
    color: colors.cream70,
  },
  calDayTextActive: {
    fontFamily: font.sansBold,
    color: colors.black,
  },
  calDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.green,
  },
  calDotActive: {
    backgroundColor: colors.black,
  },
  calDotEmpty: {
    width: 4,
    height: 4,
  },
});
