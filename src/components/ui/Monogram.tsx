import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, font, radius } from '../../theme/tokens';

interface MonogramProps {
  name: string;
  lastName?: string;
  size?: number;
  shape?: 'circle' | 'square';
}

export default function Monogram({ name, lastName, size = 48, shape = 'circle' }: MonogramProps) {
  const initials = `${name[0] ?? '?'}${lastName ? lastName[0] : ''}`.toUpperCase();
  const br = shape === 'circle' ? size / 2 : radius.cardSm;

  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: br },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.32 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.cream25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontFamily: font.sansXBold, color: colors.cream },
});
