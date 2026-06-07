import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { X, MapPin, Calendar, Clock, Check } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { getDailyTournaments, getUserRegistrations, registerForTournament } from '../services/tournaments';
import { getOpenPlayerRequests, expressInterest, getMyInterests } from '../services/playerRequests';
import { getMyTeam } from '../services/teams';
import { getTeamMatches } from '../services/matches';
import { getApplicationStatuses } from '../services/notifications';
import { Tournament, PlayerRequest } from '../types';
import { RootStackParamList } from '../navigation/types';
import Chip from '../components/ui/Chip';
import Monogram from '../components/ui/Monogram';
import SectionHeader from '../components/ui/SectionHeader';
import { colors, font, space, radius } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'OneGame'>;

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

export default function OneGameScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [playerRequests, setPlayerRequests] = useState<PlayerRequest[]>([]);
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());
  const [applicationStatuses, setApplicationStatuses] = useState<Map<string, 'accepted' | 'rejected'>>(new Map());
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [myMatchIds, setMyMatchIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [data, regs, myTeam] = await Promise.all([
        getDailyTournaments(),
        getUserRegistrations(session.user.id),
        getMyTeam(session.user.id),
      ]);
      setTournaments(data);
      setRegisteredIds(new Set(regs.map((r) => r.tournamentId)));
      const teamId = myTeam?.id ?? null;
      setMyTeamId(teamId);
      if (teamId) {
        getTeamMatches(teamId)
          .then((matches) => setMyMatchIds(new Set(matches.map((m) => m.id))))
          .catch(() => {});
      } else {
        setMyMatchIds(new Set());
      }
    } catch {
      // silently fail
    }
    // Load separately so a failure here doesn't break the tournaments section
    try {
      const [requests, myInterests, statuses] = await Promise.all([
        getOpenPlayerRequests(),
        getMyInterests(),
        getApplicationStatuses(),
      ]);
      setPlayerRequests(requests);
      setInterestedIds(new Set(myInterests));
      setApplicationStatuses(statuses);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function handleRegister(tournament: Tournament) {
    Alert.alert(
      t('onegame.confirmTitle'),
      `${tournament.name}\n${t('onegame.confirmMsg')}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('onegame.register'),
          onPress: async () => {
            if (!session) return;
            setRegisteringId(tournament.id);
            try {
              await registerForTournament(tournament.id, session.user.id);
              setRegisteredIds((prev) => new Set([...prev, tournament.id]));
            } catch (e: any) {
              Alert.alert(t('common.error'), e?.message ?? t('common.error'));
            } finally {
              setRegisteringId(null);
            }
          },
        },
      ],
    );
  }

  function handleApply(req: PlayerRequest) {
    Alert.alert(
      t('onegame.applyTitle'),
      t('onegame.applyMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('onegame.apply'),
          onPress: async () => {
            if (!session) return;
            try {
              await expressInterest(req.id);
              setInterestedIds((prev) => new Set([...prev, req.id]));
            } catch (e: any) {
              Alert.alert(t('common.error'), e?.message ?? t('common.error'));
            }
          },
        },
      ],
    );
  }

  function renderRequestCard(req: PlayerRequest) {
    const isInterested = interestedIds.has(req.id);
    const appStatus = req.matchId ? applicationStatuses.get(req.matchId) : undefined;
    const isOwnTeam = myTeamId !== null && req.teamId === myTeamId;
    const isOpposingTeam = !isOwnTeam && myMatchIds.has(req.matchId);
    const isPartOfMatch = isOwnTeam || isOpposingTeam;
    const isAlreadyInMatch = !isPartOfMatch && !isInterested && applicationStatuses.get(req.matchId) === 'accepted';

    return (
      <View key={req.id} style={styles.card}>
        <View style={styles.reqCardTop}>
          <Monogram name={req.team?.name ?? ''} size={44} shape="square" imageUri={req.team?.badgeUrl} />
          <Text style={[styles.cardName, { flex: 1 }]} numberOfLines={1}>{req.team?.name ?? ''}</Text>
          {req.team && (
            <Chip label={req.team.format === 5 ? t('team.format5') : t('team.format11')} />
          )}
        </View>

        {req.match && (
          <View style={styles.cardMeta}>
            <View style={styles.metaRow}>
              <Calendar size={11} color={colors.gray500} strokeWidth={2} />
              <Text style={styles.metaText}>{formatDate(req.match.date, i18n.language)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Clock size={11} color={colors.gray500} strokeWidth={2} />
              <Text style={styles.metaText}>{formatTime(req.match.time)}</Text>
            </View>
            {req.match.location ? (
              <View style={styles.metaRow}>
                <MapPin size={11} color={colors.gray500} strokeWidth={2} />
                <Text style={styles.metaText} numberOfLines={1}>{req.match.location}</Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.hairline} />

        <View style={styles.cardFooter}>
          <Text style={styles.price}>{t('onegame.oneMatch')}</Text>
          {isPartOfMatch ? (
            <View style={styles.ownTeamBadge}>
              <Text style={styles.ownTeamText}>{t('onegame.alreadyMember')}</Text>
            </View>
          ) : isAlreadyInMatch ? (
            <View style={styles.alreadyInMatchBadge}>
              <Text style={styles.alreadyInMatchText}>{t('onegame.alreadyInMatch')}</Text>
            </View>
          ) : isInterested ? (
            appStatus === 'accepted' ? (
              <View style={[styles.registeredBadge, styles.acceptedBadge]}>
                <Check size={12} color={colors.green} strokeWidth={2.5} />
                <Text style={styles.registeredText}>{t('onegame.statusAccepted')}</Text>
              </View>
            ) : appStatus === 'rejected' ? (
              <View style={[styles.registeredBadge, styles.rejectedBadge]}>
                <X size={12} color="#EF4444" strokeWidth={2.5} />
                <Text style={styles.rejectedText}>{t('onegame.statusRejected')}</Text>
              </View>
            ) : (
              <View style={styles.registeredBadge}>
                <Check size={12} color={colors.green} strokeWidth={2.5} />
                <Text style={styles.registeredText}>{t('onegame.applied')}</Text>
              </View>
            )
          ) : (
            <TouchableOpacity style={styles.registerBtn} onPress={() => handleApply(req)}>
              <Text style={styles.registerBtnText}>{t('onegame.apply')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Tournament }) => {
    const isRegistered = registeredIds.has(item.id);
    const isRegistering = registeringId === item.id;
    const priceLabel = item.price === 0 ? t('onegame.free') : `$${item.price.toLocaleString('es-CO')}`;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          <Chip label={item.format === 5 ? t('team.format5') : t('team.format11')} />
        </View>

        <View style={styles.cardMeta}>
          <View style={styles.metaRow}>
            <Calendar size={11} color={colors.gray500} strokeWidth={2} />
            <Text style={styles.metaText}>{t('onegame.starts')}: {formatDate(item.startDate, i18n.language)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Clock size={11} color={colors.gray500} strokeWidth={2} />
            <Text style={styles.metaText}>{t('onegame.deadline')}: {formatDate(item.registrationDeadline, i18n.language)}</Text>
          </View>
          {item.location ? (
            <View style={styles.metaRow}>
              <MapPin size={11} color={colors.gray500} strokeWidth={2} />
              <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.hairline} />

        <View style={styles.cardFooter}>
          <Text style={styles.price}>{priceLabel}</Text>
          {isRegistered ? (
            <View style={styles.registeredBadge}>
              <Check size={12} color={colors.green} strokeWidth={2.5} />
              <Text style={styles.registeredText}>{t('onegame.registered')}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.registerBtn, isRegistering && styles.registerBtnDisabled]}
              onPress={() => handleRegister(item)}
              disabled={isRegistering}
            >
              {isRegistering ? (
                <ActivityIndicator size="small" color={colors.black} />
              ) : (
                <Text style={styles.registerBtnText}>{t('onegame.register')}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('onegame.title')}</Text>
          <Text style={styles.subtitle}>{t('onegame.subtitle')}</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <X size={20} color={colors.cream45} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.cream45} />
        </View>
      ) : (
        <FlatList
          data={tournaments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            playerRequests.length > 0 ? (
              <View style={styles.requestsSection}>
                <SectionHeader label={t('onegame.teamsLooking')} />
                <View style={styles.requestsList}>
                  {playerRequests.map(renderRequestCard)}
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>{t('onegame.noGames')}</Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontFamily: font.sans, fontSize: 15, color: colors.cream70, textAlign: 'center', padding: 24 },

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
  headerText: { gap: 4 },
  title: { fontFamily: font.sansXBold, fontSize: 27, letterSpacing: -0.5, color: colors.cream },
  subtitle: { fontFamily: font.sans, fontSize: 13, color: colors.cream70 },
  closeBtn: { padding: 4, marginTop: 4 },

  listContent: { padding: 18, gap: space.md, paddingBottom: 40 },
  requestsSection: { marginBottom: space.xl },
  requestsList: { gap: space.md },
  reqCardTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },

  card: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.md,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.sm },
  cardName: { fontFamily: font.sansBold, fontSize: 16, color: colors.cream, flex: 1, lineHeight: 22 },

  cardMeta: { gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: font.sans, fontSize: 12, color: colors.gray500 },

  hairline: { height: 1, backgroundColor: colors.hairline },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontFamily: font.serifItalic, fontSize: 22, color: colors.cream },

  registerBtn: {
    backgroundColor: colors.cream2,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: space.lg,
  },
  registerBtnDisabled: { opacity: 0.45 },
  registerBtnText: { fontFamily: font.sansBold, fontSize: 13, color: colors.black },

  registeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: space.md,
  },
  registeredText: { fontFamily: font.sansBold, fontSize: 12, color: colors.green },
  acceptedBadge: { backgroundColor: 'rgba(34,197,94,0.12)' },
  rejectedBadge: { backgroundColor: 'rgba(239,68,68,0.12)' },
  rejectedText: { fontFamily: font.sansBold, fontSize: 12, color: '#EF4444' },
  ownTeamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(222,219,200,0.08)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: space.md,
  },
  ownTeamText: { fontFamily: font.sansBold, fontSize: 12, color: colors.cream45 },
  alreadyInMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(73,115,115,0.20)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: space.md,
  },
  alreadyInMatchText: { fontFamily: font.sansBold, fontSize: 12, color: '#497373' },
});
