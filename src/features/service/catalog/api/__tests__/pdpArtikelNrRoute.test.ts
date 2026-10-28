import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Route-Auflösung: eine gültige TCS-Artikelnummer in der Adresse darf ohne
 * Listing-Index direkt in den PDP-Vertrag gehen. Nur echte redaktionelle
 * Slugs verwenden die kanalbegrenzte Auflösung — und diese arbeitet mit
 * konservativen Seiten statt einer einzelnen 1000er Abfrage.
 */

const getProductListing = vi.fn();

vi.mock("../catalog", () => ({
  CATALOG_CHANNEL_KEY: "pdp_de",
  DATASHEET_CHANNEL_KEY: "datenblatt_de",
  getProductListing: (...args: unknown[]) => getProductListing(...args),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: { rpc: vi.fn() },
  isSupabaseConfigured: () => true,
}));

import {
  isTcsArtikelNr,
  normalizeArtikelNr,
  resolveArtikelNrBySlug,
} from "../pdp";

beforeEach(() => {
  getProductListing.mockReset();
});

describe("Artikelnummer aus der Route", () => {
  it("erkennt das TCS-Artikelnummernformat", () => {
    expect(isTcsArtikelNr("ADA45015-0030")).toBe(true);
    expect(isTcsArtikelNr("ada59010-0030")).toBe(true);
    expect(isTcsArtikelNr("ADA45015")).toBe(true);
    expect(isTcsArtikelNr("aussenstation-audio")).toBe(false);
    expect(isTcsArtikelNr("")).toBe(false);
    expect(normalizeArtikelNr(" ada45015-0030 ")).toBe("ADA45015-0030");
  });

  it("löst ADA45015-0030 ohne Listing-Aufruf auf", async () => {
    const diag = await resolveArtikelNrBySlug("ADA45015-0030", "en");
    expect(diag.artikelNr).toBe("ADA45015-0030");
    expect(diag.reason).toBe("artikel_nr_from_route");
    expect(diag.transient).toBeUndefined();
    expect(getProductListing).not.toHaveBeenCalled();
  });

  it("liefert auch bei nicht erreichbarem Listing kein channel_listing_unavailable", async () => {
    getProductListing.mockRejectedValue(new Error("statement timeout"));
    for (const locale of ["nl", "pl", "en", "nl"]) {
      const diag = await resolveArtikelNrBySlug("ada45015-0030", locale);
      expect(diag.artikelNr).toBe("ADA45015-0030");
      expect(diag.reason).not.toBe("channel_listing_unavailable");
    }
    expect(getProductListing).not.toHaveBeenCalled();
  });

  it("nutzt für redaktionelle Slugs konservative Seiten", async () => {
    getProductListing.mockImplementation(
      async ({ offset }: { offset?: number }) =>
        offset === 0
          ? Array.from({ length: 200 }, (_, i) => ({
              artikel_nr: `X${i}`,
              pdp_slug: `slug-${i}`,
            }))
          : [{ artikel_nr: "ADA45015-0030", pdp_slug: "aussenstation-audio" }],
    );

    const diag = await resolveArtikelNrBySlug("aussenstation-audio", "de");
    expect(diag.artikelNr).toBe("ADA45015-0030");
    expect(diag.pdpViewMatchField).toBe("pdp_slug");
    const limits = getProductListing.mock.calls.map(
      (c) => (c[0] as { limit?: number }).limit,
    );
    expect(limits.every((l) => l === 200)).toBe(true);
    expect(getProductListing.mock.calls.length).toBeGreaterThan(1);
  });
});
