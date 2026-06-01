import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, font, radius, space } from '../../theme/tokens';

interface Stat {
  value: string | number;
  label: string;
}

interface StatTripleProps {
  stats: [Stat, Stat, Stat];
}

export default function StatTriple({ stats }: StatTripleProps) {
  return (
    <View style={styles.card}>
      {stats.map((stat, i) => (
        <React.Fragment key={stat.label}>
          {i > 0 && <View style={styles.divider} />}
          <View style={styles.col}>
            <Text style={styles.value}>{stat.value}</Text>
            <Text style={styles.label}>{stat.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
  },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  divider: { width: 1, backgroundColor: colors.hairline, marginVertical: 4 },
  value: { fontFamily: font.serifItalic, fontSize: 26, color: colors.cream },
  label: {
    fontFamily: font.sansBold,
    fontSize: 9.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.gray500,
  },
});
