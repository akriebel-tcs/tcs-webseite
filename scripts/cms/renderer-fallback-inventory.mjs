#!/usr/bin/env node
/**
 * Sprint 2g — Renderer & Fallback Inventory (READ-ONLY).
 *
 * Erzeugt eine Matrix: Seite × Renderer-Klasse × DB-Quelle × i18n-Fallback ×
 * Hardcoding × Speziallogik × D9/R2-Bezug × Risiko.
 *
 * Schreibt NUR Berichts-Dateien:
 *   - scripts/cms/output/renderer-fallback-inventar-latest.json
 *   - docs/04-betrieb/renderer-fallback-inventar-latest.md
 *
 * Kein DB-Write. Kein Public-Code-Change. Kein i18n-Change.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const PAGES_GLOB_ROOTS = [
  path.join(ROOT, "src/features"),
  path.join(ROOT, "src/app/pages"),
];
const OUT_JSON = path.join(ROOT, "scripts/cms/output/renderer-fallback-inventar-latest.json");
const OUT_MD = path.join(ROOT, "docs/04-betrieb/renderer-fallback-inventar-latest.md");
const D9_REL_PATH = path.join(ROOT, "scripts/cms/output/d9-relations-latest.json");
const DRIFT_PATH = path.join(ROOT, "scripts/cms/output/contract-drift-audit-latest.json");
const R2_PAGES_PATH = path.join(ROOT, "scripts/cms/output/r2-pages-latest.json");

// ---------- helpers ----------
function toPosix(p) {
  return String(p).split("\\").join("/");
}

function walkPages(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkPages(p));
    else if (/Page\.tsx?$/.test(entry.name) || /(NotFound|Index)\.tsx?$/.test(entry.name)) {
      // Skip admin pages — out of public scope (platform-neutral: normalize separators).
      if (toPosix(p).includes("/admin/")) continue;
      out.push(p);
    }
  }
  return out;
}

function read(file) { return fs.readFileSync(file, "utf8"); }
function rel(p) { return path.relative(ROOT, p); }

function extractPageKey(src) {
  const m = src.match(/const\s+PAGE_KEY\s*=\s*["'`]([^"'`]+)["'`]/);
  if (m) return m[1];
  const m2 = src.match(/pageKey\s*[:=]\s*["'`]([^"'`]+)["'`]/);
  return m2 ? m2[1] : null;
}

function classifyPage(file) {
  const src = read(file);
  const flags = {
    usesCmsBodyRenderer: /CmsBodyRenderer|useCmsBody\b/.test(src),
    usesCmsPageContent: /useCmsPageContent\b/.test(src),
    usesCmsI18n: /useCmsI18n\b/.test(src),
    usesDirectI18n: /from\s+["']react-i18next["']/.test(src) && /useTranslation\s*\(/.test(src),
    usesProductDb: /from\s+["']@\/lib\/supabase\/client["']/.test(src),
    usesCatalogContract: /catalog-contract|catalogClient|product[_-]?catalog/i.test(src),
    importsLocalAssets: /from\s+["'][^"']*\/assets\/[^"']+["']/.test(src),
    importsCmsAssets: /CmsAsset|cms\.asset\b|CmsOptionalImage/.test(src),
    hardcodedArrays: /const\s+\w*(ITEMS|CARDS|BLOCKS|TILES|FAQ|FEATURES|CATEGORIES|TABS|FALLBACK)\b[^=]*=\s*\[/i.test(src),
    hugeJsxLiterals: (() => {
      // Count lines that look like static visible text in JSX (German chars, > 30 chars)
      const lines = src.split("\n").filter(l => />[^<>{]{30,}</.test(l) && /[A-ZÄÖÜ]/.test(l));
      return lines.length;
    })(),
    specialRendererImports: (() => {
      const m = src.match(/from\s+["']@\/(?:components|features\/[^/]+\/components)\/[^"']+["']/g);
      return m ? m.length : 0;
    })(),
    fileLines: src.split("\n").length,
  };

  // Classification
  let cls = "?";
  let risk = "low";
  const reasons = [];

  if (flags.usesProductDb || flags.usesCatalogContract) {
    cls = "P1";
    reasons.push("Produktdatenbank-/Katalog-Joins");
    risk = "kein CMS-Light-Ziel";
  } else if (/mobile-tk-preview|Preview|Stage|Debug/i.test(file)) {
    cls = "L1";
    reasons.push("Preview/Stage-Seite");
    risk = "low";
  } else if (flags.usesCmsBodyRenderer && !flags.usesDirectI18n && flags.fileLines < 100) {
    cls = "G0";
    reasons.push("CmsBodyRenderer + sehr schlanke Hülle");
  } else if (flags.usesCmsBodyRenderer) {
    cls = "G1";
    reasons.push("CmsBodyRenderer + page-spezifische Hülle");
  } else if (flags.usesCmsI18n && !flags.hardcodedArrays && flags.hugeJsxLiterals < 5) {
    cls = "S1";
    reasons.push("Spezialrenderer, aber DB-first (useCmsI18n)");
  } else if (flags.usesCmsI18n || flags.usesCmsPageContent) {
    cls = "S2";
    reasons.push("Spezialrenderer + i18n-Fallback gemischt");
    risk = "medium";
  } else if (flags.usesDirectI18n) {
    cls = "S3";
    reasons.push("Spezialrenderer mit i18n und/oder Hardcoding (kein useCmsI18n)");
    risk = "high";
  } else {
    cls = "S3";
    reasons.push("nur Hardcoding, keine CMS-Anbindung erkennbar");
    risk = "high";
  }

  if (flags.hardcodedArrays) {
    reasons.push("hartcodierte Daten-Arrays vorhanden");
    if (risk === "low") risk = "medium";
  }
  if (flags.hugeJsxLiterals >= 8) {
    reasons.push(`viele statische JSX-Textzeilen (~${flags.hugeJsxLiterals})`);
    if (risk === "low") risk = "medium";
  }
  if (flags.importsLocalAssets) {
    reasons.push("lokale Asset-Imports (Code statt CMS)");
  }

  return { file: rel(file), pageKey: extractPageKey(src), cls, risk, flags, reasons };
}

// ---------- main ----------
const pages = PAGES_GLOB_ROOTS.flatMap(walkPages);
const rows = pages.map(classifyPage);

// Load D9 relations & drift for R2 mapping
let d9Rel = null, drift = null;
try { d9Rel = JSON.parse(read(D9_REL_PATH)); } catch {}
try { drift = JSON.parse(read(DRIFT_PATH)); } catch {}

// Load R2 page list (read-only SELECT snapshot)
let r2Snapshot = null;
try { r2Snapshot = JSON.parse(read(R2_PAGES_PATH)); } catch {}
const r2Pages = new Map(); // page_key -> active_hits
if (r2Snapshot?.pages) for (const p of r2Snapshot.pages) r2Pages.set(p.page_key, p.active_hits);

for (const r of rows) {
  r.r2ActiveHits = r.pageKey ? (r2Pages.get(r.pageKey) ?? 0) : 0;
  r.r2Affected = r.r2ActiveHits > 0;
}

// i18n inventory: list locale files + sizes
const I18N_DIR = path.join(ROOT, "src/i18n/locales/de");
const i18nFiles = fs.readdirSync(I18N_DIR).map(f => {
  const full = path.join(I18N_DIR, f);
  const txt = read(full);
  let keys = 0;
  try { keys = Object.keys(JSON.parse(txt)).length; } catch {}
  return { file: `src/i18n/locales/de/${f}`, bytes: txt.length, topLevelKeys: keys };
});

// Aggregate
const byClass = rows.reduce((a, r) => { (a[r.cls] ??= []).push(r.file); return a; }, {});
const byRisk = rows.reduce((a, r) => { a[r.risk] = (a[r.risk] ?? 0) + 1; return a; }, {});
const r2Hits = rows.filter(r => r.r2Affected);

const summary = {
  generated_at: new Date().toISOString(),
  totals: { pages: rows.length },
  by_class: Object.fromEntries(Object.entries(byClass).map(([k, v]) => [k, v.length])),
  by_risk: byRisk,
  r2_affected_pages: r2Hits.length,
  r2_affected_page_keys: r2Hits.map(r => r.pageKey).filter(Boolean),
  i18n_locales_de: i18nFiles,
  rows,
};

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2));

// Markdown report
const lines = [];
lines.push(`# Renderer-/Fallback-Inventar — Sprint 2g`);
lines.push(``);
lines.push(`_Generiert: ${summary.generated_at}_`);
lines.push(``);
lines.push(`Read-only Inventar aller Public-Pages unter \`src/features/**/pages/**\` und \`src/app/pages/**\`. Keine DB-Änderung, kein Public-Renderer-Change.`);
lines.push(``);
lines.push(`## Klassen-Verteilung`);
lines.push(``);
lines.push(`| Klasse | Bedeutung | Anzahl |`);
lines.push(`|---|---|---:|`);
const CLS_DESC = {
  G0: "vollständig generisch (CmsBodyRenderer, schlanke Hülle)",
  G1: "generisch + page-spezifische Hülle",
  S1: "Spezialrenderer, DB-first (useCmsI18n)",
  S2: "Spezialrenderer mit DB + i18n-Fallback",
  S3: "Spezialrenderer mit Hardcoding / kein useCmsI18n",
  P1: "Produktdatenbank-/Katalog-getrieben",
  L1: "Legacy / Preview / Stage",
};
for (const cls of ["G0","G1","S1","S2","S3","P1","L1"]) {
  lines.push(`| ${cls} | ${CLS_DESC[cls]} | ${(byClass[cls]?.length ?? 0)} |`);
}
lines.push(``);
lines.push(`## Risiko-Verteilung`);
lines.push(``);
for (const [k, v] of Object.entries(byRisk)) lines.push(`- **${k}**: ${v}`);
lines.push(``);
lines.push(`## D9/R2-Bezug (\`content_v1 → card_v1\`)`);
lines.push(``);
lines.push(`Betroffene Page-Keys aus dem Drift-Audit: **${[...r2Pages.keys()].length}**.`);
lines.push(`Davon im Page-Inventar erkannt: **${r2Hits.length}**.`);
lines.push(``);
if (r2Hits.length) {
  lines.push(`| Page-Key | Datei | Klasse | Risiko |`);
  lines.push(`|---|---|---|---|`);
  for (const r of r2Hits.sort((a,b)=>a.pageKey.localeCompare(b.pageKey))) {
    lines.push(`| ${r.pageKey} | \`${r.file}\` | ${r.cls} | ${r.risk} |`);
  }
  lines.push(``);
}

lines.push(`## Vollständige Matrix`);
lines.push(``);
lines.push(`| Page-Key | Datei | Klasse | Risiko | CmsBody | useCmsI18n | useCmsPage | direct i18n | ProductDB | local assets | hard arrays | JSX-Text-Zeilen | R2 | Begründung |`);
lines.push(`|---|---|---|---|---|---|---|---|---|---|---|---:|---|---|`);
const sorted = rows.slice().sort((a,b) => (a.pageKey??"~").localeCompare(b.pageKey??"~"));
for (const r of sorted) {
  const f = r.flags;
  const yn = (b) => b ? "✓" : "·";
  lines.push(`| ${r.pageKey ?? "_(unbekannt)_"} | \`${r.file}\` | ${r.cls} | ${r.risk} | ${yn(f.usesCmsBodyRenderer)} | ${yn(f.usesCmsI18n)} | ${yn(f.usesCmsPageContent)} | ${yn(f.usesDirectI18n)} | ${yn(f.usesProductDb||f.usesCatalogContract)} | ${yn(f.importsLocalAssets)} | ${yn(f.hardcodedArrays)} | ${f.hugeJsxLiterals} | ${r.r2Affected?"R2":"·"} | ${r.reasons.join("; ")} |`);
}

lines.push(``);
lines.push(`## i18n-Locale-Übersicht (DE)`);
lines.push(``);
lines.push(`| Datei | Top-Level-Keys | Größe (Bytes) |`);
lines.push(`|---|---:|---:|`);
for (const f of i18nFiles.sort((a,b)=>b.bytes-a.bytes)) {
  lines.push(`| \`${f.file}\` | ${f.topLevelKeys} | ${f.bytes} |`);
}

fs.writeFileSync(OUT_MD, lines.join("\n") + "\n");

console.log("Renderer-/Fallback-Inventar geschrieben:");
console.log(" -", rel(OUT_JSON));
console.log(" -", rel(OUT_MD));
console.log("Klassen:", JSON.stringify(summary.by_class));
console.log("Risiko :", JSON.stringify(summary.by_risk));
console.log("R2-Seiten (aus Audit):", [...r2Pages.keys()].length, " | im Inventar:", r2Hits.length);
