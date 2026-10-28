import { describe, expect, it } from "vitest";
import {
  formatSeconds,
  qaReportToCsv,
  runProgress,
  describeRunState,
  scopeSignature,
  type QaReport,
  type TranslationRunRow,
} from "@/features/admin/api/cmsTranslationRuns";

const run = (patch: Partial<TranslationRunRow> = {}): TranslationRunRow => ({
  id: "11111111-1111-1111-1111-111111111111",
  source_locale: "de",
  target_locale: "pl",
  scope_kind: "pages",
  scope_signature: "pages:pl:a,b",
  page_keys: ["a", "b"],
  provider: "lovable_ai",
  model: "google/gemini-3.6-flash",
  status: "running",
  fields_planned: 100,
  fields_done: 20,
  fields_skipped: 5,
  fields_failed: 5,
  batches_done: 3,
  model_calls: 20,
  memory_hits: 5,
  chars_source: 4000,
  cost_estimate: 0.5,
  cost_limit: 5,
  cursor_page_key: "a",
  cursor_section_key: "hero",
  cursor_field_key: "headline",
  last_error: null,
  started_at: new Date(Date.now() - 60_000).toISOString(),
  finished_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...patch,
});

describe("Umfangs-Signatur (Idempotenz)", () => {
  it("ist unabhängig von Reihenfolge und Duplikaten", () => {
    expect(scopeSignature("pages", "pl", ["b", "a", "b"])).toBe(
      scopeSignature("pages", "pl", ["a", "b"]),
    );
  });

  it("unterscheidet Zielsprachen und Gesamtläufe", () => {
    expect(scopeSignature("pages", "pl", ["a"])).not.toBe(scopeSignature("pages", "en", ["a"]));
    expect(scopeSignature("locale", "pl", ["a"])).toBe("locale:pl:*");
  });
});

describe("Fortschritt aus persistierten Laufdaten", () => {
  it("rechnet erledigt+übersprungen+fehlerhaft gegen den Plan", () => {
    const p = runProgress(run());
    expect(p.processed).toBe(30);
    expect(p.planned).toBe(100);
    expect(p.percent).toBe(30);
    expect(p.remaining).toBe(70);
    expect(p.etaSeconds).not.toBeNull();
  });

  it("zeigt niemals 0 Fortschritt, wenn Zeilen geschrieben wurden", () => {
    const p = runProgress(run({ fields_planned: 0, fields_done: 12, fields_skipped: 0, fields_failed: 0 }));
    expect(p.planned).toBe(12);
    expect(p.percent).toBe(100);
  });

  it("überschreitet 100 % nicht", () => {
    const p = runProgress(run({ fields_planned: 10, fields_done: 40 }));
    expect(p.percent).toBeLessThanOrEqual(100);
  });
});

describe("Laufzeitformat", () => {
  it("formatiert Sekunden, Minuten, Stunden", () => {
    expect(formatSeconds(null)).toBe("–");
    expect(formatSeconds(45)).toBe("45 s");
    expect(formatSeconds(125)).toBe("2 min 5 s");
    expect(formatSeconds(7300)).toBe("2 h 1 min");
  });
});

describe("QA-CSV", () => {
  const report: QaReport = {
    target_locale: "pl",
    checked: 2,
    ok: 1,
    issues_total: 1,
    by_issue: { ziel_leer: 1 },
    failed_batches: 0,
    items: [
      {
        page_key: "anwendungen.klinik",
        section_key: "hero",
        field_key: "headline",
        issue: "ziel_leer",
        review_status: null,
        de_value: 'Text mit "Anführung"',
        target_value: "",
      },
    ],
  };

  it("enthält Kopfzeile, Feldadresse und maskierte Anführungszeichen", () => {
    const csv = qaReportToCsv(report);
    expect(csv.split("\r\n")[0]).toContain("seite;baustein;feld");
    expect(csv).toContain("anwendungen.klinik");
    expect(csv).toContain('""Anführung""');
  });
});

describe("Ehrlicher Laufzustand (Regression 235/227/done)", () => {
  it("zeigt niemals „abgeschlossen“ bei unter 100 %", () => {
    const r = run({ status: "done", fields_planned: 235, fields_done: 227, fields_skipped: 0, fields_failed: 0, last_error: "rescan_open_units:8" });
    const st = describeRunState(r);
    expect(runProgress(r).percent).toBeLessThan(100);
    expect(st.incomplete).toBe(true);
    expect(st.remaining).toBe(8);
    expect(st.label).toContain("unvollständig");
    expect(st.label).not.toContain("abgeschlossen");
    expect(st.canResume).toBe(true);
    expect(st.reason).toBe("rescan_open_units:8");
  });

  it("nennt einen bilanzierten Lauf abgeschlossen und ohne Fortsetzen", () => {
    const r = run({ status: "done", fields_planned: 227, fields_done: 227, fields_skipped: 0, fields_failed: 0 });
    const st = describeRunState(r);
    expect(runProgress(r).percent).toBe(100);
    expect(st.incomplete).toBe(false);
    expect(st.label).toBe("abgeschlossen");
    expect(st.canResume).toBe(false);
  });

  it("erlaubt Fortsetzen bei pausiert, wartend und Fehler", () => {
    for (const status of ["paused", "queued", "error"] as const) {
      expect(describeRunState(run({ status })).canResume).toBe(true);
    }
  });
});
