import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const loginBg = require('../../assets/textures/login-bg.png');
const grain   = require('../../assets/textures/grain.png');
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { AuthStackParamList } from '../navigation/types';
import { supabase } from '../services/supabase';
import CreamButton from '../components/ui/CreamButton';
import { colors, font, space } from '../theme/tokens';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const initialValues = { email: '', password: '' };

export default function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const schema = Yup.object({
    email: Yup.string().email(t('errors.emailInvalid')).required(t('errors.required')),
    password: Yup.string().required(t('errors.required')),
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ImageBackground source={loginBg} style={styles.bg} resizeMode="cover">
        <View style={styles.scrim} pointerEvents="none" />
        <View style={styles.grainWrap} pointerEvents="none">
          <Image source={grain} style={styles.grain} resizeMode="repeat" />
        </View>
      </ImageBackground>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('auth.welcomeTitle')}</Text>
            <Text style={styles.subtitle}>{t('auth.welcomeSubtitle')}</Text>
          </View>

          <Formik
            initialValues={initialValues}
            validationSchema={schema}
            onSubmit={async (values, { setSubmitting, setStatus }) => {
              const { error } = await supabase.auth.signInWithPassword({
                email: values.email,
                password: values.password,
              });
              if (error) {
                setStatus(error.message);
                setSubmitting(false);
              }
            }}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting, status }) => (
              <View style={styles.form}>
                {status ? <Text style={styles.apiError}>{status}</Text> : null}

                <View style={styles.field}>
                  <Text style={styles.label}>{t('auth.email')}</Text>
                  <TextInput
                    style={[styles.input, touched.email && errors.email && styles.inputError]}
                    value={values.email}
                    onChangeText={handleChange('email')}
                    onBlur={handleBlur('email')}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    placeholder={t('auth.emailPlaceholder')}
                    placeholderTextColor={colors.cream45}
                    selectionColor={colors.cream}
                    keyboardAppearance="dark"
                  />
                  {touched.email && errors.email ? (
                    <Text style={styles.fieldError}>{errors.email}</Text>
                  ) : null}
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>{t('auth.password')}</Text>
                  <TextInput
                    style={[styles.input, touched.password && errors.password && styles.inputError]}
                    value={values.password}
                    onChangeText={handleChange('password')}
                    onBlur={handleBlur('password')}
                    secureTextEntry
                    placeholder="••••••••"
                    placeholderTextColor={colors.cream45}
                    selectionColor={colors.cream}
                    keyboardAppearance="dark"
                  />
                  {touched.password && errors.password ? (
                    <Text style={styles.fieldError}>{errors.password}</Text>
                  ) : null}
                </View>

                <TouchableOpacity style={styles.forgotRow}>
                  <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
                </TouchableOpacity>

                <CreamButton
                  label={t('auth.login')}
                  full
                  loading={isSubmitting}
                  onPress={() => handleSubmit()}
                />

                <TouchableOpacity
                  style={styles.registerRow}
                  onPress={() => navigation.navigate('Register')}
                >
                  <Text style={styles.registerText}>
                    {t('auth.noAccount')}{' '}
                    <Text style={styles.registerLink}>{t('auth.register')}</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Formik>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },

  bg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.72)' },
  grainWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  grain: { width: '100%', height: '100%', opacity: 0.07 },

  content: { flexGrow: 1, padding: 24, justifyContent: 'center' },

  header: { marginBottom: space.xl, gap: space.sm },
  title: { fontFamily: font.sansXBold, fontSize: 27, letterSpacing: -0.5, color: colors.cream },
  subtitle: { fontFamily: font.sans, fontSize: 15, color: colors.cream70 },

  form: { gap: space.lg },
  field: { gap: space.xs },
  label: { fontFamily: font.sansBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.cream70 },

  input: {
    backgroundColor: colors.surface1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: font.sans,
    fontSize: 15,
    color: colors.cream,
  },
  inputError: { borderColor: 'rgba(239,68,68,0.6)' },
  fieldError: { fontFamily: font.sans, fontSize: 12, color: '#EF4444' },
  apiError: { fontFamily: font.sans, fontSize: 13, color: '#EF4444', textAlign: 'center' },

  forgotRow: { alignSelf: 'flex-end', marginTop: -space.sm },
  forgotText: { fontFamily: font.sans, fontSize: 12.5, color: colors.cream45 },

  registerRow: { alignItems: 'center', marginTop: space.sm },
  registerText: { fontFamily: font.sans, fontSize: 13.5, color: colors.cream70 },
  registerLink: { fontFamily: font.sansBold, color: colors.cream },
});
