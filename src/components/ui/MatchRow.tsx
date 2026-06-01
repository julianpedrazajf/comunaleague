import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin, Clock } from 'lucide-react-native';
import Chip from './Chip';
import Monogram from './Monogram';
import { colors, font, radius, space } from '../../theme/tokens';

type MatchStatus = 'upcoming' | 'live' | 'final';

interface Team {
  name: string;
  lastName?: string;
  score?: number;
}

interface MatchRowProps {
  homeTeam: Team;
  awayTeam: Team;
  date: string;
  time: string;
  location?: string;
  status: MatchStatus;
}

export default function MatchRow({ homeTeam, awayTeam, date, time, location, status }: MatchRowProps) {
  const chipVariant = status === 'live' ? 'live' : status === 'final' ? 'final' : 'default';
  const chipLabel = status === 'live' ? 'En vivo' : status === 'final' ? 'Final' : 'Próximo';
  const scoreColor = status === 'live' ? colors.green : colors.cream;
  const hasScore = status === 'live' || status === 'final';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.dateText}>{date} · {time}</Text>
        <Chip label={chipLabel} variant={chipVariant} />
      </View>

      <View style={styles.teamsRow}>
        <View style={styles.teamCol}>
          <Monogram name={homeTeam.name} lastName={homeTeam.lastName} size={40} />
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
          <Monogram name={awayTeam.name} lastName={awayTeam.lastName} size={40} />
          <Text style={styles.teamName} numberOfLines={1}>{awayTeam.name}</Text>
        </View>
      </View>

      {location && (
        <View style={styles.locationRow}>
          <MapPin size={11} color={colors.gray500} strokeWidth={2} />
          <Text style={styles.locationText}>{location}</Text>
        </View>
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
});
