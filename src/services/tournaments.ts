import { supabase } from './supabase';
import { Tournament, Registration } from '../types';

export async function getDailyTournaments(): Promise<Tournament[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('type', 'daily')
    .gte('startDate', today)
    .order('startDate', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Tournament[];
}

export async function getUserRegistrations(userId: string): Promise<Registration[]> {
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('userId', userId);
  if (error) throw error;
  return (data ?? []) as Registration[];
}

export async function registerForTournament(tournamentId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('registrations').insert({
    tournamentId,
    userId,
    status: 'pending',
  });
  if (error) throw error;
}
