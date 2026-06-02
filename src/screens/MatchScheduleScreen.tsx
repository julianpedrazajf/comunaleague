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
import { AppTabParamList, RootStackParamList } from '../navigation/types';
import MatchRow from '../components/ui/MatchRow';
import CreamButton from '../components/ui/CreamButton';
import { colors, font, space } from '../theme/tokens';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'MatchSchedule'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${minutes} ${ampm}`;
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
    const hasResult = Boolean(item.result);

    return (
      <MatchRow
        homeTeam={{ name: item.homeTeam.name }}
        awayTeam={{ name: item.awayTeam.name }}
        date={formatDate(item.date)}
        time={formatTime(item.time)}
        location={item.location}
        status={hasResult ? 'final' : 'upcoming'}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.navBar}>
        <Text style={styles.pageTitle}>{t('match.title')}</Text>
        {team && <Text style={styles.teamName}>{team.name}</Text>}
      </View>

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
      ) : !team ? (
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
          data={matches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            matches.length === 0 ? styles.emptyContainer : styles.listContent
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
});
