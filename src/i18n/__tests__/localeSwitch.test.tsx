/**
 * Regressionstests für den öffentlichen Sprachumschalter.
 *
 * 1. Eine Sprache aus der Datenbank (hier Niederländisch) muss sich wirklich
 *    setzen lassen — früher hat die feste Liste `supportedLngs: ["de","en","pl"]`
 *    jede weitere Sprache sofort auf Deutsch aufgelöst.
 * 2. Ein späterer, asynchroner Sprachdaten-Nachlauf (Overlay/Registry) darf die
 *    Nutzerwahl nicht auf Deutsch zurücksetzen.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import i18n from "@/i18n";

const read = (p: string) => readFileSync(p, "utf8");

describe("öffentlicher Sprachwechsel", () => {
  it("löst eine Datenbanksprache nicht auf Deutsch zurück (keine feste Sprachliste)", async () => {
    await i18n.changeLanguage("de");
    expect(i18n.language).toBe("de");

    await i18n.changeLanguage("nl");
    expect(i18n.language).toBe("nl");
    // Solange kein statisches NL-Paket gebündelt ist, zeigt `resolvedLanguage`
    // Deutsch — die Anzeige muss deshalb `language` verwenden. Sobald DB-Texte
    // nachgeladen sind, löst i18next auch auf „nl" auf.
    i18n.addResourceBundle("nl", "common", { probe: "Terug" }, true, true);
    await i18n.changeLanguage("nl");
    expect(i18n.resolvedLanguage).toBe("nl");

    // Fehlende Einzeltexte fallen auf Deutsch zurück — nicht die ganze Sprache.
    expect(typeof i18n.t("common:actions.back", { defaultValue: "" })).toBe("string");

    await i18n.changeLanguage("de");
  });

  it("behält die Nutzerwahl, wenn ein Sprachpaket später nachgeladen wird", async () => {
    await i18n.changeLanguage("nl");
    i18n.addResourceBundle("nl", "navigation", { probe: "Navigatie" }, true, true);
    // Nachladen anderer Sprachen darf die aktive Sprache nicht ändern.
    i18n.addResourceBundle("pl", "navigation", { probe: "Nawigacja" }, true, true);
    expect(i18n.language).toBe("nl");
    expect(i18n.t("navigation:probe")).toBe("Navigatie");
    await i18n.changeLanguage("de");
  });

  it("erzwingt keine feste DE/EN/PL-Liste im i18n-Start und im Umschalter", () => {
    const init = read("src/i18n/index.ts");
    expect(init).toContain("supportedLngs: false");
    expect(init).not.toContain("SUPPORTED_LANGUAGES");

    const switcher = read("src/components/LanguageSwitcher.tsx");
    expect(switcher).not.toContain("APP_LOCALES");
    expect(switcher).toContain("usePublicLocales");
    expect(switcher).toContain("i18n.language");

    const boot = read("src/main.tsx");
    expect(boot).not.toContain("APP_LOCALES");
    expect(boot).toContain("readLocaleRegistry");
  });
});
