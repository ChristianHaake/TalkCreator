import type { ReactNode } from 'react';
import { appsDirectory, copyFor } from './creator-copy';
import './creator.css';

export function MoreAppsLink({ locale }: { locale: string }) {
  return (
    <a className="creator-more-apps" aria-description={copyFor(locale).newTab} href={appsDirectory} target="_blank" rel="noopener noreferrer">
      {copyFor(locale).moreApps}
    </a>
  );
}

export interface CreatorFooterProps {
  locale: string;
  navigationLabel: string;
  identity: ReactNode;
  links: ReactNode;
  actions?: ReactNode;
  className?: string;
  innerClassName?: string;
  navClassName?: string;
}

export function CreatorFooter({
  locale, navigationLabel, identity, links, actions, className, innerClassName, navClassName,
}: CreatorFooterProps) {
  return (
    <footer className={className} data-creator-footer="">
      <div className={innerClassName} data-creator-footer-inner="">
        {identity}
        <nav aria-label={navigationLabel} className={navClassName}>{links}</nav>
        <MoreAppsLink locale={locale} />
        {actions}
      </div>
    </footer>
  );
}
