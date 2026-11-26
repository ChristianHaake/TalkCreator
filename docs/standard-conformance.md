# haak3 Standard Conformance

Standard:
https://git.2p4.org/Christian/Agent-Memory/src/branch/main/25_Development/standards/haak3-webapps

Standard version: `1.0.0-draft`

The link above points to the current private standard (currently 1.1.0-draft); the version recorded here reflects this app’s earlier adoption.

Last reviewed: `2026-07-29`

## Exceptions

Rule: Content linked from localized navigation should be available in the selected language.  
Reason: Privacy and imprint translations require operator review before publication.  
Scope: `/datenschutz` and `/impressum` for EN, FR, ES, and NL. These routes render the German source with `lang="de"` and a localized availability notice.  
Temporary or permanent: Temporary.  
Review date: 2026-07-29.

Open release content:

- Help and About are available in DE, EN, FR, ES, and NL.
- Privacy and Imprint remain German-only and require final operator review before a public release claim.

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
