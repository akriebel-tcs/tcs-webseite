/**
 * Vertragsprüfung des Sprach-Arbeitsbereichs über ALLE Datenbereiche.
 * Prüft am echten Quelltext, dass Lese-/Schreibwege, Bereiche und die
 * kanonische Alt-Text-Quelle nicht wegrutschen.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  TRANSLATION_AREAS,
  AREA_LABEL,
  saveTranslationUnit,
  unitsToCsv,
  saveUnitErrorHint,
  type TranslationUnit,
} from "../cmsTranslationUnits";

const units = readFileSync(
  resolve(process.cwd(), "src/features/admin/api/cmsTranslationUnits.ts"),
  "utf8",
);
const list = readFileSync(
  resolve(process.cwd(), "src/features/admin/components/TranslationTextList.tsx"),
  "utf8",
);
const fn = readFileSync(
  resolve(process.cwd(), "supabase/functions/cms-translation-run/index.ts"),
  "utf8",
);
const editor = readFileSync(
  resolve(process.cwd(), "src/features/admin/components/PageEditor.tsx"),
  "utf8",
);

const unit: TranslationUnit = {
  area: "asset_alt",
  ref_id: "11111111-1111-1111-1111-111111111111",
  ref_key: "11111111-1111-1111-1111-111111111111",
  page_key: "start",
  section_key: "hero",
  unit_key: "alt",
  label: "Bild-Alternativtext",
  source_text: 'Ein "Bild"',
  source_hash: "abc",
  target_value: null,
  target_status: null,
  whitelisted: true,
  is_todo: true,
};

describe("Sprach-Arbeitsbereich: Datenbereiche", () => {
  it("kennt die fünf redaktionellen Bereiche und die Bedienungstexte", () => {
    expect([...TRANSLATION_AREAS]).toEqual([
      "section_field",
      "page_title",
      "nav_label",
      "nav_description",
      "asset_alt",
      "ui_string",
    ]);
    for (const a of TRANSLATION_AREAS) expect(AREA_LABEL[a]).toBeTruthy();
  });


  it("liest über die enge Admin-Funktion und schreibt nur über rpc_admin_*", () => {
    expect(units).toContain("rpc_admin_list_translation_units");
    expect(units).toContain("rpc_admin_update_translation_unit");
    expect(units).not.toMatch(/\.(insert|update|upsert|delete)\(/);
  });

  it("nennt cms_assets.alt_de/alt_en/alt_pl als einzige Alt-Text-Quelle", () => {
    expect(units).toContain("alt_de/alt_en/alt_pl");
    expect(units).toContain("`alt_text_*` ist Altbestand und wird NICHT geschrieben");
  });

  it("schreibt Deutsch nie über den Zielsprachweg", async () => {
    const res = await saveTranslationUnit({
      area: "page_title",
      refId: null,
      pageKey: "start",
      sectionKey: "",
      unitKey: "title",
      locale: "de",
      value: "x",
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe("locale_not_allowed");
  });

  it("erklärt Sperrgründe verständlich", () => {
    expect(saveUnitErrorHint("field_not_allowed")).toMatch(/noch nicht vorbereitet/);
    expect(saveUnitErrorHint("locale_not_supported_for_area")).toMatch(/vorbereitet/);
  });


  it("exportiert CSV mit Bereich und maskierten Anführungszeichen", () => {
    const csv = unitsToCsv("pl", [unit]);
    expect(csv.split("\r\n")[0]).toContain("bereich");
    expect(csv).toContain('""Bild""');
  });
});

describe("Textliste (Oberfläche)", () => {
  it("paginiert und filtert", () => {
    expect(list).toContain("PAGE_SIZE = 50");
    expect(list).toContain("listTranslationUnits");
    expect(list).toContain("STATUS_FILTER_LABEL");
  });

  it("speichert von Hand nur über den geschützten Weg", () => {
    expect(list).toContain("saveTranslationUnit");
    expect(list).not.toMatch(/\.(insert|update|upsert|delete)\(/);
  });
});

describe("Inhalte-Editor", () => {
  it("holt die Sprachen aus der Datenbanktabelle cms_locales", () => {
    expect(editor).toContain("readTargetLocales");
    expect(units).toContain('.from("cms_locales")');
    expect(units).toContain('.eq("is_active", true)');
  });

  it("gibt die Sprachauswahl an die Feldspalten weiter", () => {
    expect(editor).toContain("visibleTargets={visibleTargets}");
  });
});

describe("Serverlauf über alle Bereiche", () => {
  it("verarbeitet Bereichsfelder und schreibt über die Einheiten-Funktion", () => {
    expect(fn).toContain("rpc_internal_apply_machine_unit");
    expect(fn).toContain("CONTEXT_FOR_UNIT");
    expect(fn).toContain("p_area: item.area");
  });

  it("startet keinen Gesamtlauf ohne serverseitiges Freigabewort", () => {
    expect(fn).toContain("CMS_TRANSLATION_GLOBAL_TOKEN");
    expect(fn).toContain("global_authorization_not_configured");
  });
});

// ---------------------------------------------------------------------------
// Modellkonfiguration: eine Quelle (Datenbank) für Presets, gemeinsame Regel
// für Modell-Kennungen, echtes Eingabefeld für „Anderes Modell".
// ---------------------------------------------------------------------------
describe("Modellkonfiguration des Übersetzungswerkzeugs", () => {
  const workbench = readFileSync(
    resolve(__dirname, "../../components/TranslationWorkbench.tsx"),
    "utf8",
  );
  const fn = readFileSync(
    resolve(__dirname, "../../../../../supabase/functions/cms-translation-run/index.ts"),
    "utf8",
  );

  it("hält keine feste Modellliste in der Oberfläche", () => {
    expect(workbench).not.toContain("gemini-2.5");
    expect(workbench).not.toContain("gpt-6-astra");
    // Presets kommen aus den Kostensätzen der Datenbank.
    expect(workbench).toContain("status?.rates");
  });

  it("nimmt Regel und Standardmodell vom Server", () => {
    expect(workbench).toContain("status?.model_id_pattern");
    expect(fn).toContain("MODEL_ID_PATTERN");
    expect(fn).toContain("defaultModelFor");
    expect(fn).toContain("model_id_invalid");
  });

  it("öffnet für „Anderes Modell\" ein echtes Eingabefeld und sperrt ungültige Kennungen", () => {
    expect(workbench).toContain('value="__custom__"');
    expect(workbench).toContain("customModel &&");
    expect(workbench).toContain("!modelValid");
  });

  it("prüft Kennungen im Format anbieter/modell", () => {
    const pattern = new RegExp(
      fn.match(/const MODEL_ID_PATTERN = "(.*)";/)![1].replace(/\\\\/g, "\\"),
    );
    expect(pattern.test("google/gemini-3.6-flash")).toBe(true);
    expect(pattern.test("openai/gpt-6-astra")).toBe(true);
    expect(pattern.test("gemini-3.6-flash")).toBe(false);
    expect(pattern.test("google/")).toBe(false);
    expect(pattern.test("Google/Modell mit Leerzeichen")).toBe(false);
  });

  it("führt OpenAI über /v1/responses mit Streaming und Google über den Chat-Weg", () => {
    expect(fn).toContain('const isOpenAi = model.startsWith("openai/")');
    expect(fn).toContain("https://ai.gateway.lovable.dev/v1/responses");
    expect(fn).toContain("https://ai.gateway.lovable.dev/v1/chat/completions");
    expect(fn).toContain("stream: true");
  });
});
