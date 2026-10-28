/**
 * Regressionstest: Der Block „Sprachen" darf niemals verschwinden.
 *
 * Simuliert eine gestörte Sprachstand-Berechnung (Serverfehler 500 bzw.
 * Zeitüberschreitung). Erwartet: Sprachliste bleibt sichtbar, intern
 * aktivierbare Sprachen bleiben bedienbar, der Fehler wird getrennt gemeldet.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const locales = [
  {
    locale: "de",
    label_de: "Deutsch",
    label_native: "Deutsch",
    is_source: true,
    is_active: true,
    is_public: true,
    fallback_locale: null,
    sort_order: 1,
    deepl_supported: true,
    notes: null,
  },
  {
    locale: "nl",
    label_de: "Niederländisch",
    label_native: "Nederlands",
    is_source: false,
    is_active: true,
    is_public: false,
    fallback_locale: "de",
    sort_order: 2,
    deepl_supported: true,
    notes: null,
  },
  {
    locale: "da",
    label_de: "Dänisch",
    label_native: "Dansk",
    is_source: false,
    is_active: false,
    is_public: false,
    fallback_locale: "de",
    sort_order: 3,
    deepl_supported: true,
    notes: null,
  },
];

const basics = {
  rates: [],
  locales,
  providers: [{ provider: "lovable_ai", label: "Lovable AI", configured: true, secret: "" }],
  global_authorization_configured: true,
  limits: {
    max_items_per_step: 25,
    run_cost_limit_default: 5,
    run_cost_limit_global: 50,
    model_calls_per_day: 5000,
  },
};

const fetchTranslationBasics = vi.fn();
const fetchTranslationCoverage = vi.fn();

vi.mock("@/features/admin/api/cmsTranslationRuns", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    fetchTranslationBasics: (...a: unknown[]) => fetchTranslationBasics(...a),
    fetchTranslationCoverage: (...a: unknown[]) => fetchTranslationCoverage(...a),
    readRuns: vi.fn(async () => []),
    readRun: vi.fn(async () => null),
    readPageList: vi.fn(async () => []),
    findRunForLocale: vi.fn(async () => null),
  };
});

vi.mock("@/features/admin/api/cmsLocaleVisibility", () => ({
  setLocaleVisibility: vi.fn(async () => ({ locale: "nl", is_active: true, is_public: false })),
  checkPublicReleaseReadiness: vi.fn(async (locale: string) => ({
    locale,
    ready: false,
    missing: "Noch offen.",
    contentMissing: 1,
    uiMissing: 0,
  })),
}));

vi.mock("@/features/admin/components/AutopilotPanel", () => ({
  default: () => <div>Automatik</div>,
}));

describe("Sprachblock bleibt bei gestörten Nebenabfragen sichtbar", () => {
  beforeEach(() => {
    fetchTranslationBasics.mockReset();
    fetchTranslationCoverage.mockReset();
    fetchTranslationBasics.mockResolvedValue(basics);
    fetchTranslationCoverage.mockRejectedValue(
      new Error("rpc_failed:rpc_internal_translation_coverage_cached:500"),
    );
  });

  // Grosszügiges Zeitfenster: der Arbeitsbereich rendert viele Blöcke.
  it("zeigt Sprachliste und Aktiv-Schalter trotz Coverage-Fehler 500", async () => {
    const { default: TranslationWorkbench } = await import("../TranslationWorkbench");
    render(<TranslationWorkbench />);

    await waitFor(() => {
      expect(screen.getByLabelText("Sprachen und Sichtbarkeit")).toBeInTheDocument();
    });
    expect(screen.getByText("Niederländisch")).toBeInTheDocument();
    expect(screen.getByText("Dänisch")).toBeInTheDocument();

    const nl = screen.getByLabelText("Niederländisch: im CMS bearbeitbar");
    expect(nl).toBeEnabled();
    expect(nl).toBeChecked();
    // Noch nicht intern aktive Sprache bleibt bedienbar (anschaltbar).
    expect(screen.getByLabelText("Dänisch: im CMS bearbeitbar")).toBeEnabled();

    // Der Zahlenfehler wird getrennt gemeldet, nicht als Ausfall des Blocks.
    await waitFor(() => {
      expect(
        screen.getByText(/Übersetzungszahlen konnten gerade nicht berechnet werden/),
      ).toBeInTheDocument();
    });
  }, 20000);

  it("lässt die Sprachliste auch bei einer Zeitüberschreitung stehen", async () => {
    fetchTranslationCoverage.mockRejectedValue(new Error("canceling statement due to timeout 504"));
    const { default: TranslationWorkbench } = await import("../TranslationWorkbench");
    render(<TranslationWorkbench />);

    await waitFor(() => {
      expect(screen.getByLabelText("Sprachen und Sichtbarkeit")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Niederländisch: im CMS bearbeitbar")).toBeEnabled();
    await waitFor(() => {
      expect(screen.getByText(/zu lange gedauert/)).toBeInTheDocument();
    });
  }, 20000);

  it("meldet einen Fehler der Sprachliste lokal mit „Erneut laden“", async () => {
    fetchTranslationBasics.mockRejectedValue(new Error("Dienst nicht erreichbar"));
    const { default: TranslationWorkbench } = await import("../TranslationWorkbench");
    render(<TranslationWorkbench />);

    await waitFor(() => {
      expect(screen.getByLabelText("Sprachen und Sichtbarkeit")).toBeInTheDocument();
    });
    expect(screen.getAllByRole("button", { name: "Erneut laden" }).length).toBeGreaterThan(0);
  });
});
