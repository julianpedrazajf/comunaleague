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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getAvailableTeams, joinTeam } from '../services/teams';
import { RootStackParamList } from '../navigation/types';
import { Team } from '../types';
import { colors, spacing, fontSizes } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'JoinTeam'>;

export default function JoinTeamScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { session } = useAuth();

  const [teams, setTeams] = useState<Team[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () => teams.filter((t) => t.name.toLowerCase().includes(query.toLowerCase())),
    [teams, query],
  );

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const available = await getAvailableTeams(session.user.id);
      setTeams(available);
    } catch (e: any) {
      setError(e?.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [session, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleJoin = (team: Team) => {
    Alert.alert(
      t('team.joinTeam'),
      `${t('team.joinConfirm')} "${team.name}"?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('team.join'),
          onPress: async () => {
            setJoiningId(team.id);
            try {
              await joinTeam(team.id);
              navigation.goBack();
            } catch (e: any) {
              Alert.alert(t('common.error'), e?.message ?? t('common.error'));
              setJoiningId(null);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('team.joinTeam')}</Text>
      </View>

      <TextInput
        style={styles.searchBar}
        value={query}
        onChangeText={setQuery}
        placeholder={t('team.searchPlaceholder')}
        placeholderTextColor={colors.gray}
        clearButtonMode="while-editing"
        autoCapitalize="none"
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>{t('team.noTeamsAvailable')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.teamCard}>
            <View style={styles.teamInfo}>
              <Text style={styles.teamName}>{item.name}</Text>
              <View style={styles.row}>
                <View style={styles.formatBadge}>
                  <Text style={styles.formatText}>
                    {item.format === 5 ? t('team.format5') : t('team.format11')}
                  </Text>
                </View>
                <Text style={styles.playerCount}>
                  {item.playerIds.length} {t('team.players')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.joinBtn, joiningId === item.id && styles.joinBtnDisabled]}
              onPress={() => handleJoin(item)}
              disabled={joiningId === item.id}
            >
              {joiningId === item.id ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.joinBtnText}>{t('team.join')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  closeBtn: { alignSelf: 'flex-end', padding: spacing.sm, marginBottom: spacing.sm },
  closeBtnText: { fontSize: fontSizes.lg, color: colors.gray },
  title: { fontSize: fontSizes.xxl, fontWeight: 'bold', color: colors.darkGray },
  listContent: { padding: spacing.lg, gap: spacing.md },
  searchBar: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.md,
    color: colors.darkGray,
    backgroundColor: colors.lightGray,
  },

  // Error state
  errorText: { color: colors.primary, fontSize: fontSizes.sm, textAlign: 'center', marginBottom: spacing.md },
  retryBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  retryText: { color: colors.primary, fontWeight: '600' },

  // Empty state
  emptyText: { color: colors.gray, fontSize: fontSizes.md, textAlign: 'center' },

  // Team card
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    padding: spacing.md,
  },
  teamInfo: { flex: 1 },
  teamName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.darkGray, marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  formatBadge: {
    backgroundColor: colors.teal,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  formatText: { color: colors.white, fontSize: fontSizes.xs, fontWeight: '600' },
  playerCount: { color: colors.gray, fontSize: fontSizes.xs },
  joinBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 72,
    alignItems: 'center',
  },
  joinBtnDisabled: { opacity: 0.7 },
  joinBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },
});
