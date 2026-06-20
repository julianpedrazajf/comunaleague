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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { X, Trophy, MapPin, ChevronRight } from 'lucide-react-native';
import { joinTournament } from '../services/teams';
import { listOpenTournaments, OpenTournament } from '../services/league';
import { RootStackParamList } from '../navigation/types';
import { COIN_COSTS } from '../utils/prices';
import { showInsufficientCoins, isInsufficientCoinsError } from '../utils/coins';
import CoinIcon from '../components/ui/CoinIcon';
import { colors, font, space, radius } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'ChooseTournament'>;

export default function ChooseTournamentScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const [tournaments, setTournaments] = useState<OpenTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTournaments(await listOpenTournaments());
    } catch (e: any) {
      setError(e?.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const doJoin = async (leagueId: string) => {
    if (joining) return;
    setJoining(true);
    try {
      await joinTournament(leagueId);
      Alert.alert(t('team.joinTournamentDoneTitle'), t('team.joinTournamentDoneMessage'), [
        { text: t('common.done'), onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      const msg: string = e?.message ?? '';
      if (isInsufficientCoinsError(e)) {
        showInsufficientCoins(t, () => navigation.navigate('BuyCoins'));
      } else if (msg.includes('full') || msg.includes('not open') || msg.includes('not found')) {
        // The chosen tournament filled up (or closed) between listing and joining.
        Alert.alert(t('team.tournamentUnavailableTitle'), t('team.tournamentUnavailableMessage'));
        load();
      } else {
        Alert.alert(t('common.error'), msg || t('common.error'));
      }
    } finally {
      setJoining(false);
    }
  };

  const confirmJoin = (tournamentName: string, leagueId: string) => {
    Alert.alert(
      t('team.joinTournamentTitle'),
      t('team.joinTournamentMessageNamed', { name: tournamentName, coins: COIN_COSTS.joinTournament }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('team.joinTournamentConfirm'), onPress: () => doJoin(leagueId) },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('team.chooseTournamentTitle')}</Text>
          <Text style={styles.subtitle}>{t('team.chooseTournamentSubtitle')}</Text>
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
          <TouchableOpacity onPress={load}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {tournaments.length === 0 ? (
            <Text style={styles.emptyText}>{t('team.noOpenTournaments')}</Text>
          ) : (
            tournaments.map((tour) => {
              const spotsLeft = tour.maxClubs - tour.teamCount;
              return (
                <TouchableOpacity
                  key={tour.id}
                  style={styles.row}
                  activeOpacity={0.8}
                  disabled={joining}
                  onPress={() => confirmJoin(tour.barrio || tour.name, tour.id)}
                >
                  <View style={styles.iconBadge}>
                    <Trophy size={18} color={colors.cream} strokeWidth={2} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>{tour.name}</Text>
                    {tour.barrio ? (
                      <View style={styles.barrioRow}>
                        <MapPin size={12} color={colors.cream70} strokeWidth={2} />
                        <Text style={styles.barrioText} numberOfLines={1}>{tour.barrio}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.rowMeta}>
                      {t('team.tournamentClubs', { count: tour.teamCount, max: tour.maxClubs })}
                      {'  ·  '}
                      {t('team.tournamentSpotsLeft', { count: spotsLeft })}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.cream45} strokeWidth={2} />
                </TouchableOpacity>
              );
            })
          )}

          <View style={styles.priceNote}>
            <CoinIcon size={15} />
            <Text style={styles.priceText}>{t('team.joinTournamentPrice', { coins: COIN_COSTS.joinTournament })}</Text>
          </View>
        </ScrollView>
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
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: space.lg,
  },
  headerText: { gap: 4, flex: 1, paddingRight: space.md },
  title: { fontFamily: font.sansXBold, fontSize: 27, letterSpacing: -0.5, color: colors.cream },
  subtitle: { fontFamily: font.sans, fontSize: 13, color: colors.cream70 },
  closeBtn: { padding: 4, marginTop: 4 },

  content: { paddingHorizontal: 24, paddingBottom: 40, gap: space.md },

  errorText: { fontFamily: font.sans, fontSize: 14, color: '#EF4444', textAlign: 'center', marginBottom: space.md },
  retryText: { fontFamily: font.sansBold, fontSize: 13, color: colors.cream70 },
  emptyText: { fontFamily: font.sans, fontSize: 14, color: colors.cream45, textAlign: 'center', paddingVertical: space.lg },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    padding: space.lg,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 3 },
  rowName: { fontFamily: font.sansBold, fontSize: 15.5, color: colors.cream },
  barrioRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  barrioText: { fontFamily: font.sans, fontSize: 12.5, color: colors.cream70 },
  rowMeta: { fontFamily: font.sans, fontSize: 12.5, color: colors.cream45 },

  priceNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: space.sm },
  priceText: { fontFamily: font.sans, fontSize: 12.5, color: colors.cream45 },
});
