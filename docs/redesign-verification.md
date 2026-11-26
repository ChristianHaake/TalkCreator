# Redesign verification

Scope: issue #20, local `stage` checkout and `https://stage.talkcreator.haak3.de`. The production URL was not changed.

## Automated checks

- `npm run verify` on 2026-11-26: typecheck, lint, 107 unit/component tests, and production build passed. Vite still warns that the main JavaScript chunk exceeds 500 kB after minification.
- `npm run test:e2e` on 2026-11-26: 64 passed, 2 PDF cases skipped. Chromium, Firefox, and WebKit covered edit, autosave reload, all five language workflows, JSON/Markdown export, valid/invalid import, corrupt-data recovery, direct content routes, keyboard dialog focus, reduced motion, automated WCAG A/AA checks on `/`, `/hilfe`, `/agb`, and widths 320, 360, 390, 768, and 1440 CSS pixels. The `/agb` route also reflows at 320 CSS pixels.
- A schema-v1 project containing title, partner, target time, all three question phases with notes and durations, checklist states, and a source retained those fields through JSON import, IndexedDB autosave/reload, JSON export, and Markdown export in all three browser engines.
- CSS `zoom` emulation was inspected but is not treated as evidence of actual 200% browser zoom; that manual check remains open.
- Chromium print test checks that the document is visible, UI actions are hidden, and A4 PDF generation succeeds. Playwright does not generate PDF in Firefox or WebKit; those two PDF assertions are skipped.
- A generated two-page A4 PDF was inspected for reading order and clipping. Browser print dialogs and physical printers still need manual checks.

## Remaining Stage acceptance

- Use one real smartphone or tablet to repeat create, edit, language change, preview, and export. Record device, browser, and result.
- Manually check one screenreader, visible focus throughout the core workflow, and actual 200% browser zoom. Automated keyboard dialog focus, contrast/WCAG rules, and reduced-motion checks passed; they do not replace the manual checks. Record browser and result.
- Have the operator review and approve the German AGB, privacy notice, and imprint, including Cloudflare logging details. Each is visibly marked as an editorial draft on Stage. German is the operator-selected authoritative language; EN/FR/ES/NL legal routes show the German source with a localized notice that it is unapproved.
- Track the incomplete EN/FR/ES/NL legal and language acceptance separately in TalkCreator issues #21, #22, #23, and #24. Automated language paths pass in all three browser engines; operator legal approval and real-device acceptance are pending.
- PR #19 has a documented independent Cavecrew subagent review of the `main...stage` diff: one high finding (AGB placeholder) and one low finding (40 px repository link). A product-specific AGB draft replaces the placeholder; the link is now 44 px. CI and CodeQL passed for commit `14ddcc8`. Final release still requires operator approval of the legal draft.

### Language acceptance record

Automated checks passed in Chromium, Firefox, and WebKit for language switching without lost input; localized Help, Examples, Support, template dialog, save status, import error, and export labels; JSON/Markdown download; and direct legal routes with `lang="de"` plus a localized draft notice. Human review of translation quality and operator approval of legal content remain pending.

| Interface language | Technical Stage result | Legal policy | Fully accepted |
| --- | --- | --- | --- |
| Deutsch (`de`) | Passed | German drafts pending operator approval | No |
| English (`en`) | Passed | German authoritative source with English draft notice; approval pending | No |
| Français (`fr`) | Passed | German authoritative source with French draft notice; approval pending | No |
| Español (`es`) | Passed | German authoritative source with Spanish draft notice; approval pending | No |
| Nederlands (`nl`) | Passed | German authoritative source with Dutch draft notice; approval pending | No |

Fully accepted languages: **0 of 5** until the operator and manual-device gates are complete.

## Stage deployment and smoke test

- Deployed on 2026-11-26 with Wrangler 4.168.0. Worker: `interviewdesigner-stage`; version ID: `e726e901-5040-4434-a775-c53a90ddfa37`. The custom domain `stage.talkcreator.haak3.de` was reassigned from the existing `talkcreator` Worker to this Stage Worker. The previous Worker remains available as the immediate domain rollback target.
- Updated Stage deployment on 2026-11-26: version ID `10dcf059-a063-4984-b523-daa0938ac037`. The prior Stage version `e726e901-5040-4434-a775-c53a90ddfa37` is the immediate Worker version rollback target for this update.
- Latest Stage deployment on 2026-11-26: version ID `069c4d55-42b8-4227-846c-e6836b026f90`. The prior version `10dcf059-a063-4984-b523-daa0938ac037` is the immediate Worker version rollback target. A fresh Chromium session confirmed the visible external-link icon and localized new-tab announcement on `/unterstuetzung`.
- `wrangler.jsonc` now pins the Cloudflare account ID because the authenticated OAuth token lacks `account:read`; automatic account discovery made the first scripted deploy stop after tests passed. The deployment succeeded with that account ID supplied explicitly. The `deploy:stage` script now reads the same ID from the configuration.
- HTTPS returned 200 for `/`, `/beispiele`, and `/agb`. A headless Chromium smoke test on the live Stage site covered editing, autosave after reload, mobile preview at 320 px, JSON and Markdown downloads, direct content routes, schema-v1 JSON import, and A4 PDF creation. Imported state remained present after reload.
- After the Stage update, a fresh Chromium session confirmed the editor, English legal notice, German AGB draft, corrected Cloudflare Workers privacy text, and marked imprint draft over HTTPS.
- Rollback source SHA before this work: `ddaa6b40fdc952406386cdafff46f6d39f95c80b`. Reassign the Stage custom domain to the previous `talkcreator` Worker for immediate rollback. Issue #20 stays open pending the manual acceptance above.
