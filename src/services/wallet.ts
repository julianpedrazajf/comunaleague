import { supabase } from './supabase';

// Current user's Comuna Coin balance.
export async function getMyCoins(): Promise<number> {
  const { data, error } = await supabase.rpc('get_my_coins');
  if (error) throw error;
  return (data as number) ?? 0;
}

// Credit coins after a (simulated) purchase. Replace with a server-side
// webhook once real MercadoPago payments are wired up.
export async function addCoins(amount: number): Promise<void> {
  const { error } = await supabase.rpc('add_coins', { p_amount: amount });
  if (error) throw error;
}

// Send coins to an official teammate (same team). Atomic on the server.
export async function transferCoins(toUserId: string, amount: number): Promise<void> {
  const { error } = await supabase.rpc('transfer_coins', { p_to_user_id: toUserId, p_amount: amount });
  if (error) throw error;
}
