// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { LocaleProvider } from "../../i18n";
import { Header } from "./Header";

afterEach(() => cleanup());

describe("language selection", () => {
  it("shows full locale names and remains usable when localStorage is blocked", () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem() { throw new DOMException("Blocked", "SecurityError"); },
        setItem() { throw new DOMException("Blocked", "SecurityError"); },
      },
    });

    render(
      <LocaleProvider>
        <MemoryRouter><Header /></MemoryRouter>
      </LocaleProvider>,
    );

    const select = screen.getByRole("combobox", { name: "Select language" });
    expect(Array.from((select as HTMLSelectElement).options).map((option) => option.textContent)).toEqual([
      "Deutsch", "English", "Français", "Español", "Nederlands",
    ]);

    fireEvent.change(select, { target: { value: "fr" } });

    expect(select).toHaveValue("fr");
    expect(document.documentElement).toHaveAttribute("lang", "fr");
    expect(document.title).toBe("TalkCreator");
  });
});
