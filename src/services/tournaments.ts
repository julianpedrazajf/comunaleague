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

/**
 * Upcoming daily matches readable without an account (guest mode). Backed by a
 * public SECURITY DEFINER RPC, so it works for the anon role. Returns the
 * matches plus a registered-count map (same shape the screen already uses).
 */
export async function getPublicDailyMatches(): Promise<{ tournaments: Tournament[]; counts: Map<string, number> }> {
  const { data, error } = await supabase.rpc('get_public_daily_matches');
  if (error) throw error;
  const tournaments: Tournament[] = [];
  const counts = new Map<string, number>();
  for (const r of (data ?? []) as any[]) {
    tournaments.push({
      id: r.id,
      name: r.name,
      type: 'daily',
      format: r.format,
      startDate: r.startDate,
      startTime: r.startTime ?? undefined,
      location: r.location ?? '',
      registrationDeadline: '',
      price: 0,
      coinCost: r.coinCost ?? undefined,
    });
    counts.set(r.id, Number(r.registeredCount));
  }
  return { tournaments, counts };
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

// Capacity-checked registration for daily matches (max 18 players, DB-enforced)
export async function registerForDaily(tournamentId: string): Promise<void> {
  const { error } = await supabase.rpc('register_for_daily', { p_tournament_id: tournamentId });
  if (error) throw error;
}

export async function getRegistrationCounts(tournamentIds: string[]): Promise<Map<string, number>> {
  if (!tournamentIds.length) return new Map();
  const { data, error } = await supabase.rpc('get_registration_counts', {
    p_tournament_ids: tournamentIds,
  });
  if (error) throw error;
  const map = new Map<string, number>();
  for (const row of (data ?? []) as { tournamentId: string; count: number }[]) {
    map.set(row.tournamentId, Number(row.count));
  }
  return map;
}

export interface DailyMatchPlayer {
  id: string;
  name: string;
  lastName: string;
  position: string;
  skillLevel: string;
  avatarUrl?: string;
}

// Only players registered in the daily match can see the list (DB-enforced)
export async function getDailyMatchPlayers(tournamentId: string): Promise<DailyMatchPlayer[]> {
  const { data, error } = await supabase.rpc('get_daily_match_players', {
    p_tournament_id: tournamentId,
  });
  if (error) throw error;
  return (data ?? []) as DailyMatchPlayer[];
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
