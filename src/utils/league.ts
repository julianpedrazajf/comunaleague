/**
 * Motor de competición — Liga de 10 clubes (fase regular + playoffs).
 *
 * Implementa el formato inspirado en la Liga BetPlay DIMAYOR adaptado a 10
 * clubes: todos contra todos (solo ida) seguido de semifinales y final a ida y
 * vuelta, con la mecánica de "puntaje acumulado" para definir la localía.
 *
 * Este módulo es PURO (sin acceso a datos): recibe los resultados registrados y
 * deriva tabla, clasificados, siembras, puntaje acumulado y ganadores de forma
 * idempotente. La capa de datos vive en src/services/league.ts.
 */

// ─── Modelo de datos ──────────────────────────────────────────────────────────

export type Club = {
  id: string;
  nombre: string;
  escudo?: string;
  ciudad?: string;
};

// Fase regular
export type PartidoLiga = {
  id: string;
  fecha: number; // jornada (1–9 en solo ida)
  localId: string;
  visitanteId: string;
  golesLocal: number | null;
  golesVisitante: number | null;
  jugado: boolean;
};

export type FilaTabla = {
  clubId: string;
  pj: number; // partidos jugados
  pg: number; // ganados
  pe: number; // empatados
  pp: number; // perdidos
  gf: number; // goles a favor
  gc: number; // goles en contra
  dg: number; // diferencia de gol
  pts: number; // puntos
};

// Playoffs
export type Ronda = 'semifinal' | 'final';

export type Leg = {
  localId: string;
  visitanteId: string;
  golesLocal: number | null;
  golesVisitante: number | null;
};

export type SerieEliminatoria = {
  id: string;
  ronda: Ronda;
  clubAId: string; // mayor PA / mejor siembra → cierra de local (local en la VUELTA)
  clubBId: string; // local en la IDA
  ida: Leg; // ida.localId === clubBId
  vuelta: Leg; // vuelta.localId === clubAId
  penales?: { clubA: number; clubB: number };
  ganadorId: string | null;
};

export type EstadoTorneo = {
  clubes: Club[];
  partidosLiga: PartidoLiga[];
  tabla: FilaTabla[]; // derivada de partidosLiga
  puntajeAcumulado: Record<string, number>; // clubId -> PA
  semifinales: SerieEliminatoria[]; // 2 series
  final: SerieEliminatoria | null;
  campeonId: string | null;
};

const BYE = '__BYE__';

// ─── 1. Calendario (round-robin, método del círculo) ─────────────────────────

/**
 * Genera un calendario balanceado todos-contra-todos. En `idaYVuelta = false`
 * cada club juega una sola vez contra cada rival (9 fechas con 10 clubes).
 * Alterna la localía por jornada para repartirla de forma equilibrada.
 */
export function generarCalendario(clubes: Club[], idaYVuelta = false): PartidoLiga[] {
  const teams = clubes.map((c) => c.id);
  if (teams.length % 2 !== 0) teams.push(BYE);

  const n = teams.length;
  const half = n / 2;
  const fixed = teams[0];
  let rotating = teams.slice(1);

  const jornadas: [string, string][][] = [];
  for (let round = 0; round < n - 1; round++) {
    const arrangement = [fixed, ...rotating];
    const pares: [string, string][] = [];
    for (let i = 0; i < half; i++) {
      const a = arrangement[i];
      const b = arrangement[n - 1 - i];
      if (a === BYE || b === BYE) continue;
      // Alternar la localía según la jornada equilibra cuántas veces cada club
      // juega de local a lo largo del torneo.
      pares.push(round % 2 === 0 ? [a, b] : [b, a]);
    }
    jornadas.push(pares);
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }

  const partidos: PartidoLiga[] = [];
  let counter = 0;
  const pushJornada = (pares: [string, string][], fecha: number, invertir: boolean) => {
    for (const [local, visitante] of pares) {
      partidos.push({
        id: `L${++counter}`,
        fecha,
        localId: invertir ? visitante : local,
        visitanteId: invertir ? local : visitante,
        golesLocal: null,
        golesVisitante: null,
        jugado: false,
      });
    }
  };

  jornadas.forEach((pares, idx) => pushJornada(pares, idx + 1, false));
  if (idaYVuelta) {
    jornadas.forEach((pares, idx) => pushJornada(pares, jornadas.length + idx + 1, true));
  }
  return partidos;
}

// ─── 2. Tabla de posiciones + desempates ─────────────────────────────────────

/**
 * Puntos que x sumó frente a y en sus enfrentamientos directos, menos los de y.
 * Positivo → x va por delante. Usado como criterio de desempate (sección 3.5).
 */
function enfrentamientoDirecto(x: string, y: string, partidos: PartidoLiga[]): number {
  let px = 0;
  let py = 0;
  for (const p of partidos) {
    if (!p.jugado || p.golesLocal == null || p.golesVisitante == null) continue;
    const xy = p.localId === x && p.visitanteId === y;
    const yx = p.localId === y && p.visitanteId === x;
    if (!xy && !yx) continue;
    const gx = xy ? p.golesLocal : p.golesVisitante;
    const gy = xy ? p.golesVisitante : p.golesLocal;
    if (gx > gy) px += 3;
    else if (gx < gy) py += 3;
    else {
      px += 1;
      py += 1;
    }
  }
  return px - py;
}

/** Orden de desempate en cascada (sección 3). Devuelve <0 si `a` va antes que `b`. */
function compararFilas(a: FilaTabla, b: FilaTabla, partidos: PartidoLiga[]): number {
  if (b.pts !== a.pts) return b.pts - a.pts; // 1. más puntos
  if (b.dg !== a.dg) return b.dg - a.dg; // 2. mejor diferencia de gol
  if (b.gf !== a.gf) return b.gf - a.gf; // 3. más goles a favor
  if (a.gc !== b.gc) return a.gc - b.gc; // 4. menos goles en contra
  const h2h = enfrentamientoDirecto(b.clubId, a.clubId, partidos); // 5. enfrentamiento directo
  if (h2h !== 0) return h2h;
  return a.clubId < b.clubId ? -1 : a.clubId > b.clubId ? 1 : 0; // 6. sorteo (determinista)
}

/**
 * Calcula la tabla a partir de los resultados registrados, ya ordenada con los
 * desempates de la sección 3. Es idempotente: solo cuenta partidos jugados.
 * Pasar `clubes` garantiza una fila por club aunque aún no haya jugado.
 */
export function calcularTabla(partidos: PartidoLiga[], clubes?: Club[]): FilaTabla[] {
  const filas = new Map<string, FilaTabla>();
  const fila = (id: string): FilaTabla => {
    let f = filas.get(id);
    if (!f) {
      f = { clubId: id, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
      filas.set(id, f);
    }
    return f;
  };

  if (clubes) for (const c of clubes) fila(c.id);

  for (const p of partidos) {
    if (!p.jugado || p.golesLocal == null || p.golesVisitante == null) continue;
    const local = fila(p.localId);
    const visitante = fila(p.visitanteId);
    local.pj += 1;
    visitante.pj += 1;
    local.gf += p.golesLocal;
    local.gc += p.golesVisitante;
    visitante.gf += p.golesVisitante;
    visitante.gc += p.golesLocal;
    if (p.golesLocal > p.golesVisitante) {
      local.pg += 1;
      local.pts += 3;
      visitante.pp += 1;
    } else if (p.golesLocal < p.golesVisitante) {
      visitante.pg += 1;
      visitante.pts += 3;
      local.pp += 1;
    } else {
      local.pe += 1;
      visitante.pe += 1;
      local.pts += 1;
      visitante.pts += 1;
    }
  }

  for (const f of filas.values()) f.dg = f.gf - f.gc;
  return [...filas.values()].sort((a, b) => compararFilas(a, b, partidos));
}

// ─── 3. Clasificados ─────────────────────────────────────────────────────────

/** Los `n` primeros de la tabla (por defecto los 4 que avanzan a playoffs). */
export function obtenerClasificados(tabla: FilaTabla[], n = 4): string[] {
  return tabla.slice(0, n).map((f) => f.clubId);
}

// ─── 4. Siembra de series ────────────────────────────────────────────────────

function crearSerie(id: string, ronda: Ronda, clubA: string, clubB: string): SerieEliminatoria {
  // clubA cierra de local: juega la IDA de visitante y la VUELTA de local.
  return {
    id,
    ronda,
    clubAId: clubA,
    clubBId: clubB,
    ida: { localId: clubB, visitanteId: clubA, golesLocal: null, golesVisitante: null },
    vuelta: { localId: clubA, visitanteId: clubB, golesLocal: null, golesVisitante: null },
    ganadorId: null,
  };
}

/**
 * Semifinales sembradas 1v4 (Llave A) y 2v3 (Llave B). El mejor ubicado de cada
 * llave (1.º y 2.º) cierra de local.
 */
export function sembrarSemifinales(clasificados: string[]): SerieEliminatoria[] {
  const [c1, c2, c3, c4] = clasificados;
  return [
    crearSerie('SF-A', 'semifinal', c1, c4),
    crearSerie('SF-B', 'semifinal', c2, c3),
  ];
}

/**
 * Final sembrada por puntaje acumulado: cierra de local el finalista con mayor
 * PA. Empate de PA → mejor posición en la fase regular; si persiste, mejor DG.
 */
export function sembrarFinal(
  ganadores: [string, string],
  puntajeAcumulado: Record<string, number>,
  tabla: FilaTabla[],
): SerieEliminatoria {
  const [g1, g2] = ganadores;
  const pos = (id: string) => tabla.findIndex((f) => f.clubId === id);
  const dg = (id: string) => tabla.find((f) => f.clubId === id)?.dg ?? 0;

  const pa1 = puntajeAcumulado[g1] ?? 0;
  const pa2 = puntajeAcumulado[g2] ?? 0;

  let g2CierraLocal = false;
  if (pa2 > pa1) g2CierraLocal = true;
  else if (pa2 === pa1) {
    if (pos(g2) < pos(g1)) g2CierraLocal = true;
    else if (pos(g2) === pos(g1) && dg(g2) > dg(g1)) g2CierraLocal = true;
  }

  return g2CierraLocal
    ? crearSerie('FINAL', 'final', g2, g1)
    : crearSerie('FINAL', 'final', g1, g2);
}

// ─── 5. Puntaje acumulado (localía) ──────────────────────────────────────────

/**
 * Recalcula el PA de cada club de forma idempotente: parte de los puntos de la
 * fase regular y suma 3/1/0 por cada partido de playoff ya jugado (la ida y la
 * vuelta cuentan como dos partidos independientes).
 */
export function actualizarPuntajeAcumulado(estado: EstadoTorneo): Record<string, number> {
  const pa: Record<string, number> = {};
  for (const f of estado.tabla) pa[f.clubId] = f.pts;

  const series = [...estado.semifinales, ...(estado.final ? [estado.final] : [])];
  for (const serie of series) {
    for (const leg of [serie.ida, serie.vuelta]) {
      if (leg.golesLocal == null || leg.golesVisitante == null) continue;
      if (leg.golesLocal > leg.golesVisitante) pa[leg.localId] = (pa[leg.localId] ?? 0) + 3;
      else if (leg.golesLocal < leg.golesVisitante) pa[leg.visitanteId] = (pa[leg.visitanteId] ?? 0) + 3;
      else {
        pa[leg.localId] = (pa[leg.localId] ?? 0) + 1;
        pa[leg.visitanteId] = (pa[leg.visitanteId] ?? 0) + 1;
      }
    }
  }
  return pa;
}

// ─── 6. Resolución de series (ida y vuelta) ──────────────────────────────────

export interface ResumenSerie {
  golesA: number; // marcador global de clubA
  golesB: number; // marcador global de clubB
  ganadorId: string | null;
  porPenales: boolean;
  completa: boolean; // ambos partidos jugados
}

/**
 * Resume una serie: marcador global por club y ganador. Empate global se define
 * por penales (sin gol de visitante por defecto, como en el fútbol colombiano).
 */
export function resumenSerie(serie: SerieEliminatoria, golVisitante = false): ResumenSerie {
  const { ida, vuelta, clubAId, clubBId } = serie;
  const completa =
    ida.golesLocal != null &&
    ida.golesVisitante != null &&
    vuelta.golesLocal != null &&
    vuelta.golesVisitante != null;

  if (!completa) return { golesA: 0, golesB: 0, ganadorId: null, porPenales: false, completa: false };

  // clubB es local en la ida; clubA es local en la vuelta.
  const golesA = ida.golesVisitante! + vuelta.golesLocal!;
  const golesB = ida.golesLocal! + vuelta.golesVisitante!;

  if (golesA > golesB) return { golesA, golesB, ganadorId: clubAId, porPenales: false, completa: true };
  if (golesB > golesA) return { golesA, golesB, ganadorId: clubBId, porPenales: false, completa: true };

  // Empate global.
  if (golVisitante) {
    const visA = ida.golesVisitante!; // goles de clubA como visitante (ida)
    const visB = vuelta.golesVisitante!; // goles de clubB como visitante (vuelta)
    if (visA !== visB) {
      return { golesA, golesB, ganadorId: visA > visB ? clubAId : clubBId, porPenales: false, completa: true };
    }
  }

  if (serie.penales) {
    const { clubA, clubB } = serie.penales;
    const ganadorId = clubA > clubB ? clubAId : clubB > clubA ? clubBId : null;
    return { golesA, golesB, ganadorId, porPenales: true, completa: true };
  }

  return { golesA, golesB, ganadorId: null, porPenales: false, completa: true };
}

/** Ganador de una serie (global → penales). `null` si aún no se puede resolver. */
export function resolverSerie(serie: SerieEliminatoria, golVisitante = false): string | null {
  return resumenSerie(serie, golVisitante).ganadorId;
}
