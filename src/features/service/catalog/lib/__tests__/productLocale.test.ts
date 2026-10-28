import { describe, expect, it, vi } from "vitest";
import {
  normalizeProductLocale,
  pickProductLocalized,
  productIntlLocale,
  productLocaleChain,
  readDeliveredLocale,
  resolveProductLocaleValue,
} from "../productLocale";

/**
 * Sprachweitergabe zur Produktbasis: der gewählte Sprachcode geht
 * unverändert durch; nur bei einem echten Rückfall greift die Kette
 * angefordert → en → de.
 */
describe("normalizeProductLocale", () => {
  it("reduziert auf die Grundform und lässt beliebige Sprachen zu", () => {
    expect(normalizeProductLocale("nl-NL")).toBe("nl");
    expect(normalizeProductLocale("NL")).toBe("nl");
    expect(normalizeProductLocale("pl")).toBe("pl");
    expect(normalizeProductLocale("da_DK")).toBe("da");
    expect(normalizeProductLocale("")).toBe("de");
    expect(normalizeProductLocale(undefined)).toBe("de");
  });
});

describe("productLocaleChain", () => {
  it("liefert angefordert → en → de ohne Dubletten", () => {
    expect(productLocaleChain("nl")).toEqual(["nl", "en", "de"]);
    expect(productLocaleChain("en")).toEqual(["en", "de"]);
    expect(productLocaleChain("de")).toEqual(["de", "en"]);
  });
});

describe("readDeliveredLocale", () => {
  it("erkennt locale und text_locale", () => {
    expect(readDeliveredLocale({ locale: "de" })).toBe("de");
    expect(readDeliveredLocale({ text_locale: "NL-nl" })).toBe("nl");
    expect(readDeliveredLocale({ foo: 1 })).toBeNull();
  });
});

describe("resolveProductLocaleValue", () => {
  it("gibt nl unverändert weiter, wenn die Produktbasis nl liefert", async () => {
    const load = vi.fn(async (locale: string) => ({
      locale,
      headline: locale === "nl" ? "Deurcommunicatie" : "Türkommunikation",
    }));
    const res = await resolveProductLocaleValue("nl-NL", load);
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith("nl");
    expect(res.resolvedLocale).toBe("nl");
    expect(res.usedFallback).toBe(false);
  });

  it("gibt pl unverändert weiter", async () => {
    const load = vi.fn(async (locale: string) => ({ locale }));
    const res = await resolveProductLocaleValue("pl", load);
    expect(load).toHaveBeenCalledTimes(1);
    expect(res.resolvedLocale).toBe("pl");
    expect(res.usedFallback).toBe(false);
  });

  it("nimmt bei stillem Rückfall zuerst en, nicht sofort de", async () => {
    const load = vi.fn(async (locale: string) => {
      if (locale === "nl") return { locale: "de", headline: "deutsch" };
      if (locale === "en") return { locale: "en", headline: "english" };
      return { locale: "de", headline: "deutsch" };
    });
    const res = await resolveProductLocaleValue("nl", load);
    expect(res.attempted).toEqual(["nl", "en"]);
    expect(res.resolvedLocale).toBe("en");
    expect(res.usedFallback).toBe(true);
    expect((res.value as { headline: string }).headline).toBe("english");
  });

  it("fällt erst auf de zurück, wenn en fehlt", async () => {
    const load = vi.fn(async (locale: string) => {
      if (locale === "de") return { locale: "de", headline: "deutsch" };
      return null;
    });
    const res = await resolveProductLocaleValue("nl", load);
    expect(res.attempted).toEqual(["nl", "en", "de"]);
    expect(res.resolvedLocale).toBe("de");
    expect(res.usedFallback).toBe(true);
  });

  it("meldet kein Ergebnis, wenn der Artikel im Kanal fehlt", async () => {
    const res = await resolveProductLocaleValue("nl", async () => null);
    expect(res.value).toBeNull();
    expect(res.usedFallback).toBe(false);
  });
});

describe("pickProductLocalized", () => {
  it("bevorzugt die angeforderte Sprache, dann en, dann de", () => {
    const rec = { label_de: "Grau", label_en: "Grey", label_nl: "Grijs" };
    expect(pickProductLocalized(rec, "label", "nl")).toBe("Grijs");
    expect(pickProductLocalized(rec, "label", "da")).toBe("Grey");
    expect(pickProductLocalized({ label_de: "Grau" }, "label", "nl")).toBe(
      "Grau",
    );
    expect(pickProductLocalized({ label: "X" }, "label", "nl")).toBe("X");
  });
});

describe("productIntlLocale", () => {
  it("liefert passende Formatierungs-Tags", () => {
    expect(productIntlLocale("nl")).toBe("nl-NL");
    expect(productIntlLocale("de")).toBe("de-DE");
    expect(productIntlLocale("hr")).toBe("hr");
  });
});
