import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Sprachvertrag der Produktliste: Der ausgewählte Website-Localecode geht
 * unverändert (nur normalisiert) als `p_locale` an
 * `rpc_get_channel_product_listing`. Die Produktbasis löst den Rückfall
 * feldweise (angefordert → `en` → `de`) selbst auf; der Client darf deshalb
 * nicht mehr probieren und nicht global auf Deutsch umschalten.
 */

const rpc = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
  isSupabaseConfigured: () => true,
}));

import { getProductListingLocalized, resolveListingLocale } from "../catalog";

function rows(prefix: string, count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    artikel_nr: `A${i}`,
    title: `${prefix} ${i}`,
    teaser: `${prefix}-teaser ${i}`,
  }));
}

beforeEach(() => {
  rpc.mockReset();
});

describe("Listing-Sprachvertrag", () => {
  it("reicht PL unverändert durch und lädt genau einmal", async () => {
    rpc.mockResolvedValue({ data: rows("Stacja zewnętrzna"), error: null });

    const res = await getProductListingLocalized({ locale: "pl", limit: 24 });
    expect(rpc).toHaveBeenCalledTimes(1);
    const [name, args] = rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(name).toBe("rpc_get_channel_product_listing");
    expect(args.p_locale).toBe("pl");
    expect(args.p_channel_key).toBe("pdp_de");
    expect(res.locale.requestedLocale).toBe("pl");
    expect(res.locale.effectiveLocale).toBe("pl");
    expect(res.locale.usedFallback).toBe(false);
    expect(res.products[0]?.title).toBe("Stacja zewnętrzna 0");
  });

  it("normalisiert nl-NL auf nl und schaltet nicht auf Deutsch um", async () => {
    rpc.mockResolvedValue({ data: rows("Deurstation"), error: null });

    const res = await getProductListingLocalized({ locale: "nl-NL", limit: 12 });
    expect(rpc).toHaveBeenCalledTimes(1);
    const [, args] = rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(args.p_locale).toBe("nl");
    expect(res.locale.effectiveLocale).toBe("nl");
    expect(res.locale.usedFallback).toBe(false);
  });

  it("meldet einen echten Sprachwechsel nur, wenn die Antwort ihn meldet", async () => {
    rpc.mockResolvedValue({
      data: rows("Außenstation").map((r) => ({ ...r, resolved_locale: "de" })),
      error: null,
    });

    const res = await getProductListingLocalized({ locale: "pl", limit: 5 });
    expect(res.locale.effectiveLocale).toBe("de");
    expect(res.locale.usedFallback).toBe(true);
  });

  it("resolveListingLocale ist eine reine Durchreiche (keine Probe)", async () => {
    const res = resolveListingLocale("PL");
    expect(res).toEqual({
      requestedLocale: "pl",
      effectiveLocale: "pl",
      usedFallback: false,
      attempted: ["pl"],
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});
