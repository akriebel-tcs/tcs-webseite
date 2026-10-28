import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  describeEta,
  runProgress,
  type TranslationRunRow,
} from "@/features/admin/api/cmsTranslationRuns";
import { isValidLocaleCode, searchLanguageCatalog } from "@/i18n/languageCatalog";
import { localeChainFromRegistry, type LocaleRegistryRow } from "@/i18n/localeRegistry";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const run = (over: Partial<TranslationRunRow> = {}): TranslationRunRow =>
  ({
    id: "5d8bf173-cbe6-4151-b4d9-a388fde14865",
    source_locale: "de",
    target_locale: "en",
    scope_kind: "locale",
    scope_signature: "locale:en:*",
    page_keys: [],
    provider: "lovable_ai",
    model: "google/gemini-3.6-flash",
    status: "done",
    fields_planned: 57,
    fields_done: 53,
    fields_skipped: 4,
    fields_failed: 0,
    batches_done: 3,
    model_calls: 3,
    memory_hits: 0,
    chars_source: 100,
    cost_estimate: 0,
    cost_limit: null,
    cursor_page_key: null,
    cursor_section_key: null,
    cursor_field_key: null,
    last_error: null,
    started_at: "2026-09-11T18:54:58Z",
    finished_at: "2026-09-11T18:59:32Z",
    created_at: "2026-09-11T18:54:58Z",
    updated_at: "2026-09-11T18:59:32Z",
    ...over,
  }) as TranslationRunRow;

describe("Fortschritt eines gespeicherten Laufs", () => {
  it("zählt 53 übersetzt + 4 übersprungen von 57 als vollständig", () => {
    const p = runProgress(run());
    expect(p.processed).toBe(57);
    expect(p.planned).toBe(57);
    expect(p.percent).toBe(100);
    expect(p.remaining).toBe(0);
    expect(p.isComplete).toBe(true);
  });

  it("nennt zu wenige Messwerte ehrlich statt eine Restzeit zu erfinden", () => {
    const text = describeEta(
      run({
        status: "running",
        fields_done: 2,
        fields_skipped: 0,
        finished_at: null,
        updated_at: new Date().toISOString(),
        started_at: new Date(Date.now() - 20000).toISOString(),
      }),
    );
    expect(text).toBe("Noch keine belastbare Restzeit");
  });

  it("meldet Stillstand statt Fantasie-Restzeit", () => {
    const text = describeEta(
      run({
        status: "running",
        fields_done: 30,
        fields_skipped: 0,
        finished_at: null,
        started_at: new Date(Date.now() - 600000).toISOString(),
        updated_at: new Date(Date.now() - 400000).toISOString(),
      }),
    );
    expect(text).toContain("Wartet auf nächsten Serverschritt");
  });

  it("zeigt beim abgeschlossenen Lauf keine Restzeit", () => {
    expect(describeEta(run())).toBe("–");
  });
});

describe("Sprachkatalog als reine Auswahlhilfe", () => {
  it("findet Kroatisch über Name und Code", () => {
    expect(searchLanguageCatalog("kroat")[0]?.code).toBe("hr");
    expect(searchLanguageCatalog("hrvat")[0]?.native).toBe("Hrvatski");
  });

  it("prüft Sprachcodes nach BCP-47-Grundform", () => {
    expect(isValidLocaleCode("hr")).toBe(true);
    expect(isValidLocaleCode("pt-br")).toBe(true);
    expect(isValidLocaleCode("Deutschland")).toBe(false);
    expect(isValidLocaleCode("h")).toBe(false);
  });

  it("legt Sprachen ausschließlich über die Verwaltungsfunktion an", () => {
    const api = read("src/features/admin/api/cmsAdminLocales.ts");
    expect(api).toContain("rpc_admin_upsert_locale");
    expect(api).not.toMatch(/\.(insert|update|upsert|delete)\(/);
  });
});

describe("Rückfallkette aus der Datenbank", () => {
  const rows = [
    { locale: "de", fallback_locale: null },
    { locale: "en", fallback_locale: "de" },
    { locale: "hr", fallback_locale: "en" },
  ] as LocaleRegistryRow[];

  it("folgt der konfigurierten Rückfallsprache und endet bei Deutsch", () => {
    expect(localeChainFromRegistry("hr", rows)).toEqual(["hr", "en", "de"]);
  });

  it("hängt Deutsch auch bei unbekannter Sprache an", () => {
    expect(localeChainFromRegistry("xx", rows)).toEqual(["xx", "de"]);
  });
});

describe("Vertikale Sprachtabellen sind die führende Quelle", () => {
  it("Navigation und Seiten lesen zuerst die Sprachkarte", () => {
    const nav = read("src/navigation/localizedNav.ts");
    expect(nav).toContain("pickNavText");
    for (const file of [
      "src/navigation/useNavigationTree.ts",
      "src/navigation/useDbBreadcrumb.ts",
      "src/components/MainNavigation.tsx",
      "src/components/Footer.tsx",
      "src/components/MetaNavigation.tsx",
      "src/features/legal/pages/SitemapPage.tsx",
    ]) {
      expect(read(file)).toContain("pickNavText");
    }
  });

  it("Bild-Alttexte lesen cms_asset_translations", () => {
    const hook = read("src/features/cms/hooks/useCmsPageContent.ts");
    expect(hook).toContain("cms_asset_translations(locale, alt_text)");
    expect(hook).toContain("set.alts");
    expect(read("src/features/cms/hooks/useCmsAssetsForPages.ts")).toContain(
      "cms_asset_translations(locale, alt_text)",
    );
  });

  it("Sprachtypen sind nicht mehr auf de/en/pl festgelegt", () => {
    for (const file of [
      "src/features/cms/components/CmsBodyRenderer.tsx",
      "src/features/cms/contract/renderability.ts",
      "src/features/cms/hooks/useCmsI18n.ts",
    ]) {
      expect(read(file)).not.toContain('"de" | "en" | "pl"');
    }
  });
});

describe("Öffentlicher Sprachumschalter", () => {
  const switcher = read("src/components/LanguageSwitcher.tsx");

  it("ist ein kompaktes Menü mit Symbol, Kürzel und Beschriftung", () => {
    expect(switcher).toContain("DropdownMenu");
    expect(switcher).toContain("Languages");
    expect(switcher).toContain("aria-label");
    expect(switcher).toContain("focus-visible:ring");
    expect(switcher).toContain("usePublicLocales");
  });

  it("wird in Kopfzeile für Desktop und Mobil verwendet", () => {
    const meta = read("src/components/MetaNavigation.tsx");
    expect((meta.match(/<LanguageSwitcher/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(meta).not.toMatch(/DE\s*\|\s*EN/);
  });
});
