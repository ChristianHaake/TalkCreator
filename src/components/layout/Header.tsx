import { CreatorHeader, CreatorLanguageMenu } from '../../creator/CreatorShell';
import { Link } from 'react-router';
import { Check } from 'lucide-react';
import styles from './Header.module.css';
import { useTranslation } from '../../i18n';

export function Header() {
  const { t, locale, setLocale } = useTranslation();
  return (
    <CreatorHeader className={styles.header}
      identity={
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

      } controls={
        <div className={styles.controls}>
          <div className={styles.privacyIndicator} title={t("footer.localData")}>
            <Check size={16} aria-hidden="true" />
            <span>{t("footer.localDataShort")}</span>
          </div>

          <CreatorLanguageMenu value={locale} onChange={setLocale}
            languages={['de', 'en', 'fr', 'es', 'nl']} label={t("header.languageSelect")}
            className={styles.languageControl} selectClassName={styles.languageSelect} />
        </div>
      }
    />
  );
}
