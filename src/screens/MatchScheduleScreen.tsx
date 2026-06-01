import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { getMyTeam } from '../services/teams';
import { getTeamMatches, MatchWithTeams } from '../services/matches';
import { Team } from '../types';
import { colors, spacing, fontSizes } from '../utils/theme';
import { AppTabParamList, RootStackParamList } from '../navigation/types';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'MatchSchedule'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export default function MatchScheduleScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigation = useNavigation<NavProp>();

  const [team, setTeam] = useState<Team | null>(null);
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const found = await getMyTeam(session.user.id);
      setTeam(found);
      if (found) {
        const m = await getTeamMatches(found.id);
        setMatches(m);
      }
    } catch (e: any) {
      setError(e?.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [session, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderMatch = ({ item }: { item: MatchWithTeams }) => {
    const isHome = item.homeTeamId === team?.id;
    const myTeamName = isHome ? item.homeTeam.name : item.awayTeam.name;
    const opponentName = isHome ? item.awayTeam.name : item.homeTeam.name;

    return (
      <View style={styles.matchCard}>
        <Text style={styles.matchDate}>
          {formatDate(item.date)} · {formatTime(item.time)}
        </Text>

        <View style={styles.teamsRow}>
          <View style={styles.teamCol}>
            <Text style={styles.myTeamName} numberOfLines={1}>{myTeamName}</Text>
            <Text style={styles.teamRole}>{isHome ? t('match.home') : t('match.away')}</Text>
          </View>

          <Text style={styles.vs}>vs</Text>

          <View style={[styles.teamCol, styles.teamColRight]}>
            <Text style={styles.opponentName} numberOfLines={1}>{opponentName}</Text>
            <Text style={styles.teamRole}>{isHome ? t('match.away') : t('match.home')}</Text>
          </View>
        </View>

        {item.result ? (
          <View style={styles.resultBadge}>
            <Text style={styles.resultText}>{item.result}</Text>
          </View>
        ) : null}

        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationText}>{item.location}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>{t('match.schedule')}</Text>
        {team && <Text style={styles.subtitle}>{team.name}</Text>}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : !team ? (
        <View style={styles.centered}>
          <Text style={styles.noTeamTitle}>{t('match.noTeamForSchedule')}</Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => navigation.navigate('MyTeam')}
          >
            <Text style={styles.ctaBtnText}>{t('team.myTeam')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            matches.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>{t('match.noMatches')}</Text>
            </View>
          }
          renderItem={renderMatch}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  pageHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pageTitle: { fontSize: fontSizes.xxl, fontWeight: 'bold', color: colors.darkGray },
  subtitle: { fontSize: fontSizes.sm, color: colors.gray, marginTop: spacing.xs },

  // Error
  errorText: { color: colors.primary, fontSize: fontSizes.sm, textAlign: 'center', marginBottom: spacing.md },
  retryBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  retryText: { color: colors.primary, fontWeight: '600' },

  // No team
  noTeamTitle: {
    fontSize: fontSizes.md,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  ctaBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  ctaBtnText: { color: colors.white, fontWeight: 'bold', fontSize: fontSizes.md },

  // Empty
  emptyText: { color: colors.gray, fontSize: fontSizes.md, textAlign: 'center' },

  // List
  listContent: { padding: spacing.lg, gap: spacing.md },

  // Match card
  matchCard: {
    backgroundColor: colors.lightGray,
    borderRadius: 14,
    padding: spacing.md,
  },
  matchDate: {
    fontSize: fontSizes.xs,
    color: colors.gray,
    marginBottom: spacing.md,
    textTransform: 'capitalize',
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  teamCol: { flex: 1 },
  teamColRight: { alignItems: 'flex-end' },
  myTeamName: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.darkGray,
  },
  opponentName: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: colors.darkGray,
    textAlign: 'right',
  },
  teamRole: {
    fontSize: fontSizes.xs,
    color: colors.gray,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  vs: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.primary,
    marginHorizontal: spacing.sm,
  },
  resultBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.teal,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: spacing.sm,
  },
  resultText: { color: colors.white, fontSize: fontSizes.xs, fontWeight: '700' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  locationIcon: { fontSize: fontSizes.xs },
  locationText: { fontSize: fontSizes.xs, color: colors.gray, flex: 1 },
});
