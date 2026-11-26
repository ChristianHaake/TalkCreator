import { Link } from 'react-router';
import { Check } from 'lucide-react';
import styles from './Header.module.css';
import { useTranslation } from '../../i18n';
import type { Locale } from '../../domain/types';

export function Header() {
  const { t, locale, setLocale } = useTranslation();
  const localeNames: Record<Locale, string> = {
    de: 'Deutsch',
    en: 'English',
    fr: 'Français',
    es: 'Español',
    nl: 'Nederlands',
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <Link to="/" id="app-home-link" className={styles.logo}>
            <img
              src="/brand/talkcreator-logo-wide.png"
              alt={t("app.title")}
              className={styles.logoImage}
              width="680"
              height="298"
            />
          </Link>
          <span className={styles.tagline}>
            {t("app.metaDescription")}
          </span>
        </div>
        
        <div className={styles.controls}>
          <div className={styles.privacyIndicator} title={t("footer.localData")}>
            <Check size={16} aria-hidden="true" />
            <span>{t("footer.localDataShort")}</span>
          </div>
          
          <label className={styles.languageControl}>
            <span>{t("header.languageSelect")}</span>
            <select
              className={styles.languageSelect}
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
              aria-label={t("header.languageSelect")}
            >
              {(Object.keys(localeNames) as Locale[]).map((code) => (
                <option key={code} value={code}>{localeNames[code]}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </header>
  );
}
