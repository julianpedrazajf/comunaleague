import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Image } from 'react-native';
import SoccerBallIcon from '../components/ui/SoccerBallIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { AuthStackParamList } from '../navigation/types';
import CreamButton from '../components/ui/CreamButton';
import GhostButton from '../components/ui/GhostButton';
import { colors, font, space } from '../theme/tokens';

const loginBg = require('../../assets/textures/Night_Pitch_Dew_Bokeh.png');
const grain   = require('../../assets/textures/grain.png');

type Props = NativeStackScreenProps<AuthStackParamList, 'GuestHome'>;

export default function GuestHomeScreen({ navigation }: Props) {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Full-bleed background + scrim + grain */}
      <ImageBackground source={loginBg} style={styles.bg} resizeMode="cover">
        <View style={styles.scrim} pointerEvents="none" />
        <View style={styles.grainWrap} pointerEvents="none">
          <Image source={grain} style={styles.grain} resizeMode="repeat" />
        </View>
      </ImageBackground>

      {/* Content floats above */}
      <View style={styles.inner}>
        <View style={styles.lockup}>
          <View style={styles.wordmarkWrap}>
            <Text style={styles.title}>{'Comuna'}</Text>
            <View style={styles.leagueRow}>
              <Text style={styles.title}>{'League'}</Text>
              <SoccerBallIcon size={25} color={colors.cream2} />
            </View>
          </View>
          <Text style={styles.tagline}>pibes de barrio.</Text>
        </View>

        <View style={styles.actions}>
          <CreamButton
            label={t('guest.enter')}
            full
            onPress={() => navigation.navigate('Login')}
          />
          <GhostButton
            label={t('guest.continueAsGuest')}
            full
            onPress={() => navigation.navigate('Login')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },

  bg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  grainWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  grain: { width: '100%', height: '100%', opacity: 0.07 },

  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },

  lockup: { gap: space.lg },
  wordmarkWrap: { gap: -6 },
  leagueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: {
    fontFamily: font.sansXBold,
    fontSize: 58,
    letterSpacing: -2.9,
    lineHeight: 62,
    color: colors.cream,
  },
  tagline: {
    fontFamily: font.serifItalic,
    fontSize: 18,
    color: colors.cream70,
    marginTop: space.sm,
  },

  actions: { gap: space.md },
});
