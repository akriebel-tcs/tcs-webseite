#!/usr/bin/env node
/**
 * Harvest-Skript: scannt alle Page-/Block-Komponenten im src/-Baum nach
 *   cms.asset("<section>", "<field>", ...)
 * Aufrufen und ordnet sie über `pageKey="..."`-Deklarationen in derselben Datei
 * oder in benachbarten Layout-Komponenten dem zugehörigen page_key zu.
 *
 * Ergebnis ist eine deterministisch sortierte TypeScript-Konstante
 *   src/features/admin/lib/knownPageComponentReads.ts
 * mit allen (page_key, section_key, field_key)-Tupeln, die NICHT von einem
 * V1-Renderer aus `rendererSlotMap.ts` abgedeckt werden, aber von einer
 * hartkodierten Page-Komponente gelesen werden.
 *
 * Diese Tupel werden im Wahrheits-Check als Status `page_component_read`
 * (ok, kein Fehler) ausgewiesen — der Slot ist legitim gelesen, nur eben
 * von einer Page-Komponente statt einer V1-Section.
 *
 * Plattformneutral (Windows + macOS + Linux): kein `find`, kein `globSync`,
 * stattdessen rekursiver `fs.readdirSync({withFileTypes:true})`.
 * Kommentare werden vor dem Regex-Scan entfernt, damit Beispiele aus
 * Code-Kommentaren keine False-Positives in der Allowlist erzeugen.
 *
 * Idempotent. Schreibwege bleiben unangetastet.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const SRC_DIR = path.join(ROOT, "src");

// Rekursiver Walker (plattformneutral, ohne externe Abhängigkeiten).
function walk(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, acc);
    } else if (e.isFile() && /\.(tsx|ts)$/.test(e.name)) {
      acc.push(path.relative(ROOT, full).split(path.sep).join("/"));
    }
  }
  return acc;
}

const files = walk(SRC_DIR);

// Kommentare entfernen, damit Beispiele in Doc-Kommentaren keine
// vermeintlichen `cms.asset(...)`-Aufrufe in die Allowlist tragen.
// Reihenfolge wichtig: zuerst Block-, dann Zeilenkommentare.
function stripComments(src) {
  // /* ... */  (greedy auf Multiline)
  let out = src.replace(/\/\*[\s\S]*?\*\//g, "");
  // // ... bis Zeilenende — nicht innerhalb von Strings; einfache Heuristik
  // reicht hier, weil wir die Datei sowieso nur per Regex scannen.
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  return out;
}

// Regexe
const PAGE_KEY_RE = /pageKey\s*[:=]\s*["'`]([a-z0-9._-]+)["'`]/g;
const PAGE_KEY_CONST_RE = /const\s+PAGE_KEY\s*=\s*["'`]([a-z0-9._-]+)["'`]/g;
// Section + Field jeweils als reines String-Literal (kein ${…}). Greift auch
// alternative Adapter-Namen wie `cmsContent.asset(...)` oder `content.asset(...)`.
const ASSET_CALL_RE = /\b[a-zA-Z_][a-zA-Z0-9_]*\.asset\s*\(\s*["'`]([a-zA-Z0-9._-]+)["'`]\s*,\s*["'`]([a-zA-Z0-9._-]+)["'`]/g;
// Dynamische Field-Reads: <adapter>.asset("section", `...${...}...`, ...) — wir
// markieren die ganze Section als „Page-Component liest beliebige Felder".
const ASSET_CALL_DYNAMIC_RE = /\b[a-zA-Z_][a-zA-Z0-9_]*\.asset\s*\(\s*["'`]([a-zA-Z0-9._-]+)["'`]\s*,\s*`[^`]*\$\{[^`]*`/g;
// Variable als field (z. B. `cmsContent.asset("anwendungsumfelder", item.imageField, "")`).
// Auch hier markieren wir die ganze Section als Wildcard.
const ASSET_CALL_VAR_FIELD_RE = /\b[a-zA-Z_][a-zA-Z0-9_]*\.asset\s*\(\s*["'`]([a-zA-Z0-9._-]+)["'`]\s*,\s*[a-zA-Z_][a-zA-Z0-9_.]*\s*[,)]/g;

// Erste Runde: page_key je Datei sammeln.
const pageKeyByFile = new Map();
for (const file of files) {
  let src;
  try {
    src = readFileSync(path.join(ROOT, file), "utf8");
  } catch {
    continue;
  }
  const clean = stripComments(src);
  const keys = new Set();
  let m;
  while ((m = PAGE_KEY_RE.exec(clean))) keys.add(m[1]);
  PAGE_KEY_RE.lastIndex = 0;
  while ((m = PAGE_KEY_CONST_RE.exec(clean))) keys.add(m[1]);
  PAGE_KEY_CONST_RE.lastIndex = 0;
  if (keys.size > 0) pageKeyByFile.set(file, [...keys]);
}

// Zweite Runde: cms.asset(section, field)-Aufrufe je Datei sammeln.
const callsByFile = new Map();
for (const file of files) {
  let src;
  try {
    src = readFileSync(path.join(ROOT, file), "utf8");
  } catch {
    continue;
  }
  const clean = stripComments(src);
  const calls = [];
  let m;
  while ((m = ASSET_CALL_RE.exec(clean))) {
    calls.push({ section: m[1], field: m[2] });
  }
  while ((m = ASSET_CALL_DYNAMIC_RE.exec(clean))) {
    calls.push({ section: m[1], field: "*" });
  }
  while ((m = ASSET_CALL_VAR_FIELD_RE.exec(clean))) {
    calls.push({ section: m[1], field: "*" });
  }
  if (calls.length > 0) callsByFile.set(file, calls);
}

// Auflösung: für jede Datei mit Calls den eigenen page_key oder den der
// Datei, die diese Komponente importiert (eine Ebene tief).
const tuples = new Set();
for (const [file, calls] of callsByFile) {
  let keys = pageKeyByFile.get(file);
  if (!keys || keys.length === 0) {
    const base = path.basename(file).replace(/\.(tsx|ts)$/, "");
    for (const candidate of files) {
      if (candidate === file) continue;
      let src;
      try {
        src = readFileSync(path.join(ROOT, candidate), "utf8");
      } catch {
        continue;
      }
      if (src.includes(`/${base}"`) || src.includes(`/${base}'`)) {
        const parentKeys = pageKeyByFile.get(candidate);
        if (parentKeys && parentKeys.length > 0) {
          keys = (keys ?? []).concat(parentKeys);
        }
      }
    }
  }
  if (!keys || keys.length === 0) continue;
  for (const pk of keys) {
    for (const c of calls) {
      tuples.add(`${pk}|${c.section}|${c.field}`);
    }
  }
}

// Manuell gepflegte Ergänzungen für Page-Komponenten mit dynamischem page_key
// (z. B. Detail-Seiten mit Slug). Format wie oben; `*` als ganzer
// page_key-Bestandteil ist erlaubt (Prefix-Match im Truth-Check).
const MANUAL_EXTRA = [
  "anwendungen.referenzprojekte.*|gallery|img_0",
  "anwendungen.referenzprojekte.*|gallery|img_1",
  "anwendungen.referenzprojekte.*|gallery|img_2",
];
for (const t of MANUAL_EXTRA) tuples.add(t);

// Deterministisch sortieren
const sorted = [...tuples].sort();

const banner = `/**
 * AUTO-GENERIERT durch scripts/cms/harvest-page-component-reads.mjs
 * Stand: ${new Date().toISOString().slice(0, 10)}
 *
 * Tupel (page_key|section_key|field_key) von Bildslots, die von hartkodierten
 * Page-Komponenten via cms.asset(...) gelesen werden — und damit legitim sind,
 * obwohl sie nicht im V1-Renderer-Slot-Map stehen.
 *
 * Verwendung: Wahrheits-Check setzt für diese Tupel den Status
 * \`page_component_read\` (ok), statt fälschlich \`renderer_orphan\`.
 *
 * NICHT manuell editieren. Bei neuen Page-Komponenten Skript neu laufen lassen.
 */

export const KNOWN_PAGE_COMPONENT_READS: ReadonlySet<string> = new Set<string>([
${sorted.map((s) => `  ${JSON.stringify(s)},`).join("\n")}
]);
`;

const outFile = "src/features/admin/lib/knownPageComponentReads.ts";
writeFileSync(path.join(ROOT, outFile), banner, "utf8");
console.log(`✓ ${outFile}: ${sorted.length} Tupel`);
