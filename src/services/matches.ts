import { supabase } from './supabase';
import { Match } from '../types';

type TeamInfo = { id: string; name: string; badgeUrl?: string };
export type MatchWithTeams = Match & { homeTeam: TeamInfo; awayTeam: TeamInfo };

export async function confirmAttendance(matchId: string, attending: boolean): Promise<void> {
  const { error } = await supabase.rpc('confirm_attendance', { match_id: matchId, attending });
  if (error) throw error;
}

export async function getTeamMatches(teamId: string): Promise<MatchWithTeams[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('matches')
    .select('*, homeTeam:homeTeamId(id, name, badgeUrl), awayTeam:awayTeamId(id, name, badgeUrl)')
    .or(`homeTeamId.eq.${teamId},awayTeamId.eq.${teamId}`)
    .gte('date', today)
    .order('date', { ascending: true })
    .order('time', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MatchWithTeams[];
}
