import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import CreamButton from '../components/ui/CreamButton';
import GhostButton from '../components/ui/GhostButton';
import { colors, font, space } from '../theme/tokens';

const loginBg = require('../../assets/textures/login-bg.png');
const grain   = require('../../assets/textures/grain.png');

type Props = NativeStackScreenProps<AuthStackParamList, 'GuestHome'>;

export default function GuestHomeScreen({ navigation }: Props) {
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
          <Text style={styles.title}>
            Comuna{'\n'}League<Text style={styles.asterisk}>*</Text>
          </Text>
          <Text style={styles.tagline}>el barrio juega en serio.</Text>
        </View>

        <View style={styles.actions}>
          <CreamButton
            label="Entrar"
            full
            onPress={() => navigation.navigate('Login')}
          />
          <GhostButton
            label="Continuar como invitado"
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
  title: {
    fontFamily: font.sansXBold,
    fontSize: 58,
    letterSpacing: -2.9,
    lineHeight: 56,
    color: colors.cream,
  },
  asterisk: {
    fontFamily: font.serifItalic,
    fontSize: 40,
    color: colors.cream2,
  },
  tagline: {
    fontFamily: font.serifItalic,
    fontSize: 18,
    color: colors.cream70,
    marginTop: space.sm,
  },

  actions: { gap: space.md },
});
