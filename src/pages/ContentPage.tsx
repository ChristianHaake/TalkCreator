import { useEffect, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import { useParams, Link } from 'react-router';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import styles from './ContentPage.module.css';
import { useTranslation } from '../i18n';
import type { Locale } from '../domain/types';
import { resolveContentPage } from './contentPages';

function ContentLink({ href, children, node: _node, ...props }: ComponentProps<'a'> & { node?: unknown }) {
  const { t } = useTranslation();
  const external = href?.startsWith('https://') || href?.startsWith('http://');
  return (
    <a {...props} href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
      {children}
      {external && <>
        <ExternalLink aria-hidden="true" className={styles.externalIcon} size={14} />
        <span className="visually-hidden">{t('content.opensNewTab')}</span>
      </>}
    </a>
  );
}

export function ContentPage() {
  const { pageId } = useParams<{ pageId: string }>();
  const { locale, t } = useTranslation();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : null,
  );
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

  useEffect(() => {
    if (!loading) (headingRef.current ?? articleRef.current)?.focus();
  }, [loading, pageId]);

  const restoreFocusAfterReturn = () => {
    const previousTarget = returnFocusRef.current;
    window.setTimeout(() => {
      if (previousTarget?.isConnected) previousTarget.focus();
      else document.getElementById('app-home-link')?.focus();
    }, 0);
  };

  return (
    <div className={styles.container}>
      <div className={styles.backLink}>
        <Link to="/" onClick={restoreFocusAfterReturn}>
          <ArrowLeft size={16} />
          {t("content.backToEditor")}
        </Link>
      </div>

      <article ref={articleRef} className={styles.article} lang={contentLanguage} tabIndex={-1}>
        {loading && <p>{t("content.loading")}</p>}
        {error && (
          <div>
            <h1 ref={headingRef} tabIndex={-1}>{t("content.notFoundTitle")}</h1>
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
            <ReactMarkdown components={{
              a: ContentLink,
              h1: ({ node: _node, ...props }) => <h1 {...props} ref={headingRef} tabIndex={-1} />,
            }}>{content}</ReactMarkdown>
          </>
        )}
      </article>
    </div>
  );
}
