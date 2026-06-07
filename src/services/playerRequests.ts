import { supabase } from './supabase';
import { PlayerRequest } from '../types';

export async function createPlayerRequest(teamId: string, matchId: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_player_request', { team_id: teamId, match_id: matchId });
  if (error) throw error;
  return data as string;
}

export async function cancelPlayerRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_player_request', { request_id: requestId });
  if (error) throw error;
}

export async function expressInterest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('express_interest', { request_id: requestId });
  if (error) throw error;
}

export async function getOpenPlayerRequests(): Promise<PlayerRequest[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('player_requests')
    .select('*, team:teams(name, badgeUrl, format), match:matches(date, time, location)')
    .eq('status', 'open')
    .order('createdAt', { ascending: false });
  if (error) throw error;
  // Only hide requests where the match is confirmed past; if join is null, still show
  return ((data ?? []) as PlayerRequest[]).filter((r) => !r.match || r.match.date >= today);
}

export async function getRequestInterests(requestId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('player_request_interests')
    .select('userId')
    .eq('requestId', requestId);
  if (error) throw error;
  return (data ?? []).map((r) => r.userId as string);
}

export async function getMyInterests(): Promise<string[]> {
  const { data, error } = await supabase
    .from('player_request_interests')
    .select('requestId');
  if (error) throw error;
  return (data ?? []).map((r) => r.requestId as string);
}

export async function getTeamOpenRequest(teamId: string, matchId: string): Promise<PlayerRequest | null> {
  const { data, error } = await supabase
    .from('player_requests')
    .select('*')
    .eq('teamId', teamId)
    .eq('matchId', matchId)
    .eq('status', 'open')
    .limit(1);
  if (error) throw error;
  return (data?.[0] as PlayerRequest) ?? null;
}
