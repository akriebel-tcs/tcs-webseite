/**
 * Vertragsprüfung der Übersetzungs-Automatik.
 * Prüft am echten Quelltext, dass Lese-/Schreibwege, Anzeige und die
 * Serverstrecke nicht wegrutschen.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const api = readFileSync(
  resolve(process.cwd(), "src/features/admin/api/cmsTranslationAutopilot.ts"),
  "utf8",
);
const panel = readFileSync(
  resolve(process.cwd(), "src/features/admin/components/AutopilotPanel.tsx"),
  "utf8",
);
const workbench = readFileSync(
  resolve(process.cwd(), "src/features/admin/components/TranslationWorkbench.tsx"),
  "utf8",
);
const fn = readFileSync(
  resolve(process.cwd(), "supabase/functions/cms-translation-run/index.ts"),
  "utf8",
);
const doc = readFileSync(
  resolve(process.cwd(), "docs/04-betrieb/uebersetzungs-automatik.md"),
  "utf8",
);

describe("Automatik: Client-Zugang", () => {
  it("liest und schaltet nur über die vorgesehenen Funktionen", () => {
    expect(api).toContain("rpc_admin_translation_autopilot_status");
    expect(api).toContain("rpc_admin_set_translation_autopilot");
    expect(api).not.toMatch(/\.(insert|update|upsert|delete)\(/);
    expect(api).not.toMatch(/rpc\(\s*"rpc_internal/);
  });

  it("enthält keine Modellkennung und keine Schlüssel", () => {
    expect(api).not.toMatch(/gemini|gpt-|service_role|API_KEY|Bearer /i);
    expect(panel).not.toMatch(/gemini|gpt-|service_role|API_KEY/i);
  });
});

describe("Automatik: Anzeige", () => {
  it("ist im Übersetzungsbereich eingebunden", () => {
    expect(workbench).toContain("AutopilotPanel");
  });

  it("zeigt Zustand, Zielsprachen, Bestand und Verarbeitung getrennt", () => {
    expect(panel).toContain("Automatik für neue deutsche Texte");
    expect(panel).toContain("aktiv");
    expect(panel).toContain("inaktiv");
    expect(panel).toContain("vorhanden");
    expect(panel).toContain("fehlt");
    expect(panel).toContain("veraltet");
    expect(panel).toContain("geplant (Ruhezeit läuft)");
    expect(panel).toContain("jetzt fällig");
    expect(panel).toContain("Fehler");
    expect(panel).toContain("von Hand gepflegt, Quelle geändert");
    expect(panel).toContain("letzte erfolgreiche Verarbeitung");
    expect(panel).toContain("letzte Serveraktivität");
  });

  it("bietet Anhalten/Fortsetzen der Verarbeitung getrennt von der Erkennung", () => {
    expect(panel).toContain("Verarbeitung anhalten");
    expect(panel).toContain("Verarbeitung fortsetzen");
    expect(panel).toContain("weiter vorgemerkt");
    expect(api).toContain("setAutopilotPaused");
    expect(api).toContain("p_paused");
    expect(api).toContain("rpc_admin_translation_locale_counts");
  });

  it("erklärt, dass Speichern nie sofort übersetzt", () => {
    expect(panel).toContain("übersetzt nie sofort");
    expect(panel).toContain("Ruhezeit");
  });


  it("beobachtet nur und übersetzt nicht im Browser", () => {
    expect(panel).not.toContain("functions.invoke");
    expect(panel).not.toMatch(/\.(insert|update|upsert|delete)\(/);
  });
});

describe("Automatik: Serverstrecke", () => {
  it("schließt gespeicherte Aufträge über die interne Funktion ab", () => {
    expect(fn).toContain("rpc_internal_translation_job_finish");
    expect(fn).toContain("const recordJob = async");
    expect(fn).toContain("if (item.job_id)");
  });

  it("nutzt weiterhin denselben Schreibweg für Inhalte", () => {
    expect(fn).toContain("rpc_internal_apply_machine_unit");
    expect(fn).not.toContain("rest/v1/cms_section_fields");
  });

  it("behält die Mengenbremsen", () => {
    expect(fn).toContain("MAX_ITEMS_PER_STEP = 25");
    expect(fn).toContain("cost_limit_reached");
    expect(fn).toContain("daily_model_budget_reached");
  });

  it("wartet bei laufender Ruhezeit und beendet den Lauf nicht vorzeitig", () => {
    expect(fn).toContain("pending_later");
    expect(fn).toContain("waiting_for_debounce");
  });

});

describe("Automatik: Vertragsdokument", () => {
  it("beschreibt Auslöser, Sprachauswahl, Schutz und Fehlerweg", () => {
    expect(doc).toContain("is_active = true` **und** `is_public = true");
    expect(doc).toContain("cms_text_is_translatable");
    expect(doc).toContain("cms_field_is_translatable");
    expect(doc).toContain("manual_value_source_changed");
    expect(doc).toContain("batch_id = 'auto'");
    expect(doc).toContain("keine zweite Warteschlange");
    expect(doc).toContain("CMS_TRANSLATION_GLOBAL_TOKEN");
    expect(doc).toContain("src/i18n/locales/**");
  });

  it("beschreibt Ruhezeit, getrennte Pause und Folgepunkt Editor-Spalten", () => {
    expect(doc).toContain("debounce_seconds");
    expect(doc).toContain("is_paused");
    expect(doc).toContain("Folgepunkt");
  });
});

