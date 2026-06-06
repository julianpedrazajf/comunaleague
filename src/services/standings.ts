import { supabase } from './supabase';
import { Standing } from '../types';

export async function getTeamStanding(teamId: string): Promise<Standing | null> {
  const { data, error } = await supabase
    .from('standings')
    .select('*')
    .eq('teamId', teamId)
    .order('updatedAt', { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0] as Standing) ?? null;
}
