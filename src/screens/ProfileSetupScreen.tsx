import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { UserPosition, PreferredFoot, SkillLevel } from '../types';
import CreamButton from '../components/ui/CreamButton';
import { colors, font, space, radius } from '../theme/tokens';

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
  name: '', lastName: '', age: '', country: '', city: '',
  position: '', foot: '', height: '', skillLevel: '', favoriteTeam: '',
};

export default function ProfileSetupScreen() {
  const { t } = useTranslation();
  const { session, setProfileComplete } = useAuth();

  const schema = Yup.object({
    name: Yup.string().required(t('errors.required')),
    lastName: Yup.string().required(t('errors.required')),
    age: Yup.number().typeError(t('errors.mustBeNumber')).min(10, t('errors.ageMin')).max(80, t('errors.ageMax')).required(t('errors.required')),
    country: Yup.string().required(t('errors.required')),
    city: Yup.string().required(t('errors.required')),
    position: Yup.string().required(t('errors.required')),
    foot: Yup.string().required(t('errors.required')),
    height: Yup.number().typeError(t('errors.mustBeNumber')).min(100, t('errors.heightMin')).max(230, t('errors.heightMax')).required(t('errors.required')),
    skillLevel: Yup.string().required(t('errors.required')),
    favoriteTeam: Yup.string(),
  });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('profile.setup')}</Text>
            <Text style={styles.subtitle}>Cuéntanos quién eres en la cancha</Text>
          </View>

          <Formik
            initialValues={initialValues}
            validationSchema={schema}
            onSubmit={async (values, { setSubmitting, setStatus }) => {
              if (!session) { setStatus(t('common.error')); setSubmitting(false); return; }
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
              if (error) { setStatus(error.message); setSubmitting(false); return; }
              setProfileComplete(true);
            }}
          >
            {({ handleChange, handleBlur, handleSubmit, setFieldValue, values, errors, touched, isSubmitting, status }) => (
              <View style={styles.form}>
                {status ? <Text style={styles.apiError}>{status}</Text> : null}

                {/* Nombre y Apellido en fila */}
                <View style={styles.row2}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>{t('profile.name')}</Text>
                    <TextInput
                      style={[styles.input, touched.name && errors.name && styles.inputError]}
                      value={values.name}
                      onChangeText={handleChange('name')}
                      onBlur={handleBlur('name')}
                      placeholder="Juan"
                      placeholderTextColor={colors.cream45}
                      selectionColor={colors.cream}
                      keyboardAppearance="dark"
                    />
                    {touched.name && errors.name ? <Text style={styles.fieldError}>{errors.name}</Text> : null}
                  </View>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>{t('profile.lastName')}</Text>
                    <TextInput
                      style={[styles.input, touched.lastName && errors.lastName && styles.inputError]}
                      value={values.lastName}
                      onChangeText={handleChange('lastName')}
                      onBlur={handleBlur('lastName')}
                      placeholder="García"
                      placeholderTextColor={colors.cream45}
                      selectionColor={colors.cream}
                      keyboardAppearance="dark"
                    />
                    {touched.lastName && errors.lastName ? <Text style={styles.fieldError}>{errors.lastName}</Text> : null}
                  </View>
                </View>

                {/* Edad / Altura en fila */}
                <View style={styles.row2}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>{t('profile.age')}</Text>
                    <TextInput
                      style={[styles.input, touched.age && errors.age && styles.inputError]}
                      value={values.age}
                      onChangeText={handleChange('age')}
                      onBlur={handleBlur('age')}
                      keyboardType="numeric"
                      placeholder="25"
                      placeholderTextColor={colors.cream45}
                      selectionColor={colors.cream}
                      keyboardAppearance="dark"
                    />
                    {touched.age && errors.age ? <Text style={styles.fieldError}>{errors.age as string}</Text> : null}
                  </View>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>{t('profile.height')} (cm)</Text>
                    <TextInput
                      style={[styles.input, touched.height && errors.height && styles.inputError]}
                      value={values.height}
                      onChangeText={handleChange('height')}
                      onBlur={handleBlur('height')}
                      keyboardType="numeric"
                      placeholder="175"
                      placeholderTextColor={colors.cream45}
                      selectionColor={colors.cream}
                      keyboardAppearance="dark"
                    />
                    {touched.height && errors.height ? <Text style={styles.fieldError}>{errors.height as string}</Text> : null}
                  </View>
                </View>

                {/* País / Ciudad */}
                <View style={styles.row2}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>{t('profile.country')}</Text>
                    <TextInput
                      style={[styles.input, touched.country && errors.country && styles.inputError]}
                      value={values.country}
                      onChangeText={handleChange('country')}
                      onBlur={handleBlur('country')}
                      placeholder="Colombia"
                      placeholderTextColor={colors.cream45}
                      selectionColor={colors.cream}
                      keyboardAppearance="dark"
                    />
                    {touched.country && errors.country ? <Text style={styles.fieldError}>{errors.country}</Text> : null}
                  </View>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>{t('profile.city')}</Text>
                    <TextInput
                      style={[styles.input, touched.city && errors.city && styles.inputError]}
                      value={values.city}
                      onChangeText={handleChange('city')}
                      onBlur={handleBlur('city')}
                      placeholder="Cali"
                      placeholderTextColor={colors.cream45}
                      selectionColor={colors.cream}
                      keyboardAppearance="dark"
                    />
                    {touched.city && errors.city ? <Text style={styles.fieldError}>{errors.city}</Text> : null}
                  </View>
                </View>

                {/* Posición */}
                <View style={styles.field}>
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
                  {touched.position && errors.position ? <Text style={styles.fieldError}>{errors.position as string}</Text> : null}
                </View>

                {/* Pie */}
                <View style={styles.field}>
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
                  {touched.foot && errors.foot ? <Text style={styles.fieldError}>{errors.foot as string}</Text> : null}
                </View>

                {/* Nivel */}
                <View style={styles.field}>
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
                  {touched.skillLevel && errors.skillLevel ? <Text style={styles.fieldError}>{errors.skillLevel as string}</Text> : null}
                </View>

                {/* Equipo favorito (opcional) */}
                <View style={styles.field}>
                  <Text style={styles.label}>
                    {t('profile.favoriteTeam')}{' '}
                    <Text style={styles.optional}>({t('common.optional')})</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={values.favoriteTeam}
                    onChangeText={handleChange('favoriteTeam')}
                    onBlur={handleBlur('favoriteTeam')}
                    placeholder="América de Cali, Nacional..."
                    placeholderTextColor={colors.cream45}
                    selectionColor={colors.cream}
                    keyboardAppearance="dark"
                  />
                </View>

                <CreamButton
                  label={t('common.done')}
                  full
                  loading={isSubmitting}
                  onPress={() => handleSubmit()}
                />
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
  content: { flexGrow: 1, padding: 24, paddingTop: 32, paddingBottom: 48 },

  header: { marginBottom: space.xl, gap: space.xs },
  title: { fontFamily: font.sansXBold, fontSize: 27, letterSpacing: -0.5, color: colors.cream },
  subtitle: { fontFamily: font.sans, fontSize: 15, color: colors.cream70 },

  form: { gap: space.lg },
  row2: { flexDirection: 'row', gap: space.md },
  field: { gap: space.xs },
  label: { fontFamily: font.sansBold, fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.cream70 },
  optional: { fontFamily: font.sans, color: colors.cream45, textTransform: 'none', letterSpacing: 0 },

  input: {
    backgroundColor: colors.surface1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: font.sans,
    fontSize: 15,
    color: colors.cream,
  },
  inputError: { borderColor: 'rgba(239,68,68,0.6)' },
  fieldError: { fontFamily: font.sans, fontSize: 11.5, color: '#EF4444' },
  apiError: { fontFamily: font.sans, fontSize: 13, color: '#EF4444', textAlign: 'center' },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface1,
  },
  chipSelected: { backgroundColor: colors.cream2, borderColor: colors.cream2 },
  chipText: { fontFamily: font.sans, fontSize: 12.5, color: colors.cream70 },
  chipTextSelected: { fontFamily: font.sansBold, color: colors.black },

  toggleRow: { flexDirection: 'row', gap: space.sm },
  toggleBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    backgroundColor: colors.surface1,
  },
  toggleBtnSelected: { backgroundColor: colors.cream2, borderColor: colors.cream2 },
  toggleText: { fontFamily: font.sans, fontSize: 13, color: colors.cream70 },
  toggleTextSelected: { fontFamily: font.sansBold, color: colors.black },
});
