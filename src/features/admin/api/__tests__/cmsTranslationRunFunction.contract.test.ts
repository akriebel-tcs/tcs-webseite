/**
 * Statische Vertragsprüfung des Serverdienstes `cms-translation-run`.
 * Prüft am echten Quelltext, dass die Sicherheitszusagen nicht wegrutschen.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(
  resolve(process.cwd(), "supabase/functions/cms-translation-run/index.ts"),
  "utf8",
);
const client = readFileSync(
  resolve(process.cwd(), "src/features/admin/api/cmsTranslationRuns.ts"),
  "utf8",
);

describe("Serverdienst cms-translation-run", () => {
  it("erlaubt nur projektgebundene Ursprünge", () => {
    expect(src).toContain("244ceaa8-da87-42eb-90d8-045b23513c76");
    expect(src).toContain('const PROJECT_SLUG = "tcs-webseite-db-cms"');
    expect(src).toContain("`https://${PROJECT_SLUG}.lovable.app`");
    expect(src).toContain("`https://preview--${PROJECT_SLUG}.lovable.app`");
    expect(src).not.toMatch(/\^https:\/\/\[a-z0-9-\]\+\\\.lovable\\\.app\$/);
    expect(src).toContain("origin_not_allowed");
    expect(src).toContain("origin_required");
  });


  it("bremst Menge serverseitig und atomar", () => {
    expect(src).toContain("rpc_internal_rate_limit_hit");
    expect(src).toContain("cms_translation_start");
    expect(src).toContain("cms_translation_step");
    expect(src).toContain("cms_translation_model_day");
  });

  it("hat harte Grenzen und Kostenlimits", () => {
    expect(src).toContain("MAX_ITEMS_PER_STEP = 25");
    expect(src).toContain("cost_limit_exceeded");
    expect(src).toContain("daily_model_budget_reached");
  });

  it("verlangt für Gesamtläufe ein serverseitiges Freigabewort", () => {
    expect(src).toContain("CMS_TRANSLATION_GLOBAL_TOKEN");
    expect(src).toContain("global_authorization_not_configured");
    expect(src).toContain("global_authorization_invalid");
  });

  it("schreibt Inhalte nur über die interne, geschützte Funktion", () => {
    expect(src).toContain("rpc_internal_apply_machine_translation");
    expect(src).not.toContain("rest/v1/cms_section_fields");
  });

  it("gibt keine Geheimnisse an den Client oder ins Log", () => {
    expect(src).toMatch(/configured: Boolean\(env\("LOVABLE_API_KEY"\)\)/);
    expect(src).not.toMatch(/console\.(log|error|warn)\([^)]*(SERVICE_KEY|apiKey|API_KEY)/);
  });

  it("sendet nur Textsegment und Kontextlabel an das Modell", () => {
    expect(src).toContain("systemPrompt(context, target)");
    expect(src).toContain("input: text");
  });

  it("nutzt das vorgegebene Standardmodell über den Antwort-Endpunkt mit Datenstrom", () => {
    // Es gibt keine feste Modellliste im Code: Standard kommt aus der Datenbank
    // (`is_default`), nur ein Notfallwert steht in der Funktion.
    expect(src).toContain('const FALLBACK_MODEL = "google/gemini-3.6-flash"');
    expect(src).toContain("defaultModelFor");
    expect(src).not.toContain("gemini-2.5");
    expect(src).toContain("https://ai.gateway.lovable.dev/v1/responses");
    expect(src).toContain("stream: true");
    expect(src).toContain("readResponsesStream");
    // Beim Gateway-Modell darf keine Ausgabelänge gesetzt werden;
    // `max_tokens` gehört ausschließlich zum Anthropic-Weg.
    const lovableBlock = src.slice(
      src.indexOf("async function translateWithLovable"),
      src.indexOf("async function readResponsesStream"),
    );
    expect(lovableBlock).not.toContain("max_tokens");
    expect(lovableBlock).not.toContain("maxOutputTokens");
  });

  it("schätzt Modellaufrufe nie negativ", () => {
    expect(src).toContain("model_calls_expected: Math.max(");
  });

  it("unterstützt Anbieter-Abstraktion inklusive DeepL API", () => {
    expect(src).toContain("translateWithGemini");
    expect(src).toContain("translateWithAnthropic");
    expect(src).toContain("translateWithDeepl");
    expect(src).toContain("deepl_target_unsupported");
  });

it("zählt erfolgreiche No-op-Anwendungen als verarbeitet", () => {
    expect(src).toContain("if (applied?.success && !applied?.skipped) done++;");
    expect(src).not.toContain("if (applied?.success && applied?.updated) done++;");
  });

  it("überlässt den Abschluss der Datenbankprüfung statt blind „done“ zu melden", () => {
    expect(src).toContain('const settled = out.run?.status === "done"');
    expect(src).toContain("finished: settled");
    expect(src).toContain("open_units");
  });

  it("setzt einen Lauf nur über die prüfende Fortsetzen-Funktion fort", () => {
    expect(src).toContain("rpc_internal_translation_run_resume");
  });

  it("wiederholt nur vorübergehende Fehler mit Backoff", () => {
    expect(src).toContain("const delays = [400, 1200, 3000]");
    expect(src).toContain("retryable");
  });
});

describe("Client-Zugang", () => {
  it("nutzt ausschließlich den Serverdienst zum Schreiben", () => {
    expect(client).toContain('supabase.functions.invoke("cms-translation-run"');
    expect(client).not.toMatch(/\.(insert|update|upsert|delete)\(/);
    expect(client).not.toMatch(/rpc\(\s*"rpc_internal/);
  });

  it("enthält keine Provider-Schlüssel oder Service-Rolle", () => {
    expect(client).not.toMatch(/service_role|API_KEY|Bearer /);
  });
});

describe("Serverseitiger Arbeiter (Verarbeitung ohne Browser)", () => {
  it("kennt die Aktion worker und einen gemeinsamen Schrittprozessor", () => {
    expect(src).toContain('| "worker"');
    expect(src).toContain("async function performStep(");
    expect(src).toContain('if (action === "worker")');
  });

  it("arbeitet mit Lease, Lebenszeichen und Freigabe", () => {
    expect(src).toContain("rpc_internal_translation_worker_claim");
    expect(src).toContain("rpc_internal_translation_worker_heartbeat");
    expect(src).toContain("rpc_internal_translation_worker_release");
  });

  it("schaltet den Zeitplan nur bei offenen Läufen ein und danach wieder aus", () => {
    expect(src).toContain("rpc_internal_translation_worker_arm");
    expect(src).toContain("rpc_internal_translation_worker_disarm");
    expect(src).toContain("await armWorker();");
  });

  it("begrenzt das Zeitfenster und ruft sich nicht selbst rekursiv auf", () => {
    expect(src).toContain("WORKER_WINDOW_MS");
    expect(src).toContain("WORKER_MAX_STEPS");
    expect(src).not.toMatch(/action:\s*"worker"/);
  });

  it("erlaubt die Ausnahme ohne Ursprung nur für Arbeiter und Katalogabgleich mit Freigabewort", () => {
    expect(src).toContain(
      'if (action !== "worker" && !tokenGatedNoOrigin && !hasInternalProof(req))',
    );
    // Ausnahme gilt nur für den Katalogabgleich und seinen lesenden
    // Protokollnachweis — beide nur mit serverseitigem Freigabewort.
    expect(src).toContain(
      '(action === "sync_ui_catalog" || action === "ui_catalog_sync_capabilities") &&',
    );
    expect(src).toContain('Boolean(env("CMS_TRANSLATION_GLOBAL_TOKEN"))');

  });
});

describe("Oberfläche steuert nur", () => {
  const wb = readFileSync(
    resolve(process.cwd(), "src/features/admin/components/TranslationWorkbench.tsx"),
    "utf8",
  );

  it("enthält keine Arbeitsschritt-Schleife im Browser mehr", () => {
    expect(wb).not.toContain("stepRun");
    expect(wb).not.toContain("autoStep");
    expect(wb).not.toMatch(/while \(!cancelled\)/);
  });

  it("zeigt Lade-, Leer- und Fehlerzustand statt tot wirkender Auswahl", () => {
    expect(wb).toContain("selectsBusy");
    expect(wb).toContain("keine Sprache verfügbar");
    expect(wb).toContain("kein Anbieter verfügbar");
    expect(wb).toContain("kein Modell für diesen Anbieter gepflegt");
    expect(wb).toContain("Neu laden");
  });

  it("sperrt den Start bei nicht konfiguriertem Anbieter und Doppelklick", () => {
    expect(wb).toContain("if (!providerConfigured)");
    expect(wb).toContain("startBusy || startBlockReason != null");
  });

  it("führt den Hauptablauf in fünf sichtbaren Schritten mit Modellwahl an Position 2", () => {
    expect(wb).toContain('title="Sprache wählen"');
    expect(wb).toContain('title="Anbieter und Modell wählen"');
    expect(wb).toContain('title="Fehlende Texte prüfen"');
    expect(wb).toContain('title="Übersetzung starten"');
    expect(wb).toContain('title="Fortschritt"');
    // Kein technischer Secret-Name in der Oberfläche.
    expect(wb).not.toContain("CMS_TRANSLATION_GLOBAL_TOKEN");
    expect(wb).toContain("Einmalige Einrichtung erforderlich");
    expect(wb).toContain(
      "Der CMS-Bereich hat derzeit keine Anmeldung. Deshalb muss ein Administrator einmalig",
    );
  });

  it("verwirft die Vorschau bei Sprach-, Anbieter- oder Modellwechsel", () => {
    expect(wb).toContain("const resetPreview = ()");
    // Jeder Wechsel in Schritt 1 und 2 ruft resetPreview auf.
    expect((wb.match(/resetPreview\(\)/g) ?? []).length).toBeGreaterThanOrEqual(6);
  });


  it("steuert die Sprachsichtbarkeit über die Schreibfunktion mit Protokoll", () => {
    const panel = readFileSync(
      resolve(process.cwd(), "src/features/admin/components/LocaleManagerPanel.tsx"),
      "utf8",
    );
    expect(wb).toContain("setLocaleVisibility");
    expect(panel).toContain("im CMS bearbeitbar");
    expect(panel).toContain("auf der Website sichtbar");
    // Quellsprache Deutsch bleibt gesperrt.
    expect(panel).toContain("disabled={l.is_source");
  });

  it("zeigt genau eine Restzeit, ehrlich beschriftet und aus dem Lauf", () => {
    const api = client;
    expect(api).toContain("ETA_MIN_SAMPLE");
    expect(api).toContain("Noch keine belastbare Restzeit");
    expect(api).toContain("Wartet auf nächsten Serverschritt");
    expect(wb).toContain("describeEta(activeRun)");
    expect((wb.match(/etaText/g) ?? []).length).toBeLessThanOrEqual(3);
  });

  it("findet einen offenen Lauf wieder und erzeugt keinen Doppelauftrag", () => {
    expect(wb).toContain("findRunForLocale");
    expect(wb).toContain("findActiveRunForScope");
    expect(wb).toContain("Lauf läuft bereits");
    expect(wb).toContain("Auftrag angenommen");
  });

  it("zeigt übersprungene Texte getrennt und die letzte Serveraktivität", () => {
    expect(wb).toContain("übersprungen");
    expect(wb).toContain("letzte Serveraktivität");
    expect(wb).toContain("fields_skipped");
  });

  it("hält den Freigabecode für die geöffnete Sitzung, ohne ihn zu speichern", () => {
    expect(wb).toContain("releaseAccepted");
    expect(wb).toContain("Für diese Sitzung freigeschaltet");
    expect(wb).not.toMatch(/localStorage|sessionStorage/);
  });

  it("benennt Vorbereitungsstatus verständlich statt „nicht freigeschaltet“", () => {
    expect(wb).toContain("noch nicht vorbereitet");
    expect(wb).not.toContain("noch nicht freigeschaltet\", num(");
  });

  it("bereitet die Zielsprache serverseitig vor — bei Prüfung und bei Start", () => {
    const calls = src.match(/rpc_internal_translation_prepare_and_dry_run/g) ?? [];
    expect(calls.length).toBe(2);
    expect(src).not.toContain('rpc<Record<string, number>>("rpc_internal_translation_dry_run"');
  });

  it("sagt verständlich, was übersetzt wird und was erhalten bleibt", () => {
    expect(wb).toContain("fehlende Texte werden übersetzt");
    expect(wb).toContain("vorhandene bleiben erhalten");
    expect(wb).toContain("technische Ausnahmen");
    expect(wb).toContain("dry.dry_run.not_whitelisted > 0");
  });



it("zeigt „abgeschlossen“ nie zusammen mit unter 100 % und bietet Restlauf an", () => {
    expect(wb).toContain("describeRunState");
    expect(wb).toContain("Restlauf fortsetzen");
    expect(wb).toContain("Restobjekte offen");
    expect(wb).toContain("runState?.canResume");
  });

  it("nimmt einen laufenden Lauf nach Neuladen automatisch auf", () => {
    const api = client;
    expect(api).toContain('["queued", "running", "paused"].includes(r.status)');
  });
});
