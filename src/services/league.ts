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
}

interface DBLeagueMatch {
  id: string;
  phase: 'regular' | 'semifinal' | 'final';
  matchday: number | null;
  seriesId: string | null;
  leg: number | null;
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
  };
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
    const ida = legs.find((l) => l.leg === 1);
    const vuelta = legs.find((l) => l.leg === 2);
    if (!ida || !vuelta) continue;

    const serie: SerieEliminatoria = {
      id: seriesId,
      ronda: ida.phase === 'final' ? 'final' : 'semifinal',
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
    await rpc('persist_playoff_matches', {
      p_league_id: leagueId,
      p_phase: 'final',
      p_matches: serieToPayload(finalSerie),
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
