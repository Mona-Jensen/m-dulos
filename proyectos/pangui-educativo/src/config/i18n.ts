import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translations from '../data/translations.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: translations },
      en: { translation: translations },
      map: { translation: translations }
    },
    lng: "es", // idioma inicial
    fallbackLng: "es",
    interpolation: { escapeValue: false }
  });

export default i18n;