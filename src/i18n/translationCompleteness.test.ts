import { describe, expect, it } from "vitest";
import { de } from "./de";
import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { nl } from "./nl";

describe("interface translations", () => {
  it.each([
    ["English", en],
    ["Français", fr],
    ["Español", es],
    ["Nederlands", nl],
  ])("has every German interface key in %s", (_, dictionary) => {
    expect(Object.keys(dictionary).sort()).toEqual(Object.keys(de).sort());
    expect(Object.values(dictionary).every((value) => typeof value === "string" && value.trim().length > 0)).toBe(true);
  });
});
