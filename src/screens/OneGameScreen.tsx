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
import { useAuth } from '../context/AuthContext';
import { getDailyTournaments, getUserRegistrations, registerForTournament } from '../services/tournaments';
import { Tournament } from '../types';
import { colors, spacing, fontSizes } from '../utils/theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OneGame'>;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function OneGameScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { session } = useAuth();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [data, regs] = await Promise.all([
        getDailyTournaments(),
        getUserRegistrations(session.user.id),
      ]);
      setTournaments(data);
      setRegisteredIds(new Set(regs.map((r) => r.tournamentId)));
    } catch {
      // silently fail — empty list shown
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
      ]
    );
  }

  const renderItem = ({ item }: { item: Tournament }) => {
    const isRegistered = registeredIds.has(item.id);
    const isRegistering = registeringId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.formatBadge}>
            <Text style={styles.formatBadgeText}>
              {item.format === 5 ? t('team.format5') : t('team.format11')}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('onegame.starts')}</Text>
            <Text style={styles.detailValue}>{formatDate(item.startDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('match.location')}</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{item.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('onegame.deadline')}</Text>
            <Text style={styles.detailValue}>{formatDate(item.registrationDeadline)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('payment.price')}</Text>
            <Text style={styles.detailValue}>
              {item.price === 0 ? t('onegame.free') : `$${item.price.toLocaleString('es-CO')}`}
            </Text>
          </View>
        </View>

        {isRegistered ? (
          <View style={styles.registeredBadge}>
            <Text style={styles.registeredText}>{t('onegame.registered')}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.registerBtn, isRegistering && styles.registerBtnDisabled]}
            onPress={() => handleRegister(item)}
            disabled={isRegistering}
          >
            {isRegistering ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.registerBtnText}>{t('onegame.register')}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('onegame.title')}</Text>
          <Text style={styles.subtitle}>{t('onegame.subtitle')}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={tournaments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            tournaments.length === 0 ? styles.emptyContainer : styles.listContent
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
  safeArea: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: fontSizes.xxl, fontWeight: 'bold', color: colors.darkGray },
  subtitle: { fontSize: fontSizes.sm, color: colors.gray, marginTop: spacing.xs },
  closeBtn: { fontSize: fontSizes.lg, color: colors.gray, fontWeight: '600' },

  listContent: { padding: spacing.lg, gap: spacing.md },
  emptyText: { color: colors.gray, fontSize: fontSizes.md, textAlign: 'center' },

  card: {
    backgroundColor: colors.lightGray,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardName: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.darkGray,
    flex: 1,
  },
  formatBadge: {
    backgroundColor: colors.teal,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  formatBadgeText: { fontSize: fontSizes.xs, color: colors.white, fontWeight: '700' },

  cardDetails: { gap: spacing.xs },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: { fontSize: fontSizes.sm, color: colors.gray },
  detailValue: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.darkGray,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },

  registerBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  registerBtnDisabled: { opacity: 0.6 },
  registerBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },

  registeredBadge: {
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.teal,
  },
  registeredText: { color: colors.teal, fontWeight: '700', fontSize: fontSizes.sm },
});
