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
import { getAllUserMessages } from '../services/messages';
import { getMyTeam, getTeamMembers } from '../services/teams';
import { Message, User } from '../types';
import Monogram from '../components/ui/Monogram';
import { colors, font, space, radius } from '../theme/tokens';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Inbox'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Teammate = Pick<User, 'id' | 'name' | 'lastName' | 'position' | 'skillLevel'>;
type TeammateRow = Teammate & { lastMessage: Message | null };

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  if (diffDays < 7) return date.toLocaleDateString('es-CO', { weekday: 'short' });
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export default function InboxScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const { session } = useAuth();

  const [rows, setRows] = useState<TeammateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasTeam, setHasTeam] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [team, allMessages] = await Promise.all([
        getMyTeam(session.user.id),
        getAllUserMessages(session.user.id),
      ]);

      if (!team) { setHasTeam(false); setRows([]); return; }

      setHasTeam(true);
      const peerIds = team.playerIds.filter((id) => id !== session.user.id);
      const members = await getTeamMembers(peerIds);
      const myId = session.user.id;

      const built: TeammateRow[] = members.map((m) => {
        const conversation = allMessages.filter(
          (msg) => (msg.fromId === myId && msg.toId === m.id) || (msg.fromId === m.id && msg.toId === myId),
        );
        return { ...m, lastMessage: conversation[0] ?? null };
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

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
        <Monogram name={item.name} lastName={item.lastName} size={50} />

        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.rowName} numberOfLines={1}>{fullName}</Text>
            {item.lastMessage && (
              <Text style={styles.rowTime}>{formatTimestamp(item.lastMessage.timestamp)}</Text>
            )}
          </View>
          <Text style={styles.rowSub} numberOfLines={1}>{preview}</Text>
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
  rowName: { fontFamily: font.sansBold, fontSize: 15, color: colors.cream, flex: 1 },
  rowTime: { fontFamily: font.sans, fontSize: 11.5, color: colors.cream45, flexShrink: 0 },
  rowSub: { fontFamily: font.sans, fontSize: 13, color: colors.cream70 },
});
