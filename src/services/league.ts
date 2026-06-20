/**
 * League data layer.
 *
 * Loads the league a user's team belongs to and maps the raw DB rows into the
 * engine's EstadoTorneo. All competition math (standings, seeding, PA, series
 * resolution) is the engine's job (src/utils/league.ts); this file only reads
 * rows and persists engine-generated fixtures/brackets back through RPCs.
 *
 * Progression is automatic and lazy: when a member opens the league screen,
 * ensureProgression() advances exactly one phase if the data allows it
 * (generate fixtures → seed semifinals → seed final → finish), then the caller
 * reloads. The RPCs are idempotent and validate preconditions server-side.
 */
import { supabase } from './supabase';
import { getMyTeam } from './teams';
import {
  Club,
  EstadoTorneo,
  PartidoLiga,
  SerieEliminatoria,
  actualizarPuntajeAcumulado,
  calcularTabla,
  generarCalendario,
  obtenerClasificados,
  resolverSerie,
  sembrarFinal,
  sembrarSemifinales,
} from '../utils/league';

export type LeagueStatus = 'filling' | 'regular' | 'playoffs' | 'finished';

export interface LeagueState {
  leagueId: string;
  name: string;
  status: LeagueStatus;
  maxClubs: number;
  estado: EstadoTorneo;
  // league_matches.id -> scheduled date/time (null until the admin sets it)
  schedule: Record<string, { date: string | null; time: string | null }>;
  // playoff leg "<seriesId>:<leg>" -> scheduled date/time (leg 0 = single-game final)
  playoffSchedule: Record<string, { date: string | null; time: string | null }>;
}

interface DBLeagueMatch {
  id: string;
  phase: 'regular' | 'semifinal' | 'final';
  matchday: number | null;
  seriesId: string | null;
  leg: number | null;
  date: string | null;
  time: string | null;
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  homePens: number | null;
  awayPens: number | null;
  played: boolean;
}

// ─── Load ─────────────────────────────────────────────────────────────────

/** The league the user's team belongs to, mapped into the engine state. */
export async function getMyLeagueState(userId: string): Promise<LeagueState | null> {
  const team = await getMyTeam(userId);
  if (!team) return null;

  const { data: membership, error: mErr } = await supabase
    .from('league_teams')
    .select('leagueId')
    .eq('teamId', team.id)
    .limit(1);
  if (mErr) throw mErr;
  const leagueId = membership?.[0]?.leagueId as string | undefined;
  if (!leagueId) return null;

  const [leagueRes, teamsRes, matchesRes] = await Promise.all([
    supabase.from('leagues').select('*').eq('id', leagueId).single(),
    supabase.from('league_teams').select('seed, team:teamId(id, name, badgeUrl)').eq('leagueId', leagueId),
    supabase.from('league_matches').select('*').eq('leagueId', leagueId),
  ]);
  if (leagueRes.error) throw leagueRes.error;
  if (teamsRes.error) throw teamsRes.error;
  if (matchesRes.error) throw matchesRes.error;

  const league = leagueRes.data as { id: string; name: string; status: LeagueStatus; maxClubs: number };

  // Clubs in stable random order (seed) → randomized but reproducible fixtures.
  const clubes: Club[] = (teamsRes.data ?? [])
    .slice()
    .sort((a: any, b: any) => a.seed - b.seed)
    .map((r: any) => ({ id: r.team.id, nombre: r.team.name, escudo: r.team.badgeUrl ?? undefined }));

  const rows = (matchesRes.data ?? []) as DBLeagueMatch[];

  const partidosLiga: PartidoLiga[] = rows
    .filter((m) => m.phase === 'regular')
    .map((m) => ({
      id: m.id,
      fecha: m.matchday ?? 0,
      localId: m.homeTeamId,
      visitanteId: m.awayTeamId,
      golesLocal: m.homeGoals,
      golesVisitante: m.awayGoals,
      jugado: m.played,
    }))
    .sort((a, b) => a.fecha - b.fecha);

  const series = buildSeries(rows.filter((m) => m.phase !== 'regular'));
  const semifinales = series
    .filter((s) => s.ronda === 'semifinal')
    .sort((a, b) => a.id.localeCompare(b.id));
  const final = series.find((s) => s.ronda === 'final') ?? null;

  const schedule: Record<string, { date: string | null; time: string | null }> = {};
  const playoffSchedule: Record<string, { date: string | null; time: string | null }> = {};
  for (const m of rows) {
    schedule[m.id] = { date: m.date ?? null, time: m.time ?? null };
    if (m.phase === 'semifinal' && m.seriesId) {
      playoffSchedule[`${m.seriesId}:${m.leg ?? 0}`] = { date: m.date ?? null, time: m.time ?? null };
    }
  }
  // Final: schedule comes from the same single row buildSeries uses, so the
  // date and the result never come from different legs.
  const finalRows = rows.filter((m) => m.phase === 'final' && m.seriesId);
  if (finalRows.length) {
    const fr = pickFinalRow(finalRows);
    playoffSchedule[`${fr.seriesId}:0`] = { date: fr.date ?? null, time: fr.time ?? null };
  }

  const tabla = calcularTabla(partidosLiga, clubes);
  const estado: EstadoTorneo = {
    clubes,
    partidosLiga,
    tabla,
    puntajeAcumulado: {},
    semifinales,
    final,
    campeonId: final ? resolverSerie(final) : null,
  };
  estado.puntajeAcumulado = actualizarPuntajeAcumulado(estado);

  return {
    leagueId: league.id,
    name: league.name,
    status: league.status,
    maxClubs: league.maxClubs,
    estado,
    schedule,
    playoffSchedule,
  };
}

// Single-match final: pick one row deterministically — the host's home leg
// (leg null for current data, or the 2nd leg of a legacy two-legged final), so
// the date and the result always come from the same match.
function pickFinalRow(legs: DBLeagueMatch[]): DBLeagueMatch {
  return legs.slice().sort((a, b) => (b.leg ?? 99) - (a.leg ?? 99))[0];
}

/** Group playoff leg rows into engine series. clubA hosts the 2nd leg. */
function buildSeries(rows: DBLeagueMatch[]): SerieEliminatoria[] {
  const bySeries = new Map<string, DBLeagueMatch[]>();
  for (const m of rows) {
    if (!m.seriesId) continue;
    const arr = bySeries.get(m.seriesId) ?? [];
    arr.push(m);
    bySeries.set(m.seriesId, arr);
  }

  const series: SerieEliminatoria[] = [];
  for (const [seriesId, legs] of bySeries) {
    // Final: single match (clubA hosts). Use one consistent row.
    if (legs.some((l) => l.phase === 'final')) {
      const row = pickFinalRow(legs);
      const serie: SerieEliminatoria = {
        id: seriesId,
        ronda: 'final',
        juegoUnico: true,
        clubAId: row.homeTeamId, // host
        clubBId: row.awayTeamId,
        ida: { localId: row.awayTeamId, visitanteId: row.homeTeamId, golesLocal: null, golesVisitante: null }, // unused
        vuelta: {
          localId: row.homeTeamId,
          visitanteId: row.awayTeamId,
          golesLocal: row.homeGoals,
          golesVisitante: row.awayGoals,
        },
        penales:
          row.homePens != null && row.awayPens != null
            ? { clubA: row.homePens, clubB: row.awayPens }
            : undefined,
        ganadorId: null,
      };
      serie.ganadorId = resolverSerie(serie);
      series.push(serie);
      continue;
    }

    // Semifinals: two legs.
    const ida = legs.find((l) => l.leg === 1);
    const vuelta = legs.find((l) => l.leg === 2);
    if (!ida || !vuelta) continue;

    const serie: SerieEliminatoria = {
      id: seriesId,
      ronda: 'semifinal',
      clubAId: vuelta.homeTeamId, // hosts the 2nd leg
      clubBId: ida.homeTeamId, // hosts the 1st leg
      ida: {
        localId: ida.homeTeamId,
        visitanteId: ida.awayTeamId,
        golesLocal: ida.homeGoals,
        golesVisitante: ida.awayGoals,
      },
      vuelta: {
        localId: vuelta.homeTeamId,
        visitanteId: vuelta.awayTeamId,
        golesLocal: vuelta.homeGoals,
        golesVisitante: vuelta.awayGoals,
      },
      penales:
        vuelta.homePens != null && vuelta.awayPens != null
          ? { clubA: vuelta.homePens, clubB: vuelta.awayPens }
          : undefined,
      ganadorId: null,
    };
    serie.ganadorId = resolverSerie(serie);
    series.push(serie);
  }
  return series;
}

// ─── Progression (automatic, lazy, idempotent) ──────────────────────────────

function serieToPayload(s: SerieEliminatoria) {
  return [
    { seriesId: s.id, leg: 1, homeTeamId: s.ida.localId, awayTeamId: s.ida.visitanteId },
    { seriesId: s.id, leg: 2, homeTeamId: s.vuelta.localId, awayTeamId: s.vuelta.visitanteId },
  ];
}

/**
 * Advances the league by at most one phase if the current data allows it.
 * Returns true if it changed anything (caller should reload).
 */
export async function ensureProgression(state: LeagueState): Promise<boolean> {
  const { leagueId, status, estado } = state;
  const { partidosLiga, semifinales, final, clubes, tabla } = estado;

  // 1. Season started but no fixtures yet → generate a random round-robin.
  if (status === 'regular' && partidosLiga.length === 0 && clubes.length >= 2) {
    const fixtures = generarCalendario(clubes, false); // clubes already in random seed order
    const payload = fixtures.map((f) => ({
      matchday: f.fecha,
      homeTeamId: f.localId,
      awayTeamId: f.visitanteId,
    }));
    await rpc('persist_regular_fixtures', { p_league_id: leagueId, p_matches: payload });
    return true;
  }

  const regularComplete = partidosLiga.length > 0 && partidosLiga.every((p) => p.jugado);

  // 2. Regular season complete → seed semifinals (top 4).
  if (regularComplete && semifinales.length === 0 && clubes.length >= 4) {
    const semis = sembrarSemifinales(obtenerClasificados(tabla, 4));
    const payload = semis.flatMap(serieToPayload);
    await rpc('persist_playoff_matches', {
      p_league_id: leagueId,
      p_phase: 'semifinal',
      p_matches: payload,
    });
    return true;
  }

  const semisComplete =
    semifinales.length === 2 && semifinales.every((s) => resolverSerie(s) !== null);

  // 3. Semifinals decided → seed the final (host decided by accumulated points).
  if (semisComplete && !final) {
    const paSeeding = actualizarPuntajeAcumulado({ ...estado, final: null });
    const ganadores: [string, string] = [
      resolverSerie(semifinales[0])!,
      resolverSerie(semifinales[1])!,
    ];
    const finalSerie = sembrarFinal(ganadores, paSeeding, tabla);
    // Single-match final: one row, hosted by clubA (higher accumulated points).
    await rpc('persist_playoff_matches', {
      p_league_id: leagueId,
      p_phase: 'final',
      p_matches: [
        { seriesId: finalSerie.id, leg: null, homeTeamId: finalSerie.clubAId, awayTeamId: finalSerie.clubBId },
      ],
    });
    return true;
  }

  // 4. Final decided → crown the champion.
  if (status !== 'finished' && final) {
    const champion = resolverSerie(final);
    if (champion) {
      await rpc('finish_league', { p_league_id: leagueId, p_champion_team_id: champion });
      return true;
    }
  }

  return false;
}

async function rpc(fn: string, args: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.rpc(fn, args);
  if (error) throw error;
}

// ─── My league matches (for the "My Matches" calendar) ───────────────────────

export interface LeagueMatchView {
  id: string;
  phase: 'regular' | 'semifinal' | 'final';
  matchday: number | null;
  seriesId: string | null;
  leg: number | null;
  date: string; // 'YYYY-MM-DD' — only scheduled matches are returned
  time: string | null; // 'HH:MM:SS'
  location: string | null;
  matchId: string | null; // mirror match row (drives the social/attendance layer)
  confirmedPlayerIds: string[]; // attendance, from the mirror match
  homeTeam: { id: string; name: string; badgeUrl?: string };
  awayTeam: { id: string; name: string; badgeUrl?: string };
  homeGoals: number | null;
  awayGoals: number | null;
  homePens: number | null;
  awayPens: number | null;
  played: boolean;
}

/**
 * Scheduled league matches the user's team plays (home or away), across the
 * whole season, so they can be browsed on the My Matches calendar. Matches the
 * admin hasn't scheduled yet (no date) are omitted.
 */
export async function getMyLeagueMatches(userId: string): Promise<LeagueMatchView[]> {
  const team = await getMyTeam(userId);
  if (!team) return [];

  const { data, error } = await supabase
    .from('league_matches')
    .select(
      'id, phase, matchday, seriesId, leg, date, time, location, homeGoals, awayGoals, homePens, awayPens, played, matchId, ' +
        'mirror:matchId(confirmedPlayerIds), ' +
        'homeTeam:homeTeamId(id, name, badgeUrl), awayTeam:awayTeamId(id, name, badgeUrl)',
    )
    .or(`homeTeamId.eq.${team.id},awayTeamId.eq.${team.id}`)
    .not('date', 'is', null)
    .order('date', { ascending: true })
    .order('time', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((m: any) => ({
    id: m.id,
    phase: m.phase,
    matchday: m.matchday,
    seriesId: m.seriesId,
    leg: m.leg,
    date: m.date,
    time: m.time,
    location: m.location,
    matchId: m.matchId ?? null,
    confirmedPlayerIds: (m.mirror?.confirmedPlayerIds ?? []) as string[],
    homeTeam: { id: m.homeTeam.id, name: m.homeTeam.name, badgeUrl: m.homeTeam.badgeUrl ?? undefined },
    awayTeam: { id: m.awayTeam.id, name: m.awayTeam.name, badgeUrl: m.awayTeam.badgeUrl ?? undefined },
    homeGoals: m.homeGoals,
    awayGoals: m.awayGoals,
    homePens: m.homePens ?? null,
    awayPens: m.awayPens ?? null,
    played: m.played,
  }));
}

/** Label for a league match, e.g. "League · Matchday 3" or "League · Semifinal · 1st leg". */
export function leagueMatchLabel(
  m: Pick<LeagueMatchView, 'phase' | 'matchday' | 'leg'>,
  t: (k: string, o?: Record<string, unknown>) => string,
): string {
  if (m.phase === 'regular') return `${t('match.leagueTag')} · ${t('league.fecha', { n: m.matchday })}`;
  // The final is a single match — no leg (ida/vuelta).
  if (m.phase === 'final') return `${t('match.leagueTag')} · ${t('league.finalRound')}`;
  const leg = m.leg === 1 ? t('league.ida') : m.leg === 2 ? t('league.vuelta') : '';
  return `${t('match.leagueTag')} · ${t('league.semifinalLabel')}${leg ? ` · ${leg}` : ''}`;
}

// ─── Result entry (admin / backend) ──────────────────────────────────────────

/**
 * Records a match result. Backed by an admin-only RPC, so this only succeeds
 * for a service-role / elevated caller (there is no in-app results UI).
 */
export async function setLeagueResult(
  matchId: string,
  homeGoals: number,
  awayGoals: number,
  homePens?: number,
  awayPens?: number,
): Promise<void> {
  await rpc('set_league_result', {
    p_match_id: matchId,
    p_home_goals: homeGoals,
    p_away_goals: awayGoals,
    p_home_pens: homePens ?? null,
    p_away_pens: awayPens ?? null,
  });
}

// ─── UI helper ──────────────────────────────────────────────────────────────

/** Map clubId → Club for resolving names/badges in the UI. */
export function clubMap(estado: EstadoTorneo): Map<string, Club> {
  return new Map(estado.clubes.map((c) => [c.id, c]));
}

export interface OpenTournament {
  id: string;
  name: string;
  barrio: string | null; // neighborhood (location), set by the admin
  teamCount: number;
  maxClubs: number;
}

/** Tournaments still accepting teams (status 'filling' with room), oldest first. */
export async function listOpenTournaments(): Promise<OpenTournament[]> {
  const { data, error } = await supabase
    .from('leagues')
    .select('id, name, barrio, maxClubs, createdAt, league_teams(count)')
    .eq('status', 'filling')
    .order('createdAt', { ascending: true });
  if (error) throw error;

  return (data ?? [])
    .map((l: any) => ({
      id: l.id,
      name: l.name,
      barrio: l.barrio ?? null,
      maxClubs: l.maxClubs,
      teamCount: l.league_teams?.[0]?.count ?? 0,
    }))
    .filter((l: OpenTournament) => l.teamCount < l.maxClubs);
}

/** Whether a team has already entered a tournament (is in a league). */
export async function isTeamInTournament(teamId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('league_teams')
    .select('teamId')
    .eq('teamId', teamId)
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
