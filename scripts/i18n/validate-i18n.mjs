#!/usr/bin/env node
/**
 * i18n-Validierungscheck (Stufe 1, regex-/textbasiert).
 *
 * Prüft:
 *  A) Locale-Dateien:
 *     - DE/EN-Dateienpaare vorhanden
 *     - Leaf-Key-Anzahl pro Sprache
 *     - DE/EN-Strukturgleichheit (gleiche Key-Pfade)
 *     - leere Werte ("", null, nur Whitespace)
 *     - _meta.namespace == Dateiname (falls vorhanden)
 *     - _meta.status in allowedMetaStatus (falls vorhanden)
 *  B) strictPages (bereits migrierte TSX-Seiten):
 *     - Datei existiert
 *     - useTranslation( vorhanden
 *     - keine harten sichtbaren deutschen Texte (Heuristik)
 *
 * Exit-Code: 0 = ok, 1 = Fehler.
 *
 * Keine Runtime-Dependencies. Nur Node-Builtins.
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, basename, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..", "..");

/**
 * Normalisiert einen Pfad auf POSIX-Form (Forward-Slashes), relativ zum
 * Projekt-Root. Robust gegen Windows-Backslashes, gemischte Trenner und
 * absolute Pfade. Pfade aus der Config (z. B. "src/features/...") bleiben
 * unverändert relativ; absolute Pfade werden zunächst über path.relative()
 * in projektrelative Pfade überführt. Doppelte Slashes werden kollabiert,
 * ein optionaler "./"-Prefix entfernt.
 */
function toPosix(p) {
  if (p == null) return p;
  let s = String(p);
  // Absolute Pfade auf projektrelativ herunterbrechen (plattformneutral).
  // Wir entscheiden anhand des aktuellen OS-Separators, nicht raten.
  const isAbs = s.startsWith("/") || /^[A-Za-z]:[\\/]/.test(s);
  if (isAbs) {
    try {
      s = relative(projectRoot, s);
    } catch {
      /* ignore — fällt auf reinen Slash-Tausch zurück */
    }
  }
  // Backslashes → Forward-Slashes
  s = s.split("\\").join("/");
  // Doppelte Slashes kollabieren
  s = s.replace(/\/+/g, "/");
  // Optionalen "./"-Prefix entfernen
  if (s.startsWith("./")) s = s.slice(2);
  return s;
}
const configPath = join(__dirname, "i18n-check.config.json");

if (!existsSync(configPath)) {
  console.error(`Konfigurationsdatei nicht gefunden: ${configPath}`);
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, "utf8"));

const localesDir = resolve(projectRoot, config.localesDir);
const featuresDir = config.featuresDir
  ? resolve(projectRoot, config.featuresDir)
  : resolve(projectRoot, "src/features");
const languages = config.languages ?? ["de", "en"];
const masterLanguage = config.masterLanguage ?? "de";
const allowedMetaStatus = config.allowedMetaStatus ?? ["prepared", "in-progress", "complete"];
const strictPages = (config.strictPages ?? []).map(toPosix);
const strictPagesSet = new Set(strictPages);
const ignorePages = new Set((config.ignorePages ?? []).map(toPosix));
// exemptPages: Pages, die bewusst NICHT in strictPages stehen müssen,
// auch wenn sie useTranslation nutzen oder geroutet sind.
// Format: [{ "path": "src/.../Foo.tsx", "reason": "Container-Seite ohne eigene Texte" }]
const exemptPages = (config.exemptPages ?? []).map((e) => ({
  ...e,
  path: toPosix(e.path),
}));
const exemptPagesByPath = new Map(
  exemptPages.map((e) => [e.path, e.reason ?? "(keine Begründung dokumentiert)"])
);
const germanTerms = config.germanTerms ?? [];
const allowedTechnicalTerms = config.allowedTechnicalTerms ?? [];

let totalErrors = 0;
let totalWarnings = 0;

const COLOR = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

const c = (color, text) => `${COLOR[color]}${text}${COLOR.reset}`;

// Batch 57.1: gemeinsame DB-first-/i18n-Bindungserkennung.
// Eine Seite gilt als sauber gebunden, wenn sie mindestens eines der
// folgenden Patterns enthält. Hartcodierte deutsche Sichttexte werden
// weiterhin von findGermanHits() erkannt — diese Bindungserkennung
// ersetzt diese Prüfung NICHT.
function isI18nOrCmsBound(source) {
  return (
    /\buseTranslation\s*\(/.test(source) ||
    /\buseCmsI18n\s*\(/.test(source) ||
    /\b(useCmsPageContent|useCmsPageFields)\s*\(/.test(source) ||
    /\b(GenericCmsPage|CmsOnlyShell|CmsProductSolutionShell)\b/.test(source) ||
    /\brenderPageSectionByType\s*\(/.test(source)
  );
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function collectLeafKeys(obj, prefix = "", out = new Map()) {
  if (obj === null || typeof obj !== "object") {
    out.set(prefix, obj);
    return out;
  }
  if (Array.isArray(obj)) {
    obj.forEach((value, idx) => {
      collectLeafKeys(value, prefix ? `${prefix}.${idx}` : String(idx), out);
    });
    return out;
  }
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object") {
      collectLeafKeys(value, next, out);
    } else {
      out.set(next, value);
    }
  }
  return out;
}

function isEmptyValue(value) {
  if (value === null) return true;
  if (typeof value !== "string") return false;
  return value.trim() === "";
}

function getByPath(obj, path) {
  return path.split(".").reduce((acc, part) => {
    if (acc === undefined || acc === null) return undefined;
    return acc[part];
  }, obj);
}

// ---------------------------------------------------------------------------
// A) Locale-Prüfung
// ---------------------------------------------------------------------------

console.log(c("bold", "\ni18n-Validierung"));
console.log("================\n");

const namespacesByLang = {};
for (const lang of languages) {
  const dir = join(localesDir, lang);
  if (!existsSync(dir)) {
    console.error(c("red", `Sprachordner fehlt: ${dir}`));
    totalErrors++;
    namespacesByLang[lang] = [];
    continue;
  }
  namespacesByLang[lang] = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

const allNamespaces = Array.from(
  new Set(Object.values(namespacesByLang).flat())
).sort();

const namespaceResults = [];

for (const ns of allNamespaces) {
  const result = {
    namespace: ns,
    deLeaves: 0,
    enLeaves: 0,
    diffCount: 0,
    onlyInDe: [],
    onlyInEn: [],
    emptyValues: [],
    metaStatus: null,
    metaNamespaceMismatch: false,
    errors: [],
    warnings: [],
  };

  const localesByLang = {};
  let loadOk = true;

  for (const lang of languages) {
    const filePath = join(localesDir, lang, `${ns}.json`);
    if (!existsSync(filePath)) {
      result.errors.push(`${lang}/${ns}.json fehlt`);
      loadOk = false;
      continue;
    }
    try {
      localesByLang[lang] = JSON.parse(readFileSync(filePath, "utf8"));
    } catch (err) {
      result.errors.push(`${lang}/${ns}.json ist kein gültiges JSON: ${err.message}`);
      loadOk = false;
    }
  }

  if (!loadOk) {
    namespaceResults.push(result);
    continue;
  }

  // _meta-Prüfung anhand Master-Sprache
  const master = localesByLang[masterLanguage];
  if (master && master._meta) {
    if (master._meta.namespace && master._meta.namespace !== ns) {
      result.metaNamespaceMismatch = true;
      result.errors.push(
        `_meta.namespace ("${master._meta.namespace}") passt nicht zum Dateinamen ("${ns}")`
      );
    }
    if (master._meta.status) {
      result.metaStatus = master._meta.status;
      if (!allowedMetaStatus.includes(master._meta.status)) {
        result.errors.push(
          `_meta.status "${master._meta.status}" ist nicht in allowedMetaStatus`
        );
      }
    }
  }

  // Leaf-Keys sammeln
  const leavesByLang = {};
  for (const lang of languages) {
    leavesByLang[lang] = collectLeafKeys(localesByLang[lang]);
  }
  result.deLeaves = leavesByLang[masterLanguage]?.size ?? 0;
  const otherLang = languages.find((l) => l !== masterLanguage);
  result.enLeaves = otherLang ? leavesByLang[otherLang]?.size ?? 0 : 0;

  // Strukturvergleich (ignoriere _meta-Unterbaum nicht – wir wollen Parität)
  if (otherLang) {
    const masterKeys = new Set(leavesByLang[masterLanguage].keys());
    const otherKeys = new Set(leavesByLang[otherLang].keys());
    for (const k of masterKeys) {
      if (!otherKeys.has(k)) result.onlyInDe.push(k);
    }
    for (const k of otherKeys) {
      if (!masterKeys.has(k)) result.onlyInEn.push(k);
    }
    result.diffCount = result.onlyInDe.length + result.onlyInEn.length;
    if (result.diffCount > 0) {
      result.errors.push(`DE/EN-Strukturdiff: ${result.diffCount} Key(s)`);
    }
  }

  // Leere Werte (in allen Sprachen)
  for (const lang of languages) {
    const leaves = leavesByLang[lang];
    if (!leaves) continue;
    for (const [key, value] of leaves.entries()) {
      // _meta-Felder dürfen leere Notes haben? Wir prüfen alles strikt.
      if (isEmptyValue(value)) {
        result.emptyValues.push(`${lang}:${key}`);
      }
    }
  }
  if (result.emptyValues.length > 0) {
    result.errors.push(`${result.emptyValues.length} leere Werte`);
  }

  namespaceResults.push(result);
}

// Ausgabe Locale-Ergebnisse
for (const r of namespaceResults) {
  const ok = r.errors.length === 0;
  console.log(c("cyan", `Namespace: ${r.namespace}`));
  console.log(`  ${masterLanguage.toUpperCase()} leaf keys: ${r.deLeaves}`);
  const otherLang = languages.find((l) => l !== masterLanguage);
  if (otherLang) {
    console.log(`  ${otherLang.toUpperCase()} leaf keys: ${r.enLeaves}`);
    console.log(`  Diff DE↔EN:   ${r.diffCount}`);
    if (r.onlyInDe.length > 0) {
      console.log(c("red", `    nur in ${masterLanguage.toUpperCase()}: ${r.onlyInDe.slice(0, 10).join(", ")}${r.onlyInDe.length > 10 ? ", …" : ""}`));
    }
    if (r.onlyInEn.length > 0) {
      console.log(c("red", `    nur in ${otherLang.toUpperCase()}: ${r.onlyInEn.slice(0, 10).join(", ")}${r.onlyInEn.length > 10 ? ", …" : ""}`));
    }
  }
  console.log(`  Leere Werte:  ${r.emptyValues.length}`);
  if (r.emptyValues.length > 0) {
    console.log(c("red", `    z. B.: ${r.emptyValues.slice(0, 5).join(", ")}`));
  }
  if (r.metaStatus) {
    console.log(`  _meta.status: ${r.metaStatus}`);
  }
  if (ok) {
    console.log(c("green", "  Status:       OK"));
  } else {
    console.log(c("red", `  Status:       FEHLER (${r.errors.length})`));
    for (const e of r.errors) console.log(c("red", `    - ${e}`));
    totalErrors += r.errors.length;
  }
  console.log("");
}

// ---------------------------------------------------------------------------
// B) strictPages-Prüfung
// ---------------------------------------------------------------------------

console.log(c("bold", "Seiten-Check (strictPages)"));
console.log("--------------------------\n");

const pageResults = [];

function stripJsxAndJsComments(source) {
  // Entferne /* ... */ Blockkommentare
  let out = source.replace(/\/\*[\s\S]*?\*\//g, "");
  // Entferne {/* ... */} JSX-Kommentare (dürfen restlich sein)
  out = out.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");
  // Entferne // Zeilen-Kommentare
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  return out;
}

function findGermanHits(source) {
  const hits = [];
  const lines = source.split("\n");

  // i18n-ignore-next-line Markierungen sammeln
  const ignoredLines = new Set();
  lines.forEach((line, idx) => {
    if (/i18n-ignore-next-line/.test(line)) {
      ignoredLines.add(idx + 1); // nächste Zeile (1-basiert)
    }
  });

  // Block-/JSDoc-Kommentar-Bereiche erkennen (Zeilen-genau, einfache Heuristik)
  const inBlockComment = new Array(lines.length).fill(false);
  let block = false;
  lines.forEach((line, idx) => {
    let l = line;
    // Falls Zeile mit aktivem Block startet
    if (block) inBlockComment[idx] = true;
    // /* ... */ in derselben Zeile zählt nicht als Block für Folgezeilen
    // Mehrere /* und */ pro Zeile berücksichtigen
    while (true) {
      if (!block) {
        const open = l.indexOf("/*");
        if (open === -1) break;
        inBlockComment[idx] = true;
        const close = l.indexOf("*/", open + 2);
        if (close === -1) {
          block = true;
          break;
        }
        l = l.slice(close + 2);
      } else {
        const close = l.indexOf("*/");
        if (close === -1) break;
        block = false;
        l = l.slice(close + 2);
      }
    }
  });

  const umlautRegex = /[äöüÄÖÜß]/;
  const termRegexes = germanTerms.map((t) => ({
    term: t,
    re: new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`),
  }));

  lines.forEach((rawLine, idx) => {
    const lineNo = idx + 1;
    if (ignoredLines.has(lineNo)) return;
    if (inBlockComment[idx]) return;

    let line = rawLine;
    // Entferne // Zeilen-Kommentar-Anteil (Heuristik)
    const slashIdx = line.indexOf("//");
    if (slashIdx >= 0) line = line.slice(0, slashIdx);

    // Importzeilen ignorieren
    if (/^\s*import\b/.test(line)) return;

    // JSX-Kommentare {/* ... */} und Block-Kommentare /* ... */
    // entfernen — sind unsichtbar im DOM und führen sonst zu False-Positives
    // (z. B. Section-Marker wie {/* Geschäftsfelder */}).
    // Einzeilig: vollständig entfernen. Mehrzeilig wird bereits über
    // inBlockComment[idx] erfasst.
    let stripped = line
      .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\buseTranslation\s*\(\s*["'`][^"'`]*["'`]\s*\)/g, "")
      .replace(/\bt\s*\(\s*["'`][^"'`]*["'`](?:\s*,\s*\{[^}]*\})?\s*\)/g, "");

    // Erlaubte technische Begriffe entfernen
    for (const term of allowedTechnicalTerms) {
      stripped = stripped.split(term).join("");
    }

    let matched = null;
    if (umlautRegex.test(stripped)) {
      matched = stripped.match(/[A-Za-zÄÖÜäöüß]*[äöüÄÖÜß][A-Za-zÄÖÜäöüß]*/)?.[0] ?? "Umlaut";
    } else {
      for (const { term, re } of termRegexes) {
        if (re.test(stripped)) {
          matched = term;
          break;
        }
      }
    }

    if (matched) {
      hits.push({ line: lineNo, snippet: rawLine.trim().slice(0, 120), matched });
    }
  });

  return hits;
}

for (const relPath of strictPages) {
  if (ignorePages.has(relPath)) continue;
  const absPath = resolve(projectRoot, relPath);
  const result = {
    path: relPath,
    exists: false,
    hasUseTranslation: false,
    germanHits: [],
    errors: [],
  };

  if (!existsSync(absPath)) {
    result.errors.push("Datei nicht gefunden");
    pageResults.push(result);
    continue;
  }
  result.exists = true;
  const source = readFileSync(absPath, "utf8");
  // Nach der CMS-Light-Migration zählen folgende Pfade als gültige
  // i18n-/CMS-Anbindung (Batch 57.1):
  //   - klassisches useTranslation()
  //   - DB-first-Hook useCmsI18n()
  //   - DB-first-Hooks useCmsPageContent()/useCmsPageFields()
  //   - DB-first-Shells GenericCmsPage / CmsOnlyShell / CmsProductSolutionShell
  //   - generischer Renderpfad renderPageSectionByType()
  result.hasUseTranslation = isI18nOrCmsBound(source);
  if (!result.hasUseTranslation) {
    result.errors.push("weder useTranslation(...) noch useCmsI18n(...)/DB-first-Shell gefunden");
  }

  result.germanHits = findGermanHits(source);
  if (result.germanHits.length > 0) {
    result.errors.push(`${result.germanHits.length} mögliche harte deutsche Texte`);
  }

  pageResults.push(result);
}

for (const r of pageResults) {
  const ok = r.errors.length === 0;
  const mark = ok ? c("green", "✓") : c("red", "✗");
  console.log(`${mark} ${r.path}`);
  console.log(`    useTranslation: ${r.hasUseTranslation ? "ja" : "nein"}`);
  console.log(`    harte deutsche Texte: ${r.germanHits.length}`);
  if (r.germanHits.length > 0) {
    for (const hit of r.germanHits.slice(0, 8)) {
      console.log(c("yellow", `      Zeile ${hit.line} [${hit.matched}]: ${hit.snippet}`));
    }
    if (r.germanHits.length > 8) {
      console.log(c("yellow", `      … (${r.germanHits.length - 8} weitere)`));
    }
  }
  if (!ok) {
    for (const e of r.errors) console.log(c("red", `    - ${e}`));
    totalErrors += r.errors.length;
  }
  console.log("");
}

// ---------------------------------------------------------------------------
// C) strictPages Health Check
//    Vergleicht strictPages gegen den realen Seitenbestand:
//    - tote Strict-Einträge (bereits in B als Fehler)
//    - geroutete Pages mit useTranslation, die NICHT in strictPages stehen
//      und NICHT als exemptPages dokumentiert sind   → Warnung
//    - exemptPages-Übersicht (zur Transparenz, kein Fehler/Warnung)
// ---------------------------------------------------------------------------

console.log(c("bold", "Health Check (strictPages-Abdeckung)"));
console.log("------------------------------------\n");

// 1. Alle *Page.tsx unter src/features/**/pages/ einsammeln
function collectPageFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectPageFiles(full, out);
    } else if (entry.endsWith("Page.tsx")) {
      out.push(full);
    }
  }
  return out;
}

// Pfade plattformneutral: über path.relative() projektrelativ machen,
// dann auf POSIX (Forward-Slashes) normalisieren. Das gleicht Vergleiche
// gegen strictPages/exemptPages auf Windows und POSIX an.
const allPageFiles = collectPageFiles(featuresDir)
  .map((p) => toPosix(relative(projectRoot, p)))
  .sort();

// 2. Geroutete Komponenten aus allen routes.tsx ableiten
const routesFiles = [];
function collectRoutesFiles(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectRoutesFiles(full);
    } else if (entry === "routes.tsx") {
      routesFiles.push(full);
    }
  }
}
collectRoutesFiles(featuresDir);
collectRoutesFiles(resolve(projectRoot, "src/app"));

const routedComponentNames = new Set();
const elementRegex = /element=\{\s*<\s*([A-Z][A-Za-z0-9]+)\b/g;
for (const rf of routesFiles) {
  const src = readFileSync(rf, "utf8");
  let m;
  while ((m = elementRegex.exec(src)) !== null) {
    routedComponentNames.add(m[1]);
  }
}

// 3. Auf Page-Datei mappen: Datei gilt als geroutet, wenn ihr Basename
//    (ohne .tsx) zu einem geroutete Komponentennamen passt ODER der
//    default-Export-Komponentenname matcht (Heuristik via Dateiname).
const routedPageFiles = new Set();
for (const file of allPageFiles) {
  const base = basename(file).replace(/\.tsx$/, "");
  if (routedComponentNames.has(base)) {
    routedPageFiles.add(file);
  }
}

// 4. Tote strictPages-Einträge bereits als Fehler in B erfasst.
//    Hier zusätzlich: Liste aller toten Einträge ausgeben.
const deadStrict = strictPages.filter(
  (p) => !existsSync(resolve(projectRoot, p))
);
if (deadStrict.length > 0) {
  console.log(c("red", "Tote strictPages-Einträge (Datei existiert nicht):"));
  for (const p of deadStrict) console.log(c("red", `  ✗ ${p}`));
  console.log("");
} else {
  console.log(c("green", "Keine toten strictPages-Einträge."));
  console.log("");
}

// 5. Pages mit useTranslation, die NICHT in strictPages und NICHT exempt sind
const i18nReadyMissing = [];
for (const file of allPageFiles) {
  const abs = resolve(projectRoot, file);
  const src = readFileSync(abs, "utf8");
  const usesT = isI18nOrCmsBound(src);
  if (!usesT) continue;
  if (strictPagesSet.has(file)) continue;
  if (exemptPagesByPath.has(file)) continue;
  i18nReadyMissing.push(file);
}

if (i18nReadyMissing.length > 0) {
  console.log(
    c(
      "yellow",
      `${i18nReadyMissing.length} i18n-fähige Seite(n) NICHT in strictPages und NICHT exempt:`
    )
  );
  for (const p of i18nReadyMissing) console.log(c("yellow", `  ⚠ ${p}`));
  console.log(
    c(
      "yellow",
      "  → entweder in strictPages aufnehmen oder als exemptPages mit reason dokumentieren."
    )
  );
  console.log("");
  totalWarnings += i18nReadyMissing.length;
} else {
  console.log(c("green", "Alle i18n-fähigen Pages sind in strictPages oder exempt."));
  console.log("");
}

// 6. Geroutete Pages OHNE useTranslation (potenzielle Migrationskandidaten)
const routedWithoutT = [];
for (const file of routedPageFiles) {
  const abs = resolve(projectRoot, file);
  if (!existsSync(abs)) continue;
  const src = readFileSync(abs, "utf8");
  const usesT = isI18nOrCmsBound(src);
  if (usesT) continue;
  if (exemptPagesByPath.has(file)) continue;
  routedWithoutT.push(file);
}
if (routedWithoutT.length > 0) {
  console.log(
    c(
      "yellow",
      `${routedWithoutT.length} geroutete Page(s) OHNE useTranslation und OHNE exempt-Eintrag:`
    )
  );
  for (const p of routedWithoutT) console.log(c("yellow", `  ⚠ ${p}`));
  console.log(
    c(
      "yellow",
      "  → entweder migrieren oder als exemptPages (z. B. Container-Page) dokumentieren."
    )
  );
  console.log("");
  totalWarnings += routedWithoutT.length;
} else {
  console.log(c("green", "Alle gerouteten Pages nutzen useTranslation oder sind exempt."));
  console.log("");
}

// 7. Exemptions-Übersicht (Transparenz)
if (exemptPages.length > 0) {
  console.log(c("cyan", `Bewusste Ausnahmen (${exemptPages.length}):`));
  for (const e of exemptPages) {
    const abs = resolve(projectRoot, e.path);
    const exists = existsSync(abs);
    const mark = exists ? c("green", "✓") : c("red", "✗");
    console.log(`  ${mark} ${e.path}`);
    console.log(`      reason: ${e.reason ?? "(fehlt)"}`);
    if (!exists) {
      console.log(c("red", "      Datei existiert nicht — Ausnahme veraltet"));
      totalErrors++;
    }
    if (!e.reason || !e.reason.trim()) {
      console.log(c("red", "      reason fehlt — Ausnahme nicht akzeptiert"));
      totalErrors++;
    }
  }
  console.log("");
}

// ---------------------------------------------------------------------------
// Zusammenfassung
// ---------------------------------------------------------------------------

console.log(c("bold", "Zusammenfassung"));
console.log("---------------");
console.log(`Namespaces geprüft: ${namespaceResults.length}`);
console.log(`Seiten geprüft:     ${pageResults.length}`);
console.log(`Fehler:             ${totalErrors}`);
console.log(`Warnungen:          ${totalWarnings}`);

if (totalErrors > 0) {
  console.log(c("red", "\nResultat: FEHLER"));
  process.exit(1);
} else {
  console.log(c("green", "\nResultat: OK"));
  process.exit(0);
}
