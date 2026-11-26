# Redesign verification

Scope: issue #20, local `stage` checkout and `https://stage.talkcreator.haak3.de`. The production URL was not changed.

## Automated checks

- `npm run verify` on 2026-11-26: typecheck, lint, 107 unit/component tests, and production build passed. Vite still warns that the main JavaScript chunk exceeds 500 kB after minification.
- `npm run test:e2e` on 2026-11-26: 28 passed, 2 PDF cases skipped. Chromium, Firefox, and WebKit covered edit, autosave reload, language change, JSON export, valid/invalid import, corrupt-data recovery, direct content routes, and widths 320, 360, 390, 768, and 1440 CSS pixels.
- Chromium print test checks that the document is visible, UI actions are hidden, and A4 PDF generation succeeds. Playwright does not generate PDF in Firefox or WebKit; those two PDF assertions are skipped.
- A generated two-page A4 PDF was inspected for reading order and clipping. Browser print dialogs and physical printers still need manual checks.

## Remaining Stage acceptance

- Use one real smartphone or tablet to repeat create, edit, language change, preview, and export. Record device, browser, and result.
- Check keyboard-only use, one screenreader, visible focus, 200% browser zoom, reduced motion, contrast, and modal focus return. Record browser and result.
- Have the operator review and complete AGB, privacy, and imprint. The AGB page is visibly marked as a draft; German legal text remains the explicitly identified source for other locales until approved translations exist.
- Track the incomplete EN/FR/ES/NL legal and language acceptance separately in TalkCreator issues #21, #22, #23, and #24. German interface text and all five dictionary key sets are complete; legal approval is still pending.

## Stage deployment and smoke test

- Deployed on 2026-11-26 with Wrangler 4.168.0. Worker: `interviewdesigner-stage`; version ID: `e726e901-5040-4434-a775-c53a90ddfa37`. The custom domain `stage.talkcreator.haak3.de` was reassigned from the existing `talkcreator` Worker to this Stage Worker. The previous Worker remains available as the immediate domain rollback target.
- `wrangler.jsonc` now pins the Cloudflare account ID because the authenticated OAuth token lacks `account:read`; automatic account discovery made the first scripted deploy stop after tests passed. The deployment succeeded with that account ID supplied explicitly. The `deploy:stage` script now reads the same ID from the configuration.
- HTTPS returned 200 for `/`, `/beispiele`, and `/agb`. A headless Chromium smoke test on the live Stage site covered editing, autosave after reload, mobile preview at 320 px, JSON and Markdown downloads, direct content routes, schema-v1 JSON import, and A4 PDF creation. Imported state remained present after reload.
- Rollback source SHA before this work: `ddaa6b40fdc952406386cdafff46f6d39f95c80b`. Reassign the Stage custom domain to the previous `talkcreator` Worker for immediate rollback. Issue #20 stays open pending the manual acceptance above.
