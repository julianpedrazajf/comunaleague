import { supabase } from './supabase';
import { Team, TeamFormat, User } from '../types';

type Member = Pick<User, 'id' | 'name' | 'lastName' | 'position' | 'skillLevel' | 'avatarUrl'>;

export async function getMyTeam(userId: string): Promise<Team | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .contains('playerIds', [userId])
    .limit(1);
  if (error) throw error;
  return (data?.[0] as Team) ?? null;
}

export async function getTeamMembers(playerIds: string[]): Promise<Member[]> {
  if (!playerIds.length) return [];
  const { data, error } = await supabase
    .from('users')
    .select('id, name, lastName, position, skillLevel, avatarUrl')
    .in('id', playerIds);
  if (error) throw error;
  return (data ?? []) as Member[];
}

// Creates the team and spends the coin cost atomically (server-side).
export async function createTeam(name: string, format: TeamFormat): Promise<void> {
  const { error } = await supabase.rpc('create_team', { p_name: name, p_format: format });
  if (error) throw error;
}

export async function isTeamCaptain(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('ownerId', userId);
  if (error) return false;
  return (count ?? 0) > 0;
}

export async function getTeamById(teamId: string): Promise<Team | null> {
  const { data, error } = await supabase.from('teams').select('*').eq('id', teamId).limit(1);
  if (error) throw error;
  return (data?.[0] as Team) ?? null;
}

export async function getAvailableTeams(userId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('createdAt', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Team[]).filter(
    (team) => !team.playerIds.includes(userId),
  );
}

export async function requestJoinTeam(teamId: string): Promise<void> {
  const { error } = await supabase.rpc('request_join_team', { team_id: teamId });
  if (error) throw error;
}

export async function getPendingJoinRequestTeamIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('team_join_requests')
    .select('teamId')
    .eq('userId', userId)
    .eq('status', 'pending');
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.teamId as string));
}

export async function leaveTeam(teamId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_team', { team_id: teamId });
  if (error) throw error;
}

export async function transferOwnership(teamId: string, newOwnerId: string): Promise<void> {
  const { error } = await supabase.rpc('transfer_ownership', { team_id: teamId, new_owner_id: newOwnerId });
  if (error) throw error;
}

export async function deleteTeam(teamId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_team', { team_id: teamId });
  if (error) throw error;
}

export async function updateTeamBadge(teamId: string, badgeUrl: string): Promise<void> {
  const { error } = await supabase.from('teams').update({ badgeUrl }).eq('id', teamId);
  if (error) throw error;
}
