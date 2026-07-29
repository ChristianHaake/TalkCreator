import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft } from 'lucide-react';
import styles from './ContentPage.module.css';
import { useTranslation } from '../i18n';
import type { Locale } from '../domain/types';
import { resolveContentPage } from './contentPages';

export function ContentPage() {
  const { pageId } = useParams<{ pageId: string }>();
  const { locale, t } = useTranslation();
  const [content, setContent] = useState<string>('');
  const [contentLanguage, setContentLanguage] = useState<Locale>(locale);
  const [isGermanFallback, setIsGermanFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadContent = async () => {
      setLoading(true);
      setError(false);
      setIsGermanFallback(false);
      setContentLanguage(locale);

      const resolvedPage = resolveContentPage(pageId, locale);
      if (!resolvedPage) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const text = await resolvedPage.load();
        if (cancelled) return;
        setContent(text);
        setContentLanguage(resolvedPage.language);
        setIsGermanFallback(resolvedPage.isGermanFallback);
      } catch {
        if (cancelled) return;
        setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadContent();

    return () => {
      cancelled = true;
    };
  }, [locale, pageId]);

  return (
    <div className={styles.container}>
      <div className={styles.backLink}>
        <Link to="/">
          <ArrowLeft size={16} />
          {t("content.backToEditor")}
        </Link>
      </div>

      <article className={styles.article} lang={contentLanguage}>
        {loading && <p>{t("content.loading")}</p>}
        {error && (
          <div>
            <h1>{t("content.notFoundTitle")}</h1>
            <p>{t("content.notFoundBody")}</p>
          </div>
        )}
        {!loading && !error && (
          <>
            {isGermanFallback && (
              <p className={styles.languageNotice} lang={locale}>
                {t("content.germanOnlyNotice")}
              </p>
            )}
            <ReactMarkdown>{content}</ReactMarkdown>
          </>
        )}
      </article>
    </div>
  );
}
