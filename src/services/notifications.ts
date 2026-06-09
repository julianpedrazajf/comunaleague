import { supabase } from './supabase';
import { AppNotification } from '../types';
import { MatchWithTeams } from './matches';

export async function getUpcomingAcceptedMatches(): Promise<MatchWithTeams[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data: notifs, error: notifError } = await supabase
    .from('notifications')
    .select('relatedId')
    .eq('type', 'player_request_accepted');
  if (notifError || !notifs?.length) return [];
  const matchIds = (notifs ?? []).map((n) => n.relatedId as string).filter(Boolean);
  if (!matchIds.length) return [];
  const { data, error } = await supabase
    .from('matches')
    .select('*, homeTeam:homeTeamId(id, name, badgeUrl), awayTeam:awayTeamId(id, name, badgeUrl)')
    .in('id', matchIds)
    .gte('date', today)
    .order('date', { ascending: true })
    .order('time', { ascending: true });
  if (error || !data?.length) return [];
  const now = new Date();
  return (data as MatchWithTeams[]).filter((m) => new Date(`${m.date}T${m.time}`) > now);
}

export async function cleanupPastNotifications(): Promise<void> {
  await supabase.rpc('cleanup_my_notifications');
}

export async function getNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('createdAt', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

export async function getUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .or('read.eq.false,and(type.eq.player_request_interest,response.is.null)');
  if (error) throw error;
  return count ?? 0;
}

export async function markAllRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('read', false);
  if (error) throw error;
}

export async function getApplicationStatuses(): Promise<Map<string, 'accepted' | 'rejected'>> {
  const { data, error } = await supabase
    .from('notifications')
    .select('relatedId, type')
    .in('type', ['player_request_accepted', 'player_request_rejected']);
  if (error) throw error;
  const map = new Map<string, 'accepted' | 'rejected'>();
  for (const n of data ?? []) {
    if (n.relatedId) {
      map.set(n.relatedId as string, n.type === 'player_request_accepted' ? 'accepted' : 'rejected');
    }
  }
  return map;
}

export async function hasPendingApplicants(requestId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'player_request_interest')
    .eq('relatedId', requestId)
    .is('response', null);
  if (error) return false;
  return (count ?? 0) > 0;
}

export async function respondToInterest(notificationId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_to_interest', {
    p_notification_id: notificationId,
    p_accept: accept,
  });
  if (error) throw error;
}
