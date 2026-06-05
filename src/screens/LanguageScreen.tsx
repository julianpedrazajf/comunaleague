import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Check } from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { LANG_STORAGE_KEY } from '../services/i18n';
import { colors, font, space, radius } from '../theme/tokens';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

type Props = NativeStackScreenProps<RootStackParamList, 'Language'>;

export default function LanguageScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const current = i18n.language;

  const select = async (code: string) => {
    await AsyncStorage.setItem(LANG_STORAGE_KEY, code);
    await i18n.changeLanguage(code);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.handle} />
      <View style={styles.navBar}>
        <Text style={styles.pageTitle}>{t('language.title')}</Text>
      </View>
      <View style={styles.card}>
        {LANGUAGES.map((lang, i) => (
          <View key={lang.code}>
            {i > 0 && <View style={styles.divider} />}
            <TouchableOpacity
              style={styles.row}
              onPress={() => select(lang.code)}
              activeOpacity={0.7}
            >
              <Text style={[styles.rowLabel, current === lang.code && styles.rowLabelActive]}>
                {lang.label}
              </Text>
              {current === lang.code && (
                <Check size={16} color={colors.cream} strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.hairline,
    alignSelf: 'center', marginTop: space.sm,
  },
  navBar: { paddingHorizontal: 18, paddingTop: space.md, paddingBottom: space.lg },
  pageTitle: { fontFamily: font.sansXBold, fontSize: 27, letterSpacing: -0.5, color: colors.cream },
  card: {
    marginHorizontal: 18,
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    paddingHorizontal: space.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  rowLabel: { fontFamily: font.sans, fontSize: 16, color: colors.cream70 },
  rowLabelActive: { fontFamily: font.sansBold, color: colors.cream },
  divider: { height: 1, backgroundColor: colors.hairline },
});
