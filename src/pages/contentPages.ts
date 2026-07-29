import type { Locale } from "../domain/types";

export const contentPageIds = ["hilfe", "ueber", "datenschutz", "impressum"] as const;

export type ContentPageId = (typeof contentPageIds)[number];

type ContentLoader = () => Promise<string>;

export type ResolvedContentPage = {
  isGermanFallback: boolean;
  language: Locale;
  load: ContentLoader;
  pageId: ContentPageId;
};

const markdownFiles = import.meta.glob("../../content/**/*.md", {
  query: "?raw",
  import: "default",
}) as Record<string, ContentLoader>;

const germanOnlyPageIds = new Set<ContentPageId>(["datenschutz", "impressum"]);

function isContentPageId(value: string | undefined): value is ContentPageId {
  return contentPageIds.includes(value as ContentPageId);
}

export function resolveContentPage(
  pageId: string | undefined,
  locale: Locale,
): ResolvedContentPage | undefined {
  if (!isContentPageId(pageId)) return undefined;

  const localizedPath =
    locale === "de"
      ? `../../content/${pageId}.md`
      : `../../content/${locale}/${pageId}.md`;
  const localizedLoader = markdownFiles[localizedPath];

  if (localizedLoader) {
    return {
      isGermanFallback: false,
      language: locale,
      load: localizedLoader,
      pageId,
    };
  }

  if (locale === "de" || !germanOnlyPageIds.has(pageId)) return undefined;

  const germanLoader = markdownFiles[`../../content/${pageId}.md`];
  if (!germanLoader) return undefined;

  return {
    isGermanFallback: true,
    language: "de",
    load: germanLoader,
    pageId,
  };
}
