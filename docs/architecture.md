# Architecture

## Product

- App: `TalkCreator`
- Live URL: `https://talkcreator.haak3.de` (rename pending; Cloudflare project still `interviewdesigner`)
- Repository: `https://github.com/ChristianHaake/InterviewCreator`
- Intended users: `Schülerinnen und Schüler, Lehrkräfte`

## Stack

- React 19 with TypeScript for the interactive editor and preview workflow.
- Vite builds the static application and PWA assets.
- React Router provides direct routes for the editor and bundled content pages.
- `idb-keyval` stores the autosaved interview project in IndexedDB.
- `@hello-pangea/dnd` provides pointer and keyboard drag-and-drop behavior.
- `lucide-react` provides interface icons.
- `react-markdown` renders bundled Markdown content without enabling raw HTML.

## Source structure

- `src/domain/`: project data types, schema constants, runtime validation, and legacy migration.
- `src/features/editor/`: project metadata, checklist, source, and question editing controls.
- `src/features/preview/`: printable interview preview.
- `src/shared/hooks/`: persistence and import/export hooks.
- `src/components/layout/`: app shell, header, footer, and navigation.
- `src/pages/`: editor home page and bundled Markdown content page.
- `src/i18n/`: static UI dictionaries and locale provider.
- `content/`: German source pages plus lazy-loaded EN, FR, ES, and NL Help/About translations.

## State

- In-memory state is owned by `useSessionPersistence` and passed into editor, preview, and storage hooks.
- Project autosave is stored in IndexedDB under `interview-creator-session`.
- Locale preference is stored in `localStorage` under `interview-creator-locale`.
- Current project schema version: `1`.
- Legacy migration accepts older `icebreakers`, `questions`, `question`, and `interviewee` fields and normalizes them to `phases`, `text`, and `partner`.
- Reset deletes the IndexedDB project entry and legacy localStorage entry before creating a fresh default project.

## Project files

- File extension: `.json`.
- Media type: `application/json`.
- Schema version: `schemaVersion: 1`.
- Import validates parsed JSON at runtime before replacing state.
- Unsupported future schema versions are rejected.
- Maximum project file size: 512 KiB.
- Maximum imported questions per phase: 100.
- Maximum checklist items: 100.
- Maximum sources: 50.
- Maximum text field length: 5000 characters.
- Failed imports preserve the current project.

## Network and privacy

- Core editing, autosave, import, export, and preview run in the browser.
- User-created interview content is not sent to an application backend.
- Production network destinations are limited to static app assets from the hosting origin plus user-initiated external links.
- Hosting-provider request metadata may be processed by Cloudflare Pages and must be described in the privacy page before release.

## Content localization

- Help and About are bundled in DE, EN, FR, ES, and NL and loaded lazily for the selected locale.
- Privacy and Imprint remain German pending operator-reviewed translations.
- Non-German legal routes identify the article as German and show a localized availability notice.

## Deployment

- Cloudflare Pages static assets.
- Build command: `npm run build`.
- Output directory: `dist`.
- SPA fallback: configured through `wrangler.jsonc` with `not_found_handling: single-page-application`.
- Security headers are defined in `public/_headers`.
- HTML and route fallbacks revalidate. Fingerprinted assets are cached immutably for one year.

## Decisions and exceptions

- Project export remains JSON rather than a custom extension for the current MVP.
- Markdown export is one-way and not an editable project import format.
- See `standard-conformance.md` for local standard status.
