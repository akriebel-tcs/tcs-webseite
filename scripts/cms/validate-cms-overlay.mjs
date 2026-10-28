#!/usr/bin/env node
/**
 * CMS-Overlay-Validierung — Pre-Live-Gate.
 *
 * Prüft VOR dem Live-Schalten (status='published', is_active=true) zwei
 * Invarianten:
 *
 *   1. REGISTRY-DECKUNG
 *      Jede Seite, die in der DB Sections+Felder hat, muss in
 *      `src/features/cms/registry/pageI18nRegistry.ts` (CMS_PAGE_I18N_REGISTRY)
 *      gemappt sein. Sonst landet das CMS-Overlay nicht in i18next, und
 *      Admin-Edits erscheinen NICHT auf der öffentlichen Site.
 *
 *   2. KEINE LEEREN PFLICHTFELDER
 *      Keine aktive Section darf Felder enthalten, deren Wert leer/NULL ist
 *      UND die zugleich nicht im Overlay-Mapping erreichbar wären.
 *      Konkret: ein leeres Feld ohne Registry-Eintrag bleibt für immer leer
 *      (kein i18n-Fallback, kein Admin-Eingriff möglich).
 *
 * Nutzung:
 *   node scripts/cms/validate-cms-overlay.mjs              # alle Seiten
 *   node scripts/cms/validate-cms-overlay.mjs <prefix>     # z. B. 'zutrittskontrolle.'
 *   node scripts/cms/validate-cms-overlay.mjs --only-live  # nur bereits live geschaltete
 *
 * Exit-Code 0 = OK, 1 = Validierungsfehler. Liest die Registry direkt
 * aus dem TS-File via Regex (keine TS-Toolchain nötig).
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO = process.cwd();
const REGISTRY_PATH = path.join(REPO, "src/features/cms/registry/pageI18nRegistry.ts");

function loadRegistryKeys() {
  const src = fs.readFileSync(REGISTRY_PATH, "utf8");
  // Erfasst "page_key": { ... } innerhalb von CMS_PAGE_I18N_REGISTRY
  const re = /"([^"]+)"\s*:\s*\{\s*namespace:/g;
  const keys = new Set();
  let m;
  while ((m = re.exec(src))) keys.add(m[1]);
  return keys;
}

function psql(sql) {
  const res = spawnSync("psql", ["-tA", "-F", "\t", "-c", sql], { encoding: "utf8" });
  if (res.status !== 0) {
    console.error("psql error:", res.stderr);
    process.exit(2);
  }
  return res.stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t"));
}

const args = process.argv.slice(2);
const onlyLive = args.includes("--only-live");
const prefix = args.find((a) => !a.startsWith("--")) ?? "";

const wherePrefix = prefix ? ` AND page_key LIKE '${prefix.replace(/'/g, "''")}%'` : "";
const whereLive = onlyLive ? " AND status = 'published' AND is_active = true" : "";

const registry = loadRegistryKeys();

// 1. Alle Seiten mit Sections/Feldern
const pages = psql(`
  SELECT p.page_key, p.status, p.is_active,
         COALESCE((SELECT count(*) FROM cms_sections s WHERE s.page_key=p.page_key AND s.is_active),0),
         COALESCE((SELECT count(*) FROM cms_section_fields f WHERE f.page_key=p.page_key),0)
    FROM cms_pages p
   WHERE 1=1 ${wherePrefix} ${whereLive}
   ORDER BY p.page_key;
`);

// 2. Leere Felder in aktiven Sections (innerhalb desselben Filters)
const wherePrefixF = prefix ? ` AND f.page_key LIKE '${prefix.replace(/'/g, "''")}%'` : "";
const whereLiveF = onlyLive
  ? " AND EXISTS (SELECT 1 FROM cms_pages p WHERE p.page_key=f.page_key AND p.status='published' AND p.is_active=true)"
  : "";
const emptyFields = psql(`
  SELECT f.page_key, f.section_key, f.field_key, f.locale
    FROM cms_section_fields f
    JOIN cms_sections s ON s.page_key=f.page_key AND s.section_key=f.section_key
   WHERE s.is_active = true
     AND (f.value IS NULL OR length(btrim(f.value)) = 0)
     ${wherePrefixF} ${whereLiveF}
   ORDER BY f.page_key, f.section_key, f.field_key, f.locale;
`);

const missingRegistry = pages.filter(([pk, , , secs, flds]) => Number(secs) > 0 && Number(flds) > 0 && !registry.has(pk));
const emptyByPage = new Map();
for (const [pk, sec, fld, loc] of emptyFields) {
  if (!emptyByPage.has(pk)) emptyByPage.set(pk, []);
  emptyByPage.get(pk).push(`${sec}.${fld} [${loc}]`);
}

let fail = 0;
console.log(`\n=== CMS-Overlay-Validierung ${prefix ? `(Filter: ${prefix}*)` : "(alle Seiten)"} ===\n`);
console.log(`Registry-Einträge: ${registry.size}`);
console.log(`Geprüfte Seiten:  ${pages.length}\n`);

if (missingRegistry.length === 0) {
  console.log("✓ Registry-Deckung: alle Seiten mit Inhalt sind im Overlay-Registry gemappt.");
} else {
  fail = 1;
  console.log(`✗ Registry-Deckung: ${missingRegistry.length} Seite(n) fehlen im Registry:`);
  for (const [pk, st, ia, secs, flds] of missingRegistry) {
    console.log(`   - ${pk}  (status=${st}, active=${ia}, sections=${secs}, fields=${flds})`);
  }
  console.log("   → in src/features/cms/registry/pageI18nRegistry.ts ergänzen, sonst greifen Admin-Edits NICHT.");
}

console.log("");

if (emptyByPage.size === 0) {
  console.log("✓ Leere Felder: keine aktiven Sections mit leeren Feldwerten.");
} else {
  fail = 1;
  console.log(`✗ Leere Felder: ${emptyFields.length} leere Wert(e) in ${emptyByPage.size} Seite(n):`);
  for (const [pk, list] of emptyByPage) {
    console.log(`   ${pk}  (${list.length}x)`);
    for (const item of list.slice(0, 8)) console.log(`     · ${item}`);
    if (list.length > 8) console.log(`     · … +${list.length - 8} weitere`);
  }
  console.log("   → leere Felder vor dem Live-Schalten füllen oder Section deaktivieren.");
}

console.log("");
process.exit(fail);
