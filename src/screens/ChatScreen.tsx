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
import { ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useMessages } from '../context/MessagesContext';
import { getConversation, sendMessage, markConversationRead } from '../services/messages';
import { isTeamCaptain } from '../services/teams';
import { supabase } from '../services/supabase';
import { Message } from '../types';
import { RootStackParamList } from '../navigation/types';
import { colors, font, space, radius } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export default function ChatScreen({ route, navigation }: Props) {
  const { peerId, peerName } = route.params;
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const { refreshUnreadMessages } = useMessages();

  const [messages, setMessages] = useState<Message[]>([]);
  const [peerIsCaptain, setPeerIsCaptain] = useState(false);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const [data, captain] = await Promise.all([
        getConversation(session.user.id, peerId),
        isTeamCaptain(peerId),
      ]);
      setMessages(data);
      setPeerIsCaptain(captain);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [session, peerId]);

  useFocusEffect(useCallback(() => {
    load();
    markConversationRead(peerId).then(() => refreshUnreadMessages()).catch(() => {});
  }, [load, peerId, refreshUnreadMessages]));

  useEffect(() => {
    if (!session) return;
    const myId = session.user.id;
    const channel = supabase
      .channel(`chat_${myId}_${peerId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `toId=eq.${myId}` },
        (payload) => {
          const incoming = payload.new as Message;
          if (incoming.fromId !== peerId) return;
          setMessages((prev) => [...prev, incoming]);
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
        })
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
            {new Date(item.timestamp).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <ArrowLeft size={22} color={colors.cream70} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerCenter}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('UserProfile', { userId: peerId })}
        >
          <View style={styles.headerNameRow}>
            <Text style={styles.headerName} numberOfLines={1}>{peerName}</Text>
            {peerIsCaptain && (
              <View style={styles.capBadge}>
                <Text style={styles.capText}>CAP</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.cream45} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={messages.length === 0 ? styles.emptyContainer : styles.listContent}
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
            placeholderTextColor={colors.cream45}
            selectionColor={colors.cream}
            keyboardAppearance="dark"
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
              <ActivityIndicator size="small" color={colors.black} />
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
  safe: { flex: 1, backgroundColor: colors.black },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: font.sans, fontSize: 14, color: colors.cream70, textAlign: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    gap: space.sm,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerName: { fontFamily: font.sansBold, fontSize: 16, color: colors.cream },
  capBadge: {
    backgroundColor: 'rgba(222,219,200,0.12)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  capText: { fontFamily: font.sansBold, fontSize: 8.5, letterSpacing: 1, color: colors.cream70, textTransform: 'uppercase' },
  headerSpacer: { width: 30 },

  listContent: { padding: 18, gap: space.sm },
  bubbleWrapper: { flexDirection: 'row', marginVertical: 2 },
  bubbleLeft: { justifyContent: 'flex-start' },
  bubbleRight: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    gap: 2,
  },
  bubbleMe: { backgroundColor: colors.cream2, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: colors.surface1, borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: font.sans, fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: colors.black },
  bubbleTextThem: { color: colors.cream },
  bubbleTime: { fontFamily: font.sans, fontSize: 10, alignSelf: 'flex-end' },
  bubbleTimeMe: { color: 'rgba(0,0,0,0.4)' },
  bubbleTimeThem: { color: colors.cream45 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 18,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    gap: space.sm,
    backgroundColor: colors.black,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colors.surface1,
    borderRadius: 20,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    fontFamily: font.sans,
    fontSize: 14,
    color: colors.cream,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  sendBtn: {
    backgroundColor: colors.cream2,
    borderRadius: 20,
    paddingHorizontal: space.lg,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  sendBtnDisabled: { opacity: 0.35 },
  sendBtnText: { fontFamily: font.sansBold, color: colors.black, fontSize: 13 },
});
