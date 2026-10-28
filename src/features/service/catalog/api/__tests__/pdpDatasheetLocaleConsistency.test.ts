import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regressionstest fuer den sprachkonsistenten Produktpfad des
 * Beispielprodukts ADA45015-0030 in DE/EN/PL/NL.
 *
 * Vertrag:
 *  - Genau ein Aufruf je Ansicht, mit der gewaehlten Sprache.
 *  - PDP und Datenblatt nutzen dieselbe Quelle (Kanalvertrag) und dieselbe
 *    angefragte Sprache.
 *  - Einzelne deutsche Rueckfallfelder stufen die Seitensprache nie global
 *    auf Deutsch herab; `proposed` gilt als vorhandene Uebersetzung.
 */

const rpc = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
  isSupabaseConfigured: () => true,
}));

import {
  loadProductDatasheetLocalized,
  loadProductPdpLocalized,
} from "../pdp";

const ARTIKEL = "ADA45015-0030";
const LOCALES = ["de", "en", "pl", "nl"] as const;

beforeEach(() => {
  rpc.mockReset();
});

describe(`Sprachkonsistenz PDP/Datenblatt ${ARTIKEL}`, () => {
  it.each(LOCALES)("PDP: %s wird genau einmal unverändert angefragt", async (loc) => {
    rpc.mockResolvedValue({
      data: {
        ok: true,
        // Produktbasis meldet feldweisen Rueckfall — Seitensprache bleibt.
        locale: "de",
        pdp: { headline: "Außenstation", translation_status: "proposed" },
      },
      error: null,
    });

    const result = await loadProductPdpLocalized(ARTIKEL, loc);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][1]).toMatchObject({
      p_artikel_nr: ARTIKEL,
      p_locale: loc,
    });
    expect(result.requestedLocale).toBe(loc);
    expect(result.resolvedLocale).toBe(loc);
    expect(result.usedFallback).toBe(false);
    expect(result.value).not.toBeNull();
  });

  it.each(LOCALES)("Datenblatt: %s wird genau einmal unverändert angefragt", async (loc) => {
    rpc.mockResolvedValue({
      data: {
        ok: true,
        locale: "de",
        datasheet: { title: "Außenstation", translation_status: "proposed" },
      },
      error: null,
    });

    const result = await loadProductDatasheetLocalized(loc, ARTIKEL);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_locale: loc });
    expect(result.resolvedLocale).toBe(loc);
    expect(result.usedFallback).toBe(false);
    expect(result.value).not.toBeNull();
  });

  it("PDP und Datenblatt nutzen dieselbe angefragte Sprache", async () => {
    rpc.mockResolvedValue({
      data: {
        ok: true,
        locale: "nl",
        pdp: { headline: "Buitenpost" },
        datasheet: { title: "Buitenpost" },
      },
      error: null,
    });

    await loadProductPdpLocalized(ARTIKEL, "nl-NL");
    await loadProductDatasheetLocalized("nl-NL", ARTIKEL);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_locale: "nl" });
    expect(rpc.mock.calls[1][1]).toMatchObject({ p_locale: "nl" });
  });
});
