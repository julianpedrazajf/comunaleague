import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CompositeNavigationProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppTabParamList, RootStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { useMessages } from '../context/MessagesContext';
import { getAllUserMessages } from '../services/messages';
import { getMyTeam, getTeamMembers, getTeamById, isTeamCaptain } from '../services/teams';
import { getTeamMatches } from '../services/matches';
import { getUpcomingAcceptedMatches } from '../services/notifications';
import { getAllTeamMatchInterests } from '../services/playerRequests';
import { Message, User } from '../types';
import Monogram from '../components/ui/Monogram';
import { colors, font, space, radius } from '../theme/tokens';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Inbox'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Teammate = Pick<User, 'id' | 'name' | 'lastName' | 'position' | 'skillLevel' | 'avatarUrl'>;
type TeammateRow = Teammate & { lastMessage: Message | null; unreadCount: number; isCaptain: boolean };

function formatTimestamp(ts: string, locale: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (diffDays < 7) return date.toLocaleDateString(locale, { weekday: 'short' });
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

export default function InboxScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const { session } = useAuth();
  const { refreshUnreadMessages } = useMessages();

  const [rows, setRows] = useState<TeammateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasTeam, setHasTeam] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const myId = session.user.id;
      const [team, allMessages, acceptedMatches] = await Promise.all([
        getMyTeam(myId),
        getAllUserMessages(myId),
        getUpcomingAcceptedMatches().catch(() => []),
      ]);

      const peerIdSet = new Set<string>();

      // Regular team members
      if (team) {
        team.playerIds.filter((id) => id !== myId).forEach((id) => peerIdSet.add(id));

        // Accepted guests for all upcoming team matches
        const teamMatches = await getTeamMatches(team.id);
        const now = new Date();
        const upcoming = teamMatches.filter((m) => new Date(`${m.date}T${m.time}`) > now);
        const guestResults = await Promise.all(
          upcoming.map((m) => getAllTeamMatchInterests(team.id, m.id)),
        );
        guestResults.flat().forEach((id) => {
          if (id !== myId && !team.playerIds.includes(id)) peerIdSet.add(id);
        });
      }

      // If the user is a guest: show the team members of the match they were accepted for
      if (acceptedMatches.length > 0) {
        const teamIds = [...new Set(acceptedMatches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
        const matchTeams = await Promise.all(teamIds.map((id) => getTeamById(id)));
        matchTeams.forEach((t) => {
          if (t) t.playerIds.forEach((id) => { if (id !== myId) peerIdSet.add(id); });
        });
      }

      // Always include anyone with a prior conversation, regardless of current
      // team membership or whether a match has already passed
      allMessages.forEach((msg) => {
        const peer = msg.fromId === myId ? msg.toId : msg.fromId;
        if (peer !== myId) peerIdSet.add(peer);
      });

      setHasTeam(!!team || acceptedMatches.length > 0 || peerIdSet.size > 0);

      if (peerIdSet.size === 0) { setRows([]); return; }

      const members = await getTeamMembers([...peerIdSet]);
      const captainFlags = await Promise.all(members.map((m) => isTeamCaptain(m.id)));

      const built: TeammateRow[] = members.map((m, i) => {
        const conversation = allMessages.filter(
          (msg) => (msg.fromId === myId && msg.toId === m.id) || (msg.fromId === m.id && msg.toId === myId),
        );
        const unreadCount = conversation.filter((msg) => msg.fromId === m.id && !msg.read).length;
        return { ...m, lastMessage: conversation[0] ?? null, unreadCount, isCaptain: captainFlags[i] };
      });

      built.sort((a, b) => {
        if (a.lastMessage && b.lastMessage) {
          return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
        }
        if (a.lastMessage) return -1;
        if (b.lastMessage) return 1;
        return a.name.localeCompare(b.name);
      });

      setRows(built);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => {
    load();
    refreshUnreadMessages();
  }, [load, refreshUnreadMessages]));

  const renderItem = ({ item }: { item: TeammateRow }) => {
    const fullName = `${item.name} ${item.lastName}`;
    const preview = item.lastMessage
      ? (item.lastMessage.fromId === session?.user.id
          ? `${t('chat.youPrefix')} ${item.lastMessage.content}`
          : item.lastMessage.content)
      : t(`positions.${item.position}`);

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate('Chat', { peerId: item.id, peerName: fullName })}
        activeOpacity={0.7}
      >
        <Monogram name={item.name} lastName={item.lastName} size={50} imageUri={item.avatarUrl} />

        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <View style={styles.nameRow}>
              <Text style={[styles.rowName, item.unreadCount > 0 && styles.rowNameUnread]} numberOfLines={1}>{fullName}</Text>
              {item.isCaptain && (
                <View style={styles.capBadge}><Text style={styles.capText}>CAP</Text></View>
              )}
            </View>
            {item.lastMessage && (
              <Text style={styles.rowTime}>{formatTimestamp(item.lastMessage.timestamp, i18n.language)}</Text>
            )}
          </View>
          <View style={styles.rowBottom}>
            <Text style={[styles.rowSub, item.unreadCount > 0 && styles.rowSubUnread]} numberOfLines={1}>{preview}</Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.navBar}>
        <Text style={styles.pageTitle}>{t('inbox.title')}</Text>
        {hasTeam && !loading && (
          <Text style={styles.pageSubtitle}>{t('inbox.teammates')}</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.cream45} />
        </View>
      ) : !hasTeam ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{t('inbox.noTeam')}</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={rows.length === 0 ? styles.emptyContainer : styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>{t('inbox.noTeammates')}</Text>
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
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: font.sans, fontSize: 15, color: colors.cream70, textAlign: 'center' },

  navBar: {
    paddingHorizontal: 18,
    paddingTop: space.md,
    paddingBottom: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  pageTitle: { fontFamily: font.sansXBold, fontSize: 27, letterSpacing: -0.5, color: colors.cream },
  pageSubtitle: { fontFamily: font.sans, fontSize: 13, color: colors.cream45, marginTop: 4 },

  listContent: { paddingBottom: 120 },

  separator: {
    height: 1,
    backgroundColor: colors.hairline,
    marginLeft: 18 + 50 + space.md,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: space.md,
    gap: space.md,
  },
  rowBody: { flex: 1, gap: 4 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  capBadge: {
    backgroundColor: 'rgba(222,219,200,0.12)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  capText: { fontFamily: font.sansBold, fontSize: 8.5, letterSpacing: 1, color: colors.cream70, textTransform: 'uppercase' },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  rowName: { fontFamily: font.sansBold, fontSize: 15, color: colors.cream, flex: 1 },
  rowNameUnread: { color: colors.cream },
  rowTime: { fontFamily: font.sans, fontSize: 11.5, color: colors.cream45, flexShrink: 0 },
  rowSub: { fontFamily: font.sans, fontSize: 13, color: colors.cream70, flex: 1 },
  rowSubUnread: { fontFamily: font.sansBold, color: colors.cream },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: { fontFamily: font.sansBold, fontSize: 10, color: colors.cream, lineHeight: 12 },
});
