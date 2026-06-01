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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { getInboxMessages, MessageWithSender } from '../services/messages';
import { colors, spacing, fontSizes } from '../utils/theme';

type NavProp = BottomTabNavigationProp<AppTabParamList, 'Inbox'>;

const AVATAR_COLORS = [colors.teal, colors.primary, colors.orange, colors.accent];

function avatarColor(id: string): string {
  const index = id.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
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

  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const data = await getInboxMessages(session.user.id);
      setMessages(data);
    } catch {
      // silently fail — empty list shown
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }: { item: MessageWithSender }) => {
    const sender = item.sender;
    const initials = sender
      ? `${sender.name[0]}${sender.lastName[0]}`.toUpperCase()
      : '?';
    const senderName = sender
      ? `${sender.name} ${sender.lastName}`
      : t('common.error');

    return (
      <View style={styles.messageCard}>
        <View style={[styles.avatar, { backgroundColor: avatarColor(item.fromId) }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.messageBody}>
          <View style={styles.messageTopRow}>
            <Text style={styles.senderName} numberOfLines={1}>{senderName}</Text>
            <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
          </View>
          <Text style={styles.messagePreview} numberOfLines={2}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.pageHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backBtnText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>{t('inbox.title')}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            messages.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>{t('inbox.noMessages')}</Text>
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

  listContent: { paddingVertical: spacing.sm },
  emptyText: { fontSize: fontSizes.md, color: colors.gray, textAlign: 'center' },

  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 48 + spacing.md,
  },

  messageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.white },

  messageBody: { flex: 1, gap: spacing.xs },
  messageTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  senderName: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.darkGray,
    flex: 1,
  },
  timestamp: { fontSize: fontSizes.xs, color: colors.gray, flexShrink: 0 },
  messagePreview: { fontSize: fontSizes.sm, color: colors.gray, lineHeight: 20 },
});
