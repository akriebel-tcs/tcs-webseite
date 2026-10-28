#!/usr/bin/env node
/**
 * Sprachvertrag-Audit (Gruppen 1–4).
 *
 * Meldet fuer jede aktive/oeffentliche Zielsprache:
 *  A) fehlende i18n-Schluessel je Namespace (Schluessel wird im Code benutzt,
 *     fehlt aber in der Zielsprache) → Fallback auf Deutsch,
 *  B) verdaechtige sichtbare String-Literale in oeffentlich genutzten,
 *     sprachabhaengigen Komponenten (JSX-Text, aria-label/title/alt/
 *     placeholder), mit begruendeter Allowlist.
 *
 * Klassifizierung der Fundstellen:
 *  - "code"       Datei ohne CMS-Bindung  → funktionale Mikrotexte gehoeren in
 *                 i18n; fehlende Schluessel sind harte Fehler.
 *  - "cms"        Datei liest CMS-Light   → Inhalt kommt aus der Datenbank und
 *                 wird vom serverseitigen Uebersetzungslauf erfasst; fehlende
 *                 i18n-Schluessel sind nur Hinweise (JSON ist nur Fallback).
 *
 * Aufruf:
 *   node scripts/i18n/sprachvertrag-audit.mjs [--json] [--strict]
 *   [--locales=de,en,pl]
 *
 * Nur Node-Builtins, keine Netz- oder Datenbankzugriffe.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const cfg = JSON.parse(readFileSync(join(__dirname, "sprachvertrag-audit.config.json"), "utf8"));

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const strict = args.includes("--strict");
const localesArg = args.find((a) => a.startsWith("--locales="));

/**
 * Gebuendelte Sprachen automatisch aus `src/i18n/index.ts` lesen
 * (`SUPPORTED_LANGUAGES`/`resources`). So bleibt die Pruefung robust, wenn
 * eine Sprache im Code freigegeben, aber in der Konfiguration vergessen
 * wird. Laufende Wahrheit ist `cms_locales` in CMS-Light; darauf hat dieses
 * Offline-Skript bewusst keinen Zugriff.
 */
function bundledLocales() {
  const out = new Set();
  try {
    const typesSrc = readFileSync(join(ROOT, "src/i18n/types.ts"), "utf8");
    const m = typesSrc.match(/SUPPORTED_LANGUAGES\s*=\s*\[([^\]]+)\]/);
    if (m) for (const hit of m[1].matchAll(/["'`]([a-z]{2}(?:-[A-Za-z0-9]{2,4})?)["'`]/g)) out.add(hit[1]);
  } catch { /* Datei optional */ }
  try {
    const idxSrc = readFileSync(join(ROOT, "src/i18n/index.ts"), "utf8");
    const block = idxSrc.slice(idxSrc.indexOf("export const resources"));
    for (const hit of block.matchAll(/^ {2}([a-z]{2}(?:-[A-Za-z0-9]{2,4})?):\s*\{/gm)) out.add(hit[1]);
  } catch { /* Datei optional */ }
  return [...out];
}

const detected = bundledLocales();
const configured = cfg.publicLocales ?? [];
const drift = detected.filter((l) => !configured.includes(l));
const locales = localesArg
  ? localesArg.slice("--locales=".length).split(",").map((s) => s.trim()).filter(Boolean)
  : [...new Set([...configured, ...detected])];
const source = cfg.sourceLocale;
const targets = locales.filter((l) => l !== source);


const posix = (p) => String(p).split("\\").join("/");

/* ---------------------------------------------------------------- Ressourcen */

function loadBundle(locale, ns) {
  const file = join(ROOT, cfg.localesDir, locale, `${ns}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    console.error(`Unlesbare Sprachdatei ${posix(relative(ROOT, file))}: ${err.message}`);
    return null;
  }
}

const namespaces = readdirSync(join(ROOT, cfg.localesDir, source))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""));

const bundles = new Map(); // `${locale}|${ns}` → object|null
for (const locale of locales) {
  for (const ns of namespaces) bundles.set(`${locale}|${ns}`, loadBundle(locale, ns));
}

function hasKey(locale, ns, key) {
  const bundle = bundles.get(`${locale}|${ns}`);
  if (!bundle) return false;
  let node = bundle;
  for (const part of key.split(".")) {
    if (node == null || typeof node !== "object") return false;
    node = node[part];
  }
  return typeof node === "string" ? node.trim().length > 0 : node != null;
}

/* ------------------------------------------------------------------- Dateien */

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = posix(relative(ROOT, p));
    if (cfg.ignorePathPatterns.some((pat) => rel.includes(pat))) continue;
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(name)) out.push(p);
  }
  return out;
}

const files = cfg.scanDirs.flatMap((d) => walk(join(ROOT, d)));

const allowlistFileEntries = Object.entries(cfg.allowlistFiles ?? {});
const allowedFileReason = (rel) => {
  const hit = allowlistFileEntries.find(([k]) => rel === k || rel.startsWith(k));
  return hit ? hit[1] : null;
};

/* ----------------------------------------------------- Schluessel-Verwendung */

const KEY_CALL = /\bt\(\s*["'`]([^"'`]+)["'`]/g;

function namespacesOf(src) {
  const found = new Set();
  for (const m of src.matchAll(/useTranslation\(\s*(\[[^\]]*\]|["'`][^"'`]+["'`])/g)) {
    const raw = m[1];
    for (const n of raw.matchAll(/["'`]([^"'`]+)["'`]/g)) found.add(n[1]);
  }
  if (found.size === 0 && /useTranslation\(/.test(src)) found.add("common");
  return [...found];
}

/* ------------------------------------------------------ Literal-Heuristiken */

// Kommentare entfernen, damit Doku-Text nicht als sichtbarer Text zaehlt.
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

// Sichtbare JSX-Textknoten: >Text<  (ohne {} und ohne reine Symbole).
const JSX_TEXT = />([^<>{}]{4,})</g;
const ATTR_TEXT = /\b(aria-label|title|placeholder|alt)=\{?["']([^"'{}]{4,})["']\}?/g;
const WORDY = /[A-Za-zÄÖÜäöüß]{4,}/;
// Code-Reste (Generics, Statements, Ausdruecke) sind kein sichtbarer Text.
const CODE_CHARS = /[=;{}<>[\]`|$_]|=>|\bconst\b|\breturn\b|\bfunction\b/;
const TECHNICAL = /^[\s\d.,:;/|+\-–—()%°#*"'&`]+$/;
const CODEISH = /^[a-z0-9_.:-]+$/; // slugs, keys, css, urls
const allowLiteral = new Set((cfg.allowlistLiterals ?? []).map((s) => s.toLowerCase()));

function suspiciousLiterals(rawSrc) {
  const src = stripComments(rawSrc);
  const hits = [];
  const push = (kind, textRaw) => {
    const text = textRaw.replace(/\s+/g, " ").trim();
    if (text.length < 4) return;
    if (TECHNICAL.test(text)) return;
    if (CODEISH.test(text)) return;
    if (CODE_CHARS.test(text)) return;
    // Klammern im Text sind fast immer Code-Reste (Generics/Ausdruecke).
    // Bewusste Grenze des Scanners: sichtbarer Text mit Klammern wird nicht
    // gemeldet — dafuer gibt es keine False Positives.
    if (/[()]/.test(text)) return;
    // JSX-Ternary-Reste wie ") : Icon ? (" sind Struktur, kein Text.
    if (/^\)/.test(text) || /\($/.test(text) || /\?\s*\(/.test(text)) return;
    // TypeScript-Typnamen aus Generics.
    if (/^(Promise|Record|Array|Map|Set|Partial|Omit|Pick|ReadonlyArray)$/.test(text)) return;
    // Technisch neutrale Werte: E-Mail-Adressen, Domains, Telefonnummern.
    if (/^[^\s]+@[^\s]+$/.test(text) || /^(https?:\/\/|www\.)/.test(text)) return;
    if (!WORDY.test(text)) return;
    if (allowLiteral.has(text.toLowerCase())) return;
    if (/^[A-Z0-9_]+$/.test(text)) return; // Konstanten/Artikelnummern
    hits.push({ kind, text: text.slice(0, 120) });
  };
  for (const m of src.matchAll(JSX_TEXT)) push("jsx-text", m[1]);
  for (const m of src.matchAll(ATTR_TEXT)) push("attribute", m[2]);
  return hits;
}

/* ----------------------------------------------------------------- Auswertung */

const report = {
  sourceLocale: source,
  targetLocales: targets,
  missingKeys: [],   // { locale, namespace, key, file, binding }
  literals: [],      // { file, binding, kind, text }
  allowlisted: [],   // { file, reason, literals }
  filesScanned: 0,
};

for (const file of files) {
  const rel = posix(relative(ROOT, file));
  const src = readFileSync(file, "utf8");
  report.filesScanned += 1;

  const cmsBacked = cfg.cmsBackedMarkers.some((m) => src.includes(m));
  const binding = cmsBacked ? "cms" : "code";

  // A) Schluessel
  const ns = namespacesOf(src);
  if (ns.length > 0) {
    const keys = new Set();
    for (const m of src.matchAll(KEY_CALL)) keys.add(m[1]);
    for (const rawKey of keys) {
      const explicit = rawKey.includes(":") ? rawKey.split(":") : null;
      const candidateNs = explicit ? [explicit[0]] : ns;
      const key = explicit ? explicit.slice(1).join(":") : rawKey;
      if (!candidateNs.some((n) => hasKey(source, n, key))) continue; // kein i18n-Key
      for (const locale of targets) {
        if (candidateNs.some((n) => hasKey(locale, n, key))) continue;
        const nsHit = candidateNs.find((n) => hasKey(source, n, key));
        report.missingKeys.push({ locale, namespace: nsHit, key, file: rel, binding });
      }
    }
  }

  // C) Zweisprachen-Ternaries: `x === "en" ? "..." : "..."` kennt nur zwei
  //    Sprachen und fiele bei jeder neuen Sprache stumm auf Deutsch zurueck.
  for (const m of stripComments(src).matchAll(/===\s*["'`]en["'`]\s*\?\s*["'`]([^"'`]{3,})["'`]\s*:\s*["'`]([^"'`]{3,})["'`]/g)) {
    const isLocaleCode = (v) => /^[a-z]{2}(-[A-Za-z0-9]{2,4})?$/.test(v);
    if (isLocaleCode(m[1]) && isLocaleCode(m[2])) continue; // Format-Locale, kein Text
    report.literals.push({ file: rel, binding, kind: "zweisprachiges-ternary", text: `${m[1]} / ${m[2]}` });
  }

  // B) Literale
  const reason = allowedFileReason(rel);
  const hits = suspiciousLiterals(src);
  if (hits.length === 0) continue;
  if (reason) {
    report.allowlisted.push({ file: rel, reason, literals: hits.length });
  } else {
    for (const h of hits) report.literals.push({ file: rel, binding, ...h });
  }
}

/* D) Dynamisch gelesene Fallback-Listen.
 * `navigation.breadcrumb.segments` wird ueber den URL-Abschnitt gelesen
 * (t(`breadcrumb.segments.${slug}`)) — solche Schluessel findet die
 * statische Pruefung oben nicht. Fuehrend sind hier die Seitentitel aus
 * CMS-Light; die JSON-Liste ist nur Notfall-Beschriftung. Deshalb Hinweis,
 * kein harter Fehler. */
for (const locale of targets) {
  const deSegs = loadBundle(source, "navigation")?.breadcrumb?.segments ?? {};
  const locSegs = loadBundle(locale, "navigation")?.breadcrumb?.segments ?? {};
  for (const key of Object.keys(deSegs)) {
    if (locSegs[key]) continue;
    report.missingKeys.push({
      locale,
      namespace: "navigation",
      key: `breadcrumb.segments.${key}`,
      file: "src/i18n/locales/<locale>/navigation.json",
      binding: "cms",
    });
  }
}

const hardMissing = report.missingKeys.filter((m) => m.binding === "code");
const softMissing = report.missingKeys.filter((m) => m.binding === "cms");

if (asJson) {
  console.log(JSON.stringify({ ...report, bundledLocales: detected, configDrift: drift, hardMissing: hardMissing.length, softMissing: softMissing.length }, null, 2));
} else {
  console.log("Sprachvertrag-Audit");
  console.log("===================");
  console.log(`Quellsprache: ${source} — Zielsprachen: ${targets.join(", ") || "(keine)"}`);
  console.log(`Dateien geprueft: ${report.filesScanned}`);
  console.log(`Im Code gebuendelte Sprachen: ${detected.join(", ") || "(keine erkannt)"}`);
  if (drift.length > 0) {
    console.log(`   Hinweis: in der Konfiguration fehlen: ${drift.join(", ")} (werden trotzdem geprueft)`);
  }
  console.log("");
  console.log(`A) Fehlende i18n-Schluessel (Fallback auf ${source}):`);
  console.log(`   harte Fehler (Code-Mikrotexte): ${hardMissing.length}`);
  console.log(`   Hinweise (CMS-gebundene Seiten, JSON nur Fallback): ${softMissing.length}`);
  const byLocale = new Map();
  for (const m of hardMissing) {
    const k = `${m.locale}/${m.namespace}`;
    byLocale.set(k, [...(byLocale.get(k) ?? []), m]);
  }
  for (const [k, list] of [...byLocale].sort()) {
    console.log(`   - ${k}: ${list.length}`);
    for (const m of list.slice(0, 20)) console.log(`       ${m.key}   (${m.file})`);
    if (list.length > 20) console.log(`       … ${list.length - 20} weitere`);
  }
  console.log("");
  console.log(`B) Verdaechtige sichtbare String-Literale: ${report.literals.length}`);
  const byFile = new Map();
  for (const l of report.literals) byFile.set(l.file, [...(byFile.get(l.file) ?? []), l]);
  for (const [f, list] of [...byFile].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`   - ${f} [${list[0].binding}] (${list.length})`);
    for (const l of list.slice(0, 6)) console.log(`       ${l.kind}: ${l.text}`);
    if (list.length > 6) console.log(`       … ${list.length - 6} weitere`);
  }
  console.log("");
  console.log(`Allowlist-Dateien: ${report.allowlisted.length}`);
  for (const a of report.allowlisted) console.log(`   - ${a.file}: ${a.reason}`);
}

if (strict && (hardMissing.length > 0 || report.literals.length > 0)) process.exit(1);
