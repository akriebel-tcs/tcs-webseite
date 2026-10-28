#!/usr/bin/env node
/**
 * Renderer DB-first Audit
 * Zählt pro Seiten-Datei:
 *   - useTranslation (direkt, ohne useCmsI18n)        → BAD
 *   - useCmsI18n                                       → GOOD
 *   - rohe Asset-Imports aus @/assets oder features/.../assets
 *   - <img src={import}> ohne cms.asset() Wrapper      → BAD
 *   - cms.asset()/cms.assetAlt() Aufrufe               → GOOD
 *   - t(...) vs cms.text(...)
 *
 * Liefert: Tabelle + Score pro Seite, CI-tauglicher Exit-Code.
 *
 * Aufruf:  node scripts/cms/renderer-audit.mjs [--json] [--strict]
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const PAGES_GLOBS = ["src/features"];
const IGNORE = /node_modules|\.test\.|\.stories\./;
// Akzeptierte Ausnahmen — Hub-/Container-/Sub-Pages ohne eigene CMS-Inhalte.
// Synchron halten mit `scripts/i18n/i18n-check.config.json` (exemptPages).
const EXEMPT = new Set([
  "src/features/admin/pages/AdminPage.tsx",
  "src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx",
  "src/features/service/pages/ProductDetailPage.tsx",
  // Produkt-Hub-/Containerseiten: DB-first über CMS oder Props, keine eigene
  // useTranslation-Bindung. Identisch in i18n-check.config.json.exemptPages.
  "src/features/produkte/pages/CategoryListPage.tsx",
  "src/features/produkte/pages/ProduktHubPage.tsx",
  "src/features/produkte/pages/TuerkommunikationHubPage.tsx",
]);

const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");
const strict = args.has("--strict");

function toPosix(p) {
  return String(p).split("\\").join("/");
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (IGNORE.test(toPosix(p))) continue;
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

const files = PAGES_GLOBS.flatMap((g) => walk(join(ROOT, g)));
const onlyPages = files.filter((f) => /\/pages\/.*Page\.tsx$/.test(toPosix(f)));

const results = [];
for (const file of onlyPages) {
  const src = readFileSync(file, "utf8");
  const useTrans = (src.match(/\buseTranslation\s*\(/g) || []).length;
  const useCmsI18n = (src.match(/\buseCmsI18n\s*\(/g) || []).length;
  const assetImports = (src.match(/from\s+['"]@\/(assets|features\/[^'"]*\/assets)/g) || []).length;
  const cmsAsset = (src.match(/\bcms\.asset\s*\(/g) || []).length;
  const cmsAssetAlt = (src.match(/\bcms\.assetAlt\s*\(/g) || []).length;
  const cmsText = (src.match(/\bcms\.text\s*\(/g) || []).length;
  const tCalls = (src.match(/\bt\s*\(\s*['"`]/g) || []).length;

  // <img src={someImport}> ohne cms.asset darum
  const imgImportSrcs = [...src.matchAll(/<img[^>]*src=\{([a-zA-Z_$][\w$]*)\}/g)]
    .map((m) => m[1])
    .filter((id) => {
      // Importname? heuristisch: groß-/kleinSchreibung egal, in importliste vorhanden?
      const importRe = new RegExp(`import\\s+${id}\\s+from\\s+['"]@/(assets|features/[^'"]*/assets)`);
      return importRe.test(src);
    });

  // DB-first-Heuristik (Batch 57.1 — synchron mit i18n-Check):
  //  - useCmsI18n ohne paralleles useTranslation,  ODER
  //  - Page rendert ausschließlich über eine DB-first-Shell
  //    (GenericCmsPage / CmsOnlyShell / CmsProductSolutionShell),  ODER
  //  - Page liest CMS-Inhalte selbst (useCmsPageContent/useCmsPageFields)
  //    UND verwendet einen generischen Renderpfad
  //    (renderPageSectionByType / CMS_RENDERERS / RENDERERS / CmsBodyRenderer).
  //    useTranslation ist hier erlaubt, weil es nur Locale liefert.
  const usesCmsDirectly = /useCmsPageContent\(|useCmsPageFields\(/.test(src);
  const usesGenericRenderer =
    /\b(renderPageSectionByType|CMS_RENDERERS|RENDERERS|CmsBodyRenderer)\b/.test(src);
  const usesDbFirstShell =
    /\b(GenericCmsPage|CmsOnlyShell|CmsProductSolutionShell)\b/.test(src);
  const dbFirst =
    (useCmsI18n > 0 && useTrans === 0) ||
    usesDbFirstShell ||
    (usesCmsDirectly && (useTrans === 0 || usesGenericRenderer));
  const assetClean = assetImports === 0 || cmsAsset >= assetImports || imgImportSrcs.length === 0;

  results.push({
    file: toPosix(relative(ROOT, file)),
    useTrans,
    useCmsI18n,
    tCalls,
    cmsText,
    assetImports,
    cmsAsset,
    cmsAssetAlt,
    rawImgWithImport: imgImportSrcs.length,
    dbFirst,
    assetClean,
    score:
      (dbFirst ? 1 : 0) * 50 +
      (assetClean ? 1 : 0) * 30 +
      (cmsText > 0 ? 1 : 0) * 10 +
      (cmsAssetAlt > 0 ? 1 : 0) * 10,
  });
}

const total = results.length;
const dbFirst = results.filter((r) => r.dbFirst).length;
const assetClean = results.filter((r) => r.assetClean).length;
const violations = results.filter((r) => (!r.dbFirst || !r.assetClean) && !EXEMPT.has(r.file));
const exempt = results.filter((r) => EXEMPT.has(r.file));

if (asJson) {
  console.log(JSON.stringify({ total, dbFirst, assetClean, results }, null, 2));
} else {
  console.log("CMS Renderer Audit");
  console.log("==================");
  console.log(`Pages total:    ${total}`);
  console.log(`DB-first (useCmsI18n, kein useTranslation): ${dbFirst}/${total}`);
  console.log(`Asset-clean (alle Image-Imports via cms.asset): ${assetClean}/${total}`);
  console.log("");
  if (violations.length) {
    console.log("Violations:");
    for (const r of violations) {
      const flags = [
        !r.dbFirst && (r.useTrans > 0 ? "useTranslation" : "kein useCmsI18n"),
        !r.assetClean && `roheImg(${r.rawImgWithImport})`,
      ]
        .filter(Boolean)
        .join(", ");
      console.log(`  - ${r.file}  [${flags}]`);
    }
  } else {
    console.log("✓ Alle Pages DB-first & asset-clean (außer dokumentierten Ausnahmen).");
  }
  if (exempt.length) {
    console.log("");
    console.log(`Dokumentierte Ausnahmen (${exempt.length}):`);
    for (const r of exempt) console.log(`  - ${r.file}`);
  }
}

if (strict && violations.length) process.exit(1);
