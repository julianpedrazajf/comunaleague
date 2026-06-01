import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { type, colors } from '../../theme/tokens';

interface EyebrowProps {
  children: React.ReactNode;
  dim?: boolean;
  style?: TextStyle;
}

export default function Eyebrow({ children, dim, style }: EyebrowProps) {
  return (
    <Text style={[styles.base, dim ? styles.dim : styles.normal, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { ...type.eyebrow },
  normal: { color: colors.cream70 },
  dim: { color: colors.cream45 },
});
