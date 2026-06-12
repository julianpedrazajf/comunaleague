import { supabase } from './supabase';
import { Tournament, Registration } from '../types';

function isPastTournament(t: Pick<Tournament, 'startDate' | 'startTime'>): boolean {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  if (t.startDate < today) return true;
  if (t.startDate > today) return false;
  if (!t.startTime) return false;
  const [hours, minutes] = t.startTime.split(':').map(Number);
  const matchTime = new Date();
  matchTime.setHours(hours, minutes, 0, 0);
  return now > matchTime;
}

export async function getDailyTournaments(): Promise<Tournament[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('type', 'daily')
    .gte('startDate', today)
    .order('startDate', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Tournament[]).filter((t) => !isPastTournament(t));
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

export async function getUserTournamentRegistrations(userId: string): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('registrations')
    .select('tournament:tournamentId(*)')
    .eq('userId', userId);
  if (error) throw error;
  const tournaments = (data ?? [])
    .map((r: any) => r.tournament as Tournament | null)
    .filter((t): t is Tournament => !!t && t.type === 'daily' && !isPastTournament(t));
  tournaments.sort((a, b) => a.startDate.localeCompare(b.startDate));
  return tournaments;
}
