import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

/**
 * Sprachwechsel bei geöffnetem Produkt: der PDP-Hook muss neu laden und darf
 * kein Ergebnis der alten Sprache weiterverwenden.
 */

const loadPdp = vi.fn();

vi.mock("../../api/pdp", () => ({
  loadProductPdpLocalized: (...args: unknown[]) => loadPdp(...args),
  getPaketKomponenten: vi.fn(async () => []),
  resolveArtikelNrBySlug: vi.fn(async () => ({ artikelNr: "A-1" })),
}));

vi.mock("@/lib/catalog-contract", () => ({
  getCapabilityClaims: vi.fn(async () => []),
}));

import { usePdpData } from "../usePdpData";

beforeEach(() => {
  loadPdp.mockReset();
  loadPdp.mockImplementation(async (_nr: string, locale: string) => ({
    value: { found: true, locale, headline: `h-${locale}` },
    requestedLocale: locale,
    resolvedLocale: locale,
    usedFallback: false,
    attempted: [locale],
  }));
});

describe("usePdpData bei Sprachwechsel", () => {
  it("lädt bei Wechsel de → nl neu und nutzt keinen alten Stand", async () => {
    const { result, rerender } = renderHook(
      ({ locale }: { locale: string }) =>
        usePdpData({ artikelNr: "A-1", locale }),
      { initialProps: { locale: "de" } },
    );

    await waitFor(() =>
      expect(result.current.phase).toBe("ready"),
    );
    expect(loadPdp).toHaveBeenLastCalledWith("A-1", "de");

    rerender({ locale: "nl-NL" });

    await waitFor(() => {
      expect(loadPdp).toHaveBeenLastCalledWith("A-1", "nl");
    });
    await waitFor(() => {
      expect(
        result.current.phase === "ready" ? result.current.resolvedLocale : null,
      ).toBe("nl");
    });
  });
});
