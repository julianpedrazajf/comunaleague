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

export type FeaturedPlayer = Pick<User, 'id' | 'name' | 'lastName' | 'position' | 'skillLevel'>;

export async function getFeaturedPlayers(): Promise<FeaturedPlayer[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, lastName, position, skillLevel')
    .order('createdAt', { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []) as FeaturedPlayer[];
}

export async function getFullProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as User;
}
