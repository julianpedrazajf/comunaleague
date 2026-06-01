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
import { colors, spacing, fontSizes } from '../utils/theme';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Inbox'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Teammate = Pick<User, 'id' | 'name' | 'lastName' | 'position' | 'skillLevel'>;

type TeammateRow = Teammate & {
  lastMessage: Message | null;
};

const AVATAR_COLORS = [colors.teal, colors.primary, colors.orange, colors.accent, '#7B68EE', '#20B2AA'];

function avatarColor(id: string): string {
  return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays < 7) {
    return date.toLocaleDateString('es-CO', { weekday: 'short' });
  }
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

      if (!team) {
        setHasTeam(false);
        setRows([]);
        return;
      }

      setHasTeam(true);
      const peerIds = team.playerIds.filter((id) => id !== session.user.id);
      const members = await getTeamMembers(peerIds);

      const myId = session.user.id;
      const built: TeammateRow[] = members.map((m) => {
        const conversation = allMessages.filter(
          (msg) =>
            (msg.fromId === myId && msg.toId === m.id) ||
            (msg.fromId === m.id && msg.toId === myId),
        );
        return { ...m, lastMessage: conversation[0] ?? null };
      });

      built.sort((a, b) => {
        if (a.lastMessage && b.lastMessage) {
          return new Date(b.lastMessage.timestamp).getTime() -
            new Date(a.lastMessage.timestamp).getTime();
        }
        if (a.lastMessage) return -1;
        if (b.lastMessage) return 1;
        return a.name.localeCompare(b.name);
      });

      setRows(built);
    } catch {
      // silently fail — empty list shown
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }: { item: TeammateRow }) => {
    const initials = `${item.name[0]}${item.lastName[0]}`.toUpperCase();
    const fullName = `${item.name} ${item.lastName}`;

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate('Chat', { peerId: item.id, peerName: fullName })}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor(item.id) }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.rowName} numberOfLines={1}>{fullName}</Text>
            {item.lastMessage && (
              <Text style={styles.rowTime}>{formatTimestamp(item.lastMessage.timestamp)}</Text>
            )}
          </View>
          <Text style={styles.rowSub} numberOfLines={1}>
            {item.lastMessage
              ? (item.lastMessage.fromId === session?.user.id
                  ? `${t('chat.youPrefix')} ${item.lastMessage.content}`
                  : item.lastMessage.content)
              : t(`positions.${item.position}`)}
          </Text>
        </View>

        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.pageHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backBtnText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>{t('inbox.title')}</Text>
        {hasTeam && !loading && (
          <Text style={styles.pageSubtitle}>{t('inbox.teammates')}</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !hasTeam ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{t('inbox.noTeam')}</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={rows.length === 0 ? styles.emptyContainer : undefined}
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
  safeArea: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  pageHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { marginBottom: spacing.xs },
  backBtnText: { fontSize: fontSizes.sm, color: colors.gray, fontWeight: '500' },
  pageTitle: { fontSize: fontSizes.xxl, fontWeight: 'bold', color: colors.darkGray },
  pageSubtitle: { fontSize: fontSizes.sm, color: colors.gray, marginTop: spacing.xs },

  emptyText: { fontSize: fontSizes.md, color: colors.gray, textAlign: 'center' },

  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 52 + spacing.md,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: fontSizes.md, fontWeight: '700', color: colors.white },

  rowBody: { flex: 1, gap: 3 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.darkGray, flex: 1 },
  rowTime: { fontSize: fontSizes.xs, color: colors.gray, flexShrink: 0 },
  rowSub: { fontSize: fontSizes.sm, color: colors.gray },

  chevron: { fontSize: fontSizes.xl, color: colors.gray, marginLeft: spacing.xs },
});
