// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { LocaleProvider } from "../../i18n";
import { Footer } from "./Footer";

describe("application footer", () => {
  it("keeps required information pages visible and uses internal support navigation", () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: { getItem: () => "de", setItem() {} },
    });
    render(
      <LocaleProvider>
        <MemoryRouter><Footer /></MemoryRouter>
      </LocaleProvider>,
    );

    for (const [label, href] of [
      ["Hilfe", "/hilfe"],
      ["Beispiele", "/beispiele"],
      ["Über", "/ueber"],
      ["AGB", "/agb"],
      ["Datenschutz", "/datenschutz"],
      ["Impressum", "/impressum"],
      ["Unterstützen", "/unterstuetzung"],
    ]) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
    }

    const repository = screen.getByRole("link", { name: "TalkCreator-Quellcode auf GitHub" });
    expect(repository).toHaveAttribute("href", "https://github.com/ChristianHaake/TalkCreator");
    expect(repository).toHaveAttribute("target", "_blank");
    expect(repository).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "haak3" })).toHaveAttribute("href", "https://haak3.de/");
  });
});
