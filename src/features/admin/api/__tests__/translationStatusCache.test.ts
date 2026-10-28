import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Schutz gegen Anfragenstürme in der Statusübersicht.
 *
 * Die Oberfläche darf beim Öffnen des Übersetzungsbereichs nur EINE Anfrage
 * auslösen, auch wenn mehrere Bereiche gleichzeitig laden. Ein frisches
 * Ergebnis wird kurz wiederverwendet; „Zahlen neu berechnen" erzwingt eine
 * neue Anfrage mit serverseitiger Neuberechnung.
 */

const invokeMock = vi.fn();

vi.mock("@/lib/cmsSupabase/client", () => ({
  getCmsSupabaseClient: () => ({
    functions: { invoke: invokeMock },
  }),
}));

const payload = {
  coverage: {
    de_translatable_fields: 18446,
    areas: ["section_field"],
    source_by_area: { section_field: 17869 },
    locales: [],
    cache: {
      hit: true,
      is_stale: false,
      computed_at: new Date().toISOString(),
      compute_ms: 0,
      age_seconds: 12,
      refreshed_locale: null,
      pending_locales: [],
    },
  },
  rates: [],
  locales: [],
  providers: [],
  global_authorization_configured: true,
  limits: {
    max_items_per_step: 200,
    run_cost_limit_default: 5,
    run_cost_limit_global: 50,
    model_calls_per_day: 5000,
  },
};

describe("Statusübersicht: Entdopplung und Zwischenspeicher", () => {
  beforeEach(async () => {
    invokeMock.mockReset();
    invokeMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: payload, error: null }), 5);
        }),
    );
    const mod = await import("../cmsTranslationRuns");
    mod.resetTranslationStatusCache();
  });

  it("bündelt gleichzeitige Aufrufe zu einer einzigen Anfrage", async () => {
    const { fetchTranslationStatus } = await import("../cmsTranslationRuns");
    const results = await Promise.all([
      fetchTranslationStatus(),
      fetchTranslationStatus(),
      fetchTranslationStatus(),
    ]);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(results[0].coverage.de_translatable_fields).toBe(18446);
  });

  it("verwendet ein frisches Ergebnis wieder statt neu zu fragen", async () => {
    const { fetchTranslationStatus } = await import("../cmsTranslationRuns");
    await fetchTranslationStatus();
    await fetchTranslationStatus();
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it("fragt nach Ablauf der Wiederverwendung erneut", async () => {
    const { fetchTranslationStatus } = await import("../cmsTranslationRuns");
    await fetchTranslationStatus();
    await fetchTranslationStatus({ maxAgeMs: 0 });
    expect(invokeMock).toHaveBeenCalledTimes(2);
  });

  it("erzwingt bei „Zahlen neu berechnen\" eine serverseitige Neuberechnung", async () => {
    const { fetchTranslationStatus } = await import("../cmsTranslationRuns");
    await fetchTranslationStatus();
    await fetchTranslationStatus({ refresh: true });
    expect(invokeMock).toHaveBeenCalledTimes(2);
    const body = invokeMock.mock.calls[1][1].body as Record<string, unknown>;
    expect(body.action).toBe("status");
    expect(body.refresh_coverage).toBe(true);
    expect(body.coverage_max_age_seconds).toBe(0);
  });

  it("fragt im Normalfall mit gespeicherter Zusammenfassung", async () => {
    const { fetchTranslationStatus } = await import("../cmsTranslationRuns");
    await fetchTranslationStatus();
    const body = invokeMock.mock.calls[0][1].body as Record<string, unknown>;
    expect(body.refresh_coverage).toBe(false);
    expect(body.coverage_max_age_seconds).toBe(900);
  });
});
