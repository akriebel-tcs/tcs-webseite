#!/usr/bin/env node
/**
 * CI-Konsistenzcheck für den Wahrheits-Check.
 *
 * Läuft bei jedem Push/PR auf main und stellt sicher, dass:
 *
 *   1. der Harvester offline reproduzierbar ist (Snapshot-Modus, kein Supabase),
 *   2. die generierten Artefakte (`knownPageObjectContracts.ts` +
 *      `faq-cta-toggle-inventar.md`) **bit-genau** dem entsprechen, was im
 *      Repo eingecheckt ist — d. h. niemand hat sie händisch verändert,
 *      ohne den Harvester neu laufen zu lassen,
 *   3. keine `foo.bar`-/Kommentar-False-Positives in die Allowlists
 *      gerutscht sind,
 *   4. die Body-Map konsistent ist (jeder `page_key` aus `cms_pages`
 *      hat einen Eintrag `ok` oder `unknown`).
 *
 * Reines Lesen + Diff. Schreibt nichts ins Repo (Harvester-Output wird in
 * ein temporäres Verzeichnis umgeleitet und am Ende mit den eingecheckten
 * Dateien verglichen).
 *
 * Exit-Code 0 = OK, 1 = Drift/Verletzung mit klarer Meldung.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, copyFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const SNAPSHOT_DIR = path.join(ROOT, "scripts/sync/snapshot");
const TRACKED_TS = path.join(ROOT, "src/features/admin/lib/knownPageObjectContracts.ts");
const TRACKED_MD = path.join(ROOT, "docs/04-betrieb/faq-cta-toggle-inventar.md");

const failures = [];
function fail(msg) { failures.push(msg); }

// 1) Harvester in isoliertem Tempdir laufen lassen.
const work = mkdtempSync(path.join(tmpdir(), "wahrheits-check-ci-"));
try {
  // Wir rufen den Harvester direkt auf, leiten aber die Schreibziele
  // über ein Shadow-Repo um: dafür spiegeln wir die Verzeichnisstruktur
  // soweit nötig in `work` und führen den Harvester dort aus.
  // Einfacher: Harvester schreibt relativ zu cwd. Also: Harvester im
  // ECHTEN cwd laufen lassen, danach beide Output-Dateien beiseitelegen,
  // mit den getrackten Dateien vergleichen, und dann den Originalzustand
  // aus git wiederherstellen.
  //
  // Um den Working Tree NICHT zu verändern, kopieren wir vor dem Lauf
  // die getrackten Dateien weg, lassen den Harvester schreiben, vergleichen,
  // und schreiben die Originale zurück.
  const backupTs = path.join(work, "tracked.ts");
  const backupMd = path.join(work, "tracked.md");
  copyFileSync(TRACKED_TS, backupTs);
  copyFileSync(TRACKED_MD, backupMd);

  try {
    execFileSync(
      process.execPath,
      ["scripts/cms/faq-cta-toggle-inventar.mjs", "--snapshot", SNAPSHOT_DIR],
      { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (e) {
    const stderr = e.stderr?.toString() ?? "";
    const stdout = e.stdout?.toString() ?? "";
    fail(`Harvester ist im Snapshot-Modus fehlgeschlagen:\n${stderr || stdout || e.message}`);
  }

  const generatedTs = readFileSync(TRACKED_TS, "utf8");
  const generatedMd = readFileSync(TRACKED_MD, "utf8");

  // Originale zurückschreiben (Repo bleibt unverändert).
  copyFileSync(backupTs, TRACKED_TS);
  copyFileSync(backupMd, TRACKED_MD);

  const trackedTs = readFileSync(backupTs, "utf8");
  const trackedMd = readFileSync(backupMd, "utf8");

  // 2) Diff: getrackt vs. frisch generiert.
  //    Den `Stand: YYYY-MM-DD`-Header normalisieren, sonst kippt der Vergleich
  //    täglich um. Beide Dateien tragen genau einen solchen Zeitstempel.
  const normalize = (s) =>
    s
      .replace(/Stand:\s*\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?/g, "Stand: <NORMALIZED>")
      // Snapshot-Quelle normalisieren: absoluter Pfad variiert je Maschine
      // (`/dev-server/...` in CI, `D:/.../` lokal auf Windows, `/Users/...` auf macOS).
      .replace(/Quelle:\s*`snapshot:[^`]+`/g, "Quelle: `snapshot:<NORMALIZED>`")
      .replace(/\r\n/g, "\n");

  if (normalize(generatedTs) !== normalize(trackedTs)) {
    fail(
      "knownPageObjectContracts.ts driftet: eingecheckte Version unterscheidet sich vom Harvester-Output.\n" +
        "Fix: `node scripts/cms/faq-cta-toggle-inventar.mjs --snapshot scripts/sync/snapshot` lokal laufen lassen und committen.",
    );
  }
  if (normalize(generatedMd) !== normalize(trackedMd)) {
    fail(
      "docs/04-betrieb/faq-cta-toggle-inventar.md driftet: Inhalt entspricht nicht dem Harvester-Output.\n" +
        "Fix: Harvester neu laufen lassen und Bericht committen.",
    );
  }

  // 3) Keine `foo.bar`-/Kommentar-False-Positives.
  if (/foo\.bar/.test(generatedTs) || /foo\.bar/.test(generatedMd)) {
    fail("`foo.bar` taucht in generierten Artefakten auf — Kommentar-Stripper im Harvester ist defekt.");
  }

  // 4) Body-Map deckt alle Seiten ab.
  const pages = JSON.parse(readFileSync(path.join(SNAPSHOT_DIR, "tables/cms_pages.json"), "utf8"));
  const bodyMatch = generatedTs.match(/body:\s*(\{[\s\S]*?\n\s*\}),?\s*\n\s*\};/);
  if (!bodyMatch) {
    fail("Body-Map konnte in knownPageObjectContracts.ts nicht gefunden werden.");
  } else {
    let body;
    try {
      // JSON-konform: Schlüssel sind bereits quoted.
      body = JSON.parse(bodyMatch[1]);
    } catch (e) {
      fail(`Body-Map ist kein valides JSON: ${e.message}`);
      body = {};
    }
    const missing = [];
    const bad = [];
    for (const p of pages) {
      const v = body[p.page_key];
      if (v === undefined) missing.push(p.page_key);
      else if (v !== "ok" && v !== "unknown") bad.push(`${p.page_key}=${v}`);
    }
    if (missing.length) fail(`Body-Map fehlt für ${missing.length} Seiten, z. B.: ${missing.slice(0, 5).join(", ")}`);
    if (bad.length) fail(`Body-Map enthält unerlaubte Werte: ${bad.slice(0, 5).join(", ")}`);
  }

  // 5) Launch-Gate: harte Zähler-Schwellen auf die Summary-Tabelle.
  //    Bisher prüfte dieser CI-Job nur Drift gegen die eingecheckten
  //    Artefakte — eine NEUE Orphan/Mixed/Dedup-Only-Seite wäre durch-
  //    gerutscht, solange jemand die generierte Datei mit-commitet.
  //    Diese Assertion macht aus dem Wahrheits-Check ein echtes
  //    Launch-Gate: jede Verschlechterung der CMS-Synchronität schlägt
  //    auf rotes CI um.
  const summaryRe =
    /\| FAQ\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*\n\| CTA\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/;
  const m = generatedMd.match(summaryRe);
  if (!m) {
    fail("Summary-Tabelle FAQ/CTA konnte nicht aus dem Harvester-Bericht gelesen werden — Tabellenform verändert?");
  } else {
    const [, , faqDedup, faqOrphan, faqMixed, , , , ctaDedup, ctaOrphan, ctaMixed] = m;
    const checks = [
      ["FAQ ORPHAN", Number(faqOrphan)],
      ["FAQ MIXED", Number(faqMixed)],
      ["FAQ OK_DEDUP_ONLY", Number(faqDedup)],
      ["CTA ORPHAN", Number(ctaOrphan)],
      ["CTA MIXED", Number(ctaMixed)],
      ["CTA OK_DEDUP_ONLY", Number(ctaDedup)],
    ];
    for (const [label, n] of checks) {
      if (n > 0) {
        fail(
          `Launch-Gate: ${label} = ${n} (erlaubt: 0). ` +
            "Eine neue Seite läuft an Admin-FAQ/CTA-Schaltern vorbei. " +
            "Fix: Seite über CmsTailFaq/CmsTailCta oder generischen Renderer einbinden.",
        );
      }
    }
  }

} finally {
  try { rmSync(work, { recursive: true, force: true }); } catch { /* noop */ }
}

if (failures.length) {
  console.error("❌ Wahrheits-Check CI FEHLGESCHLAGEN:");
  for (const f of failures) console.error("\n   - " + f);
  process.exit(1);
}

console.log("✅ Wahrheits-Check CI OK — Harvester reproduzierbar, keine Drift, Body-Map vollständig, Launch-Gate erfüllt (FAQ/CTA orphan/mixed/dedup-only = 0).");
