'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Language, ui } from '@/lib/i18n';

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (typeof ui)[Language];
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export default function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    const saved = window.localStorage.getItem('ai2human-lang');
    if (saved === 'en' || saved === 'zh') {
      setLanguage(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('ai2human-lang', language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage, t: ui[language] }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
