import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { font } from '../../theme/tokens';

interface CoinIconProps {
  size?: number;
}

// Comuna Coin badge — a gold disc with a "C".
export default function CoinIcon({ size = 20 }: CoinIconProps) {
  return (
    <View
      style={[
        styles.coin,
        { width: size, height: size, borderRadius: size / 2, borderWidth: Math.max(1, size * 0.06) },
      ]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.55 }]}>C</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  coin: {
    backgroundColor: '#F2B366',
    borderColor: '#F25116',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontFamily: font.sansXBold,
    color: '#7A2E0E',
    lineHeight: undefined,
  },
});
