import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, font, radius } from '../../theme/tokens';

interface GhostButtonProps {
  label: string;
  onPress?: () => void;
  full?: boolean;
  style?: ViewStyle;
}

export default function GhostButton({ label, onPress, full, style }: GhostButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.base, full && styles.full, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: colors.cream25,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  full: { alignSelf: 'stretch' },
  label: { fontFamily: font.sansBold, fontSize: 15, color: colors.cream70 },
});
