import { supabase } from './supabase';
import { Message } from '../types';

type SenderInfo = { id: string; name: string; lastName: string };
export type MessageWithSender = Message & { sender: SenderInfo | null };

export async function getInboxMessages(userId: string): Promise<MessageWithSender[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:fromId(id, name, lastName)')
    .eq('toId', userId)
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MessageWithSender[];
}

export async function getAllUserMessages(userId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`fromId.eq.${userId},toId.eq.${userId}`)
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function getConversation(userId: string, peerId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(fromId.eq.${userId},toId.eq.${peerId}),and(fromId.eq.${peerId},toId.eq.${userId})`)
    .order('timestamp', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function sendMessage(fromId: string, toId: string, content: string): Promise<void> {
  const { error } = await supabase.from('messages').insert({
    fromId,
    toId,
    content,
    timestamp: new Date().toISOString(),
  });
  if (error) throw error;
}
