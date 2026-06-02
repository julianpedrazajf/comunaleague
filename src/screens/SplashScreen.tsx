import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { colors, font } from '../theme/tokens';

const grain = require('../../assets/textures/grain.png');

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => navigation.replace('GuestHome'), 2000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.grainWrap} pointerEvents="none">
        <Image source={grain} style={styles.grain} resizeMode="repeat" />
      </View>

      <View style={styles.lockup}>
        <Text style={styles.wordmark}>
          {'Comuna\nLeague'}
          <Text style={styles.asterisk}>*</Text>
        </Text>
        <Text style={styles.tagline}>el barrio juega en serio.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grainWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  grain: { width: '100%', height: '100%', opacity: 0.06 },

  lockup: { alignItems: 'center', gap: 14 },
  wordmark: {
    fontFamily: font.sansXBold,
    fontSize: 58,
    lineHeight: 52,
    letterSpacing: -2.9,
    color: colors.cream,
    textAlign: 'center',
  },
  asterisk: {
    fontFamily: font.serifItalic,
    fontSize: 52,
    color: colors.cream70,
  },
  tagline: {
    fontFamily: font.serifItalic,
    fontSize: 16,
    color: colors.cream45,
    letterSpacing: 0.2,
  },
});
