# haak3 Standard Conformance

Standard:
https://github.com/ChristianHaake/DEV-Memory/tree/main/standards/haak3-webapps

Standard version: `1.1.0-draft`

The current adoption uses the DEV-Memory copy of the standard.

Last reviewed: `2026-11-26`

## Exceptions

Rule: Content linked from localized navigation should be available in the selected language.  
Reason: Privacy and imprint translations require operator review before publication.  
Scope: `/datenschutz` and `/impressum` for EN, FR, ES, and NL. These routes render the German source with `lang="de"` and a localized availability notice.  
Temporary or permanent: Temporary.  
Review date: 2026-11-26.

Open release content:

- Help, Examples, About, and Support are available in DE, EN, FR, ES, and NL.
- Terms has a localized route in all five languages, but the current text is an explicit draft and requires operator review before release.
- Privacy and Imprint remain German-only. The legal text and its translations require operator review before release.

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
