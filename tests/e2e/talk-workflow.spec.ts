import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("interview-creator-locale", "de"));
});

test("edits a plan, restores it, switches language, and exports JSON", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("talk-canvas")).toBeVisible();
  await page.getByRole("button", { name: /Projekttitel bearbeiten/ }).click();
  await page.getByRole("textbox", { name: "Projekttitel" }).fill("Gespräch über Energie");
  await page.getByRole("button", { name: "Fertig" }).first().click();
  await expect(page.getByText("Gespräch über Energie")).toBeVisible();
  await expect(page.getByText("Lokal gespeichert")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Gespräch über Energie")).toBeVisible();
  await page.getByRole("combobox").selectOption("en");
  await expect(page.getByText("Gespräch über Energie")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const project = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  expect(project.title).toBe("Gespräch über Energie");
  expect(project.schemaVersion).toBe(1);
});

test("mobile preview keeps content and does not overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  await expect(page.getByTestId("talk-canvas")).toBeVisible();
  await page.getByRole("button", { name: /Projekttitel bearbeiten/ }).click();
  await page.getByRole("textbox", { name: "Projekttitel" }).fill("Vorschau Test");
  await page.getByRole("button", { name: "Fertig" }).first().click();
  await page.getByRole("button", { name: "Vorschau", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Vorschau", exact: true })).toBeFocused();
  await expect(page.getByRole("article", { name: "Live Vorschau" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Live Vorschau" })).toContainText("Vorschau Test");
  await expect(page.getByTestId("talk-canvas")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Bearbeiten" }).click();
  await expect(page.getByTestId("talk-canvas")).toBeVisible();
});

for (const width of [360, 390, 768, 1440]) {
  test(`workspace fits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByTestId("talk-canvas")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("invalid import preserves work and valid import requires confirmation", async ({ page }) => {
  await page.goto("/");
  const title = page.getByTestId("talk-canvas").locator("h1").first();
  await expect(title).toBeVisible();
  const original = await title.textContent();

  await page.locator('input[type="file"]').setInputFiles({
    name: "invalid.json", mimeType: "application/json", buffer: Buffer.from("{bad json"),
  });
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(title).toHaveText(original ?? "");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Speichern" }).click();
  const stream = await (await downloadPromise).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const project = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  project.title = "Importierter Plan";
  await page.locator('input[type="file"]').setInputFiles({
    name: "project.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(title).toHaveText(original ?? "");
  await page.getByRole("button", { name: "Projekt importieren" }).click();
  await expect(page.getByTestId("talk-canvas").locator("h1").first()).toHaveAttribute("aria-label", "Importierter Plan");
});

test("corrupt saved data can be downloaded and explicitly replaced", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("interview-creator-session", "{broken"));
  await page.goto("/");
  await expect(page.getByTestId("talk-canvas")).toHaveCount(0);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Sicherung herunterladen" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("talkcreator-recovery.json");
  await page.getByRole("button", { name: "Neue Sitzung starten" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Neue Sitzung starten" }).last().click();
  await expect(page.getByTestId("talk-canvas")).toBeVisible();
});

test("print layout contains the document", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "PDF output is available in Playwright Chromium");
  await page.goto("/");
  await expect(page.getByTestId("talk-canvas")).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByTestId("talk-canvas")).toBeVisible();
  await expect(page.getByRole("button", { name: "Drucken / PDF" })).toBeHidden();
  const pdf = await page.pdf({ format: "A4", printBackground: true });
  expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  expect(pdf.byteLength).toBeGreaterThan(1000);
});

test("direct content routes retain the plan", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("talk-canvas")).toBeVisible();
  await page.getByRole("button", { name: /Projekttitel bearbeiten/ }).click();
  await page.getByRole("textbox", { name: "Projekttitel" }).fill("Plan vor Seitenwechsel");
  await page.getByRole("button", { name: "Fertig" }).first().click();
  await page.getByRole("link", { name: "Hilfe" }).click();
  await page.getByRole("link", { name: "Zurück zum Editor" }).click();
  await expect(page.getByTestId("talk-canvas").locator("h1").first()).toHaveAttribute("aria-label", "Plan vor Seitenwechsel");
  for (const route of ["hilfe", "beispiele", "ueber", "unterstuetzung", "agb", "datenschutz", "impressum"]) {
    await page.goto(`/${route}`);
    await expect(page.locator("article h1")).toBeVisible();
  }
  await page.goto("/");
  await expect(page.getByTestId("talk-canvas")).toBeVisible();
});
