/**
 * Mehrsprachigkeit der Merkliste.
 *
 * Geprüft wird:
 * - ein alter, deutsch gespeicherter Eintrag zeigt in PL den polnischen
 *   PDP-Text (localStorage ist keine Sprachwahrheit),
 * - ein Sprachwechsel PL → NL aktualisiert Titel und Kurztext,
 * - ein einzelner Fehlschlag nutzt nur für diesen Artikel den lokalen
 *   Fallback und blockiert die übrigen Artikel nicht,
 * - das Breadcrumb-Segment `merkliste` ist in PL und NL übersetzt.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import i18n from "@/i18n";
import { useMerklisteProducts } from "../useMerklisteProducts";
import type { MerklisteItem } from "../useMerkliste";

const getProductPdp = vi.hoisted(() => vi.fn());
vi.mock("@/features/service/catalog/api/pdp", () => ({
  getProductPdp,
}));

const payload = (locale: string, nr: string) => ({
  headline: `${locale.toUpperCase()} Titel ${nr}`,
  subheadline: `${locale.toUpperCase()} Kurztext ${nr}`,
});

const items: MerklisteItem[] = [
  { artikel_nr: "ADA45015-0030", title: "Deutscher Alt-Titel", teaser: "Alter Kurztext" },
  { artikel_nr: "ADA59010-0030", title: "Deutscher Alt-Titel 2", teaser: "Alter Kurztext 2" },
];

describe("Merkliste — Sprachaktualisierung der Produkttexte", () => {
  beforeEach(() => {
    getProductPdp.mockReset();
  });

  it("zeigt für einen deutsch gespeicherten Alt-Eintrag den polnischen PDP-Text", async () => {
    getProductPdp.mockImplementation(async (nr: string, locale: string) =>
      payload(locale, nr),
    );
    const { result } = renderHook(() => useMerklisteProducts(items, "pl"));
    await waitFor(() =>
      expect(result.current.byArtikel.get("ADA45015-0030")?.title).toBe(
        "PL Titel ADA45015-0030",
      ),
    );
    expect(result.current.byArtikel.get("ADA45015-0030")?.teaser).toBe(
      "PL Kurztext ADA45015-0030",
    );
    // Alle Artikel werden parallel geladen.
    expect(getProductPdp).toHaveBeenCalledTimes(2);
  });

  it("aktualisiert Titel und Kurztext beim Sprachwechsel PL → NL", async () => {
    getProductPdp.mockImplementation(async (nr: string, locale: string) =>
      payload(locale, nr),
    );
    const { result, rerender } = renderHook(
      ({ locale }: { locale: string }) => useMerklisteProducts(items, locale),
      { initialProps: { locale: "pl" } },
    );
    await waitFor(() =>
      expect(result.current.byArtikel.get("ADA59010-0030")?.title).toBe(
        "PL Titel ADA59010-0030",
      ),
    );
    rerender({ locale: "nl" });
    await waitFor(() =>
      expect(result.current.byArtikel.get("ADA59010-0030")?.title).toBe(
        "NL Titel ADA59010-0030",
      ),
    );
    expect(result.current.byArtikel.get("ADA59010-0030")?.teaser).toBe(
      "NL Kurztext ADA59010-0030",
    );
  });

  it("nutzt bei Teilausfall nur für den betroffenen Artikel den lokalen Fallback", async () => {
    getProductPdp.mockImplementation(async (nr: string, locale: string) => {
      if (nr === "ADA45015-0030") throw new Error("rpc failed");
      return payload(locale, nr);
    });
    const { result } = renderHook(() => useMerklisteProducts(items, "pl"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const failed = result.current.byArtikel.get("ADA45015-0030");
    expect(failed?.failed).toBe(true);
    expect(failed?.title).toBeNull();

    const ok = result.current.byArtikel.get("ADA59010-0030");
    expect(ok?.failed).toBe(false);
    expect(ok?.title).toBe("PL Titel ADA59010-0030");
  });
});

describe("Merkliste — Breadcrumb-Segment", () => {
  it("ist in PL und NL übersetzt und fällt nicht auf den deutschen Slug zurück", async () => {
    for (const locale of ["pl", "nl", "en", "de"]) {
      const t = i18n.getFixedT(locale, "navigation");
      const label = t("breadcrumb.segments.merkliste");
      expect(label).not.toBe("breadcrumb.segments.merkliste");
      expect(label.length).toBeGreaterThan(0);
    }
    expect(i18n.getFixedT("pl", "navigation")("breadcrumb.segments.merkliste")).not.toBe(
      "Merkliste",
    );
    expect(i18n.getFixedT("nl", "navigation")("breadcrumb.segments.merkliste")).not.toBe(
      "Merkliste",
    );
  });
});
