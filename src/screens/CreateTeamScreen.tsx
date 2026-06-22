import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { X } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { createTeam } from '../services/teams';
import { RootStackParamList } from '../navigation/types';
import { TeamFormat } from '../types';
import CreamButton from '../components/ui/CreamButton';
import RegisterCta from '../components/ui/RegisterCta';
import { colors, font, space, radius } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateTeam'>;

const FORMATS: TeamFormat[] = [5];

type FormValues = { name: string; format: TeamFormat | null };
const initialValues: FormValues = { name: '', format: 5 };

export default function CreateTeamScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { session, isGuest } = useAuth();

  const schema = Yup.object({
    name: Yup.string().required(t('errors.required')),
    format: Yup.number().required(t('errors.required')).nullable(),
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{t('team.createTeam')}</Text>
              <Text style={styles.subtitle}>{t('team.createSubtitle')}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} hitSlop={12}>
              <X size={20} color={colors.cream45} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <Formik
            initialValues={initialValues}
            validationSchema={schema}
            onSubmit={async (values, { setSubmitting, setStatus }) => {
              if (!session || !values.format) { setSubmitting(false); return; }
              try {
                await createTeam(values.name.trim(), values.format);
                navigation.navigate('AppTabs');
              } catch (e: any) {
                setStatus(e?.message ?? t('common.error'));
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ handleChange, handleBlur, handleSubmit, setFieldValue, values, errors, touched, isSubmitting, status }) => (
              <View style={styles.form}>
                {status ? <Text style={styles.apiError}>{status}</Text> : null}

                <View style={styles.field}>
                  <Text style={styles.label}>{t('team.teamName')}</Text>
                  <TextInput
                    style={[styles.input, touched.name && errors.name && styles.inputError]}
                    value={values.name}
                    onChangeText={handleChange('name')}
                    onBlur={handleBlur('name')}
                    placeholder="Los Caimanes FC"
                    placeholderTextColor={colors.cream45}
                    selectionColor={colors.cream}
                    autoCapitalize="words"
                    keyboardAppearance="dark"
                  />
                  {touched.name && errors.name ? <Text style={styles.fieldError}>{errors.name}</Text> : null}
                </View>

                <View style={styles.field}>
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
                  {touched.format && errors.format ? <Text style={styles.fieldError}>{errors.format as string}</Text> : null}
                </View>

                {isGuest ? (
                  <RegisterCta prompt={false} style={{ paddingHorizontal: 0, paddingVertical: 0 }} />
                ) : (
                  <CreamButton
                    label={t('team.createTeam')}
                    full
                    loading={isSubmitting}
                    onPress={() => handleSubmit()}
                  />
                )}
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
  content: { flexGrow: 1, padding: 24, paddingTop: 28 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: space.xl,
  },
  headerText: { gap: 4 },
  title: { fontFamily: font.sansXBold, fontSize: 27, letterSpacing: -0.5, color: colors.cream },
  subtitle: { fontFamily: font.sans, fontSize: 13, color: colors.cream70 },
  closeBtn: { padding: 4, marginTop: 4 },

  form: { gap: space.lg },
  field: { gap: space.xs },
  label: { fontFamily: font.sansBold, fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.cream70 },

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
  fieldError: { fontFamily: font.sans, fontSize: 11.5, color: '#EF4444' },
  apiError: { fontFamily: font.sans, fontSize: 13, color: '#EF4444', textAlign: 'center' },
  priceNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  priceNoteText: { fontFamily: font.sans, fontSize: 12.5, color: colors.cream45 },

  toggleRow: { flexDirection: 'row', gap: space.md },
  toggleBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    backgroundColor: colors.surface1,
  },
  toggleBtnSelected: { backgroundColor: colors.cream2, borderColor: colors.cream2 },
  toggleText: { fontFamily: font.sans, fontSize: 14, color: colors.cream70 },
  toggleTextSelected: { fontFamily: font.sansBold, color: colors.black },
});
