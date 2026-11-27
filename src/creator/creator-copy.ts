export const creatorCopy = {
  de: { newTab: 'Öffnet in einem neuen Tab.', language: 'Sprache', moreApps: 'Weitere Apps', name: 'Deutsch' },
  en: { newTab: 'Opens in a new tab.', language: 'Language', moreApps: 'More apps', name: 'English' },
  fr: { newTab: 'S’ouvre dans un nouvel onglet.', language: 'Langue', moreApps: 'Autres applications', name: 'Français' },
  es: { newTab: 'Se abre en una pestaña nueva.', language: 'Idioma', moreApps: 'Más aplicaciones', name: 'Español' },
  nl: { newTab: 'Opent in een nieuw tabblad.', language: 'Taal', moreApps: 'Meer apps', name: 'Nederlands' },
} as const;

export type CreatorLocale = keyof typeof creatorCopy;

export function copyFor(locale: string) {
  const language = locale.toLowerCase().split('-')[0];
  return Object.prototype.hasOwnProperty.call(creatorCopy, language)
    ? creatorCopy[language as CreatorLocale]
    : creatorCopy.de;
}

export const appsDirectory = 'https://haak3.de/apps-fur-die-schule/';
