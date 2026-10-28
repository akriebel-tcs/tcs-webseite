/**
 * Etappe 4A — Verhaltenstests des gemeinsamen Seitenlesers
 * (`src/features/cms/hooks/useCmsPageContent.ts`).
 *
 * Nur Lesepfad, nur künstliche Antworten. Es wird KEINE Datenbank berührt.
 * Der Steuerzustand liegt in `vi.hoisted`, damit die gehobene Modulattrappe
 * dieselben Objekte benutzt wie die Tests.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Diese Tests pruefen den CMS-Light-Lesepfad (Supabase); Standardquelle ist sonst Storyblok.
vi.stubEnv("VITE_CONTENT_SOURCE", "supabase");
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCmsPageContent, buildSectionTree } from "@/features/cms/hooks/useCmsPageContent";
import { resetLocaleRegistryCache } from "@/i18n/localeRegistry";

type Rows = Record<string, unknown>[];

const mockState = vi.hoisted(() => {
  interface TablePlan {
    /** Antwortseiten in Leseordnung. */
    pages?: Array<{ data: Record<string, unknown>[] | null; error: unknown }>;
    /** Kurzform: eine einzige vollständige Seite. */
    rows?: Record<string, unknown>[];
    /** Antwort erst freigeben, wenn dieses Versprechen erfüllt ist. */
    gate?: Promise<void>;
  }
  interface Plan {
    configured?: boolean;
    tables: Record<string, TablePlan>;
    locales?: Record<string, unknown>[] | null;
  }
  return {
    /** Antwortpläne: je Seitenschlüssel oder als letzter gesetzter Plan. */
    plans: new Map<string, Plan>(),
    /** Letzter gesetzter Plan (für Seiten ohne eigenen Plan). */
    ctx: { planKey: "default" },
    /** Aufgezeichnete Sortierspalten je Tabelle. */
    orders: {} as Record<string, string[][]>,
    /** Seitenzeiger je Seite+Tabelle (der Leser ruft `from()` pro Seite neu auf). */
    cursor: {} as Record<string, number>,
    /** Zähler gestarteter Abfragen je Seitenschlüssel. */
    started: {} as Record<string, number>,
    /** Register-Antwort erst nach Freigabe. */
    localesGate: { promise: null as Promise<void> | null },
  };
});

type Plan = Parameters<typeof mockState.plans.set>[1];

vi.mock("@/lib/cmsSupabase/client", () => {
  const planFor = (pageKey: string | null): Plan => {
    if (pageKey && mockState.plans.has(pageKey)) return mockState.plans.get(pageKey) as Plan;
    return (mockState.plans.get(mockState.ctx.planKey) as Plan) ?? { tables: {} };
  };

  const makeQuery = (table: string) => {
    const orders: string[] = [];
    let pageKey: string | null = null;
    const q: Record<string, unknown> = {};
    const chain = () => q as never;
    q.select = chain;
    q.eq = (col: string, value: unknown) => {
      if (col === "page_key") pageKey = String(value);
      return chain();
    };
    q.order = (col: string) => {
      orders.push(col);
      return chain();
    };
    q.range = async () => {
      (mockState.orders[table] ??= []).push([...orders]);
      const key = pageKey ?? "?";
      mockState.started[key] = (mockState.started[key] ?? 0) + 1;
      const plan = planFor(pageKey);
      const tp = plan.tables[table] ?? {};
      const pages = tp.pages ?? [{ data: tp.rows ?? [], error: null }];
      const cursorKey = `${key}|${table}`;
      const index = mockState.cursor[cursorKey] ?? 0;
      mockState.cursor[cursorKey] = index + 1;
      const answer = pages[Math.min(index, pages.length - 1)];
      // Erst NACH der Startaufzeichnung warten: Tests können damit auf eine
      // tatsächlich laufende Anfrage warten, bevor sie sie freigeben.
      if (tp.gate) await tp.gate;
      return answer;
    };
    return q;
  };

  return {
    isCmsSupabaseConfigured: () => planFor(null).configured !== false,
    getCmsSupabaseClient: () => ({
      from: (table: string) => {
        if (table === "cms_locales") {
          return {
            select: () => ({
              order: async () => {
                if (mockState.localesGate.promise) await mockState.localesGate.promise;
                const rows = planFor(null).locales ?? null;
                return { data: rows, error: rows ? null : { message: "no locales" } };
              },
            }),
          };
        }
        return makeQuery(table);
      },
    }),
  };
});

function setPlan(key: string, plan: Plan) {
  for (const k of Object.keys(mockState.cursor)) delete mockState.cursor[k];
  mockState.plans.set(key, plan);
  mockState.ctx.planKey = key;
}

/** Wartet, bis für eine Seite tatsächlich Abfragen gestartet wurden. */
async function waitForStart(pageKey: string, count = 3) {
  await waitFor(() => expect(mockState.started[pageKey] ?? 0).toBeGreaterThanOrEqual(count));
}

function makeGate() {
  let release: () => void = () => undefined;
  const promise = new Promise<void>((r) => {
    release = () => r();
  });
  return { promise, release };
}

const field = (
  section_key: string,
  field_key: string,
  locale: string,
  value: string | null,
  review_status: string | null = "geprueft",
) => ({ section_key, field_key, locale, value, review_status });

let consoleWarn: ReturnType<typeof vi.spyOn>;
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mockState.plans.clear();
  mockState.ctx.planKey = "default";
  mockState.localesGate.promise = null;
  for (const k of Object.keys(mockState.orders)) delete mockState.orders[k];
  for (const k of Object.keys(mockState.cursor)) delete mockState.cursor[k];
  for (const k of Object.keys(mockState.started)) delete mockState.started[k];
  resetLocaleRegistryCache();
  vi.restoreAllMocks();
  consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

// ---------------------------------------------------------------------------
// 1 + 2: Seitenwechsel
// ---------------------------------------------------------------------------

describe("Seitenwechsel", () => {
  it("Seite A mit Inhalten → Seite B ohne Inhalte: keine A-Reste", async () => {
    setPlan("a", {
      tables: {
        cms_section_fields: { rows: [field("hero", "headline", "de", "A-Titel")] },
        cms_assets: { rows: [] },
        cms_sections: {
          rows: [
            { id: "s1", section_key: "hero", section_type: "hero_v1", sort_order: 1, parent_section_id: null },
          ],
        },
      },
    });

    const { result, rerender } = renderHook(({ p }: { p: string }) => useCmsPageContent(p), {
      initialProps: { p: "page-a" },
    });
    await waitFor(() => expect(result.current.hasDbContent).toBe(true));
    expect(result.current.text("hero", "headline", "de", "fb")).toBe("A-Titel");
    expect(result.current.sections.map((s) => s.section_key)).toEqual(["hero"]);

    setPlan("b", {
      tables: { cms_section_fields: { rows: [] }, cms_assets: { rows: [] }, cms_sections: { rows: [] } },
    });
    rerender({ p: "page-b" });

    // Erster Render der neuen Seite: nichts von A.
    expect(result.current.text("hero", "headline", "de", "fb")).toBe("fb");
    expect(result.current.sections).toEqual([]);
    expect(result.current.hasDbContent).toBe(false);
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.text("hero", "headline", "de", "fb")).toBe("fb");
    expect(result.current.sections).toEqual([]);
    expect(result.current.hasDbContent).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("bereits laufende A-Antwort überschreibt die neue Seite nicht", async () => {
    const gate = makeGate();
    setPlan("page-a", {
      tables: {
        cms_section_fields: { rows: [field("hero", "headline", "de", "A-Titel")], gate: gate.promise },
        cms_assets: { rows: [], gate: gate.promise },
        cms_sections: { rows: [], gate: gate.promise },
      },
    });
    setPlan("page-b", {
      tables: {
        cms_section_fields: { rows: [field("hero", "headline", "de", "B-Titel")] },
        cms_assets: { rows: [] },
        cms_sections: { rows: [] },
      },
    });

    const { result, rerender } = renderHook(({ p }: { p: string }) => useCmsPageContent(p), {
      initialProps: { p: "page-a" },
    });
    // Erst wechseln, wenn A nachweislich läuft (alle drei Abfragen gestartet).
    await waitForStart("page-a");
    rerender({ p: "page-b" });

    await waitFor(() => expect(result.current.text("hero", "headline", "de", "fb")).toBe("B-Titel"));

    // Erst jetzt antwortet die alte Seite — sie darf nichts mehr überschreiben.
    await act(async () => {
      gate.release();
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(result.current.text("hero", "headline", "de", "fb")).toBe("B-Titel");
    expect(result.current.error).toBeNull();
  });

  it("Unmount: bereits laufende Antwort löst keinen Zustandswechsel aus", async () => {
    const gate = makeGate();
    setPlan("page-a", {
      tables: {
        cms_section_fields: { rows: [field("hero", "headline", "de", "X")], gate: gate.promise },
        cms_assets: { rows: [], gate: gate.promise },
        cms_sections: { rows: [], gate: gate.promise },
      },
    });
    const { unmount } = renderHook(() => useCmsPageContent("page-a"));
    await waitForStart("page-a");
    unmount();

    await act(async () => {
      gate.release();
      await new Promise((r) => setTimeout(r, 40));
    });
    // React meldet einen Zustandswechsel nach dem Ausbau über console.error.
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it("leerer/nicht gesetzter Seitenschlüssel liefert leeren Zustand", async () => {
    setPlan("none", { tables: {} });
    const { result } = renderHook(() => useCmsPageContent(null));
    expect(result.current.loading).toBe(false);
    expect(result.current.hasDbContent).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.text("a", "b", "de", "fb")).toBe("fb");
  });

  it("nicht konfigurierte Datenbank: leer plus Fehlerkennung", async () => {
    setPlan("unconf", { configured: false, tables: {} });
    const { result } = renderHook(() => useCmsPageContent("page-a"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("unconfigured");
    expect(result.current.hasDbContent).toBe(false);
    expect(result.current.sections).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3: Blättern und Fehler
// ---------------------------------------------------------------------------

describe("vollständiges Lesen", () => {
  const okAssets = { rows: [] as Rows };
  const okSections = { rows: [] as Rows };

  const bigPage = (n: number, prefix: string): Rows =>
    Array.from({ length: n }, (_, i) => field("hero", `${prefix}${i}`, "de", `v${i}`));

  it("1005 Zeilen über zwei Seiten werden vollständig übernommen", async () => {
    setPlan("big", {
      tables: {
        cms_section_fields: {
          pages: [
            { data: bigPage(1000, "f"), error: null },
            { data: bigPage(5, "g"), error: null },
          ],
        },
        cms_assets: okAssets,
        cms_sections: okSections,
      },
    });
    const { result } = renderHook(() => useCmsPageContent("page-a"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fieldKeys("hero").length).toBe(1005);
    expect(result.current.error).toBeNull();
  });

  for (const table of ["cms_section_fields", "cms_assets", "cms_sections"]) {
    it(`Fehler auf Seite 2 von ${table} liefert keinen Teilerfolg`, async () => {
      setPlan(`err-${table}`, {
        tables: {
          cms_section_fields: { rows: [field("hero", "headline", "de", "A")] },
          cms_assets: okAssets,
          cms_sections: okSections,
          [table]: {
            pages: [
              { data: bigPage(1000, "f"), error: null },
              { data: null, error: { message: "boom" } },
            ],
          },
        },
      });
      const { result } = renderHook(() => useCmsPageContent("page-a"));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe("read_failed");
      expect(result.current.hasDbContent).toBe(false);
      expect(result.current.fieldKeys("hero")).toEqual([]);
      expect(result.current.sections).toEqual([]);
    });
  }

  it("NULL-Daten ohne Fehler gelten nicht als Erfolg", async () => {
    setPlan("nulldata", {
      tables: {
        cms_section_fields: { pages: [{ data: null, error: null }] },
        cms_assets: okAssets,
        cms_sections: okSections,
      },
    });
    const { result } = renderHook(() => useCmsPageContent("page-a"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("read_failed");
    expect(result.current.hasDbContent).toBe(false);
  });

  it("jede geblätterte Abfrage sortiert eindeutig (id als Tiebreaker)", async () => {
    setPlan("orders", {
      tables: { cms_section_fields: { rows: [] }, cms_assets: { rows: [] }, cms_sections: { rows: [] } },
    });
    const { result } = renderHook(() => useCmsPageContent("page-a"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    for (const table of ["cms_section_fields", "cms_assets", "cms_sections"]) {
      const calls = mockState.orders[table] ?? [];
      expect(calls.length).toBeGreaterThan(0);
      for (const cols of calls) {
        expect(cols[cols.length - 1]).toBe("id");
        expect(cols.length).toBeGreaterThan(1);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 5: Baumaufbau
// ---------------------------------------------------------------------------

describe("Bausteinbaum", () => {
  const row = (id: string, key: string, sort: number, parent: string | null) => ({
    id,
    section_key: key,
    section_type: "card_v1",
    sort_order: sort,
    parent_section_id: parent,
  });

  it("gültiger dreistufiger Baum bleibt vollständig", () => {
    const out = buildSectionTree([
      row("a", "root", 1, null),
      row("b", "mid", 2, "a"),
      row("c", "leaf", 3, "b"),
    ]);
    expect(out.map((r) => r.section_key)).toEqual(["root", "mid", "leaf"]);
    expect(out.map((r) => r.parent_section_key)).toEqual([null, "root", "mid"]);
  });

  it("behält die gelesene Reihenfolge auch bei gleichen Ordnungszahlen", () => {
    // Gleiche `sort_order`, absichtlich nicht alphabetische Schlüssel: die
    // eindeutige DB-Reihenfolge (sort_order, id) darf NICHT umsortiert werden.
    const out = buildSectionTree([
      row("id-1", "zulu", 5, null),
      row("id-2", "alpha", 5, "id-1"),
      row("id-3", "mike", 5, "id-2"),
      row("id-4", "bravo", 5, null),
    ]);
    expect(out.map((r) => r.section_key)).toEqual(["zulu", "alpha", "mike", "bravo"]);
  });

  it("tieferer Baum bleibt vollständig", () => {
    const rows = [row("n0", "s0", 0, null)];
    for (let i = 1; i < 12; i += 1) rows.push(row(`n${i}`, `s${i}`, i, `n${i - 1}`));
    expect(buildSectionTree(rows).length).toBe(12);
  });

  it("Nachfahren fehlender/inaktiver Eltern fallen weg und werden nie Wurzel", () => {
    const out = buildSectionTree([
      row("a", "root", 1, null),
      row("b", "orphan", 2, "missing"),
      row("c", "orphan-child", 3, "b"),
    ]);
    expect(out.map((r) => r.section_key)).toEqual(["root"]);
  });

  it("Selbstzyklus wird ausgeschlossen", () => {
    const out = buildSectionTree([row("a", "root", 1, null), row("b", "self", 2, "b")]);
    expect(out.map((r) => r.section_key)).toEqual(["root"]);
  });

  it("langer Zyklus wird endlich ausgeschlossen", () => {
    const out = buildSectionTree([
      row("a", "root", 1, null),
      row("x", "c1", 2, "z"),
      row("y", "c2", 3, "x"),
      row("z", "c3", 4, "y"),
    ]);
    expect(out.map((r) => r.section_key)).toEqual(["root"]);
  });
});

// ---------------------------------------------------------------------------
// 6: Alt-Texte je Sprache
// ---------------------------------------------------------------------------

describe("Alt-Texte", () => {
  const asset = (translations: Array<{ locale: string; alt_text: string }> = []) => ({
    section_key: "hero",
    field_key: "image",
    public_url: "https://x/img.jpg",
    alt_de: "DE-Alt",
    alt_en: "EN-Alt",
    alt_pl: "PL-Alt",
    viewport: "desktop",
    cms_asset_translations: translations,
  });

  const registry = (rows: Array<[string, string | null]>): Rows =>
    rows.map(([locale, fallback], i) => ({
      locale,
      label_de: locale,
      label_native: locale,
      is_source: locale === "de",
      is_active: true,
      is_public: true,
      fallback_locale: fallback,
      sort_order: i,
    }));

  const mount = async (
    translations: Array<{ locale: string; alt_text: string }>,
    locales: Rows | null,
  ) => {
    setPlan(`alt-${Math.random()}`, {
      locales,
      tables: {
        cms_section_fields: { rows: [field("hero", "headline", "de", "T")] },
        cms_assets: { rows: [asset(translations)] },
        cms_sections: { rows: [] },
      },
    });
    const { result } = renderHook(() => useCmsPageContent("page-a"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    return result;
  };

  it("PL nutzt weiterhin die alte PL-Spalte", async () => {
    const result = await mount([], null);
    expect(result.current.assetAlt("hero", "image", "pl", "fb")).toBe("PL-Alt");
  });

  it("NL nimmt den vertikalen NL-Wert", async () => {
    const result = await mount(
      [{ locale: "nl", alt_text: "NL-Alt" }],
      registry([
        ["de", null],
        ["nl", "en"],
        ["en", "de"],
      ]),
    );
    await waitFor(() => expect(result.current.assetAlt("hero", "image", "nl", "fb")).toBe("NL-Alt"));
  });

  it("NL/DA ohne vertikalen Wert folgen der Registerkette (EN), nicht PL", async () => {
    const result = await mount(
      [],
      registry([
        ["de", null],
        ["en", "de"],
        ["nl", "en"],
        ["da", "en"],
      ]),
    );
    await waitFor(() => expect(result.current.assetAlt("hero", "image", "nl", "fb")).toBe("EN-Alt"));
    expect(result.current.assetAlt("hero", "image", "da", "fb")).toBe("EN-Alt");
    expect(result.current.assetAlt("hero", "image", "da", "fb")).not.toBe("PL-Alt");
  });

  it("später eintreffendes Sprachregister wird renderwirksam", async () => {
    const gate = makeGate();
    mockState.localesGate.promise = gate.promise;
    setPlan("late-registry", {
      locales: registry([
        ["de", null],
        ["en", "de"],
        ["nl", "en"],
      ]),
      tables: {
        cms_section_fields: { rows: [field("hero", "headline", "de", "T")] },
        cms_assets: { rows: [asset([])] },
        cms_sections: { rows: [] },
      },
    });

    const { result } = renderHook(() => useCmsPageContent("page-a"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Inhalt ist da, obwohl das Register noch aussteht.
    expect(result.current.text("hero", "headline", "de", "fb")).toBe("T");
    // Ohne Register greift die Code-Kette: NL → DE.
    expect(result.current.assetAlt("hero", "image", "nl", "fb")).toBe("DE-Alt");

    await act(async () => {
      gate.release();
      await new Promise((r) => setTimeout(r, 20));
    });
    await waitFor(() => expect(result.current.assetAlt("hero", "image", "nl", "fb")).toBe("EN-Alt"));
  });
});
