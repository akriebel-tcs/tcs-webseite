import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Verbindlicher Kanalvertrag (Stand 2026-09-13):
 * PDP und Datenblatt werden **genau einmal** mit der angeforderten,
 * normalisierten Sprache abgefragt. Der Rückfall passiert feldweise in der
 * Produktbasis; der Client führt keine Sprachprobe durch und stuft die
 * Seitensprache nie global herab.
 */

const rpc = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
  isSupabaseConfigured: () => true,
}));

import {
  getProductDatasheet,
  getProductPdp,
  loadProductDatasheetLocalized,
  loadProductPdpLocalized,
} from "../pdp";
import { readDeliveredLocale } from "../../lib/productLocale";

beforeEach(() => {
  rpc.mockReset();
});

describe("Sprachangabe aus dem Kanal-Envelope", () => {
  it("liest verschachtelte Pfade (meta.locale, pdp.text_locale)", () => {
    expect(readDeliveredLocale({ meta: { locale: "de" } })).toBe("de");
    expect(readDeliveredLocale({ meta: { resolved_locale: "en" } })).toBe("en");
    expect(readDeliveredLocale({ datasheet: { meta: { locale: "de" } } })).toBe(
      "de",
    );
    expect(readDeliveredLocale({ pdp: { text_locale: "nl" } })).toBe("nl");
  });

  it("heftet die Envelope-Sprache an die PDP-Nutzlast", async () => {
    rpc.mockResolvedValue({
      data: { ok: true, locale: "de", pdp: { headline: "Außenstation" } },
      error: null,
    });
    const payload = await getProductPdp("A1", "nl");
    expect(readDeliveredLocale(payload)).toBe("de");
  });

  it("überschreibt eine vorhandene innere Sprachangabe nicht", async () => {
    rpc.mockResolvedValue({
      data: {
        ok: true,
        locale: "de",
        datasheet: { meta: { locale: "nl" }, title: "Deurstation" },
      },
      error: null,
    });
    const sheet = await getProductDatasheet("A1", "nl");
    expect(readDeliveredLocale(sheet)).toBe("nl");
  });
});

describe("Kein clientseitiger Sprach-Probe-Lauf mehr", () => {
  it("PDP: genau ein Aufruf mit der angefragten Sprache, keine Herabstufung", async () => {
    rpc.mockResolvedValue({
      data: {
        ok: true,
        locale: "nl",
        pdp: { headline: "Deurstation", technical_specs_display: [] },
      },
      error: null,
    });

    const result = await loadProductPdpLocalized("A1", "nl-NL");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][1]).toMatchObject({
      p_artikel_nr: "A1",
      p_locale: "nl",
    });
    expect(result.requestedLocale).toBe("nl");
    expect(result.resolvedLocale).toBe("nl");
    expect(result.usedFallback).toBe(false);
    expect(result.attempted).toEqual(["nl"]);
  });

  it("PDP: einzelne deutsche Rückfallfelder stufen die Seitensprache nicht herab", async () => {
    rpc.mockResolvedValue({
      data: {
        ok: true,
        locale: "de",
        pdp: { headline: "Außenstation" },
      },
      error: null,
    });

    const result = await loadProductPdpLocalized("A1", "pl");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(result.resolvedLocale).toBe("pl");
    expect(result.usedFallback).toBe(false);
    expect(result.value?.headline).toBe("Außenstation");
  });

  it("Datenblatt: genau ein Aufruf, keine EN-Zweitabfrage", async () => {
    rpc.mockResolvedValue({
      data: {
        ok: true,
        locale: "de",
        datasheet: { meta: { locale: "de" }, title: "Außenstation" },
      },
      error: null,
    });

    const result = await loadProductDatasheetLocalized("nl", "A1");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_locale: "nl" });
    expect(result.resolvedLocale).toBe("nl");
    expect(result.usedFallback).toBe(false);
    expect(result.value?.title).toBe("Außenstation");
  });

  it("PDP: nicht im Kanal sichtbar bleibt null, ohne weitere Sprachversuche", async () => {
    rpc.mockResolvedValue({ data: { ok: false }, error: null });
    const result = await loadProductPdpLocalized("A1", "pl");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(result.value).toBeNull();
    expect(result.resolvedLocale).toBe("pl");
  });
});
