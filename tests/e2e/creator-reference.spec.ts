import { test } from '@playwright/test';
import { expectCreatorFooter } from '../creator/creator-footer-contract';

const names = { de: 'Weitere Apps', en: 'More apps', fr: 'Autres applications', es: 'Más aplicaciones', nl: 'Meer apps' };

test('shows the shared app directory in every language at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('/');
  for (const [locale, label] of Object.entries(names)) {
    await page.locator('[data-creator-language] select').selectOption(locale);
    await expectCreatorFooter(page, label);
  }
});
