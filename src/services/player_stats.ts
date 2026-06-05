import { supabase } from './supabase';
import { PlayerStats } from '../types';

export async function getPlayerStats(userId: string): Promise<PlayerStats | null> {
  const { data, error } = await supabase
    .from('player_stats')
    .select('*')
    .eq('userId', userId)
    .limit(1);
  if (error) throw error;
  return (data?.[0] as PlayerStats) ?? null;
}
