import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, Users, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Chip from './Chip';
import Monogram from './Monogram';
import { colors, font, radius, space } from '../../theme/tokens';

type MatchStatus = 'upcoming' | 'live' | 'final';

interface Team {
  name: string;
  lastName?: string;
  score?: number;
  badgeUrl?: string | null;
}

interface CaptainAction {
  label: string;
  active: boolean;
  onPress: () => void;
}

interface MatchRowProps {
  homeTeam: Team;
  awayTeam: Team;
  date: string;
  time: string;
  location?: string;
  status: MatchStatus;
  label?: string;
  attendanceConfirmed?: boolean;
  captainAction?: CaptainAction;
  onViewPlayers?: () => void;
}

export default function MatchRow({ homeTeam, awayTeam, date, time, location, status, label, attendanceConfirmed, captainAction, onViewPlayers }: MatchRowProps) {
  const { t } = useTranslation();
  const chipVariant = status === 'live' ? 'live' : status === 'final' ? 'final' : 'default';
  const chipLabel = status === 'live' ? t('match.live') : status === 'final' ? t('match.final') : t('match.upcoming_chip');
  const scoreColor = status === 'live' ? colors.green : colors.cream;
  const hasScore = status === 'live' || status === 'final';

  return (
    <View style={styles.card}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.topRow}>
        <Text style={styles.dateText}>{time ? `${date} · ${time}` : date}</Text>
        <Chip label={chipLabel} variant={chipVariant} />
      </View>

      <View style={styles.teamsRow}>
        <View style={styles.teamCol}>
          <Monogram name={homeTeam.name} lastName={homeTeam.lastName} size={40} shape="square" imageUri={homeTeam.badgeUrl} />
          <Text style={styles.teamName} numberOfLines={1}>{homeTeam.name}</Text>
        </View>

        <View style={styles.scoreCol}>
          {hasScore ? (
            <Text style={[styles.score, { color: scoreColor }]}>
              {homeTeam.score ?? 0} – {awayTeam.score ?? 0}
            </Text>
          ) : (
            <Text style={styles.vs}>vs</Text>
          )}
        </View>

        <View style={styles.teamCol}>
          <Monogram name={awayTeam.name} lastName={awayTeam.lastName} size={40} shape="square" imageUri={awayTeam.badgeUrl} />
          <Text style={styles.teamName} numberOfLines={1}>{awayTeam.name}</Text>
        </View>
      </View>

      {location && (
        <View style={styles.locationRow}>
          <MapPin size={11} color={colors.gray500} strokeWidth={2} />
          <Text style={styles.locationText}>{location}</Text>
        </View>
      )}

      {attendanceConfirmed !== undefined && (
        <View style={styles.attendanceRow}>
          <View style={[styles.attendanceDot, attendanceConfirmed ? styles.dotGreen : styles.dotGray]} />
          <Text style={[styles.attendanceText, attendanceConfirmed ? styles.textGreen : styles.textGray]}>
            {attendanceConfirmed ? t('team.confirmed') : t('team.pending')}
          </Text>
        </View>
      )}

      {captainAction && (
        <>
          <View style={styles.hairline} />
          <TouchableOpacity
            style={[styles.captainBtn, captainAction.active && styles.captainBtnActive]}
            onPress={captainAction.onPress}
            activeOpacity={0.75}
          >
            <Text style={[styles.captainBtnText, captainAction.active && styles.captainBtnTextActive]}>
              {captainAction.label}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {onViewPlayers && (
        <>
          <View style={styles.hairline} />
          <TouchableOpacity style={styles.viewPlayersRow} onPress={onViewPlayers} activeOpacity={0.7}>
            <Users size={12} color={colors.cream45} strokeWidth={2} />
            <Text style={styles.viewPlayersText}>{t('dailyplayers.viewPlayers')}</Text>
            <ChevronRight size={13} color={colors.cream45} strokeWidth={2} />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.md,
  },
  label: { fontFamily: font.sansBold, fontSize: 9.5, letterSpacing: 0.8, color: '#F2B366', textTransform: 'uppercase' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontFamily: font.sansBold, fontSize: 10, letterSpacing: 0.8, color: colors.cream70, textTransform: 'uppercase' },
  teamsRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  teamCol: { flex: 1, alignItems: 'center', gap: space.xs },
  teamName: { fontFamily: font.sansBold, fontSize: 12, color: colors.cream70, textAlign: 'center' },
  scoreCol: { alignItems: 'center', minWidth: 60 },
  score: { fontFamily: font.serifItalic, fontSize: 26 },
  vs: { fontFamily: font.serifItalic, fontSize: 18, color: colors.cream45 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontFamily: font.sans, fontSize: 11.5, color: colors.gray500 },
  attendanceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  attendanceDot: { width: 6, height: 6, borderRadius: 3 },
  dotGreen: { backgroundColor: colors.green },
  dotGray: { backgroundColor: colors.gray500 },
  attendanceText: { fontFamily: font.sans, fontSize: 12 },
  textGreen: { color: colors.green },
  textGray: { color: colors.gray500 },
  hairline: { height: 1, backgroundColor: colors.hairline },
  captainBtn: {
    borderRadius: radius.card,
    paddingVertical: space.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  captainBtnActive: {
    backgroundColor: 'rgba(242,179,102,0.10)',
    borderColor: 'rgba(242,179,102,0.40)',
  },
  captainBtnText: {
    fontFamily: font.sansBold,
    fontSize: 13,
    color: colors.cream70,
  },
  captainBtnTextActive: {
    color: '#F2B366',
  },
  viewPlayersRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  viewPlayersText: { fontFamily: font.sansBold, fontSize: 12, color: colors.cream45 },
});
