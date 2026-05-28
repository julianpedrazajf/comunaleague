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
import { useTranslation } from 'react-i18next';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { colors, spacing, fontSizes } from '../utils/theme';
import { UserPosition, PreferredFoot, SkillLevel } from '../types';

const POSITIONS: UserPosition[] = [
  'goalkeeper',
  'center_back', 'right_back', 'left_back',
  'defensive_midfielder', 'central_midfielder', 'attacking_midfielder',
  'right_winger', 'left_winger',
  'striker', 'second_striker',
];

const FEET: PreferredFoot[] = ['left', 'right', 'both'];
const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];

type FormValues = {
  name: string;
  lastName: string;
  age: string;
  country: string;
  city: string;
  position: UserPosition | '';
  foot: PreferredFoot | '';
  height: string;
  skillLevel: SkillLevel | '';
  favoriteTeam: string;
};

const initialValues: FormValues = {
  name: '',
  lastName: '',
  age: '',
  country: '',
  city: '',
  position: '',
  foot: '',
  height: '',
  skillLevel: '',
  favoriteTeam: '',
};

export default function ProfileSetupScreen() {
  const { t } = useTranslation();
  const { session, setProfileComplete } = useAuth();

  const schema = Yup.object({
    name: Yup.string().required(t('errors.required')),
    lastName: Yup.string().required(t('errors.required')),
    age: Yup.number()
      .typeError(t('errors.mustBeNumber'))
      .min(10, t('errors.ageMin'))
      .max(80, t('errors.ageMax'))
      .required(t('errors.required')),
    country: Yup.string().required(t('errors.required')),
    city: Yup.string().required(t('errors.required')),
    position: Yup.string().required(t('errors.required')),
    foot: Yup.string().required(t('errors.required')),
    height: Yup.number()
      .typeError(t('errors.mustBeNumber'))
      .min(100, t('errors.heightMin'))
      .max(230, t('errors.heightMax'))
      .required(t('errors.required')),
    skillLevel: Yup.string().required(t('errors.required')),
    favoriteTeam: Yup.string(),
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
        <Text style={styles.title}>{t('profile.setup')}</Text>
        <Text style={styles.subtitle}>
          {t('guest.loginPrompt')}
        </Text>

        <Formik
          initialValues={initialValues}
          validationSchema={schema}
          onSubmit={async (values, { setSubmitting, setStatus }) => {
            if (!session) {
              setStatus(t('common.error'));
              setSubmitting(false);
              return;
            }
            const { error } = await supabase.from('users').upsert({
              id: session.user.id,
              email: session.user.email,
              name: values.name,
              lastName: values.lastName,
              age: Number(values.age),
              country: values.country,
              city: values.city,
              position: values.position,
              foot: values.foot,
              height: Number(values.height),
              skillLevel: values.skillLevel,
              favoriteTeam: values.favoriteTeam || null,
              createdAt: new Date().toISOString(),
            });
            if (error) {
              setStatus(error.message);
              setSubmitting(false);
              return;
            }
            setProfileComplete(true);
          }}
        >
          {({ handleChange, handleBlur, handleSubmit, setFieldValue, values, errors, touched, isSubmitting, status }) => (
            <View>
              {status ? <Text style={styles.apiError}>{status}</Text> : null}

              {/* Name */}
              <Text style={styles.label}>{t('profile.name')}</Text>
              <TextInput
                style={[styles.input, touched.name && errors.name ? styles.inputError : null]}
                value={values.name}
                onChangeText={handleChange('name')}
                onBlur={handleBlur('name')}
                placeholder={t('profile.name')}
                placeholderTextColor={colors.gray}
              />
              {touched.name && errors.name ? <Text style={styles.fieldError}>{errors.name}</Text> : null}

              {/* Last Name */}
              <Text style={styles.label}>{t('profile.lastName')}</Text>
              <TextInput
                style={[styles.input, touched.lastName && errors.lastName ? styles.inputError : null]}
                value={values.lastName}
                onChangeText={handleChange('lastName')}
                onBlur={handleBlur('lastName')}
                placeholder={t('profile.lastName')}
                placeholderTextColor={colors.gray}
              />
              {touched.lastName && errors.lastName ? <Text style={styles.fieldError}>{errors.lastName}</Text> : null}

              {/* Age */}
              <Text style={styles.label}>{t('profile.age')}</Text>
              <TextInput
                style={[styles.input, touched.age && errors.age ? styles.inputError : null]}
                value={values.age}
                onChangeText={handleChange('age')}
                onBlur={handleBlur('age')}
                keyboardType="numeric"
                placeholder="25"
                placeholderTextColor={colors.gray}
              />
              {touched.age && errors.age ? <Text style={styles.fieldError}>{errors.age as string}</Text> : null}

              {/* Country */}
              <Text style={styles.label}>{t('profile.country')}</Text>
              <TextInput
                style={[styles.input, touched.country && errors.country ? styles.inputError : null]}
                value={values.country}
                onChangeText={handleChange('country')}
                onBlur={handleBlur('country')}
                placeholder="Colombia"
                placeholderTextColor={colors.gray}
              />
              {touched.country && errors.country ? <Text style={styles.fieldError}>{errors.country}</Text> : null}

              {/* City */}
              <Text style={styles.label}>{t('profile.city')}</Text>
              <TextInput
                style={[styles.input, touched.city && errors.city ? styles.inputError : null]}
                value={values.city}
                onChangeText={handleChange('city')}
                onBlur={handleBlur('city')}
                placeholder="Cali"
                placeholderTextColor={colors.gray}
              />
              {touched.city && errors.city ? <Text style={styles.fieldError}>{errors.city}</Text> : null}

              {/* Position */}
              <Text style={styles.label}>{t('profile.position')}</Text>
              <View style={styles.chipGrid}>
                {POSITIONS.map((pos) => (
                  <TouchableOpacity
                    key={pos}
                    style={[styles.chip, values.position === pos && styles.chipSelected]}
                    onPress={() => setFieldValue('position', pos)}
                  >
                    <Text style={[styles.chipText, values.position === pos && styles.chipTextSelected]}>
                      {t(`positions.${pos}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {touched.position && errors.position ? (
                <Text style={styles.fieldError}>{errors.position as string}</Text>
              ) : null}

              {/* Preferred Foot */}
              <Text style={styles.label}>{t('profile.foot')}</Text>
              <View style={styles.toggleRow}>
                {FEET.map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.toggleBtn, values.foot === f && styles.toggleBtnSelected]}
                    onPress={() => setFieldValue('foot', f)}
                  >
                    <Text style={[styles.toggleText, values.foot === f && styles.toggleTextSelected]}>
                      {t(`foot.${f}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {touched.foot && errors.foot ? (
                <Text style={styles.fieldError}>{errors.foot as string}</Text>
              ) : null}

              {/* Height */}
              <Text style={styles.label}>{t('profile.height')} (cm)</Text>
              <TextInput
                style={[styles.input, touched.height && errors.height ? styles.inputError : null]}
                value={values.height}
                onChangeText={handleChange('height')}
                onBlur={handleBlur('height')}
                keyboardType="numeric"
                placeholder="175"
                placeholderTextColor={colors.gray}
              />
              {touched.height && errors.height ? (
                <Text style={styles.fieldError}>{errors.height as string}</Text>
              ) : null}

              {/* Skill Level */}
              <Text style={styles.label}>{t('profile.skillLevel')}</Text>
              <View style={styles.toggleRow}>
                {SKILL_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[styles.toggleBtn, values.skillLevel === level && styles.toggleBtnSelected]}
                    onPress={() => setFieldValue('skillLevel', level)}
                  >
                    <Text style={[styles.toggleText, values.skillLevel === level && styles.toggleTextSelected]}>
                      {t(`skillLevel.${level}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {touched.skillLevel && errors.skillLevel ? (
                <Text style={styles.fieldError}>{errors.skillLevel as string}</Text>
              ) : null}

              {/* Favorite Team (optional) */}
              <Text style={styles.label}>
                {t('profile.favoriteTeam')}{' '}
                <Text style={styles.optionalTag}>({t('common.optional')})</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={values.favoriteTeam}
                onChangeText={handleChange('favoriteTeam')}
                onBlur={handleBlur('favoriteTeam')}
                placeholder="Nacional, America de Cali..."
                placeholderTextColor={colors.gray}
              />

              <TouchableOpacity
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
                onPress={() => handleSubmit()}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonText}>{t('common.done')}</Text>
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
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: colors.darkGray,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.gray,
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSizes.sm,
    color: colors.darkGray,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  optionalTag: {
    fontWeight: '400',
    color: colors.gray,
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
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.lightGray,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSizes.xs,
    color: colors.darkGray,
  },
  chipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.lightGray,
  },
  toggleBtnSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: {
    fontSize: fontSizes.sm,
    color: colors.darkGray,
  },
  toggleTextSelected: {
    color: colors.white,
    fontWeight: '600',
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
});
