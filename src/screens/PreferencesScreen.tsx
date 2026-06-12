import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getFullProfile, updateUserPreferences } from '../services/users';
import { UserPosition, PreferredFoot, SkillLevel } from '../types';
import { RootStackParamList } from '../navigation/types';
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

type Props = NativeStackScreenProps<RootStackParamList, 'Preferences'>;

export default function PreferencesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { session } = useAuth();

  const [position, setPosition] = useState<UserPosition>('striker');
  const [foot, setFoot] = useState<PreferredFoot>('right');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('intermediate');
  const [favoriteTeam, setFavoriteTeam] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!session) return;
    setLoading(true);
    getFullProfile(session.user.id)
      .then((p) => {
        if (p) {
          setPosition(p.position);
          setFoot(p.foot);
          setSkillLevel(p.skillLevel);
          setFavoriteTeam(p.favoriteTeam ?? '');
        }
      })
      .finally(() => setLoading(false));
  }, [session]));

  const save = async () => {
    if (!session) return;
    setSaving(true);
    try {
      await updateUserPreferences(session.user.id, {
        position,
        foot,
        skillLevel,
        favoriteTeam: favoriteTeam.trim() || null,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.cream45} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.handle} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>{t('preferences.title')}</Text>

          {/* Position */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('profile.position')}</Text>
            <View style={styles.chipGrid}>
              {POSITIONS.map((pos) => (
                <TouchableOpacity
                  key={pos}
                  style={[styles.chip, position === pos && styles.chipSelected]}
                  onPress={() => setPosition(pos)}
                >
                  <Text style={[styles.chipText, position === pos && styles.chipTextSelected]}>
                    {t(`positions.${pos}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Foot */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('profile.foot')}</Text>
            <View style={styles.toggleRow}>
              {FEET.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.toggleBtn, foot === f && styles.toggleBtnSelected]}
                  onPress={() => setFoot(f)}
                >
                  <Text style={[styles.toggleText, foot === f && styles.toggleTextSelected]}>
                    {t(`foot.${f}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Skill Level */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('profile.skillLevel')}</Text>
            <View style={styles.toggleRow}>
              {SKILL_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.toggleBtn, skillLevel === level && styles.toggleBtnSelected]}
                  onPress={() => setSkillLevel(level)}
                >
                  <Text style={[styles.toggleText, skillLevel === level && styles.toggleTextSelected]}>
                    {t(`skillLevel.${level}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Favorite Team */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              {t('profile.favoriteTeam')}{' '}
              <Text style={styles.optional}>({t('common.optional')})</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={favoriteTeam}
              onChangeText={setFavoriteTeam}
              placeholder="América de Cali, Nacional..."
              placeholderTextColor={colors.cream45}
              selectionColor={colors.cream}
              keyboardAppearance="dark"
            />
          </View>

          <CreamButton label={t('common.save')} full loading={saving} onPress={save} />

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.hairline,
    alignSelf: 'center', marginTop: space.sm,
  },
  content: { padding: 18, paddingTop: space.md, gap: space.lg },
  pageTitle: {
    fontFamily: font.sansXBold, fontSize: 27,
    letterSpacing: -0.5, color: colors.cream,
    marginBottom: space.sm,
  },

  field: { gap: space.xs },
  fieldLabel: {
    fontFamily: font.sansBold, fontSize: 10.5,
    letterSpacing: 1.2, textTransform: 'uppercase', color: colors.cream70,
  },
  optional: { fontFamily: font.sans, color: colors.cream45, textTransform: 'none', letterSpacing: 0 },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface1,
  },
  chipSelected: { backgroundColor: colors.cream2, borderColor: colors.cream2 },
  chipText: { fontFamily: font.sans, fontSize: 12.5, color: colors.cream70 },
  chipTextSelected: { fontFamily: font.sansBold, color: colors.black },

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
  toggleText: { fontFamily: font.sans, fontSize: 13, color: colors.cream70 },
  toggleTextSelected: { fontFamily: font.sansBold, color: colors.black },

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
});
