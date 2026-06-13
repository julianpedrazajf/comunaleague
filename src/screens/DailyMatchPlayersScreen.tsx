import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { X, ChevronRight } from 'lucide-react-native';
import { getDailyMatchPlayers, DailyMatchPlayer } from '../services/tournaments';
import { getRequestMatchPlayers, getGuestMatchPlayers, RequestMatchPlayer } from '../services/playerRequests';
import { RootStackParamList } from '../navigation/types';
import { DAILY_MATCH_CAPACITY } from '../utils/prices';
import Monogram from '../components/ui/Monogram';
import Chip from '../components/ui/Chip';
import { colors, font, space, radius } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyMatchPlayers'>;

type Player = DailyMatchPlayer & Partial<Pick<RequestMatchPlayer, 'isGuest'>>;

export default function DailyMatchPlayersScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { tournamentId, requestId, matchId, tournamentName } = route.params;

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = requestId
        ? await getRequestMatchPlayers(requestId)
        : matchId
        ? await getGuestMatchPlayers(matchId)
        : tournamentId
        ? await getDailyMatchPlayers(tournamentId)
        : [];
      setPlayers(data);
    } catch (e: any) {
      setError(e?.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [tournamentId, requestId, matchId, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('dailyplayers.title')}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{tournamentName}</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <X size={20} color={colors.cream45} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.cream45} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={{ marginTop: space.md }}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={players}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <Text style={styles.countText}>
              {tournamentId
                ? t('dailyplayers.count', { count: players.length, max: DAILY_MATCH_CAPACITY })
                : t('dailyplayers.countSimple', { count: players.length })}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>{t('dailyplayers.empty')}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.playerCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
            >
              <Monogram
                name={`${item.name} ${item.lastName}`}
                size={42}
                imageUri={item.avatarUrl}
              />
              <View style={styles.playerInfo}>
                <Text style={styles.playerName} numberOfLines={1}>
                  {item.name} {item.lastName}
                </Text>
                <View style={styles.chipRow}>
                  {item.position ? (
                    <Chip label={t(`positions.${item.position}`)} />
                  ) : null}
                  {item.isGuest ? (
                    <Text style={styles.guestBadge}>{t('team.guestBadge')}</Text>
                  ) : null}
                </View>
              </View>
              <ChevronRight size={16} color={colors.cream25} strokeWidth={2} />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: space.md,
    paddingBottom: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  headerText: { gap: 4, flex: 1, paddingRight: space.md },
  title: { fontFamily: font.sansXBold, fontSize: 27, letterSpacing: -0.5, color: colors.cream },
  subtitle: { fontFamily: font.sans, fontSize: 13, color: colors.cream70 },
  closeBtn: { padding: 4, marginTop: 4 },

  errorText: { fontFamily: font.sans, fontSize: 13, color: '#EF4444', textAlign: 'center' },
  retryText: { fontFamily: font.sansBold, fontSize: 13, color: colors.cream70 },
  emptyText: { fontFamily: font.sans, fontSize: 15, color: colors.cream70, textAlign: 'center' },

  listContent: { padding: 18, gap: space.sm, paddingBottom: 40 },
  countText: {
    fontFamily: font.sansBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.cream45,
    marginBottom: space.sm,
  },

  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface1,
    borderRadius: radius.cardSm,
    padding: space.md,
    gap: space.md,
  },
  playerInfo: { flex: 1, gap: 6 },
  playerName: { fontFamily: font.sansBold, fontSize: 15, color: colors.cream },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  guestBadge: {
    fontFamily: font.sansBold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: '#497373',
  },
});
