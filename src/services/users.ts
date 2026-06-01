import { supabase } from './supabase';
import { User } from '../types';

type ProfileSummary = Pick<User, 'id' | 'name' | 'lastName'>;

export async function getProfile(userId: string): Promise<ProfileSummary | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, lastName')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as ProfileSummary;
}
