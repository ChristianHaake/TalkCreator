import { Link } from 'react-router';
import { Check } from 'lucide-react';
import styles from './Header.module.css';
import { useTranslation } from '../../i18n';
import type { Locale } from '../../domain/types';

export function Header() {
  const { t, locale, setLocale } = useTranslation();
  const locales: Locale[] = ['de', 'en', 'fr', 'es', 'nl'];

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <Link to="/" className={styles.logo}>
            {t("app.title")}
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
          
          <div className={styles.languageSwitch} aria-label={t("header.languageSelect")}>
            {locales.map(l => (
              <button
                key={l}
                className={locale === l ? styles.activeLang : ''}
                onClick={() => setLocale(l)}
                type="button"
                aria-pressed={locale === l}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
