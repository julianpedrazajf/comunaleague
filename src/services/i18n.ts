import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from '../locales/en.json';
import es from '../locales/es.json';

export const LANG_STORAGE_KEY = '@lang';

const deviceLanguage = getLocales()[0]?.languageCode ?? 'es';
const supportedLanguage = ['en', 'es'].includes(deviceLanguage) ? deviceLanguage : 'es';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: supportedLanguage,
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
});

export default i18n;
