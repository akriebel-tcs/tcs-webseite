import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkPublicReleaseReadiness,
  setLocaleVisibility,
} from "@/features/admin/api/cmsLocaleVisibility";

const rpc = vi.fn();
vi.mock("@/lib/cmsSupabase/client", () => ({
  getCmsSupabaseClient: () => ({ rpc }),
}));


/**
 * Sprachsichtbarkeit: eine Wahrheit in `cms_locales`, ein Schreibweg über
 * `rpc_admin_set_locale_visibility`, und der öffentliche Sprachumschalter
 * kommt ausschließlich aus der Datenbank.
 */
const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("Sprachsichtbarkeit", () => {
  const api = read("src/features/admin/api/cmsLocaleVisibility.ts");
  const hook = read("src/i18n/usePublicLocales.ts");
  const registry = read("src/i18n/localeRegistry.ts");
  const switcher = read("src/components/LanguageSwitcher.tsx");

  it("schreibt nur über die Verwaltungsfunktion, nicht direkt in die Tabelle", () => {
    expect(api).toContain("rpc_admin_set_locale_visibility");
    expect(api).not.toMatch(/\.(insert|update|upsert|delete)\(/);
  });

  it("liest die öffentlichen Sprachen aus cms_locales mit is_public", () => {
    expect(registry).toContain('from("cms_locales")');
    expect(registry).not.toMatch(/\.(insert|update|upsert|delete)\(/);
    expect(hook).toContain("r.is_public");
    expect(hook).not.toMatch(/\.(insert|update|upsert|delete)\(/);
  });

  it("baut den öffentlichen Sprachumschalter ohne feste Sprachliste", () => {
    expect(switcher).toContain("usePublicLocales");
    expect(switcher).not.toContain("APP_LOCALES");
  });
});

describe("Gate für die öffentliche Sprachfreigabe", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  const readiness = (content: number, ui: number, ready: boolean) => ({
    data: {
      success: true,
      ready,
      content: { total: 100, missing: content },
      ui: { total: 414, missing: ui },
    },
    error: null,
  });

  it("lässt die Quellsprache immer zu, ohne die Datenbank zu fragen", async () => {
    const de = await checkPublicReleaseReadiness("de");
    expect(de.ready).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("prüft beide Textklassen in der Datenbank", async () => {
    rpc.mockResolvedValue(readiness(0, 0, true));
    const pl = await checkPublicReleaseReadiness("pl");
    expect(pl.ready).toBe(true);
    expect(rpc).toHaveBeenCalledWith("rpc_admin_locale_release_readiness", { p_locale: "pl" });
  });

  it("blockt eine Sprache mit fehlenden Bedienungstexten verständlich", async () => {
    rpc.mockResolvedValue(readiness(0, 120, false));
    const hr = await checkPublicReleaseReadiness("HR-hr");
    expect(hr.locale).toBe("hr");
    expect(hr.ready).toBe(false);
    expect(hr.missing).toMatch(/120 Bedienungstexte/);
  });

  it("blockt eine Sprache mit fehlenden Seiteninhalten verständlich", async () => {
    rpc.mockResolvedValue(readiness(42, 0, false));
    const nl = await checkPublicReleaseReadiness("nl");
    expect(nl.ready).toBe(false);
    expect(nl.missing).toMatch(/42 Seiteninhalte/);
  });

  it("verweigert das Setzen von is_public bereits vor dem Schreibweg", async () => {
    rpc.mockResolvedValue(readiness(5, 7, false));
    await expect(setLocaleVisibility({ locale: "hr", isPublic: true })).rejects.toThrow(
      /Bedienungstexte/,
    );
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe("rpc_admin_locale_release_readiness");
  });

  it("nutzt die Datenbank als fachliche Wahrheit und baut keine zweite Sprachliste", () => {
    const api = read("src/features/admin/api/cmsLocaleVisibility.ts");
    expect(api).toContain("rpc_admin_locale_release_readiness");
    expect(api).not.toMatch(/\[\s*"de"\s*,\s*"en"\s*,\s*"pl"\s*\]/);
  });

  it("erklärt die fehlende Vorbereitung auch im Admin-Panel", () => {
    const panel = read("src/features/admin/components/LocaleManagerPanel.tsx");
    expect(panel).toContain("checkPublicReleaseReadiness");
    expect(panel).toContain("Noch nicht für die Website freischaltbar");
  });
  it("bietet je Sprache erneutes Prüfen und einen Weg zum Vervollständigen", () => {
    const panel = read("src/features/admin/components/LocaleManagerPanel.tsx");
    expect(panel).toContain("Sprachstand neu prüfen");
    expect(panel).toContain("Fehlende Übersetzungen vervollständigen");
    expect(panel).toContain("Seiteninhalte ·");
    const wb = read("src/features/admin/components/TranslationWorkbench.tsx");
    expect(wb).toContain("onCompleteMissing");
  });

  it("meldet eine laufende Neuberechnung getrennt von echten Lücken", () => {
    const api = read("src/features/admin/api/cmsLocaleVisibility.ts");
    expect(api).toContain("coverage_pending");
    expect(api).toContain("wird gerade berechnet");
  });
});
