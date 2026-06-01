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
