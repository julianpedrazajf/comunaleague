import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { AuthStackParamList } from '../navigation/types';
import { colors, spacing, fontSizes } from '../utils/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.register')}</Text>
      {/* TODO: Formik form — email + password */}
      <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('ProfileSetup')}>
        <Text style={styles.linkText}>{t('common.continue')} →</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.linkText}>{t('auth.hasAccount')} {t('auth.login')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center' },
  title: { fontSize: fontSizes.xxl, fontWeight: 'bold', color: colors.darkGray, marginBottom: spacing.xl },
  link: { marginTop: spacing.md },
  linkText: { color: colors.primary, fontSize: fontSizes.sm, textAlign: 'center' },
});
