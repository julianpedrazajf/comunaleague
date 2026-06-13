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

export type PublicProfile = Pick<
  User,
  'id' | 'name' | 'lastName' | 'position' | 'foot' | 'height' | 'skillLevel' | 'favoriteTeam' | 'avatarUrl' | 'city' | 'country'
>;

// Public-facing profile fields only (no email/age) for viewing other players.
export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, lastName, position, foot, height, skillLevel, favoriteTeam, avatarUrl, city, country')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as PublicProfile;
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

export async function updateAvatarUrl(userId: string, avatarUrl: string): Promise<void> {
  const { error } = await supabase.from('users').update({ avatarUrl }).eq('id', userId);
  if (error) throw error;
}

export async function updateUserPreferences(
  userId: string,
  data: { position: string; foot: string; skillLevel: string; favoriteTeam: string | null },
): Promise<void> {
  const { error } = await supabase.from('users').update(data).eq('id', userId);
  if (error) throw error;
}
