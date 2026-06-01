import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { createTeam } from '../services/teams';
import { RootStackParamList } from '../navigation/types';
import { TeamFormat } from '../types';
import { colors, spacing, fontSizes } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateTeam'>;

const FORMATS: TeamFormat[] = [5, 11];

type FormValues = {
  name: string;
  format: TeamFormat | null;
};

const initialValues: FormValues = { name: '', format: null };

export default function CreateTeamScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { session } = useAuth();

  const schema = Yup.object({
    name: Yup.string().required(t('errors.required')),
    format: Yup.number().required(t('errors.required')).nullable(),
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t('team.createTeam')}</Text>

        <Formik
          initialValues={initialValues}
          validationSchema={schema}
          onSubmit={async (values, { setSubmitting, setStatus }) => {
            if (!session || !values.format) return;
            try {
              await createTeam(values.name.trim(), values.format, session.user.id);
              navigation.goBack();
            } catch (e: any) {
              setStatus(e?.message ?? t('common.error'));
              setSubmitting(false);
            }
          }}
        >
          {({ handleChange, handleBlur, handleSubmit, setFieldValue, values, errors, touched, isSubmitting, status }) => (
            <View>
              {status ? <Text style={styles.apiError}>{status}</Text> : null}

              <Text style={styles.label}>{t('team.teamName')}</Text>
              <TextInput
                style={[styles.input, touched.name && errors.name ? styles.inputError : null]}
                value={values.name}
                onChangeText={handleChange('name')}
                onBlur={handleBlur('name')}
                placeholder="Los Caimanes FC"
                placeholderTextColor={colors.gray}
                autoCapitalize="words"
              />
              {touched.name && errors.name ? (
                <Text style={styles.fieldError}>{errors.name}</Text>
              ) : null}

              <Text style={styles.label}>{t('team.format')}</Text>
              <View style={styles.toggleRow}>
                {FORMATS.map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.toggleBtn, values.format === f && styles.toggleBtnSelected]}
                    onPress={() => setFieldValue('format', f)}
                  >
                    <Text style={[styles.toggleText, values.format === f && styles.toggleTextSelected]}>
                      {f === 5 ? t('team.format5') : t('team.format11')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {touched.format && errors.format ? (
                <Text style={styles.fieldError}>{errors.format as string}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
                onPress={() => handleSubmit()}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonText}>{t('team.createTeam')}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </Formik>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  closeBtn: { alignSelf: 'flex-end', padding: spacing.sm, marginBottom: spacing.sm },
  closeBtnText: { fontSize: fontSizes.lg, color: colors.gray },
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
  inputError: { borderColor: colors.primary },
  fieldError: { color: colors.primary, fontSize: fontSizes.xs, marginTop: spacing.xs },
  apiError: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.lightGray,
  },
  toggleBtnSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { fontSize: fontSizes.sm, color: colors.darkGray, fontWeight: '500' },
  toggleTextSelected: { color: colors.white, fontWeight: '600' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: colors.white, fontSize: fontSizes.md, fontWeight: 'bold' },
});
