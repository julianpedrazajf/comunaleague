import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, font, space, radius } from '../../theme/tokens';

type ChipVariant = 'default' | 'live' | 'final';

interface ChipProps {
  label: string;
  variant?: ChipVariant;
}

export default function Chip({ label, variant = 'default' }: ChipProps) {
  return (
    <View style={[styles.base, styles[variant]]}>
      {variant === 'live' && <View style={styles.liveDot} />}
      <Text style={[styles.text, textStyles[variant]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.chip,
    alignSelf: 'flex-start',
  },
  default: { backgroundColor: 'rgba(222,219,200,0.08)' },
  live: { backgroundColor: 'rgba(34,197,94,0.14)' },
  final: { backgroundColor: 'rgba(222,219,200,0.05)' },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.green,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  text: { fontFamily: font.sansBold, fontSize: 10, letterSpacing: 0.5 },
});

const textStyles = StyleSheet.create({
  default: { color: colors.cream70 },
  live: { color: colors.green },
  final: { color: colors.gray400 },
});
