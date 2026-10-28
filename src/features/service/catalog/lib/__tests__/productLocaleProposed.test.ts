import { describe, expect, it, vi } from "vitest";
import {
  isProductTranslationUsable,
  pickProductLocalized,
  pickProductLocalizedDetailed,
  readRecordStatusUsable,
  resolveProductLocaleValue,
} from "../productLocale";

/**
 * Fachentscheidung: Produktübersetzungen im Status `proposed` werden
 * öffentlich genauso ausgespielt wie `approved`. Es gibt vorerst kein
 * redaktionelles Freigabe-Gate.
 *
 * Verbindlich getestet:
 *  - `proposed` gilt als vorhanden und löst KEINEN Sprachrückfall aus.
 *  - Rückfall angefordert → en → de nur bei fehlend/leer/veraltet.
 *  - Kennzeichnung (`usedFallback`) nur bei echtem Sprachwechsel.
 */

describe("Statusbewertung", () => {
  it("behandelt proposed wie approved", () => {
    expect(isProductTranslationUsable("proposed")).toBe(true);
    expect(isProductTranslationUsable("Proposed")).toBe(true);
    expect(isProductTranslationUsable("approved")).toBe(true);
    expect(isProductTranslationUsable("machine")).toBe(true);
  });

  it("erlaubt Rückfall nur bei fehlend/leer/veraltet", () => {
    for (const status of ["missing", "empty", "stale", "outdated", "veraltet"]) {
      expect(isProductTranslationUsable(status)).toBe(false);
    }
  });

  it("wertet unbekannte oder fehlende Statuswerte als vorhanden", () => {
    expect(isProductTranslationUsable("irgendwas")).toBe(true);
    expect(isProductTranslationUsable(undefined)).toBe(true);
    expect(isProductTranslationUsable("")).toBe(true);
  });

  it("liest den Status einer ganzen Nutzlast", () => {
    expect(readRecordStatusUsable({ translation_status: "proposed" })).toBe(true);
    expect(readRecordStatusUsable({ translation_status: "stale" })).toBe(false);
    expect(readRecordStatusUsable({})).toBe(true);
  });
});

describe("Kartenfelder (PL) mit proposed", () => {
  it("nimmt den polnischen Wert im Status proposed", () => {
    const row = {
      title_pl: "Stacja zewnętrzna",
      title_pl_status: "proposed",
      title_en: "Outdoor station",
      title_de: "Außenstation",
    };
    const pick = pickProductLocalizedDetailed(row, "title", "pl");
    expect(pick.value).toBe("Stacja zewnętrzna");
    expect(pick.locale).toBe("pl");
    expect(pick.usedFallback).toBe(false);
  });

  it("nimmt den unsuffigierten Wert mit Marker pl und Status proposed", () => {
    const badge = {
      label: "Natynkowy",
      label_locale: "pl",
      label_status: "proposed",
      label_de: "Aufputz",
    };
    const pick = pickProductLocalizedDetailed(badge, "label", "pl");
    expect(pick.value).toBe("Natynkowy");
    expect(pick.usedFallback).toBe(false);
  });

  it("fällt bei veraltetem PL-Wert auf Englisch zurück", () => {
    const row = {
      title_pl: "Stara nazwa",
      title_pl_translation_status: "stale",
      title_en: "Outdoor station",
      title_de: "Außenstation",
    };
    const pick = pickProductLocalizedDetailed(row, "title", "pl");
    expect(pick.value).toBe("Outdoor station");
    expect(pick.locale).toBe("en");
    expect(pick.usedFallback).toBe(true);
  });

  it("fällt bei leerem PL-Wert auf Englisch zurück", () => {
    const row = { title_pl: "   ", title_en: "Outdoor station", title_de: "Außenstation" };
    expect(pickProductLocalized(row, "title", "pl")).toBe("Outdoor station");
  });

  it("kennzeichnet keinen Rückfall, wenn nur der Status proposed ist", () => {
    const row = { label_nl: "Deurstation", label_nl_status: "proposed" };
    expect(pickProductLocalizedDetailed(row, "label", "nl").usedFallback).toBe(
      false,
    );
  });
});

describe("PDP und Datenblatt (PL) mit proposed", () => {
  it("akzeptiert die PL-Nutzlast im Status proposed ohne weitere Anfrage", async () => {
    const load = vi.fn(async (locale: string) =>
      locale === "pl"
        ? { locale: "pl", translation_status: "proposed", headline: "Stacja" }
        : null,
    );
    const res = await resolveProductLocaleValue("pl", load);
    expect(res.value).toMatchObject({ headline: "Stacja" });
    expect(res.resolvedLocale).toBe("pl");
    expect(res.usedFallback).toBe(false);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("fällt bei veralteter PL-Nutzlast auf Englisch zurück", async () => {
    const load = vi.fn(async (locale: string) => {
      if (locale === "pl") {
        return { locale: "pl", translation_status: "stale", headline: "Stara" };
      }
      if (locale === "en") {
        return { locale: "en", translation_status: "approved", headline: "Door station" };
      }
      return { locale: "de", headline: "Außenstation" };
    });
    const res = await resolveProductLocaleValue("pl", load);
    expect(res.resolvedLocale).toBe("en");
    expect(res.usedFallback).toBe(true);
  });

  it("kennzeichnet den Rückfall auf Deutsch beim Datenblatt", async () => {
    const load = vi.fn(async () => ({
      locale: "de",
      requested_locale: "de",
      translation_status: "approved",
    }));
    const res = await resolveProductLocaleValue("pl", load);
    expect(res.resolvedLocale).toBe("de");
    expect(res.usedFallback).toBe(true);
  });

  it("behandelt proposed beim Datenblatt nicht als fehlend", async () => {
    const load = vi.fn(async (locale: string) =>
      locale === "pl"
        ? { locale: "pl", translation_status: "proposed", sections: [{ id: "a" }] }
        : null,
    );
    const res = await resolveProductLocaleValue("pl", load);
    expect(res.value).not.toBeNull();
    expect(res.usedFallback).toBe(false);
  });
});
