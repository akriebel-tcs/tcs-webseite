/**
 * Vertragsprüfung der Sprach-Vorbereitung (DB-first).
 *
 * Geprüft wird am echten Quelltext, dass
 * - die Vorbereitung idempotent und nur für aktive, nicht-Quell-Sprachen läuft,
 * - ausschließlich wirklich übersetzbare deutsche Bausteinfelder freigeschaltet
 *   werden (keine pauschale Kopie technischer Felder),
 * - Seitentitel / Navigation / Bild-Alternativtexte nicht mehr von einer
 *   zufälligen Seiten-Freigabezeile abhängen,
 * - die Feldfreigabe die Sprache gegen `cms_locales` prüft statt gegen eine
 *   feste Liste,
 * - vorhandene Übersetzungen nicht angetastet werden.
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dir = resolve(process.cwd(), "supabase/migrations");
const sql = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(resolve(dir, f), "utf8"))
  .join("\n");

const prepStart = sql.lastIndexOf(
  "CREATE OR REPLACE FUNCTION public.rpc_internal_prepare_translation_locale",
);
const prep = sql.slice(
  prepStart,
  sql.indexOf("rpc_internal_translation_prepare_and_dry_run", prepStart),
);

const editable = readFileSync(
  resolve(process.cwd(), "src/features/admin/api/cmsAdminEditableFields.ts"),
  "utf8",
);

describe("Vorbereitung einer Zielsprache", () => {
  it("gibt es als eigene, wiederholbare Datenbankfunktion", () => {
    expect(sql).toContain("rpc_internal_prepare_translation_locale");
    expect(sql).toContain("cms_translatable_source_fields");
    expect(sql).toContain("rpc_internal_translation_prepare_and_dry_run");
  });

  it("läuft nur für aktive Zielsprachen und nie für die Quellsprache", () => {
    expect(prep).toContain("locale_unknown");
    expect(prep).toContain("locale_not_active");
    expect(prep).toContain("source_locale");
  });

  it("schaltet nur wirklich übersetzbare deutsche Texte frei", () => {
    expect(sql).toContain("public.cms_field_is_translatable(f.field_key)");
    expect(sql).toContain("public.cms_text_is_translatable(f.value)");
  });

  it("legt keine Zeile doppelt an (idempotent)", () => {
    expect(prep).toContain("WHERE NOT EXISTS");
    expect(prep).toContain("GET DIAGNOSTICS");
  });

  it("ändert keine Übersetzungsinhalte", () => {
    expect(prep).not.toMatch(/cms_section_fields\s+SET/i);
    expect(prep).not.toMatch(/DELETE FROM/i);
  });

  it("macht Titel, Navigation und Bildtexte unabhängig von Seiten-Freigabezeilen", () => {
    expect(sql).toContain("ELSE cfg.col_ok");
    expect(sql.slice(sql.lastIndexOf("CREATE OR REPLACE FUNCTION public.cms_translation_units"))).not.toContain(
      "page_wl",
    );
  });

  it("prüft die Sprache dynamisch gegen die Sprachliste", () => {
    const fn = sql.slice(sql.lastIndexOf("rpc_admin_set_editable_field_enabled"));
    expect(fn).toContain("FROM public.cms_locales c WHERE c.locale = _loc");
    expect(fn).not.toContain("('de','en','pl')");
    expect(editable).not.toContain('args.locale !== "en"');
  });

  /**
   * Der Sichtbarkeitsschalter muss eine kurze Einzeländerung bleiben. Er darf
   * NICHT zusätzlich alle Textfelder der Sprache vorbereiten — sonst wartet er
   * auf die schwere Sprachstand-Berechnung und scheitert mit „lock timeout".
   * Vorbereitet wird beim Prüfen/Starten eines Laufs.
   */
  it("bereitet beim Umschalten der Sichtbarkeit nicht die ganze Sprache vor", () => {
    const vis = sql.slice(sql.lastIndexOf("rpc_admin_set_locale_visibility"));
    expect(vis).not.toContain("rpc_internal_prepare_translation_locale(v_locale)");
    expect(vis).toContain("lock_timeout");
  });

  it("gibt die Vorbereitung nicht öffentlich frei", () => {
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.rpc_internal_prepare_translation_locale(text) FROM PUBLIC",
    );
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.rpc_internal_prepare_translation_locale(text) TO service_role",
    );
  });
});
