import React from 'react';
import { StyleSheet, View, Image, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/tokens';

const grain = require('../../../assets/textures/grain.png');

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
}

export default function Screen({ children, style, noPadding }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.inner, !noPadding && styles.padded, style]}>
        {children}
        <View style={styles.grainWrap} pointerEvents="none">
          <Image source={grain} style={styles.grain} resizeMode="repeat" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },
  inner: { flex: 1, backgroundColor: colors.black },
  padded: { paddingHorizontal: 18, paddingBottom: 130 },
  grainWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999,
  },
  grain: {
    width: '100%',
    height: '100%',
    opacity: 0.06,
  },
});
