import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import CreamButton from '../components/ui/CreamButton';
import GhostButton from '../components/ui/GhostButton';
import { colors, font, space } from '../theme/tokens';

type Props = NativeStackScreenProps<AuthStackParamList, 'GuestHome'>;

const { width } = Dimensions.get('window');

export default function GuestHomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      {/* Radial glow — painted as a circle behind the lockup */}
      <View style={styles.glowContainer} pointerEvents="none">
        <View style={styles.glow} />
      </View>

      <View style={styles.inner}>
        {/* Lockup */}
        <View style={styles.lockup}>
          <Text style={styles.title}>
            Comuna{'\n'}League<Text style={styles.asterisk}>*</Text>
          </Text>
          <Text style={styles.tagline}>el barrio juega en serio.</Text>
        </View>

        {/* Actions */}
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

  glowContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: width * 0.8,
    alignItems: 'center',
    overflow: 'hidden',
  },
  glow: {
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: 'rgba(34,197,94,0.04)',
    position: 'absolute',
    bottom: -width * 0.5,
  },

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
