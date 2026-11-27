import { expect, type Page } from '@playwright/test';

export async function expectCreatorFooter(page: Page, localizedDirectoryLabel: string) {
  const footer = page.locator('[data-creator-footer]');
  const directory = footer.getByRole('link', { name: localizedDirectoryLabel, exact: true });
  await expect(footer.getByRole('navigation')).toHaveAccessibleName(/\S/);
  await expect(directory).toBeVisible();
  await expect(directory).toHaveAccessibleDescription(/\S/);
  await expect(directory).toHaveAttribute('href', 'https://haak3.de/apps-fur-die-schule/');
  await expect(directory).toHaveAttribute('target', '_blank');
  await expect(directory).toHaveAttribute('rel', /\bnoopener\b/);
  await expect(directory).toHaveAttribute('rel', /\bnoreferrer\b/);
  await directory.focus();
  await expect(directory).toBeFocused();
  const box = await directory.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
    .toBeLessThanOrEqual(1);
}
