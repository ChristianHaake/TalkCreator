# Redesign verification

Scope: issue #20, local `stage` checkout and `https://stage.talkcreator.haak3.de`. The production URL was not changed.

## Automated checks

- `npm run verify` on 2026-11-26: typecheck, lint, 107 unit/component tests, and production build passed. Vite still warns that the main JavaScript chunk exceeds 500 kB after minification.
- `npm run test:e2e` on 2026-11-26: 58 passed, 2 PDF cases skipped. Chromium, Firefox, and WebKit covered edit, autosave reload, all five language workflows, JSON/Markdown export, valid/invalid import, corrupt-data recovery, direct content routes, keyboard dialog focus, reduced motion, automated WCAG A/AA checks on `/`, `/hilfe`, `/agb`, and widths 320, 360, 390, 768, and 1440 CSS pixels.
- Chromium print test checks that the document is visible, UI actions are hidden, and A4 PDF generation succeeds. Playwright does not generate PDF in Firefox or WebKit; those two PDF assertions are skipped.
- A generated two-page A4 PDF was inspected for reading order and clipping. Browser print dialogs and physical printers still need manual checks.

## Remaining Stage acceptance

- Use one real smartphone or tablet to repeat create, edit, language change, preview, and export. Record device, browser, and result.
- Manually check one screenreader, visible focus throughout the core workflow, and actual 200% browser zoom. Automated keyboard dialog focus, contrast/WCAG rules, and reduced-motion checks passed; they do not replace the manual checks. Record browser and result.
- Have the operator review and approve the German AGB, privacy notice, and imprint, including Cloudflare logging details. Each is visibly marked as an editorial draft on Stage. German is the operator-selected authoritative language; EN/FR/ES/NL legal routes show the German source with a localized notice that it is unapproved.
- Track the incomplete EN/FR/ES/NL legal and language acceptance separately in TalkCreator issues #21, #22, #23, and #24. Automated language paths pass in all three browser engines; operator legal approval and real-device acceptance are pending.
- PR #19 has passing CI and CodeQL on the previous Stage commit. An independent Cavecrew subagent reviewed the `main...stage` diff: one high finding (AGB placeholder) and one low finding (40 px repository link). A product-specific AGB draft replaces the placeholder; the link is now 44 px. Final release still requires operator approval of the legal draft.

## Stage deployment and smoke test

- Deployed on 2026-11-26 with Wrangler 4.168.0. Worker: `interviewdesigner-stage`; version ID: `e726e901-5040-4434-a775-c53a90ddfa37`. The custom domain `stage.talkcreator.haak3.de` was reassigned from the existing `talkcreator` Worker to this Stage Worker. The previous Worker remains available as the immediate domain rollback target.
- Updated Stage deployment on 2026-11-26: version ID `10dcf059-a063-4984-b523-daa0938ac037`. The prior Stage version `e726e901-5040-4434-a775-c53a90ddfa37` is the immediate Worker version rollback target for this update.
- `wrangler.jsonc` now pins the Cloudflare account ID because the authenticated OAuth token lacks `account:read`; automatic account discovery made the first scripted deploy stop after tests passed. The deployment succeeded with that account ID supplied explicitly. The `deploy:stage` script now reads the same ID from the configuration.
- HTTPS returned 200 for `/`, `/beispiele`, and `/agb`. A headless Chromium smoke test on the live Stage site covered editing, autosave after reload, mobile preview at 320 px, JSON and Markdown downloads, direct content routes, schema-v1 JSON import, and A4 PDF creation. Imported state remained present after reload.
- After the Stage update, a fresh Chromium session confirmed the editor, English legal notice, German AGB draft, corrected Cloudflare Workers privacy text, and marked imprint draft over HTTPS.
- Rollback source SHA before this work: `ddaa6b40fdc952406386cdafff46f6d39f95c80b`. Reassign the Stage custom domain to the previous `talkcreator` Worker for immediate rollback. Issue #20 stays open pending the manual acceptance above.
