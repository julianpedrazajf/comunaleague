import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import SoccerBallIcon from '../components/ui/SoccerBallIcon';
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
        <View style={styles.wordmarkWrap}>
          <Text style={styles.wordmarkLine}>{'Comuna'}</Text>
          <View style={styles.leagueRow}>
            <Text style={styles.wordmarkLine}>{'League'}</Text>
            <SoccerBallIcon size={25} color={colors.cream70} />
          </View>
        </View>
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
  wordmarkWrap: { alignItems: 'center', gap: -6 },
  wordmarkLine: {
    fontFamily: font.sansXBold,
    fontSize: 58,
    lineHeight: 62,
    letterSpacing: -2.9,
    color: colors.cream,
    textAlign: 'center',
  },
  leagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagline: {
    fontFamily: font.serifItalic,
    fontSize: 16,
    color: colors.cream45,
    letterSpacing: 0.2,
  },
});
