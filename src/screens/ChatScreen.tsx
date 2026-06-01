import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { getConversation, sendMessage } from '../services/messages';
import { supabase } from '../services/supabase';
import { Message } from '../types';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, fontSizes } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export default function ChatScreen({ route, navigation }: Props) {
  const { peerId, peerName } = route.params;
  const { t } = useTranslation();
  const { session } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const data = await getConversation(session.user.id, peerId);
      setMessages(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [session, peerId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Real-time subscription: listen for incoming messages from the peer
  useEffect(() => {
    if (!session) return;
    const myId = session.user.id;

    const channel = supabase
      .channel(`chat_${myId}_${peerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `toId=eq.${myId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          if (incoming.fromId !== peerId) return;
          setMessages((prev) => [...prev, incoming]);
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, peerId]);

  const handleSend = async () => {
    if (!session || !text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    try {
      await sendMessage(session.user.id, peerId, content);
      await load();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const myId = session?.user.id ?? '';

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.fromId === myId;
    return (
      <View style={[styles.bubbleWrapper, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
            {item.content}
          </Text>
          <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
            {new Date(item.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerName} numberOfLines={1}>{peerName}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={
              messages.length === 0 ? styles.emptyContainer : styles.listContent
            }
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.emptyText}>{t('chat.noMessages')}</Text>
              </View>
            }
            renderItem={renderItem}
          />
        )}

        {/* Input bar */}
        <SafeAreaView edges={['bottom']} style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={colors.gray}
            multiline
            maxLength={500}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.sendBtnText}>{t('chat.send')}</Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: fontSizes.sm, color: colors.gray, textAlign: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  backBtn: { padding: spacing.xs },
  backBtnText: { fontSize: fontSizes.xl, color: colors.darkGray, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.darkGray },
  headerSpacer: { width: 36 },

  // Message list
  listContent: { padding: spacing.md, gap: spacing.sm },
  bubbleWrapper: { flexDirection: 'row', marginVertical: 2 },
  bubbleLeft: { justifyContent: 'flex-start' },
  bubbleRight: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  bubbleMe: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: colors.lightGray,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: fontSizes.sm, lineHeight: 20 },
  bubbleTextMe: { color: colors.white },
  bubbleTextThem: { color: colors.darkGray },
  bubbleTime: { fontSize: 10, alignSelf: 'flex-end' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.65)' },
  bubbleTimeThem: { color: colors.gray },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colors.lightGray,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.sm,
    color: colors.darkGray,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  sendBtnDisabled: { opacity: 0.45 },
  sendBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },
});
