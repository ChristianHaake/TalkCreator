// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Locale } from "../domain/types";
import { LocaleProvider } from "../i18n";
import { ContentPage } from "./ContentPage";

class MemoryStorage implements Storage {
  private items = new Map<string, string>();

  get length() {
    return this.items.size;
  }

  clear() {
    this.items.clear();
  }

  getItem(key: string) {
    return this.items.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.items.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.items.delete(key);
  }

  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
}

function renderContentPage(locale: Locale, pageId: string) {
  window.localStorage.setItem("interview-creator-locale", locale);

  return render(
    <LocaleProvider>
      <MemoryRouter initialEntries={[`/${pageId}`]}>
        <Routes>
          <Route path="/:pageId" element={<ContentPage />} />
        </Routes>
      </MemoryRouter>
    </LocaleProvider>,
  );
}

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: new MemoryStorage(),
  });
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("localized content pages", () => {
  it.each([
    ["de", "hilfe", "Hilfe"],
    ["en", "hilfe", "Help"],
    ["fr", "hilfe", "Aide"],
    ["es", "hilfe", "Ayuda"],
    ["nl", "hilfe", "Hulp"],
    ["de", "ueber", "Über TalkCreator"],
    ["en", "ueber", "About TalkCreator"],
    ["fr", "ueber", "À propos de TalkCreator"],
    ["es", "ueber", "Acerca de TalkCreator"],
    ["nl", "ueber", "Over TalkCreator"],
  ] satisfies Array<[Locale, string, string]>)(
    "renders %s /%s content in the selected language",
    async (locale, pageId, heading) => {
      renderContentPage(locale, pageId);

      expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
      expect(screen.getByRole("article")).toHaveAttribute("lang", locale);
      expect(screen.queryByText(/available only in German|nur auf Deutsch/i)).not.toBeInTheDocument();
    },
  );

  it.each([
    ["datenschutz", "Datenschutzhinweise"],
    ["impressum", "Impressum"],
  ])("renders German /%s content without a fallback notice", async (pageId, heading) => {
    renderContentPage("de", pageId);

    expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.getByRole("article")).toHaveAttribute("lang", "de");
    expect(screen.queryByText("Diese Seite ist derzeit nur auf Deutsch verfügbar.")).not.toBeInTheDocument();
  });

  it.each([
    ["en", "datenschutz", "Datenschutzhinweise", "This page is currently available only in German."],
    ["en", "impressum", "Impressum", "This page is currently available only in German."],
    ["fr", "datenschutz", "Datenschutzhinweise", "Cette page est actuellement disponible uniquement en allemand."],
    ["fr", "impressum", "Impressum", "Cette page est actuellement disponible uniquement en allemand."],
    ["es", "datenschutz", "Datenschutzhinweise", "Esta página está disponible actualmente solo en alemán."],
    ["es", "impressum", "Impressum", "Esta página está disponible actualmente solo en alemán."],
    ["nl", "datenschutz", "Datenschutzhinweise", "Deze pagina is momenteel alleen in het Duits beschikbaar."],
    ["nl", "impressum", "Impressum", "Deze pagina is momenteel alleen in het Duits beschikbaar."],
  ] satisfies Array<[Locale, string, string, string]>)(
    "marks %s /%s as German fallback content",
    async (locale, pageId, heading, notice) => {
      renderContentPage(locale, pageId);

      expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
      expect(screen.getByRole("article")).toHaveAttribute("lang", "de");
      expect(screen.getByText(notice)).toHaveAttribute("lang", locale);
    },
  );

  it("keeps unknown content routes on the localized not-found state", async () => {
    renderContentPage("en", "unknown");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("article")).toHaveAttribute("lang", "en");
  });
});
