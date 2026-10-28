import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Diese Tests pruefen den CMS-Light-Lesepfad (Supabase); Standardquelle ist sonst Storyblok.
vi.stubEnv("VITE_CONTENT_SOURCE", "supabase");

import {
  joinSegments,
  joinTranslatedSegments,
  segmentLongText,
} from "../../supabase/functions/_shared/longTextSegments";
import { TRANSLATION_AREAS, AREA_LABEL } from "@/features/admin/api/cmsTranslationUnits";
import {
  applyUiStringOverlay,
  expandDottedKeys,
  resetUiStringOverlayCache,
  toResourceBundles,
} from "@/i18n/uiStringsOverlay";

const rpc = vi.fn();
vi.mock("@/lib/cmsSupabase/client", () => ({
  getCmsSupabaseClient: () => ({ rpc }),
}));

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

/** Kleiner i18next-Ersatz, der nur das Nötige nachbildet. */
function fakeI18n(language: string) {
  const added: Array<{ locale: string; namespace: string; resources: unknown }> = [];
  return {
    language,
    added,
    addResourceBundle: (
      locale: string,
      namespace: string,
      resources: unknown,
      deep?: boolean,
      overwrite?: boolean,
    ) => {
      added.push({ locale, namespace, resources });
      expect(deep).toBe(true);
      expect(overwrite).toBe(true);
    },
    changeLanguage: async () => undefined,
    on: () => undefined,
  };
}

describe("Bedienungstext-Katalog (ui_string)", () => {
  it("wird vom Übersetzungswerkzeug gemeinsam mit den Seiteninhalten geführt", () => {
    expect(TRANSLATION_AREAS).toContain("ui_string");
    expect(AREA_LABEL.ui_string).toMatch(/Bedienungstext/);
  });

  it("hat ein wiederholbares Manifest mit deutschen Quelltexten", () => {
    const manifest = JSON.parse(read("scripts/i18n/ui-catalog.manifest.json")) as {
      version: string;
      entries: Array<{ namespace: string; key: string; de: string; seed?: Record<string, string> }>;
    };
    expect(manifest.entries.length).toBeGreaterThan(300);
    expect(manifest.version).toMatch(/^m[0-9a-f]+-\d+$/);
    for (const entry of manifest.entries) {
      expect(entry.namespace).not.toBe("");
      expect(entry.key).not.toBe("");
      expect(entry.de.trim()).not.toBe("");
    }
    const ids = manifest.entries.map((e) => `${e.namespace}|${e.key}`);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("stimmt mit dem gespeicherten Manifest überein (Generator gegen Datei)", async () => {
    const { buildManifest } = (await import("../../scripts/i18n/ui-catalog-manifest.mjs")) as {
      buildManifest: () => {
        version: string;
        counts: { entries: number; excluded: number; seeds: Record<string, number> };
        entries: Array<{ namespace: string; key: string; de: string; seed?: Record<string, string> }>;
      };
    };
    const generated = buildManifest();
    const stored = JSON.parse(read("scripts/i18n/ui-catalog.manifest.json")) as typeof generated;

    expect(generated.version).toBe(stored.version);
    expect(generated.counts).toEqual(stored.counts);

    const idOf = (e: { namespace: string; key: string }) => `${e.namespace}|${e.key}`;
    expect(generated.entries.map(idOf)).toEqual(stored.entries.map(idOf));

    const storedById = new Map(stored.entries.map((e) => [idOf(e), e]));
    for (const entry of generated.entries) {
      const saved = storedById.get(idOf(entry));
      expect(saved?.de).toBe(entry.de);
      expect(saved?.seed ?? {}).toEqual(entry.seed ?? {});
    }
  });

  it("schließt technische Werte wie Adressen, Klassen und Codes aus", () => {
    const config = JSON.parse(read("scripts/i18n/ui-catalog.config.json")) as {
      excludedKeySuffixes: string[];
      technicalValuePatterns: string[];
    };
    for (const suffix of ["href", "url", "slug", "id", "class", "route"]) {
      expect(config.excludedKeySuffixes).toContain(suffix);
    }
    expect(config.technicalValuePatterns.some((p) => p.includes("https"))).toBe(true);
  });

  // HISTORISCHE SEMANTIK: prüft die derzeit live installierte Fassung des
  // Abgleichs (Migration vom 2026-09-12). Die neue additive Fassung liegt als
  // noch nicht angewendeter Entwurf unter docs/04-betrieb/ und wird darunter
  // gesondert geprüft.
  it("überschreibt beim Abgleich keinen vorhandenen Zieltext (historische Fassung in den Migrationen)", () => {
    const dir = "supabase/migrations";
    const files = readdirSync(resolve(process.cwd(), dir)).filter((f) => f.endsWith(".sql"));
    const sync = files
      .map((f) => read(`${dir}/${f}`))
      .filter((sql) => sql.includes("rpc_admin_sync_ui_strings"))
      .join("\n");
    expect(sync).not.toBe("");
    // Startwerte nur, wenn in der Datenbank noch kein Zieltext steht
    expect(sync).toContain("NOT EXISTS");
    expect(sync).toContain("ON CONFLICT (ui_string_id, locale) DO NOTHING");
    // entfallene Schlüssel werden stillgelegt, nie gelöscht
    expect(sync).toMatch(/SET is_active = false/);
    expect(sync).not.toMatch(/DELETE FROM public\.cms_ui_strings\b/);
  });

  it("gleicht nur über den geschützten Serverweg ab, nie mit einem Frontend-Schlüssel", () => {
    const script = read("scripts/i18n/ui-catalog-sync.mjs");
    // kein direkter Aufruf des schreibenden Vertrags aus dem Skript
    expect(script).not.toContain("/rest/v1/rpc/rpc_admin_sync_ui_strings");
    expect(script).toContain("/functions/v1/cms-translation-run");
    expect(script).toContain('action: "sync_ui_catalog"');
    // Freigabewort ausschließlich aus der Prozessumgebung, kein VITE-Geheimnis
    expect(script).toContain("process.env.CMS_TRANSLATION_GLOBAL_TOKEN");
    expect(script).not.toContain("SERVICE_ROLE");
  });

  it("ruft standardmäßig nur die Vorschau auf und schreibt erst mit --apply", () => {
    const script = read("scripts/i18n/ui-catalog-sync.mjs");
    expect(script).toContain('includes("--apply")');
    expect(script).toContain("const dryRun = !apply;");
    expect(script).toContain("dry_run: dryRun");
  });

  it("verlangt im Serverdienst das Freigabewort und reicht die Vorschau durch", () => {
    const fn = read("supabase/functions/cms-translation-run/index.ts");
    expect(fn).toContain('if (action === "sync_ui_catalog")');
    expect(fn).toContain("global_authorization_not_configured");
    expect(fn).toContain("global_authorization_invalid");
    expect(fn).toContain("cms_translation_ui_catalog_sync");
    // Vorschau ist Standard, ungültige Angabe wird abgelehnt
    expect(fn).toContain("let dryRun = true;");
    expect(fn).toContain('error: "dry_run_invalid"');
    expect(fn).toContain("p_manifest: { version, entries, dry_run: dryRun }");
    // kein pauschales run_started: false mehr
    expect(fn).not.toContain("run_started: false }");
    // Aussage nur über den eigenen Import in dieser Transaktion,
    // kein globaler Auftragszähler als Beweis.
    expect(fn).toContain("const ownImportSuppressed = result?.own_import_autopilot_suppressed === true;");
    expect(fn).toContain("run_started: applied ? !ownImportSuppressed : false,");
    expect(fn).not.toContain("ui_jobs_created ?? 0");
    // Protokollnachweis fail-closed VOR dem Schreiben
    expect(fn).toContain('if (action === "ui_catalog_sync_capabilities")');
    expect(fn).toContain('rpc_admin_ui_catalog_sync_capabilities');
    expect(fn).toContain('error: "db_protocol_unknown"');
    expect(fn).toContain('error: "db_protocol_mismatch"');
    expect(fn).toContain('error: "trigger_contract_missing"');

  });


  it("hält den schreibenden Vertrag in der Migration service_role-only", () => {
    const dir = "supabase/migrations";
    const files = readdirSync(resolve(process.cwd(), dir))
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const grants = files
      .map((f) => read(`${dir}/${f}`))
      .join("\n")
      .split("\n")
      .filter((line) => line.includes("rpc_admin_sync_ui_strings(jsonb)"));
    const last = grants.filter((l) => l.includes("GRANT EXECUTE")).at(-1) ?? "";
    expect(last).toContain("service_role");
    expect(last).not.toMatch(/\banon\b/);
    expect(last).not.toMatch(/\bauthenticated\b/);
  });
});

describe("Bedienungstexte zur Laufzeit: Datenbank zuerst, Datei als Rückfall", () => {
  beforeEach(() => {
    rpc.mockReset();
    resetUiStringOverlayCache();
  });

  it("wandelt Punktschlüssel in verschachtelte Ressourcen um", () => {
    expect(expandDottedKeys({ "actions.back": "Wróć", plain: "Tak" })).toEqual({
      actions: { back: "Wróć" },
      plain: "Tak",
    });
    expect(expandDottedKeys({ leer: "  " })).toEqual({});
  });

  it("baut je Bereich ein Ressourcenbündel", () => {
    const bundles = toResourceBundles({
      common: { "actions.back": "Wróć" },
      navigation: { "a11y.skip": "Przejdź" },
      kaputt: null,
    });
    expect(bundles.map((b) => b.namespace)).toEqual(["common", "navigation"]);
  });

  it("legt die Datenbankwerte über die mitgelieferten Texte", async () => {
    rpc.mockResolvedValue({ data: { common: { "actions.back": "Wróć" } }, error: null });
    const i18n = fakeI18n("pl");
    const ok = await applyUiStringOverlay(i18n as never, "pl");
    expect(ok).toBe(true);
    expect(i18n.added).toEqual([
      { locale: "pl", namespace: "common", resources: { actions: { back: "Wróć" } } },
    ]);
    expect(rpc).toHaveBeenCalledWith("rpc_public_read_ui_strings", { p_locale: "pl" });
  });

  it("fragt die Datenbank für Deutsch nicht (Quelle bleibt die Datei)", async () => {
    const i18n = fakeI18n("de");
    expect(await applyUiStringOverlay(i18n as never, "de")).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("bündelt gleichzeitige Anfragen und lädt je Sprache nur einmal", async () => {
    rpc.mockResolvedValue({ data: { common: { ok: "Tak" } }, error: null });
    const i18n = fakeI18n("pl");
    await Promise.all([
      applyUiStringOverlay(i18n as never, "pl"),
      applyUiStringOverlay(i18n as never, "pl"),
    ]);
    await applyUiStringOverlay(i18n as never, "pl");
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("bleibt bei einem Datenbankfehler stumm und behält die mitgelieferten Texte", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "offline" } });
    const i18n = fakeI18n("pl");
    expect(await applyUiStringOverlay(i18n as never, "pl")).toBe(false);
    expect(i18n.added).toEqual([]);
  });

  it("ändert zur Laufzeit keine Dateien im Repository", () => {
    const src = read("src/i18n/uiStringsOverlay.ts");
    expect(src).not.toMatch(/writeFile|fs\./);
    expect(read("src/i18n/index.ts")).toContain("registerUiStringOverlay");
  });
});

describe("Überlange Rechtstexte: Segmentierung", () => {
  const legal = [
    "<h2>Allgemeine Geschäftsbedingungen</h2>",
    "<p>Diese Bedingungen gelten für alle Lieferungen der TCS AG. Weitere Angaben unter <a href=\"https://tcs.example/agb\">tcs.example</a>.</p>",
    "<ul><li>Punkt eins mit Platzhalter {{name}}.</li><li>Punkt zwei.</li></ul>",
    "<p>Abschließende Regelung. Es gilt deutsches Recht.</p>",
  ].join("\n\n");

  it("setzt Segmente verlustfrei wieder zusammen", () => {
    const result = segmentLongText(legal, 80);
    expect(result.segments.length).toBeGreaterThan(1);
    expect(joinSegments(result.segments)).toBe(legal);
  });

  it("trennt nie innerhalb eines HTML-Tags oder eines Platzhalters", () => {
    const result = segmentLongText(legal, 60);
    for (const part of result.segments) {
      const opens = (part.match(/</g) ?? []).length;
      const closes = (part.match(/>/g) ?? []).length;
      expect(opens).toBe(closes);
      expect(part.includes("{{") ? part.includes("}}") : true).toBe(true);
    }
  });

  it("hält die Höchstlänge bei einem echten langen Text ein", () => {
    const long = Array.from({ length: 400 }, (_, i) => `<p>Absatz ${i} mit Text.</p>`).join("\n\n");
    expect(long.length).toBeGreaterThan(4000);
    const result = segmentLongText(long, 4000);
    expect(result.fits).toBe(true);
    expect(result.longest).toBeLessThanOrEqual(4000);
    expect(joinSegments(result.segments)).toBe(long);
  });

  it("erhält Absatzabstände beim Zusammensetzen der Übersetzung", () => {
    const source = ["<p>Eins.</p>", "<p>Zwei.</p>"];
    const translated = ["<p>One.</p>", " <p>Two.</p> "];
    const joined = joinTranslatedSegments(["<p>Eins.</p>\n\n", "<p>Zwei.</p>"], translated);
    expect(joined).toBe("<p>One.</p>\n\n<p>Two.</p>");
    expect(source.length).toBe(2);
  });

  it("ist im Serverdienst angebunden statt Texte dauerhaft auszuschließen", () => {
    const fn = read("supabase/functions/cms-translation-run/index.ts");
    expect(fn).toContain("segmentLongText");
    expect(fn).toContain("joinTranslatedSegments");
    expect(fn).toContain("MAX_SEGMENTS_PER_UNIT");
  });
});

// Der additive Abgleich ist inzwischen als Migration ANGEWENDET; der Entwurf
// unter docs/04-betrieb/ bleibt als geprüfter Beleg erhalten. Diese Prüfungen
// sind bewusst statisch (Wortlaut) und sagen NICHTS über einen ausgeführten
// Katalogimport aus — der ist weiterhin offen.
describe("Additiver Katalogabgleich (Entwurf und angewendete Migration)", () => {
  const draftPath = "docs/04-betrieb/sql-entwurf-ui-katalog-abgleich-2026-09-14.md";
  const draft = read(draftPath);

  it("ist als geprüfter Entwurf gekennzeichnet und deckungsgleich in einer Migration angewendet", () => {
    expect(draft).toContain("ANGEWENDET");
    // Der Katalogimport selbst bleibt offen — das muss im Dokument stehen.
    expect(draft).toContain("Katalogimport");
    const migrations = readdirSync(resolve(process.cwd(), "supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .map((f) => read(`supabase/migrations/${f}`));
    const contract = migrations.filter((sql) =>
      sql.includes("cms.suppress_ui_string_autopilot") &&
      sql.includes("rpc_admin_ui_catalog_sync_capabilities"),
    );
    expect(contract.length).toBe(1);
    // Kernaussagen des Entwurfs müssen in der angewendeten Migration stehen.
    for (const marker of [
      "v_dry boolean := true;",
      "'writes', 'insert_only'",
      "'protocol_version', 2",
      "REVOKE ALL ON FUNCTION public.rpc_admin_sync_ui_strings(jsonb) FROM PUBLIC, anon, authenticated;",
      "GRANT EXECUTE ON FUNCTION public.rpc_admin_sync_ui_strings(jsonb) TO service_role;",
    ]) {
      expect(contract[0]).toContain(marker);
      expect(draft).toContain(marker);
    }
    // Kein UPDATE/DELETE an bestehenden Katalog-/Übersetzungszeilen.
    expect(contract[0]).not.toMatch(/UPDATE\s+public\.cms_ui_string/i);
    expect(contract[0]).not.toMatch(/DELETE\s+FROM\s+public\.cms_/i);
  });

  it("ist standardmäßig nur lesend", () => {
    expect(draft).toContain("v_dry boolean := true;");
    expect(draft).toContain("dry_run_invalid");
    expect(draft).toContain("IF v_dry THEN");
  });

  it("bricht bei ungültiger Eingabe ab statt still zu filtern", () => {
    for (const code of [
      "manifest_invalid",
      "version_invalid",
      "entries_invalid",
      "entries_empty",
      "entries_too_many",
      "entries_invalid_rows",
      "entries_duplicate_keys",
    ]) {
      expect(draft).toContain(code);
    }
    expect(draft).toContain("20000");
  });

  it("fügt nur ein und verändert keine bestehenden Zeilen", () => {
    expect(draft).toContain("ON CONFLICT (namespace, string_key) DO NOTHING");
    expect(draft).toContain("ON CONFLICT (ui_string_id, locale) DO NOTHING");
    const sql = draft.split("```sql")[1] ?? "";
    expect(sql).not.toMatch(/UPDATE public\.cms_ui_strings/);
    expect(sql).not.toMatch(/UPDATE public\.cms_ui_string_translations/);
    expect(sql).not.toMatch(/UPDATE public\.cms_translation_unit_state/);
    expect(sql).not.toMatch(/DELETE FROM public\.cms_ui_string/);
    expect(sql).not.toMatch(/SET is_active = (false|true)/);
  });

  it("gibt neuen Startwerten keine Freigabe und lässt bestehende Zustände unberührt", () => {
    expect(draft).toContain("'maschinell'");
    const sql = draft.split("```sql")[1] ?? "";
    expect(sql).not.toContain("'geprueft'");
    expect(sql).toContain("ON CONFLICT (area, ref_key, unit_key, locale) DO NOTHING");
  });

  it("unterdrückt Übersetzungsaufträge nur transaktionslokal", () => {
    expect(draft).toContain("set_config('cms.suppress_ui_string_autopilot', 'on', true)");
    expect(draft).toContain("set_config('cms.suppress_ui_string_autopilot', v_prev, true)");
    expect(draft).toContain("autopilot_suppressed");
    // kein globaler Eingriff in Autopilot oder Trigger
    const sql = draft.split("```sql")[1] ?? "";
    expect(sql).not.toMatch(/DISABLE TRIGGER/);
    expect(sql).not.toMatch(/UPDATE public\.cms_translation_autopilot/);
    expect(sql).not.toMatch(/rpc_admin_set_translation_autopilot/);
  });

  it("behält Rechte, feste Suchpfade und begrenzte Wartezeiten", () => {
    expect(draft).toContain("SET search_path TO 'public', 'pg_temp'");
    expect(draft).toContain("SET lock_timeout TO '5s'");
    expect(draft).toContain("SET statement_timeout TO '120s'");
    expect(draft).toContain(
      "REVOKE ALL ON FUNCTION public.rpc_admin_sync_ui_strings(jsonb) FROM PUBLIC, anon, authenticated;",
    );
    expect(draft).toContain(
      "GRANT EXECUTE ON FUNCTION public.rpc_admin_sync_ui_strings(jsonb) TO service_role;",
    );
  });

  it("hat eine transaktionale SQL-Testdatei für die spätere Ausführung", () => {
    const sqlTest = read("supabase/tests/rpc_admin_sync_ui_strings_additiv.sql");
    expect(sqlTest).toContain("BEGIN;");
    expect(sqlTest.trimEnd().endsWith("ROLLBACK;")).toBe(true);
    expect(sqlTest).toContain("NICHT ANGEWENDET");
    expect(sqlTest).toContain("entries_duplicate_keys");
    expect(sqlTest).toContain("Keine neuen Übersetzungsaufträge beim Katalogimport");
  });
});
