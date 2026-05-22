'use client';

import { languages } from '@/lib/i18n';
import { useLanguage } from '@/components/LanguageProvider';
import styles from '@/app/market.module.css';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={styles.languageSwitcher}>
      {languages.map((item) => (
        <button
          key={item.code}
          type="button"
          onClick={() => setLanguage(item.code)}
          className={item.code === language ? styles.languageButtonActive : styles.languageButton}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
