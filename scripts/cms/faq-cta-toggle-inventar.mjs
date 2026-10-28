#!/usr/bin/env node
/**
 * Inventar: Welche Seiten lesen welche CMS-Objekte wirklich aus dem CMS-Pfad?
 *
 * Gibt drei Maps pro `page_key` aus:
 *
 *   faq   → ok | orphan | mixed | unknown    (wirkt der FAQ-Toggle?)
 *   cta   → ok | orphan | mixed | unknown    (wirkt der CTA-Toggle?)
 *   body  → ok | unknown                     (zieht die Seite ihren Body
 *                                             generisch über CmsBodyRenderer
 *                                             oder CmsOnlyShell?)
 *
 * `body` ist die Wahrheit, die der Wahrheits-Check für **alle anderen**
 * Bausteine (Karten-Container, Stats, Tabs, Downloads, Hero, Content, …)
 * braucht: nur dort, wo `body` = ok ist, dürfen die Objekt-Ampeln davon
 * ausgehen, dass eine im Admin geschaltete Section automatisch öffentlich
 * wirkt. Wo `body` = unknown ist, bleibt die Page-Pfad-Zeile gelb.
 *
 * Plattformneutral: kein `find`, kein `globSync`. Reiner
 * `fs.readdirSync({withFileTypes:true})`-Walker.
 *
 * Kommentare werden vor dem Regex-Scan entfernt, damit Beispiele aus
 * Doku-Kommentaren keine False-Positives liefern (kein `foo.bar`-Effekt).
 *
 * Zwei Modi:
 *
 *   1. Live-Modus (Default):
 *      Liest `cms_pages` und `cms_sections` aus Supabase via
 *      VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY.
 *
 *   2. Offline/Snapshot-Modus:
 *      `node scripts/cms/faq-cta-toggle-inventar.mjs --snapshot <dir>`
 *      Erwartet im Verzeichnis `<dir>/tables/cms_pages.json` und
 *      `<dir>/tables/cms_sections.json` als JSON-Arrays. Dieser Modus
 *      läuft ohne Supabase, ohne Env und ohne Netzwerk und ist für
 *      Review/Codex die einzige reproduzierbare Quelle.
 *
 * Reines Lesen. Keine DB-Writes, keine Code-Mutationen.
 *
 * Output:
 *   docs/04-betrieb/faq-cta-toggle-inventar.md
 *   src/features/admin/lib/knownPageObjectContracts.ts
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

// ---- 0) CLI ---------------------------------------------------------------

const argv = process.argv.slice(2);
function argOf(name) {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  return argv[i + 1] ?? null;
}
const SNAPSHOT_DIR = argOf("--snapshot");
const ROOT = path.resolve(process.cwd());
const SRC_DIR = path.join(ROOT, "src");

// ---- 1) Datenquelle: live oder snapshot ----------------------------------

async function loadFromSnapshot(dir) {
  const abs = path.resolve(dir);
  const pagesFile = path.join(abs, "tables", "cms_pages.json");
  const sectionsFile = path.join(abs, "tables", "cms_sections.json");
  let pages, sections;
  try {
    pages = JSON.parse(readFileSync(pagesFile, "utf8"));
    sections = JSON.parse(readFileSync(sectionsFile, "utf8"));
  } catch (e) {
    console.error(
      `[snapshot] konnte ${pagesFile} oder ${sectionsFile} nicht lesen: ${e.message}`,
    );
    process.exit(1);
  }
  if (!Array.isArray(pages) || !Array.isArray(sections)) {
    console.error("[snapshot] tables/cms_pages.json und tables/cms_sections.json müssen JSON-Arrays sein.");
    process.exit(1);
  }
  return { pages, sections, source: `snapshot:${abs}` };
}

async function loadFromSupabase() {
  const url = process.env.VITE_SUPABASE_URL;
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error(
      "VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY fehlen.\n" +
        "Tipp: für Review ohne Live-DB --snapshot <dir> verwenden.",
    );
    process.exit(1);
  }
  // Lazy-Import, damit der Snapshot-Modus auch ohne @supabase/supabase-js läuft.
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, key);

  async function fetchAll(table, build) {
    const PAGE = 1000;
    let from = 0;
    const out = [];
    while (true) {
      const { data, error } = await build(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      out.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return out;
  }

  const pages = await fetchAll("cms_pages", (a, b) =>
    sb.from("cms_pages").select("page_key, page_type, status, is_active, title_de").range(a, b),
  );
  const sections = await fetchAll("cms_sections", (a, b) =>
    sb
      .from("cms_sections")
      .select("page_key, section_key, section_type, is_active")
      .range(a, b),
  );
  return { pages, sections, source: "live:supabase" };
}

const { pages, sections, source } = SNAPSHOT_DIR
  ? await loadFromSnapshot(SNAPSHOT_DIR)
  : await loadFromSupabase();
const pageMeta = new Map(pages.map((p) => [p.page_key, p]));

// ---- 2) FAQ/CTA-Sections pro Seite einsammeln ----------------------------

const perPage = new Map(); // page_key → { faq?: row, cta?: row }
for (const s of sections) {
  const t = s.section_type ?? null;
  const k = s.section_key ?? "";
  const slot =
    t === "faq_v1" || k === "faq"
      ? "faq"
      : t === "cta_v1" || k === "standard_cta" || k === "cta"
        ? "cta"
        : null;
  if (!slot) continue;
  if (!perPage.has(s.page_key)) perPage.set(s.page_key, {});
  perPage.get(s.page_key)[slot] = s;
}

// ---- 3) src-Dateien indexieren (plattformneutral) -------------------------

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
    if (e.isDirectory()) walk(full, acc);
    else if (e.isFile() && /\.(tsx|ts)$/.test(e.name))
      acc.push(path.relative(ROOT, full).split(path.sep).join("/"));
  }
  return acc;
}

const files = walk(SRC_DIR);

// Kommentare entfernen — sonst werden Beispiele aus JSDoc als echte Marker
// gewertet (das hat den alten `foo.bar`-Effekt erzeugt).
function stripComments(src) {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, "");
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  return out;
}

const PAGE_KEY_RE = /pageKey\s*[:=]\s*["'`]([a-z0-9._-]+)["'`]/g;
const PAGE_KEY_CONST_RE = /const\s+PAGE_KEY\s*=\s*["'`]([a-z0-9._-]+)["'`]/g;

// Mapping: page_key (Literal in JSX-Prop) → JSX-Komponentenname, der den
// pageKey erhält. Beispiel: <CategoryListPage pageKey="produkte.zutrittskontrolle" …/>
// Erlaubt es, vom routes.tsx-Eintrag auf das echte Shared-Template
// CategoryListPage zu schließen und dessen DB-first-Marker zu übernehmen.
function findComponentForPageKeyProp(clean, pageKey) {
  const escKey = pageKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Suche jede pageKey-Stelle und blicke rückwärts auf das nächste `<Component`.
  const re = new RegExp(`pageKey\\s*=\\s*["'\`]${escKey}["'\`]`, "g");
  const out = new Set();
  let m;
  while ((m = re.exec(clean))) {
    const before = clean.slice(0, m.index);
    // Letztes `<Capital…` vor dieser pageKey-Stelle finden.
    const open = before.match(/<\s*([A-Z][A-Za-z0-9_]*)\b(?![\s\S]*<\s*[A-Z])/);
    if (open) out.add(open[1]);
  }
  return [...out];
}

// Dynamic-Slug-Templates: page_keys, die als `<base>.<slug>` über ein
// einzelnes Detail-Template gerendert werden. Eintrag = Regex + Template-File.
// Das Template-File muss eigene DB-first-Marker tragen, sonst zählt es nicht.
const KNOWN_DYNAMIC_TEMPLATES = [
  {
    pattern: /^anwendungen\.referenzprojekte\.[a-z0-9-]+$/,
    templateFile: "src/features/anwendungen/pages/ReferenzprojektDetailPage.tsx",
    evidence: "dynamic-slug-template:ReferenzprojektDetailPage",
  },
];

// Bewusste Sonderfälle ohne eigene Page-Datei: Legacy-Redirects, Kopien,
// Spielwiesen. Bleiben absichtlich body=unknown, werden aber sauber als
// intentional-special:<reason> ausgewiesen statt als „none / no-page-file".
const INTENTIONAL_SPECIAL_CASES = {
  "service.online-produktkatalog":
    "legacy-redirect:/service/online-produktkatalog → /produkte/tuerkommunikation",
  "personas.architekt.kopie":
    "duplicate-copy:Arbeitskopie der personas.architekt-Seite, kein eigenes Page-File",
};

function markersOf(clean) {
  // Inline-Marker scannen: <CmsInlineSectionMarker sectionKey="…"/>
  // Verhindert nur Doppel-Render durch CmsTailCta/CmsTailFaq; sichtbarer
  // Inhalt bleibt im Code hartcodiert. Admin-Toggle wirkt damit NICHT auf
  // den sichtbaren Inhalt → eigene Klassifikation `ok_dedup_only`.
  const inlineMarkerKeys = new Set();
  const inlineMarkerRe =
    /<\s*CmsInlineSectionMarker\b[^>]*sectionKey\s*=\s*["'`]([a-z0-9._-]+)["'`]/g;
  let mm;
  while ((mm = inlineMarkerRe.exec(clean))) inlineMarkerKeys.add(mm[1]);
  // Batch 57.1: CmsTailSections rendert FAQ und CTA gemeinsam (ersetzt
  // die alten CmsTailCta/CmsTailFaq in PageLayout). Wer CmsTailSections
  // einbindet, deckt damit beide Tail-Slots ab.
  const hasTailSections = /\bCmsTailSections\b/.test(clean);
  // GenericCmsPage iteriert intern alle Top-Level-Sections per
  // renderPageSectionByType und benutzt CmsPageLayout (→ PageLayout →
  // CmsTailSections). Pages, die ausschließlich <GenericCmsPage pageKey="…"/>
  // exportieren, sind damit DB-first inkl. FAQ/CTA-Tail.
  const hasGenericCmsPage = /\bGenericCmsPage\b/.test(clean);
  return {
    cmsBodyRenderer: /\b(CmsBodyRenderer|useCmsBody)\b/.test(clean) || hasGenericCmsPage,
    cmsOnlyShell: /\bCmsOnlyShell\b/.test(clean),
    cmsTailCta: /\bCmsTailCta\b/.test(clean) || hasTailSections || hasGenericCmsPage,
    cmsTailFaq: /\bCmsTailFaq\b/.test(clean) || hasTailSections || hasGenericCmsPage,
    cmsTailSections: hasTailSections,
    faqV1: /\bFaqV1\b/.test(clean),
    ctaV1Component: /\bCtaV1\b/.test(clean),
    ctaSectionWrapper: /<CTASection\b/.test(clean),
    pageLayoutImport: /from\s+["']@\/components\/PageLayout["']/.test(clean),
    cmsPageLayoutImport: /from\s+["'][^"']*CmsPageLayout["']/.test(clean),
    rendersDetailTemplate:
      /<\s*([A-Z][A-Za-z0-9_]*DetailPage)\b/.exec(clean)?.[1] ?? null,
    usesCmsPageContent: /\b(useCmsPageContent|usePersonaCms|useCmsI18n)\s*\(/.test(clean),
    iteratesCmsSections: /\bcms\.sections\b/.test(clean),
    usesDataCmsSection: /data-cms-section\s*=/.test(clean),
    usesGenericRenderers:
      /\b(CMS_RENDERERS|RENDERERS|renderPageSectionByType)\s*[\[\(]/.test(clean) ||
      hasGenericCmsPage,
    cmsProductSolutionShell: /\bCmsProductSolutionShell\b/.test(clean),
    personaBodyRenderer: /\bPersonaBodyRenderer\b/.test(clean),
    inlineMarkerKeys,
  };
}

const filesByPageKey = new Map();
const fileIndex = new Map();
for (const file of files) {
  let src;
  try {
    src = readFileSync(path.join(ROOT, file), "utf8");
  } catch {
    continue;
  }
  const clean = stripComments(src);
  fileIndex.set(file, { src, clean, markers: markersOf(clean) });
  let m;
  PAGE_KEY_RE.lastIndex = 0;
  while ((m = PAGE_KEY_RE.exec(clean))) {
    const k = m[1];
    if (!filesByPageKey.has(k)) filesByPageKey.set(k, []);
    if (!filesByPageKey.get(k).includes(file)) filesByPageKey.get(k).push(file);
  }
  PAGE_KEY_CONST_RE.lastIndex = 0;
  while ((m = PAGE_KEY_CONST_RE.exec(clean))) {
    const k = m[1];
    if (!filesByPageKey.has(k)) filesByPageKey.set(k, []);
    if (!filesByPageKey.get(k).includes(file)) filesByPageKey.get(k).push(file);
  }
}

function findTemplateFile(componentName) {
  const directExport = new RegExp(`(^|\\b)(export\\s+(default\\s+)?(function|const)\\s+${componentName}\\b)`);
  const namedDecl = new RegExp(`(^|\\b)(function|const)\\s+${componentName}\\b`);
  const defaultExport = new RegExp(`export\\s+default\\s+${componentName}\\b`);
  for (const [file, { clean }] of fileIndex) {
    if (directExport.test(clean)) return file;
    if (namedDecl.test(clean) && defaultExport.test(clean)) return file;
  }
  return null;
}

const pageLayoutMarkers = fileIndex.get("src/components/PageLayout.tsx")?.markers ?? null;
// CmsPageLayout-Datei direkt referenzieren — die alte Heuristik
// (`export const CmsPageLayout`) verfehlt den tatsächlichen Export-Stil
// (`const CmsPageLayout = …; export default CmsPageLayout`).
const cmsPageLayoutFile =
  fileIndex.get("src/features/cms/components/CmsPageLayout.tsx") ?? null;
let cmsPageLayoutMarkers = cmsPageLayoutFile?.markers ?? null;
let cmsPageLayoutImportsPageLayout = cmsPageLayoutMarkers?.pageLayoutImport ?? false;
if (!cmsPageLayoutMarkers) {
  // Fallback: alte Heuristik beibehalten, falls Datei umbenannt wurde.
  for (const [, { clean, markers }] of fileIndex) {
    if (
      /export\s+default\s+function\s+CmsPageLayout\b/.test(clean) ||
      /export\s+(const|function)\s+CmsPageLayout\b/.test(clean)
    ) {
      cmsPageLayoutMarkers = markers;
      cmsPageLayoutImportsPageLayout = markers.pageLayoutImport;
      break;
    }
  }
}
// Batch 4: CmsPageLayout wrappt PageLayout transitiv. Was PageLayout an
// zentralen Tail-Renderern mitbringt (CmsTailCta, CmsTailFaq), gilt für
// CmsPageLayout ebenfalls — sonst meldet die Inventur fälschlich Orphans
// für Pages, die CmsPageLayout benutzen.
if (cmsPageLayoutMarkers && cmsPageLayoutImportsPageLayout && pageLayoutMarkers) {
  if (pageLayoutMarkers.cmsTailCta) cmsPageLayoutMarkers.cmsTailCta = true;
  if (pageLayoutMarkers.cmsTailFaq) cmsPageLayoutMarkers.cmsTailFaq = true;
}



// ---- 4) Bewertung pro page_key -------------------------------------------

function combinedMarkers(pageKey) {
  const candidates = filesByPageKey.get(pageKey) ?? [];
  const out = {
    cmsBodyRenderer: false,
    cmsOnlyShell: false,
    cmsTailCta: false,
    cmsTailFaq: false,
    faqV1: false,
    ctaV1Component: false,
    ctaSectionWrapper: false,
    usesPageLayout: false,
    usesCmsPageLayout: false,
    usesCmsPageContent: false,
    iteratesCmsSections: false,
    usesDataCmsSection: false,
    usesGenericRenderers: false,
    cmsProductSolutionShell: false,
    personaBodyRenderer: false,
    inlineMarkerKeys: new Set(),
    templates: new Set(),
    candidates,
  };
  const absorb = (m) => {
    if (m.cmsBodyRenderer) out.cmsBodyRenderer = true;
    if (m.cmsOnlyShell) out.cmsOnlyShell = true;
    if (m.cmsTailCta) out.cmsTailCta = true;
    if (m.cmsTailFaq) out.cmsTailFaq = true;
    if (m.faqV1) out.faqV1 = true;
    if (m.ctaV1Component) out.ctaV1Component = true;
    if (m.ctaSectionWrapper) out.ctaSectionWrapper = true;
    if (m.pageLayoutImport) out.usesPageLayout = true;
    if (m.cmsPageLayoutImport) out.usesCmsPageLayout = true;
    if (m.usesCmsPageContent) out.usesCmsPageContent = true;
    if (m.iteratesCmsSections) out.iteratesCmsSections = true;
    if (m.usesDataCmsSection) out.usesDataCmsSection = true;
    if (m.usesGenericRenderers) out.usesGenericRenderers = true;
    if (m.cmsProductSolutionShell) out.cmsProductSolutionShell = true;
    if (m.personaBodyRenderer) out.personaBodyRenderer = true;
    if (m.rendersDetailTemplate) out.templates.add(m.rendersDetailTemplate);
    if (m.inlineMarkerKeys)
      for (const k of m.inlineMarkerKeys) out.inlineMarkerKeys.add(k);
  };
  for (const f of candidates) absorb(fileIndex.get(f).markers);
  const sharedTemplates = new Set();
  for (const f of candidates) {
    const { clean } = fileIndex.get(f);
    for (const compName of findComponentForPageKeyProp(clean, pageKey)) {
      sharedTemplates.add(compName);
    }
  }
  for (const compName of sharedTemplates) {
    const tplFile = findTemplateFile(compName);
    if (!tplFile) continue;
    absorb(fileIndex.get(tplFile).markers);
    out.templates.add(compName);
  }
  for (const tpl of out.templates) {
    const tplFile = findTemplateFile(tpl);
    if (!tplFile) continue;
    absorb(fileIndex.get(tplFile).markers);
  }
  out.sharedTemplates = sharedTemplates;
  return out;
}

function evaluatePage(pageKey) {
  // (a) Dynamische Slug-Templates (z. B. anwendungen.referenzprojekte.<slug>):
  // wenn das Detail-Template DB-first-Marker trägt, gilt OK.
  for (const dyn of KNOWN_DYNAMIC_TEMPLATES) {
    if (!dyn.pattern.test(pageKey)) continue;
    const entry = fileIndex.get(dyn.templateFile);
    if (!entry) break;
    const m = entry.markers;
    const dbFirst =
      m.cmsBodyRenderer ||
      m.cmsOnlyShell ||
      m.cmsProductSolutionShell ||
      (m.usesCmsPageContent &&
        (m.iteratesCmsSections || m.usesDataCmsSection || m.usesGenericRenderers)) ||
      m.usesCmsPageContent; // Detail-Template ruft useCmsPageContent(<base>.<slug>)
    if (dbFirst) {
      // Detail-Template nutzt CmsPageLayout/PageLayout → Tail-Renderer
      // (CmsTailCta, CmsTailFaq) sind transitiv aktiv.
      const tailFaq =
        (m.pageLayoutImport && pageLayoutMarkers?.cmsTailFaq) ||
        (m.cmsPageLayoutImport && cmsPageLayoutMarkers?.cmsTailFaq);
      const tailCta =
        (m.pageLayoutImport && pageLayoutMarkers?.cmsTailCta) ||
        (m.cmsPageLayoutImport && cmsPageLayoutMarkers?.cmsTailCta);
      return {
        faq:
          m.faqV1 || m.cmsBodyRenderer || m.cmsOnlyShell || tailFaq
            ? "OK"
            : "ORPHAN",
        cta:
          m.cmsTailCta || m.ctaV1Component || tailCta ? "OK" : "ORPHAN",
        body: "OK",
        bodyEvidence: dyn.evidence,
        files: [dyn.templateFile],
        templates: [],
        note: "Dynamisches Slug-Template — Page-Datei wird über :slug gerendert.",
      };
    }
  }


  // (b) Bewusste Sonderfälle ohne Page-Datei (Legacy-Redirects, Kopien).
  if (INTENTIONAL_SPECIAL_CASES[pageKey]) {
    return {
      faq: "UNKNOWN",
      cta: "UNKNOWN",
      body: "UNKNOWN",
      bodyEvidence: `intentional-special:${INTENTIONAL_SPECIAL_CASES[pageKey]}`,
      files: [],
      templates: [],
      note: INTENTIONAL_SPECIAL_CASES[pageKey],
    };
  }

  const cand = filesByPageKey.get(pageKey) ?? [];
  if (cand.length === 0) {
    return {
      faq: "UNKNOWN",
      cta: "UNKNOWN",
      body: "UNKNOWN",
      bodyEvidence: "no-page-file",
      files: [],
      templates: [],
      note: "Keine Page-Datei mit dieser pageKey gefunden.",
    };
  }
  const c = combinedMarkers(pageKey);
  const layoutHasTailCta =
    (c.usesPageLayout && pageLayoutMarkers?.cmsTailCta) ||
    (c.usesCmsPageLayout && cmsPageLayoutMarkers?.cmsTailCta);
  // Batch 4: zentraler FAQ-Tail-Renderer in PageLayout. Jede Page mit
  // pageKey, die PageLayout (direkt oder via CmsPageLayout) benutzt, ist
  // damit für aktive faq_v1-Sections automatisch abgedeckt.
  const layoutHasTailFaq =
    (c.usesPageLayout && pageLayoutMarkers?.cmsTailFaq) ||
    (c.usesCmsPageLayout && cmsPageLayoutMarkers?.cmsTailFaq);

  // Batch 5b (harte Abnahme): Inline-Marker auf section_keys cta/standard_cta
  // bzw. faq erkennen. Inhalt bleibt hartcodiert, Marker unterdrückt nur
  // Doppel-Render → Admin-Toggle wirkt NICHT → `ok_dedup_only`.
  const ctaInlineMarked =
    c.inlineMarkerKeys.has("standard_cta") || c.inlineMarkerKeys.has("cta");
  const faqInlineMarked = c.inlineMarkerKeys.has("faq");

  let faqStatus =
    c.cmsBodyRenderer || c.cmsOnlyShell || c.faqV1 || c.cmsTailFaq ||
    layoutHasTailFaq || c.personaBodyRenderer
      ? "OK"
      : "ORPHAN";
  let ctaStatus =
    c.cmsTailCta || layoutHasTailCta || c.ctaV1Component ||
    c.ctaSectionWrapper || c.cmsProductSolutionShell || c.personaBodyRenderer
      ? "OK"
      : "ORPHAN";

  // Wenn der einzige „grüne" Pfad ein Inline-Marker (Hartcode + Dedup) ist,
  // ehrlich ausweisen — auch wenn parallel ein Tail-Renderer existiert,
  // der vom Marker bewusst unterdrückt wird.
  if (ctaStatus === "OK" && ctaInlineMarked) ctaStatus = "OK_DEDUP_ONLY";
  if (faqStatus === "OK" && faqInlineMarked) faqStatus = "OK_DEDUP_ONLY";


  // Body-Pfad-Bewertung: konservativ, Code-Evidenz Pflicht.
  // Reihenfolge der Beweisstärke (höchste zuerst):
  //  1) Generischer Body-Renderer (CmsBodyRenderer / useCmsBody / CmsOnlyShell)
  //  2) Spezial-Shell CmsProductSolutionShell (iteriert intern cms.sections)
  //  3) Page-eigene DB-first-Iteration: useCmsPageContent + cms.sections
  //  4) Page-eigene DB-first-Iteration: useCmsPageContent + data-cms-section
  //  5) Generischer RENDERERS/CMS_RENDERERS-Dispatch in der Page selbst
  // CmsPageLayout allein zählt NICHT als Body-Beweis.
  let bodyStatus = "UNKNOWN";
  let bodyEvidence = "none";
  if (c.cmsBodyRenderer) {
    bodyStatus = "OK";
    bodyEvidence = "cms-body-renderer";
  } else if (c.cmsOnlyShell) {
    bodyStatus = "OK";
    bodyEvidence = "cms-only-shell";
  } else if (c.cmsProductSolutionShell) {
    bodyStatus = "OK";
    bodyEvidence = "cms-product-solution-shell";
  } else if (c.usesCmsPageContent && c.usesGenericRenderers) {
    bodyStatus = "OK";
    bodyEvidence = "generic-renderers-dispatch";
  } else if (c.usesCmsPageContent && c.iteratesCmsSections && c.usesDataCmsSection) {
    bodyStatus = "OK";
    bodyEvidence = "page-iterates-cms-sections";
  } else if (c.usesCmsPageContent && c.iteratesCmsSections) {
    bodyStatus = "OK";
    bodyEvidence = "page-iterates-cms-sections-no-marker";
  }

  return {
    faq: faqStatus,
    cta: ctaStatus,
    body: bodyStatus,
    bodyEvidence,
    files: cand,
    templates: [...c.templates],
    note: "",
  };
}

// ---- 5) Reportzeilen + Body-Map über ALLE pages --------------------------

const faqCtaRows = [];
for (const [pageKey, blocks] of [...perPage.entries()].sort()) {
  const ev = evaluatePage(pageKey);
  faqCtaRows.push({
    pageKey,
    pageType: pageMeta.get(pageKey)?.page_type ?? "?",
    title: pageMeta.get(pageKey)?.title_de ?? "",
    faqActive: blocks.faq ? blocks.faq.is_active : null,
    ctaActive: blocks.cta ? blocks.cta.is_active : null,
    faqStatus: blocks.faq ? ev.faq : "—",
    ctaStatus: blocks.cta ? ev.cta : "—",
    files: ev.files,
    templates: ev.templates,
    note: ev.note,
  });
}

const bodyMap = {};
const bodyEvidenceMap = {};
for (const p of pages) {
  const ev = evaluatePage(p.page_key);
  bodyMap[p.page_key] = ev.body.toLowerCase(); // "ok" | "unknown"
  bodyEvidenceMap[p.page_key] = ev.bodyEvidence;
}

// ---- 6) Markdown-Bericht --------------------------------------------------

const counts = {
  faq: { OK: 0, OK_DEDUP_ONLY: 0, ORPHAN: 0, UNKNOWN: 0, MIXED: 0, "—": 0 },
  cta: { OK: 0, OK_DEDUP_ONLY: 0, ORPHAN: 0, UNKNOWN: 0, MIXED: 0, "—": 0 },
};
for (const r of faqCtaRows) {
  counts.faq[r.faqStatus]++;
  counts.cta[r.ctaStatus]++;
}
const bodyCounts = { ok: 0, unknown: 0 };
for (const v of Object.values(bodyMap)) bodyCounts[v] += 1;

const md = [];
md.push("# FAQ-/CTA-Toggle- und Body-Pfad-Inventar");
md.push("");
md.push(
  `Stand: ${new Date().toISOString().slice(0, 16).replace("T", " ")} · Quelle: \`${source}\` · ${faqCtaRows.length} Seiten mit FAQ-/CTA-Section · ${pages.length} Seiten insgesamt.`,
);
md.push("");
md.push("## Bedeutung");
md.push("");
md.push("- **OK / ok_db_rendered** — Page-Pfad zieht das CMS-Objekt aus der DB: Admin-Toggle wirkt 1:1.");
md.push("- **OK_DEDUP_ONLY / ok_dedup_only** — Inline-Code rendert weiter, `CmsInlineSectionMarker` verhindert nur Doppelrender. **Admin-Toggle wirkt NICHT auf den sichtbaren Inhalt** — bewusste Restschuld, keine Wahrheit.");
md.push("- **ORPHAN** — Kein V1-Renderer im Page-Pfad sichtbar.");
md.push("- **MIXED** — V1-Pfad + Legacy `<CTASection/>` parallel, Risiko Doppel-CTA.");
md.push("- **UNKNOWN / unknown** — Page-Pfad nicht eindeutig auflösbar (z. B. dynamische Slug-Routen).");
md.push("- **—** — Block existiert auf der Seite nicht.");
md.push("");
md.push("## Zusammenfassung");
md.push("");
md.push("| Block | OK | OK_DEDUP_ONLY | ORPHAN | MIXED | UNKNOWN | nicht vorhanden |");
md.push("|-------|----|---------------|--------|-------|---------|------------------|");
md.push(`| FAQ   | ${counts.faq.OK} | ${counts.faq.OK_DEDUP_ONLY} | ${counts.faq.ORPHAN} | ${counts.faq.MIXED} | ${counts.faq.UNKNOWN} | ${counts.faq["—"]} |`);
md.push(`| CTA   | ${counts.cta.OK} | ${counts.cta.OK_DEDUP_ONLY} | ${counts.cta.ORPHAN} | ${counts.cta.MIXED} | ${counts.cta.UNKNOWN} | ${counts.cta["—"]} |`);
md.push("");
md.push(
  `Body-Pfad (DB-first, Code-Evidenz Pflicht): **${bodyCounts.ok} ok**, **${bodyCounts.unknown} unknown** über alle ${pages.length} Seiten.`,
);
md.push("");
md.push("### Body-Evidenz (Aufschlüsselung)");
md.push("");
const evidenceCounts = {};
for (const ev of Object.values(bodyEvidenceMap)) {
  evidenceCounts[ev] = (evidenceCounts[ev] ?? 0) + 1;
}
const evidenceLabels = {
  "cms-body-renderer": "Generischer `CmsBodyRenderer` / `useCmsBody`",
  "cms-only-shell": "`CmsOnlyShell` (Body iteriert intern Sections)",
  "cms-product-solution-shell": "`CmsProductSolutionShell` (T05-Spezial-Shell)",
  "generic-renderers-dispatch": "Page nutzt generischen `RENDERERS`/`CMS_RENDERERS`-Dispatch",
  "page-iterates-cms-sections": "Page iteriert `cms.sections` + `data-cms-section`",
  "page-iterates-cms-sections-no-marker": "Page iteriert `cms.sections` (ohne `data-cms-section`-Marker)",
  "none": "Kein Body-Beweis im Page-Code (`CmsPageLayout` allein zählt nicht)",
  "no-page-file": "Keine Page-Datei mit dieser pageKey gefunden",
  "dynamic-slug-template:ReferenzprojektDetailPage":
    "Dynamisches Slug-Template `ReferenzprojektDetailPage` (`anwendungen.referenzprojekte.<slug>`)",
};
md.push("| Evidenz | Seiten |");
md.push("|---------|-------:|");
for (const [ev, n] of Object.entries(evidenceCounts).sort((a, b) => b[1] - a[1])) {
  // intentional-special-Einträge gruppieren wir unter einem Label.
  const label = ev.startsWith("intentional-special:")
    ? `Bewusster Sonderfall (${ev.slice("intentional-special:".length)})`
    : evidenceLabels[ev] ?? ev;
  md.push(`| ${label} | ${n} |`);
}
md.push("");

const outMd = "docs/04-betrieb/faq-cta-toggle-inventar.md";
writeFileSync(path.join(ROOT, outMd), md.join("\n"));

// ---- 7) TS-Map schreiben -------------------------------------------------

const faqContracts = Object.fromEntries(
  faqCtaRows.filter((r) => r.faqStatus !== "—").map((r) => [r.pageKey, r.faqStatus.toLowerCase()]),
);
const ctaContracts = Object.fromEntries(
  faqCtaRows.filter((r) => r.ctaStatus !== "—").map((r) => [r.pageKey, r.ctaStatus.toLowerCase()]),
);

const tsOut = "src/features/admin/lib/knownPageObjectContracts.ts";
const ts = `/**
 * AUTO-GENERIERT durch scripts/cms/faq-cta-toggle-inventar.mjs
 * Stand: ${new Date().toISOString().slice(0, 10)}
 *
 * Bewertet pro page_key, ob CMS-Objekte am öffentlichen Page-Pfad wirken:
 *
 *   faq   — FAQ-Section wird vom Page-Code wirklich gerendert.
 *   cta   — Tail-CTA / CtaV1 wird vom Page-Code wirklich gerendert.
 *   body  — Seite zieht ihren Body generisch über CmsBodyRenderer oder
 *           CmsOnlyShell (Voraussetzung für alle anderen CMS-Bausteine
 *           wie Karten, Stats, Tabs, Downloads, Hero, Content).
 *
 * Status (faq/cta): ok | ok_dedup_only | orphan | mixed | unknown.
 * Status (body):    ok | unknown.
 *
 * NICHT manuell editieren. Neu erzeugen mit:
 *   node scripts/cms/faq-cta-toggle-inventar.mjs
 *   node scripts/cms/faq-cta-toggle-inventar.mjs --snapshot <dir>
 */

export type PageObjectContractStatus =
  | "ok"
  | "ok_dedup_only"
  | "orphan"
  | "mixed"
  | "unknown";
export type PageObjectContractKind = "faq" | "cta" | "body";

export const KNOWN_PAGE_OBJECT_CONTRACTS: Readonly<Record<PageObjectContractKind, Readonly<Record<string, PageObjectContractStatus>>>> = {
  faq: ${JSON.stringify(faqContracts, null, 2)},
  cta: ${JSON.stringify(ctaContracts, null, 2)},
  body: ${JSON.stringify(bodyMap, null, 2)},
};

export function getKnownPageObjectContractStatus(
  kind: PageObjectContractKind,
  pageKey: string,
): PageObjectContractStatus | null {
  return KNOWN_PAGE_OBJECT_CONTRACTS[kind][pageKey] ?? null;
}
`;
writeFileSync(path.join(ROOT, tsOut), ts);

console.log(`Inventar geschrieben: ${outMd}`);
console.log(`Contract-Map geschrieben: ${tsOut}`);
console.log(`Quelle: ${source}`);
console.log(`Seiten mit FAQ/CTA: ${faqCtaRows.length} · Seiten gesamt: ${pages.length}`);
console.log("FAQ:", counts.faq);
console.log("CTA:", counts.cta);
console.log("Body:", bodyCounts);
console.log("Body-Evidenz:", evidenceCounts);
