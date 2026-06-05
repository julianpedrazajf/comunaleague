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

export async function createTeam(
  name: string,
  format: TeamFormat,
  ownerId: string,
): Promise<void> {
  const { error } = await supabase.from('teams').insert({
    name,
    format,
    playerIds: [ownerId],
    ownerId,
    createdAt: new Date().toISOString(),
  });
  if (error) throw error;
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

export async function joinTeam(teamId: string): Promise<void> {
  const { error } = await supabase.rpc('join_team', { team_id: teamId });
  if (error) throw error;
}

export async function updateTeamBadge(teamId: string, badgeUrl: string): Promise<void> {
  const { error } = await supabase.from('teams').update({ badgeUrl }).eq('id', teamId);
  if (error) throw error;
}
