import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Check, X, Calendar } from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { getNotifications, markAllRead, respondToInterest, respondToJoinRequest, cleanupPastNotifications } from '../services/notifications';
import { getMyTeam, getTeamById } from '../services/teams';
import { useAuth } from '../context/AuthContext';
import { PRICES, formatCOP } from '../utils/prices';
import { AppNotification } from '../types';
import Monogram from '../components/ui/Monogram';
import { colors, font, space, radius } from '../theme/tokens';

const NOTIF_KEY = '@push_notifications';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

export default function NotificationsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { session } = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(NOTIF_KEY).then((val) => {
        if (val !== null) setPushEnabled(val === 'true');
      });
      if (session) {
        getMyTeam(session.user.id)
          .then((team) => setMyTeamId(team?.id ?? null))
          .catch(() => {});
      }
      setLoading(true);
      cleanupPastNotifications()
        .then(() => getNotifications())
        .then((data) => {
          setNotifications(data);
          markAllRead().catch(() => {});
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [session]),
  );

  const handlePayToJoin = async (notif: AppNotification) => {
    if (!notif.relatedId) return;
    try {
      const team = await getTeamById(notif.relatedId);
      navigation.navigate('Payment', {
        kind: 'join_team',
        amount: PRICES.joinTeam,
        title: team?.name ?? t('payment.conceptJoinTeam'),
        payload: { teamId: notif.relatedId },
      });
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
    }
  };

  const handlePushToggle = async (value: boolean) => {
    setPushEnabled(value);
    await AsyncStorage.setItem(NOTIF_KEY, value.toString());
  };

  const handleRespond = (
    notif: AppNotification,
    accept: boolean,
    responder: (notificationId: string, accept: boolean) => Promise<void>,
    confirmMessageKey: string,
  ) => {
    const label = accept ? t('notifications.accept') : t('notifications.reject');
    Alert.alert(
      label,
      accept ? t(confirmMessageKey, { name: notif.fromName ?? '' }) : undefined,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: label,
          style: accept ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await responder(notif.id, accept);
              setNotifications((prev) =>
                prev.map((n) =>
                  n.id === notif.id
                    ? { ...n, read: true, response: accept ? 'accepted' : 'rejected' }
                    : n,
                ),
              );
            } catch (e: any) {
              Alert.alert(t('common.error'), e?.message ?? t('common.error'));
            }
          },
        },
      ],
    );
  };

  const handleJoinInfoTap = () => {
    Alert.alert(t('notifications.joinCaptainOnlyTitle'), t('notifications.joinCaptainOnlyMessage'));
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const isInterest = item.type === 'player_request_interest';
    const isJoinRequest = item.type === 'join_team_request';
    const isJoinInfo = item.type === 'join_team_request_info';
    const isNewMatch = item.type === 'new_daily_match';
    const isAccepted = item.type === 'player_request_accepted' || item.type === 'join_team_accepted';
    const showAvatar = isInterest || isJoinRequest || isJoinInfo;
    const showResolution = isInterest || isJoinRequest || isJoinInfo;
    const resolution = item.response;

    const content = (
      <View style={[styles.card, !item.read && !resolution && styles.cardUnread]}>
        {showAvatar ? (
          <Monogram name={item.fromName ?? '?'} size={40} />
        ) : isNewMatch ? (
          <View style={[styles.iconWrap, styles.iconAccepted]}>
            <Calendar size={18} color={colors.black} strokeWidth={2.5} />
          </View>
        ) : (
          <View style={[styles.iconWrap, isAccepted ? styles.iconAccepted : styles.iconRejected]}>
            {isAccepted
              ? <Check size={18} color={colors.black} strokeWidth={2.5} />
              : <X size={18} color={colors.cream} strokeWidth={2.5} />
            }
          </View>
        )}

        <View style={styles.cardBody}>
          <Text style={styles.cardText}>
            {item.type === 'player_request_interest'
              ? t('notifications.playerInterest', { name: item.fromName ?? '' })
              : item.type === 'player_request_accepted'
              ? t('notifications.playerAccepted')
              : item.type === 'player_request_rejected'
              ? t('notifications.playerRejected')
              : isNewMatch
              ? t('notifications.newDailyMatch', { name: item.fromName ?? '' })
              : isJoinRequest || isJoinInfo
              ? t('notifications.joinRequest', { name: item.fromName ?? '' })
              : item.type === 'join_team_accepted'
              ? (myTeamId === item.relatedId
                  ? t('notifications.joinAccepted')
                  : t('notifications.joinAcceptedPay', { price: formatCOP(PRICES.joinTeam) }))
              : t('notifications.joinRejected')
            }
          </Text>

          {item.type === 'join_team_accepted' && myTeamId !== item.relatedId && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => handlePayToJoin(item)} activeOpacity={0.8}>
                <Text style={styles.acceptBtnText}>{t('notifications.payNow')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {isInterest && !resolution && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => handleRespond(item, true, respondToInterest, 'notifications.playerInterest')}
                activeOpacity={0.8}
              >
                <Text style={styles.acceptBtnText}>{t('notifications.accept')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => handleRespond(item, false, respondToInterest, 'notifications.playerInterest')}
                activeOpacity={0.8}
              >
                <Text style={styles.rejectBtnText}>{t('notifications.reject')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {isJoinRequest && !resolution && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => handleRespond(item, true, respondToJoinRequest, 'notifications.joinRequest')}
                activeOpacity={0.8}
              >
                <Text style={styles.acceptBtnText}>{t('notifications.accept')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => handleRespond(item, false, respondToJoinRequest, 'notifications.joinRequest')}
                activeOpacity={0.8}
              >
                <Text style={styles.rejectBtnText}>{t('notifications.reject')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {isJoinInfo && !resolution && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.acceptBtn} onPress={handleJoinInfoTap} activeOpacity={0.8}>
                <Text style={styles.acceptBtnText}>{t('notifications.accept')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={handleJoinInfoTap} activeOpacity={0.8}>
                <Text style={styles.rejectBtnText}>{t('notifications.reject')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {showResolution && resolution && (
            <Text style={[styles.resolvedLabel, resolution === 'accepted' ? styles.resolvedAccepted : styles.resolvedRejected]}>
              {resolution === 'accepted' ? t('notifications.accepted') : t('notifications.rejected')}
            </Text>
          )}
        </View>
      </View>
    );

    if (isNewMatch) {
      return (
        <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('OneGame')}>
          {content}
        </TouchableOpacity>
      );
    }

    return content;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.handle} />
      <View style={styles.navBar}>
        <Text style={styles.pageTitle}>{t('notifications.title')}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.cream45} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>{t('notifications.empty')}</Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.settingsSection}>
              <View style={styles.settingsCard}>
                <View style={styles.settingsRow}>
                  <View style={styles.settingsBody}>
                    <Text style={styles.settingsLabel}>{t('notifications.push')}</Text>
                    <Text style={styles.settingsDesc}>{t('notifications.pushDesc')}</Text>
                  </View>
                  <Switch
                    value={pushEnabled}
                    onValueChange={handlePushToggle}
                    trackColor={{ false: colors.surface2, true: colors.green }}
                    thumbColor={colors.black}
                    ios_backgroundColor={colors.surface2}
                  />
                </View>
              </View>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.hairline,
    alignSelf: 'center', marginTop: space.sm,
  },
  navBar: { paddingHorizontal: 18, paddingTop: space.md, paddingBottom: space.lg },
  pageTitle: { fontFamily: font.sansXBold, fontSize: 27, letterSpacing: -0.5, color: colors.cream },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontFamily: font.sans, fontSize: 14, color: colors.cream45, textAlign: 'center' },

  list: { paddingHorizontal: 18, gap: space.sm, paddingBottom: 40 },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    padding: space.lg,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: '#F2B366',
  },
  cardBody: { flex: 1, gap: space.sm },
  cardText: { fontFamily: font.sans, fontSize: 14, color: colors.cream, lineHeight: 20 },

  iconWrap: {
    width: 40, height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconAccepted: { backgroundColor: colors.green },
  iconRejected: { backgroundColor: '#EF4444' },

  actionRow: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  acceptBtn: {
    flex: 1,
    backgroundColor: colors.green,
    borderRadius: radius.pill,
    paddingVertical: 9,
    alignItems: 'center',
  },
  acceptBtnText: { fontFamily: font.sansBold, fontSize: 13, color: colors.black },
  rejectBtn: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.pill,
    paddingVertical: 9,
    alignItems: 'center',
  },
  rejectBtnText: { fontFamily: font.sansBold, fontSize: 13, color: colors.cream70 },

  resolvedLabel: { fontFamily: font.sansBold, fontSize: 12 },
  resolvedAccepted: { color: colors.green },
  resolvedRejected: { color: '#EF4444' },

  settingsSection: { marginTop: space.xl, paddingHorizontal: 0 },
  settingsCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    paddingHorizontal: space.lg,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    gap: space.md,
  },
  settingsBody: { flex: 1, gap: 4 },
  settingsLabel: { fontFamily: font.sansBold, fontSize: 15, color: colors.cream },
  settingsDesc: { fontFamily: font.sans, fontSize: 13, color: colors.cream70 },
});
