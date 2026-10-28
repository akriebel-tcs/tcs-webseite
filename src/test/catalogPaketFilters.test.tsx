import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Regressionstests für die Filterzeile der vorkonfigurierten Pakete.
 *
 * Belegter Fehler: `vorkonfigurierte-pakete` hat keine Serienpflicht
 * (`primary_filters = []`). Die Filterbasis wurde dreifach parallel geladen,
 * die Produktbasis brach mit `57014` ab und der Fehler wurde still zu einer
 * leeren Liste — die Filterzeile verschwand kommentarlos.
 *
 * Erwartung:
 *  1. Pakete zeigen die in der Produktbasis gesetzten Filter
 *     (System, Paketklasse, Montage AP/UP, Wohneinheiten) mit den Labels
 *     aus der Datenbank — auch ohne Serienauswahl.
 *  2. Ein Ladefehler der Filterbasis erzeugt einen sichtbaren Hinweis mit
 *     „Erneut versuchen" statt einer stillen leeren Zeile.
 */

const listing = vi.fn();
const sharedListing = vi.fn();
const filterOptions = vi.fn();

vi.mock("@/features/service/catalog/api/diagnostics", () => ({
  getCatalogDiagnostics: async () => ({
    supabaseConfigured: true,
    catalogContextRpc: { status: "ok" },
    checks: [],
  }),
}));

vi.mock("@/features/cms/hooks/useCmsPageContent", () => ({
  useCmsPageContent: () => ({
    sections: [],
    hasDbContent: false,
    text: (_s: string, _f: string, _l: string, fb = "") => fb,
    asset: (_s: string, _f: string, fb = "") => fb,
    assetAlt: (_s: string, _f: string, _l: string, fb = "") => fb,
  }),
  normalizeLocale: (l: string) => (l || "de").slice(0, 2),
}));

vi.mock("@/features/produkte/merkliste/MerklisteIndicator", () => ({
  default: () => null,
}));

vi.mock("@/features/service/catalog/api/catalog", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/service/catalog/api/catalog")
  >("@/features/service/catalog/api/catalog");
  return {
    ...actual,
    getCatalogContext: async () => null,
    getLocalizedFilterOptions: (...a: unknown[]) => filterOptions(...a),
    getSharedLocalizedFilterOptions: (...a: unknown[]) => filterOptions(...a),
    getSharedProductListing: (...a: unknown[]) => sharedListing(...a),
    getSharedProductListingLocalized: async (...a: unknown[]) => ({
      products: await listing(...a),
      locale: {
        requestedLocale: "de",
        effectiveLocale: "de",
        usedFallback: false,
        attempted: ["de"],
      },
    }),
    getSeriesForCategories: async () => [],
    getSerieFamilies: async () => [],
    getFacetsForSelection: async () => null,
    getProductColorFacets: async () => [],
    getProductColorsForArticles: async () => [],
  };
});

import CatalogMvp from "@/features/service/catalog/components/CatalogMvp";

const PAKETE_NAV = {
  nav_slug: "vorkonfigurierte-pakete",
  label_de: "Vorkonfigurierte Pakete",
  label_en: "Preconfigured packages",
  sort_order: 3,
  applicable_filters: [
    "system_typ",
    "paket_klasse",
    "montageart",
    "wohneinheiten",
    "color",
  ],
  // Bewusst leer: Pakete haben KEINE Serienpflicht.
  primary_filters: [],
  categories: [
    { category_slug: "pakete-audio", sort_order: 0 },
    { category_slug: "pakete-video", sort_order: 1 },
  ],
};

function paketRows(count = 12) {
  return Array.from({ length: count }, (_, i) => ({
    artikel_nr: `P${i}`,
    title: `Paket ${i}`,
    system_typ: i % 2 === 0 ? "2-draht" : "ip",
    montageart: i % 2 === 0 ? "AP" : "UP",
    paket_klasse: i % 3 === 0 ? "basis" : "komfort",
    wohneinheiten: (i % 4) + 1,
  }));
}

const FILTER_OPTION_ROWS = [
  { field_key: "system_typ", field_label: "System", option_key: "2-draht", option_label: "2-Draht", option_count: 6, sort_order: 1 },
  { field_key: "system_typ", field_label: "System", option_key: "ip", option_label: "IP", option_count: 6, sort_order: 2 },
  { field_key: "montageart", field_label: "Montage", option_key: "AP", option_label: "Aufputz", option_count: 6, sort_order: 1 },
  { field_key: "montageart", field_label: "Montage", option_key: "UP", option_label: "Unterputz", option_count: 6, sort_order: 2 },
  { field_key: "paket_klasse", field_label: "Paketklasse", option_key: "basis", option_label: "Basis", option_count: 4, sort_order: 1 },
  { field_key: "paket_klasse", field_label: "Paketklasse", option_key: "komfort", option_label: "Komfort", option_count: 8, sort_order: 2 },
  { field_key: "wohneinheiten", field_label: "Wohneinheiten", option_key: "1", option_label: "1", option_count: 3, sort_order: 1 },
];

beforeEach(() => {
  listing.mockReset();
  sharedListing.mockReset();
  filterOptions.mockReset();
  filterOptions.mockResolvedValue(FILTER_OPTION_ROWS);
});

describe("Paketfilter im Online-Produktkatalog", () => {
  it("zeigt Audio/Video-, Montage- und Paketfilter ohne Serienpflicht", async () => {
    listing.mockResolvedValue(paketRows());
    sharedListing.mockResolvedValue(paketRows());

    render(<CatalogMvp selectedNav={PAKETE_NAV} />);

    await waitFor(() => {
      expect(screen.getByText("Paketklasse")).toBeTruthy();
    });
    // Labels kommen aus der Produktbasis (nicht aus Namensheuristik).
    expect(screen.getByRole("button", { name: /2-Draht/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Aufputz/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Unterputz/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Komfort/ })).toBeTruthy();
    // Wohneinheiten-Eingabe (Beschriftung kommt aus dem Sprachkatalog; in
    // der Testumgebung ohne geladene Sprachdateien erscheint der Schlüssel).
    expect(
      screen.getByLabelText("katalog.filters.groups.wohneinheiten.label"),
    ).toBeTruthy();
    cleanup();
  });

  it("meldet einen Ladefehler der Filterbasis und lädt auf Klick erneut", async () => {
    const timeout = Object.assign(
      new Error("canceling statement due to statement timeout"),
      { code: "57014" },
    );
    // Produktliste lädt, nur die Filterbasis scheitert.
    listing.mockResolvedValue(paketRows());
    sharedListing.mockRejectedValue(timeout);

    render(<CatalogMvp selectedNav={PAKETE_NAV} />);

    await waitFor(() => {
      expect(
        screen.getByText("katalog.filters.status.error"),
      ).toBeTruthy();
    });

    sharedListing.mockResolvedValue(paketRows());
    await userEvent.click(
      screen.getByRole("button", { name: "katalog.filters.status.retry" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Paketklasse")).toBeTruthy();
    });
    expect(screen.queryByText("katalog.filters.status.error")).toBeNull();
    cleanup();
  });

  it("behält die geladene Liste bei einem Nachladefehler und nennt den echten Fehler", async () => {
    listing.mockResolvedValue(paketRows(6));
    sharedListing.mockResolvedValue(paketRows(6));

    render(<CatalogMvp selectedNav={PAKETE_NAV} />);
    await waitFor(() => {
      expect(screen.getByText("Paket 0")).toBeTruthy();
    });

    // Nachladen scheitert (Zeitüberschreitung der Produktbasis).
    // Fachlicher Fehler: wird nicht wiederholt, dadurch ist der Test
    // zeitlich stabil. Die Zeitüberschreitung `57014` samt begrenzter
    // Wiederholung ist in `sharedListingRetry.test.ts` abgedeckt.
    listing.mockRejectedValue({
      code: "42P01",
      message: 'relation "x" does not exist',
      details: null,
      hint: null,
    });
    await userEvent.type(
      screen.getByLabelText("katalog.target.search.aria"),
      "video",
    );

    await waitFor(
      () => {
        expect(screen.getByText(/code: 42P01/)).toBeTruthy();
      },
      { timeout: 9000 },
    );
    // Liste bleibt sichtbar, statt geleert zu werden.
    expect(screen.getByText("Paket 0")).toBeTruthy();
    expect(screen.getByText("katalog.mvp.errorBox.stale")).toBeTruthy();
    expect(screen.queryByText(/\[object Object\]/)).toBeNull();
    cleanup();
  });
});

