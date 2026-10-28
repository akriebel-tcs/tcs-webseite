#!/usr/bin/env node
/**
 * hartcode-steuerbarkeit-inventar.mjs — READ-ONLY.
 *
 * Aggregiert pro Page-Datei: ist der sichtbare Inhalt CMS-gesteuert oder
 * hartcodiert? Verwendet vorhandene Audits als Datenquellen und ergänzt
 * eine Heuristik über die Page-Quelle (`useTranslation` vs. `useCmsI18n`
 * vs. `GenericCmsPage`).
 *
 * Inputs:
 *   - scripts/sync/snapshot/tables/cms_pages.json
 *   - scripts/sync/snapshot/tables/cms_sections.json
 *   - docs/04-betrieb/audit-snapshot/aktive-db-sections-ohne-renderpfad.json
 *   - docs/04-betrieb/audit-snapshot/public-blocks-ignorieren-admin-visibility.json
 *   - docs/04-betrieb/audit-snapshot/globaler-spiegel-audit.json
 *   - docs/02-architektur/sonderseiten-register.json
 *   - src/features/** /pages/*.tsx (Quelltext-Heuristik)
 *
 * Outputs:
 *   - docs/04-betrieb/audit-snapshot/hartcode-steuerbarkeit-inventar.json
 *   - docs/04-betrieb/audit-snapshot/hartcode-steuerbarkeit-inventar.md
 *   - docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-matrix.md
 *
 * Kategorien:
 *   1 cms_gesteuert
 *   2 db_first_mit_i18n_fallback
 *   3 hartcodierter_inhalt
 *   4 hartcodiertes_layout_erlaubt
 *   5 admin_schalter_ohne_public_wirkung
 *   6 public_ohne_admin_pflege
 *   7 db_aktiv_aber_public_ignoriert
 *   8 navigation_getrennte_wahrheit
 *   9 copy_move_risiko
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SNAP = path.join(ROOT, "scripts/sync/snapshot");
const AUD = path.join(ROOT, "docs/04-betrieb/audit-snapshot");
const PAGES_ROOT = path.join(ROOT, "src/features");

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, "utf8"));
}
async function walk(dir) {
  const out = [];
  const ents = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.isFile()) out.push(p);
  }
  return out;
}

// page_key aus Page-Quelle ziehen.
// Vorrang: explizite Bindungen an Renderer/Hooks. Reine Konstanten-
// Treffer (z. B. `const PILOT_PAGE_KEY = "anwendungen.pflege"` in der
// AdminPage) gelten nur als Fallback und nur mit Wortgrenze links,
// damit AdminPage/Tool-/PDP-Dateien nicht fälschlich als Public-Page
// für "anwendungen.pflege" o. ä. klassifiziert werden.
function extractPageKey(src) {
  const strong = [
    /<GenericCmsPage[^>]*pageKey=["']([\w.\-]+)["']/,
    /<CmsPageLayout[^>]*pageKey=["']([\w.\-]+)["']/,
    /useCmsI18n\(\s*["']([\w.\-]+)["']/,
    /useCmsPageContent\(\s*["']([\w.\-]+)["']/,
    /data-cms-page=["']([\w.\-]+)["']/,
  ];
  for (const re of strong) {
    const m = src.match(re);
    if (m) return m[1];
  }
  // Schwacher Fallback: Konstanten-Deklarationen. Wortgrenze links nötig,
  // sonst matcht z. B. `PILOT_PAGE_KEY = "anwendungen.pflege"` und ein
  // Admin-Tool wird als Public-Page für `anwendungen.pflege` markiert.
  const weak = src.match(/(?:^|[^A-Za-z0-9_])(?:PAGE_KEY|pageKey)\s*=\s*["'`]([\w.\-]+)["'`]/m);
  return weak ? weak[1] : null;
}

// Page-Datei-Pfade, die nie als "Public-Content-Page" gewertet werden dürfen,
// auch wenn sie zufällig einen page_key-String im Code haben (Admin-Workbench,
// Produkt-Listen, Produktdetailseite, Merklisten-Sondertools, Mobile-Preview).
function isInfrastructureOrToolPage(rel) {
  return (
    rel.startsWith("src/features/admin/") ||
    rel.startsWith("src/features/tools/") ||
    rel.startsWith("src/features/mobile-tk-preview/") ||
    rel.startsWith("src/features/produkte/merkliste/") ||
    rel === "src/features/produkte/pages/CategoryListPage.tsx" ||
    rel === "src/features/service/pages/ProductDetailPage.tsx"
  );
}

function classify(src) {
  return {
    usesGenericCmsPage: /GenericCmsPage/.test(src),
    usesCmsI18n: /useCmsI18n\s*\(/.test(src),
    usesUseTranslation: /useTranslation\s*\(/.test(src),
    usesCmsBodyRenderer: /CmsBodyRenderer|renderPageSectionByType/.test(src),
    iteratesSections: /cms\.sections/.test(src),
    hasFormSubmit: /onSubmit|handleSubmit|FormEvent/.test(src),
    hasLinkMap: /Link\s+to=/.test(src) && (src.match(/Link\s+to=/g) || []).length > 4,
    hasHardcodedJsxText: /<(h1|h2|h3|p|button|li|a)[^>]*>\s*[A-ZÄÖÜ][^<{]{8,}/.test(src),
    loc: src.split("\n").length,
  };
}

function categorize(meta, hits) {
  const cats = [];
  if (meta.usesGenericCmsPage) cats.push("cms_gesteuert");
  if (meta.usesCmsI18n && meta.usesUseTranslation) cats.push("db_first_mit_i18n_fallback");
  if (meta.usesCmsI18n && !meta.usesUseTranslation) cats.push("db_first_mit_i18n_fallback");
  if (!meta.usesGenericCmsPage && !meta.usesCmsI18n && meta.usesUseTranslation) cats.push("hartcodierter_inhalt");
  if (!meta.usesGenericCmsPage && !meta.usesCmsI18n && !meta.usesUseTranslation && meta.hasHardcodedJsxText) cats.push("hartcodierter_inhalt");
  if (meta.iteratesSections || meta.usesCmsBodyRenderer) cats.push("cms_gesteuert");
  if (meta.hasFormSubmit) cats.push("hartcodiertes_layout_erlaubt");

  if (hits.coverageCount > 0) cats.push("db_aktiv_aber_public_ignoriert");
  if (hits.publicBlocksHigh > 0) cats.push("admin_schalter_ohne_public_wirkung"); // Spiegelbruch
  if (hits.publicBlocksMedium > 0) cats.push("admin_schalter_ohne_public_wirkung"); // Schalter wirkungslos
  if (hits.publicBlocksRestschuld > 0) cats.push("public_ohne_admin_pflege");      // i18n ohne DB-Section
  if (hits.containerHeaderFehlt > 0 || hits.i18nOhneDbGegenstueck > 0) cats.push("public_ohne_admin_pflege");

  // copy_move_risiko: custom Page (kein GenericCmsPage) mit hartem Render-Code,
  // die im Admin per `cms_sections` strukturiert aussieht, aber bei Kopie/Verschiebung
  // im Admin würde der Render-Pfad nicht mitziehen.
  if (!meta.usesGenericCmsPage && !meta.usesCmsBodyRenderer && hits.coverageCount > 0) {
    cats.push("copy_move_risiko");
  }
  return [...new Set(cats)];
}

function priority(cats, hits) {
  if (cats.includes("hartcodierter_inhalt") && hits.coverageCount > 0) return "A";
  if (cats.includes("copy_move_risiko")) return "B";
  if (cats.includes("public_ohne_admin_pflege") || cats.includes("admin_schalter_ohne_public_wirkung")) return "B";
  if (cats.includes("hartcodierter_inhalt")) return "A";
  if (cats.includes("db_aktiv_aber_public_ignoriert")) return "B";
  if (cats.length === 1 && cats[0] === "cms_gesteuert") return "C";
  if (cats.includes("hartcodiertes_layout_erlaubt") && !cats.includes("hartcodierter_inhalt")) return "C";
  return "D";
}

function recommendation(cats, meta, sonder) {
  if (sonder) return `Sonderseite (${sonder.begruendung_sonderseite}). Texte sukzessive in cms_section_fields heben.`;
  if (cats.includes("hartcodierter_inhalt") && cats.includes("db_aktiv_aber_public_ignoriert"))
    return "Page auf GenericCmsPage migrieren ODER renderPageSectionByType einbauen — aktive DB-Sections werden derzeit ignoriert.";
  if (cats.includes("copy_move_risiko"))
    return "Custom-Renderpfad härten oder auf Standardbausteine umstellen, bevor Admin Kopieren/Verschieben für diese Seite freigegeben wird.";
  if (cats.includes("public_ohne_admin_pflege"))
    return "Whitelist-Einträge ergänzen (`cms_admin_editable_fields`), damit sichtbare Texte im Admin pflegbar werden.";
  if (cats.includes("admin_schalter_ohne_public_wirkung"))
    return 'Sichtbarkeitsschalter im Public-Renderer ehrlich abbilden ODER als "Layout-Bereich" markieren.';
  if (cats.includes("db_first_mit_i18n_fallback"))
    return "i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration).";
  if (cats.length === 1 && cats[0] === "cms_gesteuert") return "Keine Aktion.";
  return "Manuell prüfen.";
}

const launchBlocker = (prio) => prio === "A" ? "ja" : "nein";

(async () => {
  const [pages, sections, coverage, publicBlocks, spiegel, sonderseiten] = await Promise.all([
    readJson(path.join(SNAP, "tables/cms_pages.json")),
    readJson(path.join(SNAP, "tables/cms_sections.json")),
    readJson(path.join(AUD, "aktive-db-sections-ohne-renderpfad.json")),
    readJson(path.join(AUD, "public-blocks-ignorieren-admin-visibility.json")),
    readJson(path.join(AUD, "globaler-spiegel-audit.json")),
    readJson(path.join(ROOT, "docs/02-architektur/sonderseiten-register.json")),
  ]);

  // Index Audit-Treffer je page_key
  const idxCoverage = new Map();
  for (const f of coverage.findings || []) {
    if (!idxCoverage.has(f.page_key)) idxCoverage.set(f.page_key, []);
    idxCoverage.get(f.page_key).push(f);
  }
  // Public-Blocks getrennt indizieren — Klassen sauber trennen:
  //   - gelb_medium  → echter Admin-Schalter-ohne-Wirkung (Section existiert in DB,
  //                    Block hartcodiert ohne is_active-Gate). Zaehlt fuer
  //                    `admin_schalter_ohne_public_wirkung`.
  //   - restschuld   → i18n-Block ohne DB-Section. Zaehlt fuer
  //                    `public_ohne_admin_pflege`, NICHT fuer Schalterbruch.
  //   - rot_high     → Spiegelbruch (DB aus, Public an). Eigene Spalte.
  const idxPbMedium = new Map();
  const idxPbRestschuld = new Map();
  const idxPbHigh = new Map();
  const pbBuckets = publicBlocks.buckets || {};
  for (const f of pbBuckets.gelb_medium_kandidat || publicBlocks.public_block_ignoriert_db_visibility || []) {
    const key = f.page_key || f.pageKey;
    if (!key) continue;
    if (f.confidence && f.confidence !== "medium") continue;
    if (!idxPbMedium.has(key)) idxPbMedium.set(key, []);
    idxPbMedium.get(key).push(f);
  }
  for (const f of pbBuckets.gelb_restschuld_ohne_bindung || publicBlocks.public_block_ohne_db_bindung || []) {
    const key = f.page_key || f.pageKey;
    if (!key) continue;
    if (!idxPbRestschuld.has(key)) idxPbRestschuld.set(key, []);
    idxPbRestschuld.get(key).push(f);
  }
  for (const f of pbBuckets.rot_high_blocker || []) {
    const key = f.page_key || f.pageKey;
    if (!key) continue;
    if (!idxPbHigh.has(key)) idxPbHigh.set(key, []);
    idxPbHigh.get(key).push(f);
  }
  const idxSpiegel = new Map();
  for (const f of spiegel.findings || spiegel.befunde || []) {
    const key = f.page_key || f.pageKey;
    if (!key) continue;
    if (!idxSpiegel.has(key)) idxSpiegel.set(key, []);
    idxSpiegel.get(key).push(f);
  }
  const sonderByFile = new Map();
  for (const s of sonderseiten) {
    if (s.datei) sonderByFile.set(s.datei.replace(/\\/g, "/"), s);
  }

  // aktive Sections je page_key
  const activeSectionsByPage = new Map();
  for (const s of sections) {
    if (!s.is_active) continue;
    if (!activeSectionsByPage.has(s.page_key)) activeSectionsByPage.set(s.page_key, []);
    activeSectionsByPage.get(s.page_key).push(s);
  }
  const pageMeta = new Map(pages.map((p) => [p.page_key, p]));

  // Page-Dateien scannen
  const allFiles = await walk(PAGES_ROOT);
  const pageFiles = allFiles.filter((p) => /\/pages\/[^/]+Page\.tsx$/.test(p));

  const rows = [];
  const skipped = [];
  for (const file of pageFiles) {
    const src = await fs.readFile(file, "utf8");
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");

    // Infrastruktur-/Tool-/PDP-/Merklisten-Dateien sind keine
    // Public-Content-Pages und werden bewusst aus der Custom-Renderpfad-
    // Analyse herausgenommen, damit Phantom-Befunde (z. B. AdminPage ->
    // anwendungen.pflege) nicht entstehen.
    if (isInfrastructureOrToolPage(rel)) {
      skipped.push({ datei: rel, grund: "infrastruktur_oder_tool_seite" });
      continue;
    }

    const meta = classify(src);
    const pk = extractPageKey(src);
    const sonder = sonderByFile.get(rel);
    const dbPage = pk ? pageMeta.get(pk) : null;
    const activeSecs = pk ? (activeSectionsByPage.get(pk) || []) : [];
    const cov = pk ? (idxCoverage.get(pk) || []) : [];
    const pbMed = pk ? (idxPbMedium.get(pk) || []) : [];
    const pbRest = pk ? (idxPbRestschuld.get(pk) || []) : [];
    const pbHigh = pk ? (idxPbHigh.get(pk) || []) : [];
    const spg = pk ? (idxSpiegel.get(pk) || []) : [];

    const hits = {
      coverageCount: cov.length,
      publicBlocksMedium: pbMed.length,
      publicBlocksRestschuld: pbRest.length,
      publicBlocksHigh: pbHigh.length,
      publicBlocksWarn: pbMed.length + pbRest.length + pbHigh.length, // legacy / backwards-compat
      containerHeaderFehlt: spg.filter((f) => (f.finding_class || f.code) === "CONTAINER_HEADER_WHITELIST_FEHLT").length,
      i18nOhneDbGegenstueck: spg.filter((f) => (f.finding_class || f.code) === "I18N_JSX_SECTION_OHNE_DB_GEGENSTUECK").length,
      activeSections: activeSecs.length,
    };

    let cats = categorize(meta, hits);
    if (sonder) cats.push("hartcodiertes_layout_erlaubt");
    cats = [...new Set(cats)];

    const prio = priority(cats, hits);
    const empf = recommendation(cats, meta, sonder);

    rows.push({
      datei: rel,
      page_key: pk,
      route: dbPage?.route_path || null,
      page_active_in_db: dbPage?.is_active ?? null,
      page_status: dbPage?.status ?? null,
      active_sections_db: activeSecs.length,
      uses_generic_cms_page: meta.usesGenericCmsPage,
      uses_cms_i18n: meta.usesCmsI18n,
      uses_use_translation: meta.usesUseTranslation,
      uses_cms_body_renderer: meta.usesCmsBodyRenderer,
      has_form_submit: meta.hasFormSubmit,
      has_hardcoded_jsx_text: meta.hasHardcodedJsxText,
      sonderseite: !!sonder,
      audit_hits: hits,
      kategorien: cats,
      prioritaet: prio,
      launch_blocker: launchBlocker(prio),
      empfehlung: empf,
    });
  }

  rows.sort((a, b) => (a.prioritaet || "Z").localeCompare(b.prioritaet || "Z") ||
                       (a.page_key || "").localeCompare(b.page_key || ""));

  const summary = { total: rows.length };
  for (const k of ["cms_gesteuert","db_first_mit_i18n_fallback","hartcodierter_inhalt","hartcodiertes_layout_erlaubt","admin_schalter_ohne_public_wirkung","public_ohne_admin_pflege","db_aktiv_aber_public_ignoriert","navigation_getrennte_wahrheit","copy_move_risiko"]) {
    summary[k] = rows.filter((r) => r.kategorien.includes(k)).length;
  }
  const prioCount = { A: 0, B: 0, C: 0, D: 0 };
  for (const r of rows) prioCount[r.prioritaet] = (prioCount[r.prioritaet] || 0) + 1;

  const out = {
    generated_at: new Date().toISOString(),
    quellen: {
      coverage: "docs/04-betrieb/audit-snapshot/aktive-db-sections-ohne-renderpfad.json",
      public_blocks: "docs/04-betrieb/audit-snapshot/public-blocks-ignorieren-admin-visibility.json",
      spiegel: "docs/04-betrieb/audit-snapshot/globaler-spiegel-audit.json",
      sonderseiten: "docs/02-architektur/sonderseiten-register.json",
      snapshot: "scripts/sync/snapshot",
    },
    summary,
    prioritaet: prioCount,
    skipped_infrastruktur: skipped,
    rows,
  };

  await fs.mkdir(AUD, { recursive: true });
  await fs.writeFile(path.join(AUD, "hartcode-steuerbarkeit-inventar.json"), JSON.stringify(out, null, 2));

  // Markdown
  const lines = [];
  lines.push("# Hartcode-Steuerbarkeits-Inventar");
  lines.push("");
  lines.push(`Stand: ${out.generated_at}. READ-ONLY. Quelle = Audit-Snapshots + statische Page-Heuristik.`);
  lines.push("");
  lines.push("## Zusammenfassung");
  lines.push("");
  lines.push("| Kategorie | Anzahl Pages |");
  lines.push("|---|---:|");
  for (const [k, v] of Object.entries(summary)) lines.push(`| ${k} | ${v} |`);
  lines.push("");
  lines.push("## Priorisierung");
  lines.push("");
  lines.push("| Klasse | Anzahl |");
  lines.push("|---|---:|");
  for (const [k, v] of Object.entries(prioCount)) lines.push(`| ${k} | ${v} |`);
  lines.push("");
  lines.push("Klassendefinition: **A** = muss vor CMS-Abschluss weg · **B** = sollte vor Übergabe weg · **C** = darf bleiben · **D** = Entscheidung Thomas.");
  lines.push("");
  lines.push("## Befunde je Page-Datei");
  lines.push("");
  lines.push("| Prio | page_key | Datei | aktive DB-Sections | Kategorien | Empfehlung |");
  lines.push("|---|---|---|---:|---|---|");
  for (const r of rows) {
    lines.push(`| ${r.prioritaet} | ${r.page_key || "—"} | ${r.datei} | ${r.active_sections_db} | ${r.kategorien.join(", ") || "—"} | ${r.empfehlung} |`);
  }
  await fs.writeFile(path.join(AUD, "hartcode-steuerbarkeit-inventar.md"), lines.join("\n"));

  // Matrix
  const m = [];
  m.push("# CMS-Steuerbarkeits-Matrix");
  m.push("");
  m.push(`Stand: ${out.generated_at}. Eine Zeile je Page-Datei.`);
  m.push("");
  m.push("| Bereich | page_key | Route | Datei | sichtbarer Block | Quelle heute | CMS-Gegenstück? | Admin pflegbar? | Sichtbarkeit steuerbar? | Reihenfolge steuerbar? | kopierbar sicher? | Kategorie | Empfehlung | Aufwand | vor Launch zwingend |");
  m.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of rows) {
    const bereich = (r.page_key || r.datei).split(/[.\/]/)[0] || "—";
    const quelle = r.uses_generic_cms_page ? "DB (GenericCmsPage)"
                 : r.uses_cms_body_renderer ? "DB (CmsBodyRenderer)"
                 : r.uses_cms_i18n ? "DB + i18n-Fallback"
                 : r.uses_use_translation ? "i18n / Code"
                 : "Code";
    const cmsGegenstueck = r.active_sections_db > 0 ? "ja" : "nein";
    const adminPflegbar = r.uses_generic_cms_page || r.uses_cms_body_renderer ? "ja"
                       : r.audit_hits.containerHeaderFehlt > 0 ? "teilweise"
                       : r.active_sections_db > 0 ? "teilweise" : "nein";
    const sichtbarkeit = r.uses_generic_cms_page || r.uses_cms_body_renderer ? "ja"
                       : r.audit_hits.publicBlocksWarn > 0 ? "nein (Public ignoriert)" : "n/a";
    const reihenfolge = r.uses_generic_cms_page || r.uses_cms_body_renderer ? "ja" : "nein";
    const kopierbar = r.kategorien.includes("copy_move_risiko") ? "nein"
                    : r.uses_generic_cms_page ? "ja" : "unklar";
    const aufwand = r.prioritaet === "A" ? "M" : r.prioritaet === "B" ? "S–M" : r.prioritaet === "C" ? "—" : "klären";
    const visibleBlock = r.audit_hits.coverageCount > 0
      ? `${r.audit_hits.coverageCount} aktive DB-Sections ohne Renderpfad`
      : (r.has_form_submit ? "Formular + Begleittexte"
      : (r.has_hardcoded_jsx_text ? "hartcodierte Headlines/Buttons" : "Standard-Layout"));
    m.push(`| ${bereich} | ${r.page_key || "—"} | ${r.route || "—"} | ${r.datei} | ${visibleBlock} | ${quelle} | ${cmsGegenstueck} | ${adminPflegbar} | ${sichtbarkeit} | ${reihenfolge} | ${kopierbar} | ${r.kategorien.join(", ") || "—"} | ${r.empfehlung} | ${aufwand} | ${r.launch_blocker} |`);
  }
  await fs.writeFile(path.join(AUD, "cms-steuerbarkeit-matrix.md"), m.join("\n"));

  console.log(`Geschrieben: hartcode-steuerbarkeit-inventar.{json,md} + cms-steuerbarkeit-matrix.md`);
  console.log(`Pages gesamt: ${rows.length} · Prio A=${prioCount.A} B=${prioCount.B} C=${prioCount.C} D=${prioCount.D}`);
  console.log("Kategorien:", summary);
})();
