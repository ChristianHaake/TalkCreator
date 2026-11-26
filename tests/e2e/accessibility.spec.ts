import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("interview-creator-locale", "de"));
});

for (const route of ["/", "/hilfe", "/agb"] as const) {
  test(`${route} has no automated WCAG A/AA violations`, async ({ page }) => {
    await page.goto(route);
    if (route === "/") await expect(page.getByTestId("talk-canvas")).toBeVisible();
    else await expect(page.locator("article h1")).toBeVisible();

    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(result.violations.map((violation) => ({
      id: violation.id,
      description: violation.description,
      targets: violation.nodes.map((node) => node.target),
    }))).toEqual([]);
  });
}

test("reset dialog traps focus and restores its trigger", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("talk-canvas")).toBeVisible();
  const reset = page.getByRole("button", { name: "Projekt zurücksetzen" });
  await reset.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Schließen" })).toBeFocused();
  for (let index = 0; index < 5; index += 1) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(reset).toBeFocused();
});

test("reduced motion shortens interface transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByTestId("talk-canvas")).toBeVisible();
  const duration = await page.locator('footer a[href*="github.com"]').evaluate((link) =>
    getComputedStyle(link).transitionDuration,
  );
  expect(duration.split(",").every((part) => parseFloat(part) < 0.001)).toBe(true);
});
