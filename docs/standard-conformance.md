# haak3 Standard Conformance

Standard:
https://github.com/ChristianHaake/DEV-Memory/tree/main/standards/haak3-webapps

Standard version: `1.1.0-draft`

The current adoption uses the DEV-Memory copy of the standard.

Last reviewed: `2026-11-26`

## Exceptions

Rule: Required content pages should be available in the selected language.

Reason: The operator selected German as the authoritative language for all legal pages; unreviewed legal translations must not appear authoritative.

Scope: `/agb`, `/datenschutz`, and `/impressum` for EN, FR, ES, and NL render the German source with `lang="de"` and a localized notice identifying it as authoritative.

Temporary or permanent: Product language policy until the operator explicitly changes it.
Review date: 2026-11-26.

Open release content:

- Help, Examples, About, and Support are available in DE, EN, FR, ES, and NL.
- All three legal routes work in each interface language, with German content and a localized notice outside the German locale.
- The German terms, privacy notice, and imprint are editorial drafts pending operator review. Stage may display these drafts; production release remains blocked until approval.

Use this format for every exception:

```text
Rule:
Reason:
Scope:
Temporary or permanent:
Review date:
```

## App-specific decisions

- Editable project files use `.json` with `schemaVersion: 1`.
- Autosave uses IndexedDB and is treated as recovery, not as a replacement for explicit export.
- Markdown export is one-way and intended for handout/print workflows.
- The direct document editor remains the source of truth. Mobile preview is read-only and uses the same in-memory project state.
- The pre-redesign compatible rollback source is `ddaa6b40fdc952406386cdafff46f6d39f95c80b` on `stage`; it uses the same IndexedDB key and schema-v1 JSON project format.
