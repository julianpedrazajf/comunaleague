import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { X, Search } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { getAvailableTeams, getMyTeam, getPendingJoinRequestTeamIds, requestJoinTeam } from '../services/teams';
import { RootStackParamList } from '../navigation/types';
import { Team } from '../types';
import { TEAM_CAPACITY } from '../utils/prices';
import Monogram from '../components/ui/Monogram';
import Chip from '../components/ui/Chip';
import { colors, font, space, radius } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'JoinTeam'>;

export default function JoinTeamScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { session } = useAuth();

  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () => teams.filter((team) => team.name.toLowerCase().includes(query.toLowerCase())),
    [teams, query],
  );

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const [available, existing, pending] = await Promise.all([
        getAvailableTeams(session.user.id),
        getMyTeam(session.user.id),
        getPendingJoinRequestTeamIds(session.user.id),
      ]);
      setTeams(available);
      setMyTeam(existing);
      setPendingIds(pending);
    } catch (e: any) {
      setError(e?.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [session, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleJoin = (team: Team) => {
    if (myTeam) {
      Alert.alert(t('team.alreadyMemberTitle'), t('team.alreadyMemberMessage', { name: myTeam.name }));
      return;
    }
    if (pendingIds.has(team.id)) {
      Alert.alert(t('team.alreadyRequestedTitle'), t('team.alreadyRequestedMessage', { name: team.name }));
      return;
    }
    if (team.playerIds.length >= TEAM_CAPACITY) {
      Alert.alert(t('team.fullTitle'), t('team.fullMessage', { name: team.name }));
      return;
    }
    Alert.alert(
      t('team.requestConfirmTitle'),
      t('team.joinNotice', { name: team.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('team.request'),
          onPress: async () => {
            try {
              await requestJoinTeam(team.id);
              setPendingIds((prev) => new Set(prev).add(team.id));
              Alert.alert(t('team.joinRequestSentTitle'), t('team.joinRequestSentMessage', { name: team.name }));
            } catch (e: any) {
              Alert.alert(t('common.error'), e?.message ?? t('common.error'));
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('team.joinTeam')}</Text>
          <Text style={styles.subtitle}>{t('team.joinSubtitle')}</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <X size={20} color={colors.cream45} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Search size={15} color={colors.cream45} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={t('team.searchPlaceholder')}
          placeholderTextColor={colors.cream45}
          selectionColor={colors.cream}
          autoCapitalize="none"
          keyboardAppearance="dark"
        />
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
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>{t('team.noTeamsAvailable')}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const spotsLeft = Math.max(TEAM_CAPACITY - item.playerIds.length, 0);
            const isFull = spotsLeft === 0;
            return (
              <View style={styles.teamCard}>
                <Monogram name={item.name} size={46} shape="square" />
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.metaRow}>
                    <Chip label={item.format === 5 ? t('team.format5') : t('team.format11')} />
                    <Text
                      style={[styles.playerCount, isFull && styles.playerCountFull]}
                      numberOfLines={1}
                    >
                      {isFull
                        ? t('team.fullLabel')
                        : t('team.spotsLeft', { count: spotsLeft })}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.joinBtn,
                    (pendingIds.has(item.id) || isFull) && styles.joinBtnDisabled,
                  ]}
                  onPress={() => handleJoin(item)}
                  disabled={pendingIds.has(item.id) || isFull}
                >
                  <Text style={styles.joinBtnText}>
                    {pendingIds.has(item.id) ? t('team.pending') : t('team.request')}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: font.sans, fontSize: 15, color: colors.cream70, textAlign: 'center' },

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

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginHorizontal: 18,
    marginVertical: space.md,
    paddingHorizontal: 14,
    gap: space.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: font.sans,
    fontSize: 15,
    color: colors.cream,
  },

  errorText: { fontFamily: font.sans, fontSize: 13, color: '#EF4444', textAlign: 'center' },
  retryText: { fontFamily: font.sansBold, fontSize: 13, color: colors.cream70 },

  listContent: { paddingHorizontal: 18, paddingBottom: 40, gap: space.sm },

  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface1,
    borderRadius: radius.cardSm,
    padding: space.md,
    gap: space.md,
  },
  teamInfo: { flex: 1, gap: 6 },
  teamName: { fontFamily: font.sansBold, fontSize: 15, color: colors.cream },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  playerCount: { fontFamily: font.sans, fontSize: 11.5, color: colors.gray500, flexShrink: 1 },
  playerCountFull: { fontFamily: font.sansBold, color: '#EF4444' },

  joinBtn: {
    backgroundColor: colors.cream2,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: space.md,
    minWidth: 68,
    alignItems: 'center',
    flexShrink: 0,
  },
  joinBtnDisabled: { opacity: 0.45 },
  joinBtnText: { fontFamily: font.sansBold, fontSize: 13, color: colors.black },
});
