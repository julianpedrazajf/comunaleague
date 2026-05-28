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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { AuthStackParamList } from '../navigation/types';
import { supabase } from '../services/supabase';
import { colors, spacing, fontSizes } from '../utils/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const initialValues = { email: '', password: '' };

export default function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const schema = Yup.object({
    email: Yup.string()
      .email(t('errors.emailInvalid'))
      .required(t('errors.required')),
    password: Yup.string().required(t('errors.required')),
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{t('auth.login')}</Text>

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
              return;
            }
            // RootNavigator detects the new session via onAuthStateChange and switches to AppTabs
          }}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting, status }) => (
            <View>
              {status ? <Text style={styles.apiError}>{status}</Text> : null}

              <Text style={styles.label}>{t('auth.email')}</Text>
              <TextInput
                style={[styles.input, touched.email && errors.email ? styles.inputError : null]}
                value={values.email}
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder={t('auth.email')}
                placeholderTextColor={colors.gray}
              />
              {touched.email && errors.email ? (
                <Text style={styles.fieldError}>{errors.email}</Text>
              ) : null}

              <Text style={styles.label}>{t('auth.password')}</Text>
              <TextInput
                style={[styles.input, touched.password && errors.password ? styles.inputError : null]}
                value={values.password}
                onChangeText={handleChange('password')}
                onBlur={handleBlur('password')}
                secureTextEntry
                placeholder={t('auth.password')}
                placeholderTextColor={colors.gray}
              />
              {touched.password && errors.password ? (
                <Text style={styles.fieldError}>{errors.password}</Text>
              ) : null}

              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
                onPress={() => handleSubmit()}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonText}>{t('auth.login')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.link}
                onPress={() => navigation.navigate('Register')}
              >
                <Text style={styles.linkText}>
                  {t('auth.noAccount')}{' '}
                  <Text style={styles.linkBold}>{t('auth.register')}</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Formik>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: colors.darkGray,
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSizes.sm,
    color: colors.darkGray,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fontSizes.md,
    color: colors.darkGray,
    backgroundColor: colors.lightGray,
  },
  inputError: {
    borderColor: colors.primary,
  },
  fieldError: {
    color: colors.primary,
    fontSize: fontSizes.xs,
    marginTop: spacing.xs,
  },
  apiError: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
  },
  forgotPasswordText: {
    color: colors.gray,
    fontSize: fontSizes.xs,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  link: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  linkText: {
    color: colors.gray,
    fontSize: fontSizes.sm,
  },
  linkBold: {
    color: colors.primary,
    fontWeight: '600',
  },
});
