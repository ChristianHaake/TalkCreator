import { expect, type Locator, type Page } from '@playwright/test';

export async function expectCreatorDialogCancellation(
  page: Page,
  trigger: Locator,
  title: string,
  cancelLabel: string,
) {
  await trigger.focus();
  await trigger.press('Enter');
  const dialog = page.locator('dialog[open][data-creator-dialog]');
  await expect(dialog).toHaveAccessibleName(title);
  const cancel = dialog.getByRole('button', { name: cancelLabel, exact: true });
  await expect(cancel).toBeFocused();
  await cancel.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
}
