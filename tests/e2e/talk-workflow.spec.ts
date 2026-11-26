import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("interview-creator-locale")) {
      localStorage.setItem("interview-creator-locale", "de");
    }
  });
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

const languageCases = [
  { locale: "de", saved: "Lokal gespeichert", save: "Speichern", markdown: "Export (MD)", template: "Neu aus Vorlage", templateTitle: "Neues Projekt aus Vorlage", invalid: "Die Datei enthält kein gültiges JSON.", notice: "Die deutsche Fassung ist für diese Rechtsseite maßgeblich. Der Text ist noch nicht freigegeben." },
  { locale: "en", saved: "Saved locally", save: "Save", markdown: "Export (MD)", template: "New from template", templateTitle: "New project from template", invalid: "The file does not contain valid JSON.", notice: "Only the German version of this legal page is authoritative. This draft has not been approved yet." },
  { locale: "fr", saved: "Enregistré localement", save: "Enregistrer", markdown: "Exporter (MD)", template: "Nouveau depuis un modèle", templateTitle: "Nouveau projet depuis un modèle", invalid: "Le fichier ne contient pas de JSON valide.", notice: "Seule la version allemande de cette page juridique fait foi. Ce projet de texte n’est pas encore approuvé." },
  { locale: "es", saved: "Guardado localmente", save: "Guardar", markdown: "Exportar (MD)", template: "Nuevo desde plantilla", templateTitle: "Nuevo proyecto desde plantilla", invalid: "El archivo no contiene JSON válido.", notice: "Solo la versión alemana de esta página legal es la versión de referencia. Este borrador aún no está aprobado." },
  { locale: "nl", saved: "Lokaal opgeslagen", save: "Opslaan", markdown: "Exporteren (MD)", template: "Nieuw uit sjabloon", templateTitle: "Nieuw project uit sjabloon", invalid: "Het bestand bevat geen geldige JSON.", notice: "Alleen de Duitse versie van deze juridische pagina is leidend. Deze concepttekst is nog niet goedgekeurd." },
] as const;

for (const language of languageCases) {
  test(`${language.locale} keeps the plan and localizes workflow and legal routes`, async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("talk-canvas")).toBeVisible();
    await page.getByRole("button", { name: /Projekttitel bearbeiten/ }).click();
    await page.getByRole("textbox", { name: "Projekttitel" }).fill("Sprachtest");
    await page.getByRole("button", { name: "Fertig" }).first().click();
    await page.getByRole("combobox").selectOption(language.locale);
    await expect(page.locator("html")).toHaveAttribute("lang", language.locale);
    await expect(page.getByText(language.saved)).toBeVisible();
    await expect(page.getByRole("button", { name: language.save, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: language.markdown, exact: true })).toBeVisible();
    await page.getByRole("button", { name: language.template }).click();
    await expect(page.getByRole("dialog", { name: language.templateTitle })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: language.save, exact: true }).click();
    const download = await downloadPromise;
    const chunks: Buffer[] = [];
    for await (const chunk of await download.createReadStream()) chunks.push(Buffer.from(chunk));
    expect(JSON.parse(Buffer.concat(chunks).toString("utf8")).title).toBe("Sprachtest");
    const markdownPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: language.markdown, exact: true }).click();
    const markdown = await markdownPromise;
    expect(markdown.suggestedFilename()).toMatch(/\.md$/);

    await page.locator('input[type="file"]').setInputFiles({
      name: "invalid.json", mimeType: "application/json", buffer: Buffer.from("{bad json"),
    });
    await expect(page.getByRole("alert")).toContainText(language.invalid);
    await expect(page.getByTestId("talk-canvas").locator("h1").first()).toHaveAttribute("aria-label", "Sprachtest");

    for (const route of ["hilfe", "beispiele", "unterstuetzung"]) {
      await page.goto(`/${route}`);
      await expect(page.getByRole("article")).toHaveAttribute("lang", language.locale);
      await expect(page.locator("article h1")).toBeVisible();
    }
    for (const route of ["agb", "datenschutz", "impressum"]) {
      await page.goto(`/${route}`);
      await expect(page.getByRole("article")).toHaveAttribute("lang", "de");
      await expect(page.locator("article h1")).toBeVisible();
      if (language.locale !== "de") await expect(page.getByText(language.notice)).toHaveAttribute("lang", language.locale);
    }
    await page.goto("/");
    await expect(page.getByTestId("talk-canvas").locator("h1").first()).toHaveAttribute("aria-label", "Sprachtest");
  });
}

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

test("schema-v1 project keeps all planning fields through import, autosave, and exports", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("talk-canvas")).toBeVisible();
  const initialDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Speichern" }).click();
  const initialChunks: Buffer[] = [];
  for await (const chunk of await (await initialDownload).createReadStream()) initialChunks.push(Buffer.from(chunk));
  const project = JSON.parse(Buffer.concat(initialChunks).toString("utf8"));
  project.title = "Vollständiger Plan";
  project.partner = "Gesprächspartner";
  project.target_minutes = 15;
  project.phases = {
    intro: [{ id: "intro-1", text: "Einstiegsfrage", notes: "Einstiegsnotiz", estimated_minutes: 3, is_backup: false }],
    main: [{ id: "main-1", text: "Kernfrage", notes: "Kernnotiz", estimated_minutes: 7, is_backup: true }],
    outro: [{ id: "outro-1", text: "Abschlussfrage", notes: "Abschlussnotiz", estimated_minutes: 2, is_backup: false }],
  };
  project.checklist = [
    { id: "check-1", text: "Erledigte Aufgabe", checked: true },
    { id: "check-2", text: "Offene Aufgabe", checked: false },
  ];
  project.sources = [{ id: "source-1", title: "Quellenbeleg", url: "https://example.org/source" }];

  await page.locator('input[type="file"]').setInputFiles({
    name: "project.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("button", { name: "Projekt importieren" }).click();
  await expect(page.getByText("Lokal gespeichert")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("talk-canvas").locator("h1").first()).toHaveAttribute("aria-label", "Vollständiger Plan");

  const jsonDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Speichern" }).click();
  const jsonChunks: Buffer[] = [];
  for await (const chunk of await (await jsonDownload).createReadStream()) jsonChunks.push(Buffer.from(chunk));
  const restored = JSON.parse(Buffer.concat(jsonChunks).toString("utf8"));
  expect(restored.schemaVersion).toBe(1);
  expect(restored.partner).toBe(project.partner);
  expect(restored.target_minutes).toBe(project.target_minutes);
  expect(restored.phases).toEqual(project.phases);
  expect(restored.checklist).toEqual(project.checklist);
  expect(restored.sources).toEqual(project.sources);
  expect(restored.total_estimated_time).toBe(12);

  const markdownDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export (MD)" }).click();
  const markdownChunks: Buffer[] = [];
  for await (const chunk of await (await markdownDownload).createReadStream()) markdownChunks.push(Buffer.from(chunk));
  const markdown = Buffer.concat(markdownChunks).toString("utf8");
  for (const text of ["Vollständiger Plan", "Gesprächspartner", "Einstiegsfrage", "Kernfrage", "Abschlussfrage", "Kernnotiz", "[Quellenbeleg](https://example.org/source)", "- [x] Erledigte Aufgabe", "- [ ] Offene Aufgabe"]) {
    expect(markdown).toContain(text);
  }
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
