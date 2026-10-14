// DFD 1.0 - Dedicated useLanguage hook for optimal Vite Fast Refresh
import { useContext } from 'react';
import { LanguageContext } from './LanguageContext';

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
