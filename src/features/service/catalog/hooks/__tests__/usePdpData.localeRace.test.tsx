import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

/**
 * Sprachwechsel-Race: eine langsame Antwort der ALTEN Sprache darf den
 * neuen Request nie überschreiben und nie „nicht gefunden" auslösen.
 */

const loadPdp = vi.fn();
const resolveSlug = vi.fn();

vi.mock("../../api/pdp", () => ({
  loadProductPdpLocalized: (...args: unknown[]) => loadPdp(...args),
  getPaketKomponenten: vi.fn(async () => []),
  resolveArtikelNrBySlug: (...args: unknown[]) => resolveSlug(...args),
}));

vi.mock("@/lib/catalog-contract", () => ({
  getCapabilityClaims: vi.fn(async () => []),
}));

import { usePdpData } from "../usePdpData";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  loadPdp.mockReset();
  resolveSlug.mockReset();
  resolveSlug.mockResolvedValue({ artikelNr: "ADA45015-0030" });
});

describe("usePdpData Sprachwechsel-Race", () => {
  it("verwirft eine späte Antwort der alten Sprache", async () => {
    const slow = deferred<unknown>();
    loadPdp.mockImplementation(async (_nr: string, locale: string) => {
      if (locale === "pl") return slow.promise;
      return {
        value: { found: true, locale },
        requestedLocale: locale,
        resolvedLocale: locale,
        usedFallback: false,
        attempted: [locale],
      };
    });

    const { result, rerender } = renderHook(
      ({ locale }: { locale: string }) =>
        usePdpData({ artikelNr: "ADA45015-0030", locale }),
      { initialProps: { locale: "pl" } },
    );

    rerender({ locale: "en" });
    await waitFor(() => expect(result.current.phase).toBe("ready"));

    // Alte PL-Antwort trifft erst jetzt ein — und zwar als "kein Treffer".
    slow.resolve(null);
    await new Promise((r) => setTimeout(r, 0));

    expect(result.current.phase).toBe("ready");
    expect(
      result.current.phase === "ready" ? result.current.resolvedLocale : null,
    ).toBe("en");
  });

  it("bleibt bei schnellen Wechseln nl→pl→en→nl bei der letzten Sprache", async () => {
    loadPdp.mockImplementation(async (_nr: string, locale: string) => ({
      value: { found: true, locale },
      requestedLocale: locale,
      resolvedLocale: locale,
      usedFallback: false,
      attempted: [locale],
    }));

    const { result, rerender } = renderHook(
      ({ locale }: { locale: string }) =>
        usePdpData({ artikelNr: "ADA45015-0030", locale }),
      { initialProps: { locale: "nl" } },
    );
    rerender({ locale: "pl" });
    rerender({ locale: "en" });
    rerender({ locale: "nl" });

    await waitFor(() =>
      expect(
        result.current.phase === "ready" ? result.current.resolvedLocale : null,
      ).toBe("nl"),
    );
    expect(result.current.phase).toBe("ready");
  });

  it("zeigt einen transienten Slug-Fehler nicht als „nicht gefunden“", async () => {
    resolveSlug.mockResolvedValue({
      artikelNr: null,
      reason: "channel_listing_unavailable",
      transient: true,
    });
    loadPdp.mockResolvedValue(null);

    const { result } = renderHook(() =>
      usePdpData({ slug: "ada45015-0030", locale: "en" }),
    );

    await waitFor(() => expect(result.current.phase).toBe("error"));
  });

  it("meldet einen echten Nicht-Treffer weiterhin als „nicht gefunden“", async () => {
    resolveSlug.mockResolvedValue({
      artikelNr: null,
      reason: "not_visible_in_channel",
    });

    const { result } = renderHook(() =>
      usePdpData({ slug: "gibt-es-nicht", locale: "en" }),
    );

    await waitFor(() => expect(result.current.phase).toBe("notfound"));
  });
});
