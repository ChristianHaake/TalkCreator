import { CreatorFooter } from '../../creator/CreatorFooter';
import { Link } from 'react-router';
import { Coffee } from 'lucide-react';
import styles from './Footer.module.css';
import { useTranslation } from '../../i18n';

export function Footer() {
  const { t, locale } = useTranslation();

  return (
    <CreatorFooter className={styles.footer} innerClassName={styles.container}
      navClassName={styles.nav} locale={locale} navigationLabel={t("footer.navigation")}
      identity={<div><span className={styles.localNotice}>{t("footer.localData")}</span>
        <p className={styles.attribution}>{t("footer.madeBy")} <a href="https://haak3.de/">haak3</a></p>
      </div>}
      links={<>
            <Link to="/hilfe">{t("footer.help")}</Link>
            <Link to="/beispiele">{t("footer.examples")}</Link>
            <Link to="/ueber">{t("footer.about")}</Link>
            <Link to="/agb">{t("footer.terms")}</Link>
            <Link to="/datenschutz">{t("footer.privacy")}</Link>
            <Link to="/impressum">{t("footer.legal")}</Link>
      </>}
      actions={
          <div className={styles.footerActions}>
          <Link
            className={styles.coffeeLink}
            to="/unterstuetzung"
          >
            <Coffee aria-hidden="true" size={16} strokeWidth={2.5} />
            <span>{t("footer.support")}</span>
          </Link>
          
          <a
            aria-label={t("footer.repository")}
            className={styles.githubLink}
            href="https://github.com/ChristianHaake/TalkCreator"
            rel="noopener noreferrer"
            target="_blank"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
            <span aria-hidden="true" className={styles.githubTooltip}>{t("footer.repository")}</span>
          </a>
          </div>
      }
    />
  );
}
