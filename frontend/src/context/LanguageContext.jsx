// DFD 1.0-9.0 - Multilingual Context Provider
import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

export const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem('civic_lang') || 'en');

  useEffect(() => {
    localStorage.setItem('civic_lang', lang);
  }, [lang]);

  const t = (key) => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export { useLanguage } from './useLanguage';
