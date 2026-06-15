import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { X, Trophy, Check } from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { getMyLeagueState, ensureProgression, clubMap, LeagueState } from '../services/league';
import { actualizarPuntajeAcumulado, resumenSerie, PartidoLiga, SerieEliminatoria } from '../utils/league';
import Monogram from '../components/ui/Monogram';
import SectionHeader from '../components/ui/SectionHeader';
import { colors, font, space, radius } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Tournaments'>;
type Tab = 'table' | 'fixtures' | 'playoffs';

const QUALIFY = 4; // clubs that advance to playoffs

export default function TournamentScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>('table');
  const [state, setState] = useState<LeagueState | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) {
      setState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let s = await getMyLeagueState(session.user.id);
      // Advance the league lazily, one phase at a time (bounded).
      if (s) {
        for (let i = 0; i < 4; i++) {
          let changed = false;
          try {
            changed = await ensureProgression(s);
          } catch {
            changed = false; // can't advance (e.g. precondition / permission) — just render
          }
          if (!changed) break;
          const next = await getMyLeagueState(session.user.id);
          if (!next) break;
          s = next;
        }
      }
      setState(s);
    } catch {
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const estado = state?.estado ?? null;
  const clubs = useMemo(() => (estado ? clubMap(estado) : new Map()), [estado]);
  const name = (id: string) => clubs.get(id)?.nombre ?? id;
  const badge = (id: string) => clubs.get(id)?.escudo;

  // PA snapshot that decided the final's host (regular + semis, not the final).
  const paSeeding = useMemo(
    () => (estado ? actualizarPuntajeAcumulado({ ...estado, final: null }) : {}),
    [estado],
  );

  const fechas = useMemo(() => {
    if (!estado) return [] as [number, PartidoLiga[]][];
    const map = new Map<number, PartidoLiga[]>();
    for (const p of estado.partidosLiga) {
      const arr = map.get(p.fecha) ?? [];
      arr.push(p);
      map.set(p.fecha, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [estado]);

  const statusLabel = (s: LeagueState['status']) => t(`league.status_${s}`);

  // ── Tabla de posiciones ─────────────────────────────────────────────────
  const renderTable = () => {
    if (!estado) return null;
    const showCut = estado.tabla.length > QUALIFY;
    return (
      <>
        {state?.status === 'filling' && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              {t('league.fillingNotice', { count: estado.clubes.length, max: state.maxClubs })}
            </Text>
          </View>
        )}
        <View style={styles.tableCard}>
          <View style={[styles.tableRow, styles.tableHeadRow]}>
            <Text style={[styles.cellPos, styles.headText]}>#</Text>
            <Text style={[styles.cellClub, styles.headText]}>{t('league.club')}</Text>
            <Text style={[styles.cellNum, styles.headText]}>{t('league.pj')}</Text>
            <Text style={[styles.cellNum, styles.headText]}>{t('league.dg')}</Text>
            <Text style={[styles.cellNum, styles.headText]}>{t('league.pts')}</Text>
          </View>

          {estado.tabla.map((fila, idx) => {
            const pos = idx + 1;
            const qualifies = pos <= QUALIFY;
            return (
              <View key={fila.clubId}>
                <View style={styles.tableRow}>
                  <View style={styles.cellPos}>
                    <Text style={[styles.posText, qualifies && styles.posTextQ]}>{pos}</Text>
                  </View>
                  <View style={[styles.cellClub, styles.clubCellInner]}>
                    <Monogram name={name(fila.clubId)} size={26} shape="square" imageUri={badge(fila.clubId)} />
                    <Text style={styles.clubName} numberOfLines={1}>{name(fila.clubId)}</Text>
                  </View>
                  <Text style={styles.cellNum}>{fila.pj}</Text>
                  <Text style={styles.cellNum}>{fila.dg > 0 ? `+${fila.dg}` : fila.dg}</Text>
                  <Text style={[styles.cellNum, styles.ptsText]}>{fila.pts}</Text>
                </View>
                {showCut && pos === QUALIFY && (
                  <View style={styles.cutLine}>
                    <Text style={styles.cutLabel}>{t('league.qualifyZone')}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </>
    );
  };

  // ── Fechas (fase regular) ───────────────────────────────────────────────
  const renderFixtures = () => {
    if (fechas.length === 0) {
      return <Text style={styles.notice}>{t('league.fixturesLocked')}</Text>;
    }
    return (
      <View style={{ gap: space.xl }}>
        {fechas.map(([fecha, partidos]) => (
          <View key={fecha} style={{ gap: space.sm }}>
            <SectionHeader label={t('league.fecha', { n: fecha })} />
            <View style={styles.fixtureCard}>
              {partidos.map((p, i) => (
                <View key={p.id} style={[styles.fixtureRow, i > 0 && styles.fixtureDivider]}>
                  <Text style={[styles.fixtureTeam, styles.fixtureHome]} numberOfLines={1}>
                    {name(p.localId)}
                  </Text>
                  <View style={styles.scoreBox}>
                    {p.jugado ? (
                      <>
                        <Text style={styles.scoreText}>{p.golesLocal}</Text>
                        <Text style={styles.scoreDash}>-</Text>
                        <Text style={styles.scoreText}>{p.golesVisitante}</Text>
                      </>
                    ) : (
                      <Text style={styles.scoreDash}>vs</Text>
                    )}
                  </View>
                  <Text style={[styles.fixtureTeam, styles.fixtureAway]} numberOfLines={1}>
                    {name(p.visitanteId)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  // ── Playoffs ────────────────────────────────────────────────────────────
  const renderSerie = (serie: SerieEliminatoria, llave?: string) => {
    const r = resumenSerie(serie);
    const isFinal = serie.ronda === 'final';
    const paA = paSeeding[serie.clubAId] ?? 0;
    const paB = paSeeding[serie.clubBId] ?? 0;

    const teamRow = (clubId: string, global: number, penales?: number) => {
      const isWinner = r.ganadorId === clubId;
      return (
        <View style={styles.serieTeamRow}>
          <Monogram name={name(clubId)} size={30} shape="square" imageUri={badge(clubId)} />
          <Text style={[styles.serieTeamName, isWinner && styles.serieWinnerName]} numberOfLines={1}>
            {name(clubId)}
          </Text>
          {isWinner && <Check size={14} color={colors.green} strokeWidth={2.5} />}
          {r.porPenales && penales != null && <Text style={styles.penText}>({penales})</Text>}
          <Text style={[styles.serieGlobal, isWinner && styles.serieGlobalWin]}>
            {r.completa ? global : '–'}
          </Text>
        </View>
      );
    };

    return (
      <View key={serie.id} style={styles.serieCard}>
        {llave && <Text style={styles.serieKey}>{llave}</Text>}
        {teamRow(serie.clubAId, r.golesA, serie.penales?.clubA)}
        {teamRow(serie.clubBId, r.golesB, serie.penales?.clubB)}

        <View style={styles.serieHairline} />

        <View style={styles.legRow}>
          <Text style={styles.legLabel}>{t('league.ida')}</Text>
          <Text style={styles.legText} numberOfLines={1}>
            {name(serie.ida.localId)} {legScore(serie.ida.golesLocal, serie.ida.golesVisitante)} {name(serie.ida.visitanteId)}
          </Text>
        </View>
        <View style={styles.legRow}>
          <Text style={styles.legLabel}>{t('league.vuelta')}</Text>
          <Text style={styles.legText} numberOfLines={1}>
            {name(serie.vuelta.localId)} {legScore(serie.vuelta.golesLocal, serie.vuelta.golesVisitante)} {name(serie.vuelta.visitanteId)}
          </Text>
        </View>
        {r.porPenales && (
          <Text style={styles.serieNote}>
            {t('league.penalties')}: {name(serie.clubAId)} {serie.penales?.clubA}-{serie.penales?.clubB} {name(serie.clubBId)}
          </Text>
        )}

        <Text style={styles.serieNote}>
          {t('league.closesHome', { club: name(serie.clubAId) })}
          {isFinal ? `  ·  ${t('league.pa')} ${name(serie.clubAId)} ${paA} / ${name(serie.clubBId)} ${paB}` : ''}
        </Text>
      </View>
    );
  };

  const renderPlayoffs = () => {
    if (!estado || estado.semifinales.length === 0) {
      return <Text style={styles.notice}>{t('league.playoffsLocked')}</Text>;
    }
    return (
      <View style={{ gap: space.xl }}>
        {estado.campeonId && (
          <View style={styles.championCard}>
            <Trophy size={26} color={colors.cream} strokeWidth={1.8} />
            <Text style={styles.championEyebrow}>{t('league.championOf')}</Text>
            <Text style={styles.championName}>{name(estado.campeonId)}</Text>
          </View>
        )}

        <Text style={styles.intro}>{t('league.playoffsIntro')}</Text>

        <View style={{ gap: space.md }}>
          <SectionHeader label={t('league.semifinals')} />
          {renderSerie(estado.semifinales[0], t('league.keyA'))}
          {estado.semifinales[1] && renderSerie(estado.semifinales[1], t('league.keyB'))}
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader label={t('league.finalRound')} />
          {estado.final ? renderSerie(estado.final) : (
            <Text style={styles.notice}>{t('league.finalLocked')}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('league.title')}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {state ? `${state.name} · ${statusLabel(state.status)}` : t('league.subtitle')}
          </Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <X size={20} color={colors.cream45} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.cream45} />
        </View>
      ) : !state ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{t('league.noTeam')}</Text>
        </View>
      ) : (
        <>
          <View style={styles.tabs}>
            {([
              { key: 'table', label: t('league.tabTable') },
              { key: 'fixtures', label: t('league.tabFixtures') },
              { key: 'playoffs', label: t('league.tabPlayoffs') },
            ] as const).map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.tabBtn, tab === key && styles.tabBtnActive]}
                onPress={() => setTab(key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {tab === 'table' && renderTable()}
            {tab === 'fixtures' && renderFixtures()}
            {tab === 'playoffs' && renderPlayoffs()}
            <View style={{ height: 40 }} />
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

function legScore(a: number | null, b: number | null): string {
  return a == null || b == null ? '–' : `${a}-${b}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontFamily: font.sans, fontSize: 15, color: colors.cream70, textAlign: 'center' },
  notice: { fontFamily: font.sans, fontSize: 13.5, color: colors.cream45, textAlign: 'center', paddingVertical: space.xl, lineHeight: 20 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: space.md,
    paddingBottom: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  headerText: { gap: 4, flex: 1 },
  title: { fontFamily: font.sansXBold, fontSize: 27, letterSpacing: -0.5, color: colors.cream },
  subtitle: { fontFamily: font.sans, fontSize: 13, color: colors.cream70 },
  closeBtn: { padding: 4, marginTop: 4 },

  tabs: {
    flexDirection: 'row',
    gap: space.xs,
    marginHorizontal: 18,
    marginTop: space.md,
    backgroundColor: colors.surface1,
    borderRadius: radius.pill,
    padding: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.pill },
  tabBtnActive: { backgroundColor: colors.cream2 },
  tabLabel: { fontFamily: font.sansBold, fontSize: 12.5, color: colors.cream45 },
  tabLabelActive: { color: colors.black },

  content: { padding: 18, paddingTop: space.lg },

  banner: {
    backgroundColor: 'rgba(242,179,102,0.12)',
    borderRadius: radius.cardSm,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    marginBottom: space.md,
  },
  bannerText: { fontFamily: font.sansBold, fontSize: 12.5, color: '#F2B366', textAlign: 'center' },

  // Tabla
  tableCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  tableHeadRow: { borderBottomWidth: 1, borderBottomColor: colors.hairline, paddingBottom: space.sm },
  headText: { fontFamily: font.sansBold, fontSize: 10, letterSpacing: 0.5, color: colors.cream45 },
  cellPos: { width: 26, alignItems: 'center' },
  cellClub: { flex: 1, paddingLeft: 2 },
  clubCellInner: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cellNum: { width: 38, textAlign: 'center', fontFamily: font.sans, fontSize: 13, color: colors.cream70 },
  posText: { fontFamily: font.sansBold, fontSize: 13, color: colors.cream45 },
  posTextQ: { color: colors.green },
  clubName: { fontFamily: font.sansBold, fontSize: 13.5, color: colors.cream, flex: 1 },
  ptsText: { fontFamily: font.sansXBold, color: colors.cream },
  cutLine: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34,197,94,0.35)',
    marginVertical: 2,
    paddingBottom: 4,
  },
  cutLabel: {
    fontFamily: font.sansBold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.green,
    textTransform: 'uppercase',
  },

  // Fechas
  fixtureCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    paddingHorizontal: space.lg,
  },
  fixtureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md },
  fixtureDivider: { borderTopWidth: 1, borderTopColor: colors.hairline },
  fixtureTeam: { flex: 1, fontFamily: font.sansBold, fontSize: 13, color: colors.cream70 },
  fixtureHome: { textAlign: 'right' },
  fixtureAway: { textAlign: 'left' },
  scoreBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, minWidth: 54, justifyContent: 'center' },
  scoreText: { fontFamily: font.sansXBold, fontSize: 15, color: colors.cream },
  scoreDash: { fontFamily: font.sans, fontSize: 12, color: colors.cream45 },

  // Playoffs
  championCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    padding: space.xl,
    alignItems: 'center',
    gap: space.xs,
    borderWidth: 1,
    borderColor: 'rgba(242,179,102,0.35)',
  },
  championEyebrow: {
    fontFamily: font.sansBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.cream45,
    textTransform: 'uppercase',
    marginTop: space.xs,
  },
  championName: { fontFamily: font.sansXBold, fontSize: 22, color: colors.cream, textAlign: 'center' },
  intro: { fontFamily: font.sans, fontSize: 12.5, color: colors.cream45, lineHeight: 18 },

  serieCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.sm,
  },
  serieKey: {
    fontFamily: font.sansBold,
    fontSize: 9.5,
    letterSpacing: 1,
    color: colors.cream45,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  serieTeamRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  serieTeamName: { flex: 1, fontFamily: font.sansBold, fontSize: 14, color: colors.cream70 },
  serieWinnerName: { color: colors.cream },
  serieGlobal: { fontFamily: font.sansXBold, fontSize: 17, color: colors.cream45, minWidth: 18, textAlign: 'center' },
  serieGlobalWin: { color: colors.cream },
  penText: { fontFamily: font.sansBold, fontSize: 11, color: colors.cream45 },
  serieHairline: { height: 1, backgroundColor: colors.hairline, marginVertical: 2 },
  legRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  legLabel: {
    width: 48,
    fontFamily: font.sansBold,
    fontSize: 9.5,
    letterSpacing: 0.5,
    color: colors.cream45,
    textTransform: 'uppercase',
  },
  legText: { flex: 1, fontFamily: font.sans, fontSize: 12, color: colors.cream70 },
  serieNote: { fontFamily: font.sans, fontSize: 11, color: colors.cream45, marginTop: 2 },
});
