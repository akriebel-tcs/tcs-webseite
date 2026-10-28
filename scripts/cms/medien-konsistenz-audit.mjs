#!/usr/bin/env node
/**
 * CMS-Light Medien-Konsistenz-Audit
 * Read-only. Klassifiziert pro Page-Komponente:
 *   A OK
 *   B Falscher Slot (image vs thumbnail)
 *   C Hardcoded Icon (Code-Lucide-Icons ohne DB-Pendant)
 *   D Fehlende card_v1-Struktur (legacy items.* Felder ohne Kind-Sections)
 *   E Fehlende DOM-Marker (Renderer ohne data-cms-field für Bild/Icon)
 *   F Legacy/Renderer ignoriert (Asset/Feld existiert, nicht gelesen)
 *
 * DB-Zugriff via psql ($PGHOST gesetzt). Codescan via readFileSync.
 *
 * Aufruf:  node scripts/cms/medien-konsistenz-audit.mjs [--json]
 */
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const asJson = process.argv.includes("--json");

function psql(sql) {
  const out = execSync(`psql -At -F $'\\t' -c "${sql.replace(/"/g, '\\"')}"`, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return out
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t"));
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (/node_modules|\.test\.|\.stories\./.test(p)) continue;
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/Page\.tsx$/.test(name)) out.push(p);
  }
  return out;
}

// 1. DB-Datasets
console.error("→ DB lesen ...");
const sectionsRows = psql(
  `SELECT s.page_key, s.section_key, s.section_type, COALESCE(p.section_key,'') AS parent_key, COALESCE(p.section_type,'') AS parent_type
   FROM cms_sections s
   LEFT JOIN cms_sections p ON p.id = s.parent_section_id
   JOIN cms_pages pg ON pg.page_key = s.page_key
   WHERE s.is_active AND pg.status='published' AND pg.is_active`,
);
const fieldsRows = psql(
  `SELECT page_key, section_key, field_key, locale FROM cms_section_fields WHERE value IS NOT NULL AND value<>''`,
);
// Erkennt sowohl `icon` als auch verschachtelte `<key>.icon`-Felder (z. B.
// `anforderungen.zutritt.icon` für indizierte Listen ohne card_v1-Kindsection).
const iconFieldRows = fieldsRows.filter(
  (r) => r[2] === "icon" || /\.icon$/.test(r[2]),
);
const assetRows = psql(
  `SELECT page_key, section_key, field_key, viewport, is_active FROM cms_assets`,
);
const whitelistRows = psql(
  `SELECT page_key, section_key, field_key, locale, is_enabled FROM cms_admin_editable_fields`,
);
const pagesRows = psql(
  `SELECT page_key, route_path FROM cms_pages WHERE status='published' AND is_active`,
);

const sectionsByPage = new Map();
for (const [pk, sk, st, ppk, ppt] of sectionsRows) {
  if (!sectionsByPage.has(pk)) sectionsByPage.set(pk, []);
  sectionsByPage.get(pk).push({ section_key: sk, section_type: st, parent_key: ppk, parent_type: ppt });
}
const iconFieldKey = new Set(iconFieldRows.map((r) => `${r[0]}|${r[1]}`));
const activeAssetKey = new Set(
  assetRows.filter((r) => r[4] === "t").map((r) => `${r[0]}|${r[1]}|${r[2]}`),
);
const whitelistKey = new Set(
  whitelistRows.filter((r) => r[4] === "t").map((r) => `${r[0]}|${r[1]}|${r[2]}`),
);

// 2. Code-Scan
console.error("→ Code scannen ...");
const pageFiles = walk(join(ROOT, "src/features")).filter((p) =>
  /\/pages\/[^/]+Page\.tsx$/.test(p),
);

// route → pageKey
const pkByRoute = new Map(pagesRows.map((r) => [r[1], r[0]]));

function scanFile(file) {
  const src = readFileSync(file, "utf8");
  const lucideImports = [
    ...src.matchAll(/from\s+["']lucide-react["']/g),
  ].length;
  const iconArrayHits = [
    ...src.matchAll(/\bicon\s*:\s*([A-Z][A-Za-z0-9_]+)\b/g),
  ].map((m) => m[1]);
  const resolveIconCalls = (src.match(/\bresolveIcon\s*\(/g) || []).length;
  const dataCmsField = [...src.matchAll(/data-cms-field=["'{]([a-zA-Z0-9_]+)/g)].map((m) => m[1]);
  const dataCmsSection = (src.match(/data-cms-section/g) || []).length;
  const cmsAssetReads = [
    ...src.matchAll(/cms\.asset(?:Set|Alt)?\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/g),
  ].map((m) => ({ section: m[1], field: m[2] }));
  // Dynamische Reads (Schleifen-Variable als section_key, z. B. cms.asset(sk, "image", ...)).
  const dynamicAssetReads = [
    ...src.matchAll(/cms\.asset(?:Set|Alt)?\s*\(\s*([a-zA-Z_][\w.]*)\s*,\s*["']([^"']+)["']/g),
  ].map((m) => ({ sectionVar: m[1], field: m[2] }));
  const usesCmsI18n = /useCmsI18n\s*\(/.test(src);
  // useCmsPageContent ist der ältere, aber gleichwertige DB-Reader (liefert
  // `.text(...)`, `.asset(...)`, `.sections`). Wird hier als legitimer
  // DB-Read-Indikator gewertet, damit F-Klasse nicht fälschlich greift,
  // wenn eine Seite Assets via `cmsContent.asset(...)` liest.
  const usesCmsPageContent = /useCmsPageContent\s*\(/.test(src);
  const useTranslation = /useTranslation\s*\(/.test(src);
  const usesCmsPageLayout = /from\s+["']@\/features\/cms\/components\/CmsPageLayout["']/.test(src);
  // Hero gilt als via PageLayout/CmsPageLayout abgedeckt, wenn ein heroImage-/
  // heroImageDesktop-Prop am Layout gesetzt ist UND die Seite den Hero nicht
  // zusätzlich inline rendert. Die cms.asset-Auflösung darf in einer Variable
  // stehen (z. B. `const heroImage = cms.asset("hero", "image", "")`).
  const usesLayoutComponent =
    /<CmsPageLayout[\s>]/.test(src) || /<PageLayout[\s>]/.test(src);
  const heroPropPattern = /\bhero(Image|ImageDesktop|ImageTablet|ImageMobile)\s*=\s*\{/;
  const heroInlinePattern = /<img[^>]*src\s*=\s*\{[^}]*cms\.asset\s*\(\s*["']hero["']/;
  const heroCoveredByLayout =
    usesLayoutComponent && heroPropPattern.test(src) && !heroInlinePattern.test(src);
  const routeMatch = src.match(/path:\s*["']([^"']+)["']/);
  return {
    lucideImports,
    iconArrayHits,
    resolveIconCalls,
    dataCmsField,
    dataCmsSection,
    cmsAssetReads,
    dynamicAssetReads,
    usesCmsI18n,
    usesCmsPageContent,
    useTranslation,
    usesCmsPageLayout,
    heroCoveredByLayout,
    routeMatch: routeMatch?.[1] ?? null,
  };
}

// Map page-file → pageKey via heuristic: filename → kebab → match against cms_pages route_path basename
function fileToCandidatePageKeys(file) {
  // strip /src/features/<area>/pages/<Name>Page.tsx
  const m = file.match(/features\/([^/]+)\/pages\/([^/]+)Page\.tsx$/);
  if (!m) return [];
  const area = m[1];
  const name = m[2]
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
  // candidates
  const candidates = [];
  for (const [pk] of pagesRows) {
    if (pk.endsWith(`.${name}`) || pk === `${area}.${name}`) candidates.push(pk);
  }
  return candidates;
}

const fileReports = [];
for (const f of pageFiles) {
  const scan = scanFile(f);
  const candidates = fileToCandidatePageKeys(f);
  const pageKey = candidates[0] ?? null;
  fileReports.push({ file: relative(ROOT, f), pageKey, candidates, ...scan });
}

// 3. Klassifizieren
const classes = { A: [], B: [], C: [], D: [], E: [], F: [] };

// B: pages where DB has only `thumbnail` assets on card_v1 children but code reads `image` (or vice versa)
const cardChildrenByPage = new Map();
for (const [pk, secs] of sectionsByPage) {
  cardChildrenByPage.set(
    pk,
    secs.filter((s) => s.section_type === "card_v1"),
  );
}

for (const r of fileReports) {
  if (!r.pageKey) continue;
  const pk = r.pageKey;
  const cards = cardChildrenByPage.get(pk) ?? [];
  if (cards.length === 0) continue;
  const cardKeys = cards.map((c) => c.section_key);
  // Welche Asset-FieldKeys liegen vor?
  const cardSlotKinds = new Set();
  for (const sk of cardKeys) {
    if (activeAssetKey.has(`${pk}|${sk}|image`)) cardSlotKinds.add("image");
    if (activeAssetKey.has(`${pk}|${sk}|thumbnail`)) cardSlotKinds.add("thumbnail");
  }
  if (cardSlotKinds.size > 1) {
    classes.B.push({ pageKey: pk, file: r.file, kinds: [...cardSlotKinds] });
  }
}

// C: Hardcoded icons. icon: <LucideName> im Code, aber Page hat keine icon-Felder in DB.
for (const r of fileReports) {
  if (!r.pageKey) continue;
  if (r.iconArrayHits.length === 0) continue;
  // sammle distinct icons (lucide CamelCase, ignoriere offensichtliche non-icons)
  const icons = [...new Set(r.iconArrayHits)].filter(
    (n) => !/^(React|Component|Fragment|Props|State)$/.test(n),
  );
  if (icons.length === 0) continue;
  // gibt es überhaupt icon-Felder für diese Page?
  const hasAnyIconField = [...iconFieldKey].some((k) => k.startsWith(pk_(r.pageKey)));
  if (!hasAnyIconField && r.resolveIconCalls === 0) {
    classes.C.push({
      pageKey: r.pageKey,
      file: r.file,
      icons,
      hasResolveIcon: false,
    });
  }
}
function pk_(pk) {
  return `${pk}|`;
}

// D: Legacy items.* Felder in DB ohne entsprechende card_v1 Kind-Sections
// Hinweis (Audit-Hygiene Tranche 7b): nur published + active Pages zählen.
// Archived/inactive Seiten (z. B. personas.architekt.kopie) bleiben aus der
// Klasse-D-Restliste heraus — sie werden vom Public-Renderer ohnehin nicht
// ausgeliefert.
const publishedPageKeys = new Set(pagesRows.map((r) => r[0]));
const itemsLikePages = new Map();
for (const [pk, sk, fk] of fieldsRows) {
  if (!publishedPageKeys.has(pk)) continue;
  if (/^items[._]/.test(sk) || /^items\./.test(fk) || /^item_\d+$/.test(sk) || /_item_\d+$/.test(sk)) {
    if (!itemsLikePages.has(pk)) itemsLikePages.set(pk, new Set());
    itemsLikePages.get(pk).add(sk);
  }
}
for (const [pk, secs] of itemsLikePages) {
  const cardKids = (cardChildrenByPage.get(pk) ?? []).length;
  // wenn viele "_item_N" aber 0 card_v1 → D
  if (cardKids === 0 && secs.size >= 2) {
    classes.D.push({ pageKey: pk, legacySectionKeys: [...secs].slice(0, 10), childCount: 0 });
  }
}

// E: Page rendert cms.asset(...), aber Reads sind nicht durch DOM-Marker abgedeckt.
// Coverage-Regeln:
//   - hero/image gilt als abgedeckt, wenn die Seite CmsPageLayout nutzt
//     (Layout setzt data-cms-section="hero" + data-cms-field="image").
//   - Andere statische Reads benötigen entweder einen passenden
//     data-cms-field-Eintrag in der Datei ODER einen dynamischen Marker.
for (const r of fileReports) {
  if (!r.pageKey) continue;
  if (r.cmsAssetReads.length === 0) continue;
  const fieldMarkers = new Set(r.dataCmsField);
  const uncovered = [];
  for (const read of r.cmsAssetReads) {
    if (read.section === "hero" && read.field === "image" && r.heroCoveredByLayout) continue;
    if (fieldMarkers.has(read.field)) continue;
    uncovered.push(`${read.section}/${read.field}`);
  }
  if (uncovered.length > 0) {
    classes.E.push({
      pageKey: r.pageKey,
      file: r.file,
      assetReads: r.cmsAssetReads.length,
      uncovered,
    });
  }
}

// F: Asset existiert in DB, wird aber nicht im Code gelesen (nur grobe Heuristik je Page)
for (const r of fileReports) {
  if (!r.pageKey) continue;
  const codeKeys = new Set(r.cmsAssetReads.map((c) => `${c.section}|${c.field}`));
  const dbKeys = [...activeAssetKey]
    .filter((k) => k.startsWith(`${r.pageKey}|`))
    .map((k) => k.split("|").slice(1).join("|"));
  const unread = dbKeys.filter((k) => !codeKeys.has(k));
  if (dbKeys.length > 0 && unread.length === dbKeys.length && codeKeys.size === 0 && !r.usesCmsI18n && !r.usesCmsPageContent) {
    classes.F.push({ pageKey: r.pageKey, file: r.file, dbAssetSlots: dbKeys.length });
  }
}

// A: alle Pages die nicht in B/C/D/E/F vorkommen
const flagged = new Set();
for (const k of "BCDEF") for (const e of classes[k]) flagged.add(e.pageKey);
for (const r of fileReports) {
  if (r.pageKey && !flagged.has(r.pageKey) && r.cmsAssetReads.length > 0) {
    classes.A.push({ pageKey: r.pageKey, file: r.file });
  }
}

// 4. Output
const summary = {
  total_published_pages: pagesRows.length,
  total_page_files: pageFiles.length,
  total_icon_db_fields: iconFieldRows.length,
  total_active_assets: [...activeAssetKey].length,
  classes: {
    A_ok: classes.A.length,
    B_wrong_slot: classes.B.length,
    C_hardcoded_icons: classes.C.length,
    D_missing_card_v1: classes.D.length,
    E_missing_dom_markers: classes.E.length,
    F_legacy_renderer_ignored: classes.F.length,
  },
};

if (asJson) {
  console.log(JSON.stringify({ summary, classes }, null, 2));
} else {
  const out = [];
  out.push("# CMS-Light Medien-Konsistenz-Audit");
  out.push("");
  out.push("## Zusammenfassung");
  for (const [k, v] of Object.entries(summary)) {
    if (typeof v === "object") {
      out.push(`- ${k}:`);
      for (const [kk, vv] of Object.entries(v)) out.push(`  - ${kk}: ${vv}`);
    } else out.push(`- ${k}: ${v}`);
  }
  for (const [klass, label] of [
    ["B", "B — Falscher Slot (image ↔ thumbnail-Mix)"],
    ["C", "C — Hardcoded Icons (Code-Lucide, keine DB-icon-Felder)"],
    ["D", "D — Fehlende card_v1-Struktur (legacy items.*)"],
    ["E", "E — Fehlende DOM-Marker (cms.asset ohne data-cms-field)"],
    ["F", "F — Legacy / Renderer ignoriert"],
    ["A", "A — OK (Stichprobe, max. 20)"],
  ]) {
    out.push("");
    out.push(`## ${label}  (${classes[klass].length})`);
    const list = klass === "A" ? classes[klass].slice(0, 20) : classes[klass];
    for (const e of list) {
      out.push(`- ${e.pageKey}  (${e.file ?? "-"})  ${JSON.stringify({ ...e, pageKey: undefined, file: undefined })}`);
    }
  }
  const md = out.join("\n");
  writeFileSync("/mnt/documents/cms-medien-audit.md", md);
  console.log(md);
  console.error("\n→ Bericht: /mnt/documents/cms-medien-audit.md");
}
