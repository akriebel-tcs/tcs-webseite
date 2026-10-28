/**
 * Sprachvertrag-Gate als Test.
 *
 * Faellt rot, wenn
 *  - ein im Code benutzter i18n-Schluessel in einer aktiven oeffentlichen
 *    Zielsprache fehlt (Fallback auf Deutsch), oder
 *  - eine oeffentlich genutzte Komponente sichtbaren Text hart verdrahtet
 *    hat (inkl. Zweisprachen-Ternaries wie `loc === "en" ? ... : ...`).
 *
 * Details/Allowlist: scripts/i18n/sprachvertrag-audit.config.json
 */
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

interface AuditReport {
  targetLocales: string[];
  missingKeys: { locale: string; namespace: string; key: string; file: string; binding: string }[];
  literals: { file: string; kind: string; text: string }[];
}

function runAudit(): AuditReport {
  const out = execFileSync(
    process.execPath,
    ["scripts/i18n/sprachvertrag-audit.mjs", "--json"],
    { cwd: process.cwd(), encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  return JSON.parse(out) as AuditReport;
}

describe("Sprachvertrag", () => {
  const report = runAudit();

  it("kennt Zielsprachen", () => {
    expect(report.targetLocales.length).toBeGreaterThan(0);
  });

  it("hat keine fehlenden i18n-Schluessel in Code-Mikrotexten", () => {
    const hard = report.missingKeys.filter((m) => m.binding === "code");
    expect(hard.map((m) => `${m.locale}/${m.namespace}:${m.key} (${m.file})`)).toEqual([]);
  });

  it("hat keine hart verdrahteten sichtbaren Texte in oeffentlichen Komponenten", () => {
    expect(report.literals.map((l) => `${l.file} [${l.kind}] ${l.text}`)).toEqual([]);
  });
});
