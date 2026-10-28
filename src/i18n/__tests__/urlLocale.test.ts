/**
 * Regressionstests für die Sprache in der Adresse (`?lang=`).
 *
 * 1. Ein gültiger Parameter ist beim ersten Laden autoritativ und schlägt einen
 *    alten gemerkten Wert.
 * 2. Ein Sprachwechsel schreibt den Parameter in die aktuelle Adresse.
 * 3. Ungültige Werte werden ignoriert (kein Sprachsprung).
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  readLocaleFromSearch,
  readStoredLocale,
  resolveInitialLocale,
  storeLocale,
  writeUrlLocale,
} from "@/i18n/urlLocale";

const go = (url: string) => window.history.replaceState({}, "", url);

describe("Sprache in der Adresse", () => {
  beforeEach(() => {
    localStorage.clear();
    go("/produkte/ada45015-0030");
  });

  it("liest gültige Sprachcodes und ignoriert unsinnige Werte", () => {
    expect(readLocaleFromSearch("?lang=nl")).toBe("nl");
    expect(readLocaleFromSearch("?lang=nl-NL")).toBe("nl");
    expect(readLocaleFromSearch("?lang=")).toBeNull();
    expect(readLocaleFromSearch("?lang=123")).toBeNull();
    expect(readLocaleFromSearch("?x=1")).toBeNull();
  });

  it("gibt der Adresse Vorrang vor dem gemerkten Wert", () => {
    storeLocale("en");
    go("/produkte/ada45015-0030?lang=nl");
    expect(resolveInitialLocale("de")).toBe("nl");
    // Der gemerkte Wert wird gleich nachgezogen, damit beide Quellen gleich sind.
    expect(readStoredLocale()).toBe("nl");
  });

  it("nutzt den gemerkten Wert nur ohne Adressparameter", () => {
    storeLocale("pl");
    expect(resolveInitialLocale("de")).toBe("pl");
    localStorage.clear();
    expect(resolveInitialLocale("de")).toBe("de");
  });

  it("schreibt den Sprachparameter in die aktuelle Adresse", () => {
    writeUrlLocale("pl", "push");
    expect(window.location.search).toBe("?lang=pl");
    expect(window.location.pathname).toBe("/produkte/ada45015-0030");
    writeUrlLocale("en", "push");
    expect(window.location.search).toBe("?lang=en");
    // Zurück stellt die vorherige Sprache wieder her.
    window.history.back();
  });

  it("behält andere Parameter und den Anker", () => {
    go("/service?tab=downloads#anker");
    writeUrlLocale("nl", "replace");
    expect(window.location.search).toContain("tab=downloads");
    expect(window.location.search).toContain("lang=nl");
    expect(window.location.hash).toBe("#anker");
  });
});
