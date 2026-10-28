#!/usr/bin/env node
/**
 * page-renderer-coverage.mjs (Etappe D1)
 *
 * READ-ONLY. Erzeugt das globale Inventar "welche Page-Datei rendert
 * welche aktiven CMS-Sections — und welche aktiven Sections werden
 * stillschweigend ignoriert, weil die Page-Datei sie nicht aufruft".
 *
 * Befundklasse: AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD
 *
 * Inputs:
 *   - src/features/** /pages/*Page.tsx       (statische AST-leichte Analyse via Regex)
 *   - src/features/cms/components/CmsBodyRenderer.tsx (RENDERERS, SKIP_TYPES, normalizeType)
 *   - docs/02-architektur/sonderseiten-register.json (registrierte Sonderfälle)
 *   - DB:  cms_pages / cms_sections (aktive Top-Level-Sections je page_key)
 *
 * Outputs (alle UTF-8, ASCII-sicher):
 *   - docs/04-betrieb/audit-snapshot/page-renderer-coverage.json
 *   - docs/04-betrieb/audit-snapshot/page-renderer-coverage.md
 *   - docs/04-betrieb/audit-snapshot/aktive-db-sections-ohne-renderpfad.json
 *   - docs/04-betrieb/audit-snapshot/aktive-db-sections-ohne-renderpfad.md
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const PAGES_GLOB_ROOT = path.join(ROOT, "src/features");
const RENDERER_FILE = path.join(ROOT, "src/features/cms/components/CmsBodyRenderer.tsx");
const SONDERSEITEN_FILE = path.join(ROOT, "docs/02-architektur/sonderseiten-register.json");
const OUT_DIR = path.join(ROOT, "docs/04-betrieb/audit-snapshot");

/* --------------------------- helpers --------------------------- */

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.isFile()) out.push(p);
  }
  return out;
}

async function readText(p) { return fs.readFile(p, "utf8"); }

function uniq(arr) { return [...new Set(arr)]; }

/* --------------------------- renderer registry parse --------------------------- */

async function parseRendererRegistry() {
  const src = await readText(RENDERER_FILE);
  const types = [];
  const block = src.match(/export const RENDERERS[^{]*{([\s\S]*?)\n\};/);
  if (block) {
    for (const m of block[1].matchAll(/^\s*([a-z0-9_]+)\s*:/gmi)) types.push(m[1]);
  }
  const skip = [];
  const skipBlock = src.match(/SKIP_TYPES\s*=\s*new Set\(\[(.*?)\]\)/s);
  if (skipBlock) {
    for (const m of skipBlock[1].matchAll(/"([^"]+)"/g)) skip.push(m[1]);
  }
  const aliases = {};
  const normBlock = src.match(/function normalizeType[\s\S]*?const map: Record<string, string> = {([\s\S]*?)};/);
  if (normBlock) {
    for (const m of normBlock[1].matchAll(/"?([a-zA-Z0-9_\-]+)"?\s*:\s*"([a-zA-Z0-9_]+)"/g)) {
      aliases[m[1]] = m[2];
    }
  }
  return { rendererTypes: new Set(types), skipTypes: new Set(skip), aliases };
}

function normalizeType(raw, aliases) {
  if (!raw) return null;
  return aliases[raw] ?? raw;
}

/* --------------------------- page file classification --------------------------- */

function extractPageKey(src) {
  // Reihenfolge: GenericCmsPage > CmsPageLayout > useCmsI18n > useCmsPageContent > data-cms-page
  // Letzter Fallback: `const PAGE_KEY = "..."` — wird verwendet, wenn die
  // Seite den Schlüssel als Konstante hält und sonst nur `PAGE_KEY` (ohne
  // String-Literal) an Hooks/Layout übergibt (z. B. P-057, P-071 seit
  // Batch 33d/34b).
  const patterns = [
    /<GenericCmsPage[^>]*pageKey=["']([^"']+)["']/,
    /<CmsPageLayout[^>]*pageKey=["']([^"']+)["']/,
    /useCmsI18n\(\s*["']([^"']+)["']/,
    /useCmsPageContent\(\s*["']([^"']+)["']/,
    /pageKey:\s*["']([^"']+)["']/,
    /pageKey=["']([^"']+)["']/,
    /data-cms-page=["']([^"']+)["']/,
    /const\s+PAGE_KEY\s*=\s*["']([^"']+)["']/,
  ];
  for (const re of patterns) {
    const m = src.match(re);
    if (m) return m[1];
  }
  return null;
}

function classifyPageFile(src) {
  const usesGenericCmsPage = /<GenericCmsPage\b/.test(src);
  const usesCmsBodyRenderer = /<CmsBodyRenderer\b/.test(src);
  // "renderByType" deckt zwei aequivalente Dispatch-Patterns ab:
  //   a) renderPageSectionByType(...) aus @/features/cms/lib/renderPageSection
  //   b) inline-Variante: CMS_RENDERERS[normalized](ctx) — gleiches Mapping,
  //      gleiche Wirkung. Wird z. B. in TuersprechanlagenPage als generischer
  //      Fallback unter dbOrder.map(...) verwendet.
  const callsRenderByTypeFn = /renderPageSectionByType\s*\(/.test(src);
  const callsCmsRenderersInline =
    /CMS_RENDERERS\s*\[\s*(?:normalized|normalizedType|cmsNormalizeType\()/.test(src) &&
    /cms\.sections/.test(src);
  const callsRenderByType = callsRenderByTypeFn || callsCmsRenderersInline;

  let fullIteration = false;
  if (callsRenderByType) {
    if (/handledSectionKeys/.test(src)) {
      fullIteration = true;
    } else {
      const iterPatterns = [
        /cms\.sections[\s\S]{0,400}?\.filter\([\s\S]*?\)\s*\.map\([\s\S]{0,400}?renderPageSectionByType/,
        /cms\.sections[\s\S]{0,400}?\.map\([\s\S]{0,400}?renderPageSectionByType/,
        // Inline-Variante: dbOrder.map(...) faellt am Ende auf CMS_RENDERERS[normalized] zurueck.
        /\.map\([\s\S]{0,1200}?CMS_RENDERERS\s*\[\s*(?:normalized|normalizedType|cmsNormalizeType\()/,
      ];
      for (const re of iterPatterns) {
        const m = src.match(re);
        if (!m) continue;
        const blob = m[0];
        const restrictsByKey =
          /section_key\s*===\s*["'][^"']+["']/.test(blob) ||
          /section_key\s*\.\s*startsWith\(\s*["'][^"']+["']\s*\)(?!\s*[,)])/.test(blob) ||
          /\.\s*includes\(\s*s\.section_key\s*\)/.test(blob);
        const onlyExclusion = /![^=]*startsWith\(/.test(blob) || /![^=]*\.has\(/.test(blob);
        if (!restrictsByKey || onlyExclusion) { fullIteration = true; break; }
      }
    }
  }

  // Sections, die per handledSectionKeys-Set explizit als „bereits anderweitig
  // gerendert" markiert wurden (z. B. inline ContentSection / globaler CmsTailCta).
  const handledSetKeys = [];
  const handledSetBlock = src.match(/handledSectionKeys\s*=\s*new Set<[^>]*>?\(\[([\s\S]*?)\]\)/)
    ?? src.match(/handledSectionKeys\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
  if (handledSetBlock) {
    for (const m of handledSetBlock[1].matchAll(/["']([^"']+)["']/g)) handledSetKeys.push(m[1]);
  }

  // Batch 20 — zentraler Anwendungs-Wrapper:
  // Pages, die ueber `AnwendungDetailPage` mit einem `pageKey` rendern,
  // delegieren die 6 Standard-Sections der Anwendungs-Detailseiten an die
  // Wrapper-Komponente:
  //   - `content`, `anforderungen`, `leistungen`, `systembausteine`,
  //     `broschure` werden im Wrapper aus DB gelesen (mit B19-Gates),
  //   - `faq` wird vom zentralen FAQ-Tail neben dem Wrapper gerendert.
  // Diese Keys gelten daher fuer solche Pages als bereits handled.
  const usesAnwendungDetailWrapper =
    /from\s+["'][^"']*AnwendungDetailPage["']/.test(src) &&
    /<AnwendungDetailPage[^>]*pageKey=/.test(src);
  if (usesAnwendungDetailWrapper) {
    for (const k of ["content", "anforderungen", "leistungen", "systembausteine", "broschure", "faq"]) {
      handledSetKeys.push(k);
    }
  }



  // Explizit behandelte section_keys (außer Iterations-Filter)
  const explicitKeys = new Set();
  for (const m of src.matchAll(/section_key\s*===\s*["']([^"']+)["']/g)) explicitKeys.add(m[1]);
  for (const m of src.matchAll(/sectionKey:\s*["']([^"']+)["']/g)) explicitKeys.add(m[1]);
  for (const m of src.matchAll(/sectionKey=["']([^"']+)["']/g)) explicitKeys.add(m[1]);
  for (const m of src.matchAll(/\.find\([^)]*section_key\s*===\s*["']([^"']+)["']/g)) explicitKeys.add(m[1]);
  // Präfixe (z.B. bereich_)
  const explicitKeyPrefixes = [];
  for (const m of src.matchAll(/section_key\s*\.\s*startsWith\(\s*["']([^"']+)["']\s*\)/g)) explicitKeyPrefixes.push(m[1]);
  // Template-Literal-Section-Keys: `<prefix>_${id}` oder `<prefix>_${id}_<suffix>`
  // (z. B. P-057 / P-071 ab Batch 33d/34b — iterieren ueber FACILITIES und
  // bauen Keys wie `einrichtung_${id}`, `anforderungen_${id}`,
  // `leistungen_${id}_sicherheit`, `broschure_${id}`). Wir leiten daraus den
  // statischen Praefix bis zum ersten `${` ab und behandeln passende
  // DB-Section-Keys als explizit gehandhabt.
  for (const m of src.matchAll(/`([a-zA-Z][a-zA-Z0-9_-]*)_\$\{/g)) {
    explicitKeyPrefixes.push(`${m[1]}_`);
  }
  // String-Array-Konstanten von Section-Keys: `const SECTION_ORDER = ["…","…"]`
  // wird ueber `.map((sk) => renderTopSection(sk))` an `renderPageSectionByType`
  // gegeben (z. B. P-071). Wenn die Datei `renderPageSectionByType` aufruft,
  // gelten die enthaltenen String-Literale als explizit gehandhabte Keys.
  if (callsRenderByTypeFn) {
    for (const arrM of src.matchAll(/const\s+[A-Z][A-Z0-9_]*\s*=\s*\[([\s\S]*?)\]\s*;/g)) {
      const body = arrM[1];
      const strs = [...body.matchAll(/["']([a-zA-Z][a-zA-Z0-9_-]*)["']/g)].map((m) => m[1]);
      if (strs.length === 0) continue;
      for (const k of strs) explicitKeys.add(k);
    }
    // Inline-Literal: `<BroschureLink ... sectionKey="broschure_intern" ...>` —
    // bereits ueber `sectionKey=` und `sectionKey:` oben erfasst, aber zusaetzlich
    // einfache `sectionKey="…"`-Strings als bare-Literal in JSX-Attributen.
  }

  // Explizit behandelte section_types (z.B. teaser_2col_v1 als Filter)
  const explicitTypes = new Set();
  for (const m of src.matchAll(/section_type\s*===\s*["']([^"']+)["']/g)) explicitTypes.add(m[1]);

  // Tail-Renderer: <CmsTailFaq pageKey="..."/> bzw. <CmsTailCta pageKey="..."/>
  // decken FAQ-/CTA-Sections der jeweiligen Page page-lokal ab. Wir markieren
  // die zugehoerigen section_types nur dann als handled, wenn das `pageKey`-
  // Prop am Tail mit dem aus der Datei extrahierten Page-Key uebereinstimmt
  // (Batch 8: keine implizite Annahme mehr).
  const pageKeyForTail = extractPageKey(src);
  for (const m of src.matchAll(/<CmsTailFaq\b[^>]*pageKey=["']([^"']+)["']/g)) {
    if (m[1] === pageKeyForTail) {
      explicitTypes.add("faq_v1");
      explicitTypes.add("faq");
    }
  }
  for (const m of src.matchAll(/<CmsTailCta\b[^>]*pageKey=["']([^"']+)["']/g)) {
    if (m[1] === pageKeyForTail) {
      explicitTypes.add("cta_v1");
      explicitTypes.add("standard_cta");
    }
  }

  // Handlayout-Buchhaltung: Wenn eine Seite Inhalte einer Section per
  //   t("<section>.<field>") / t("<ns>.<section>.<field>") / cms.text("<section>", …)
  //   listChildItems(cms, "<section>", …) / txChildField(cms, "<section>", …)
  //   listCardItems(cms, "<section>", …) / txCardItem(cms, loc, "<section>", …)
  //   isCardItemIconVisible(cms, loc, "<section>", …)
  //   renderTopLevel("<section>")
  // aus der DB liest, gilt die Section als handled (DB-first Handlayout).
  // Wir sammeln Kandidaten und schneiden spaeter gegen die tatsaechlichen
  // DB-Section-Keys der Seite, damit es keine globalen Phantome gibt.
  const handlayoutKeyCandidates = new Set();
  // t("a.b...") oder t(`a.b...`) — String- und Template-Literal (ohne Interpolation).
  for (const m of src.matchAll(/\bt\(\s*[`"']([a-zA-Z0-9_\-]+)\.([a-zA-Z0-9_\-$]+)(?:[\.\$][^`"']*)?[`"']/g)) {
    handlayoutKeyCandidates.add(m[1]);
    handlayoutKeyCandidates.add(m[2]);
  }
  // Template-Literal-Variante mit Base-Variable:
  //   t(`${base}.<section>.<field>`) ⇒ section gilt als handled, wenn die
  //   Datei `useCmsI18n(...)` mit rootPrefix verwendet (DB-first via Hook).
  const usesUseCmsI18n = /\buseCmsI18n\s*\(/.test(src);
  if (usesUseCmsI18n) {
    for (const m of src.matchAll(/\bt\(\s*`\$\{[a-zA-Z_$][\w$]*\}\.([a-zA-Z0-9_\-]+)\./g)) {
      handlayoutKeyCandidates.add(m[1]);
    }
  }
  for (const m of src.matchAll(/\bcms\.text\(\s*["']([a-zA-Z0-9_\-]+)["']/g)) handlayoutKeyCandidates.add(m[1]);
  for (const m of src.matchAll(/\blistChildItems\(\s*[a-zA-Z_$][\w$]*\s*,\s*["']([a-zA-Z0-9_\-]+)["']/g)) handlayoutKeyCandidates.add(m[1]);
  for (const m of src.matchAll(/\btxChildField\(\s*[a-zA-Z_$][\w$]*\s*,\s*["']([a-zA-Z0-9_\-]+)["']/g)) handlayoutKeyCandidates.add(m[1]);
  // Service-Hub-Helfer (Tranche 7c) — DB-first Karten/Items.
  for (const m of src.matchAll(/\blistCardItems\(\s*[a-zA-Z_$][\w$]*\s*,\s*["']([a-zA-Z0-9_\-]+)["']/g)) handlayoutKeyCandidates.add(m[1]);
  // txCardItem(cms, loc, "section", ...) — drittes Argument.
  for (const m of src.matchAll(/\btxCardItem\(\s*[a-zA-Z_$][\w$]*\s*,\s*[a-zA-Z_$][\w$]*\s*,\s*["']([a-zA-Z0-9_\-]+)["']/g)) handlayoutKeyCandidates.add(m[1]);
  // isCardItemIconVisible(cms, loc, "section", ...) — drittes Argument.
  for (const m of src.matchAll(/\bisCardItemIconVisible\(\s*[a-zA-Z_$][\w$]*\s*,\s*[a-zA-Z_$][\w$]*\s*,\s*["']([a-zA-Z0-9_\-]+)["']/g)) handlayoutKeyCandidates.add(m[1]);
  for (const m of src.matchAll(/\brenderTopLevel\(\s*["']([a-zA-Z0-9_\-]+)["']/g)) handlayoutKeyCandidates.add(m[1]);
  for (const m of src.matchAll(/\bcmsOr\(\s*["']([a-zA-Z0-9_\-]+)\./g)) handlayoutKeyCandidates.add(m[1]);
  // tcms("sectionKey", "field.path") — kontaktseitiges Muster.
  for (const m of src.matchAll(/\btcms\(\s*["']([a-zA-Z0-9_\-]+)["']/g)) handlayoutKeyCandidates.add(m[1]);
  // case "sectionKey": innerhalb renderTopLevel / switch-Dispatcher.
  if (/renderTopLevel|CMS_RENDERERS|cms\.sections/.test(src)) {
    for (const m of src.matchAll(/\bcase\s+["']([a-zA-Z0-9_\-]+)["']\s*:/g)) handlayoutKeyCandidates.add(m[1]);
  }

  let renderClass;
  if (usesGenericCmsPage) renderClass = "generisch_cms";
  else if (usesCmsBodyRenderer) renderClass = "generisch_cms";
  else if (fullIteration) renderClass = "generisch_iteration";
  else if (callsRenderByType) renderClass = "teilweise_generisch";
  else renderClass = "hart_codiert";

  return {
    renderClass,
    usesGenericCmsPage,
    usesCmsBodyRenderer,
    callsRenderByType,
    fullIteration,
    explicitKeys: [...explicitKeys].sort(),
    explicitKeyPrefixes: explicitKeyPrefixes.sort(),
    explicitTypes: [...explicitTypes].sort(),
    handledSetKeys,
    handlayoutKeyCandidates: [...handlayoutKeyCandidates].sort(),
  };
}

/* --------------------------- DB --------------------------- */

function psql(sql) {
  const out = execSync(`psql -At -F'|'`, {
    input: sql,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  return out.trim().split("\n").filter(Boolean).map((l) => l.split("|"));
}

function loadActiveSections() {
  // Top-Level only (kein parent_section_id), is_active=true, Seite published+active.
  const rows = psql(`
    select s.page_key, s.section_key, coalesce(s.section_type,''), s.sort_order
    from cms_sections s
    join cms_pages p on p.page_key = s.page_key
    where s.is_active = true
      and s.parent_section_id is null
      and p.status = 'published' and p.is_active = true
    order by s.page_key, s.sort_order, s.section_key;
  `);
  const map = new Map(); // page_key -> [{section_key, section_type, sort_order}]
  for (const [pk, sk, st, so] of rows) {
    if (!map.has(pk)) map.set(pk, []);
    map.get(pk).push({ section_key: sk, section_type: st, sort_order: Number(so) });
  }
  return map;
}

/* --------------------------- main --------------------------- */

(async () => {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const { rendererTypes, skipTypes, aliases } = await parseRendererRegistry();

  // Sonderseiten-Register
  let sonderseiten = [];
  try { sonderseiten = JSON.parse(await readText(SONDERSEITEN_FILE)); } catch { sonderseiten = []; }
  const sonderByPageKey = new Set(sonderseiten.map((e) => e.page_key).filter(Boolean));
  const sonderByFile = new Set(sonderseiten.map((e) => e.datei).filter(Boolean));

  // Page-Dateien einsammeln
  const allFiles = await walk(PAGES_GLOB_ROOT);
  const pageFiles = allFiles.filter((p) => /\/pages\/[^/]+Page\.tsx$/.test(p));

  // Aktive DB-Sections je page_key
  const dbSections = loadActiveSections();

  const pages = [];
  const ignoredFindings = [];

  // pageKey -> page entry (für Mehrfach-Zuordnung dokumentieren)
  const seenPageKeys = new Map();

  for (const file of pageFiles.sort()) {
    const rel = path.relative(ROOT, file);
    const src = await readText(file);
    const pageKey = extractPageKey(src);
    const cls = classifyPageFile(src);
    const isRegistered = sonderByFile.has(rel) || (pageKey && sonderByPageKey.has(pageKey));

    const dbActive = pageKey ? (dbSections.get(pageKey) ?? []) : [];

    // Pro DB-Section bestimmen: hat sie einen zentralen Renderer?
    // Wird sie von der Page-Datei behandelt?
    const sectionsAnalysis = dbActive.map((s) => {
      const normType = normalizeType(s.section_type, aliases);
      const hasRenderer = normType ? rendererTypes.has(normType) : false;
      const isGloballyHandled = normType ? skipTypes.has(normType) : false; // hero/cta laufen global
      const explicitlyHandledByKey =
        cls.explicitKeys.includes(s.section_key) ||
        cls.explicitKeyPrefixes.some((pre) => s.section_key.startsWith(pre)) ||
        cls.handledSetKeys.includes(s.section_key);
      const explicitlyHandledByType = normType
        ? cls.explicitTypes.includes(normType) || cls.explicitTypes.includes(s.section_type)
        : false;
      const handledByHandlayout = cls.handlayoutKeyCandidates.includes(s.section_key);
      const isGenericPage =
        cls.renderClass === "generisch_cms" || cls.renderClass === "generisch_iteration";
      const isHandled =
        isGloballyHandled ||
        isGenericPage ||
        explicitlyHandledByKey ||
        explicitlyHandledByType ||
        handledByHandlayout;
      return {
        section_key: s.section_key,
        section_type: s.section_type,
        normalized_type: normType,
        sort_order: s.sort_order,
        has_renderer: hasRenderer,
        globally_handled: isGloballyHandled,
        explicitly_handled_by_key: explicitlyHandledByKey,
        explicitly_handled_by_type: explicitlyHandledByType,
        handled_by_handlayout: handledByHandlayout,
        page_renders_generically: isGenericPage,
        is_handled: isHandled,
        is_ignored_finding: hasRenderer && !isGloballyHandled && !isHandled,
      };
    });

    const missing = sectionsAnalysis.filter((a) => a.is_ignored_finding);

    const entry = {
      page_file: rel,
      page_key: pageKey,
      render_class: cls.renderClass,
      uses_generic_cms_page: cls.usesGenericCmsPage,
      uses_cms_body_renderer: cls.usesCmsBodyRenderer,
      calls_render_by_type: cls.callsRenderByType,
      full_iteration: cls.fullIteration,
      explicit_section_keys: cls.explicitKeys,
      explicit_section_key_prefixes: cls.explicitKeyPrefixes,
      explicit_section_types: cls.explicitTypes,
      is_registered_sonderseite: isRegistered,
      db_active_top_section_count: dbActive.length,
      db_active_sections: sectionsAnalysis,
      ignored_section_count: missing.length,
    };
    pages.push(entry);

    if (pageKey) {
      if (!seenPageKeys.has(pageKey)) seenPageKeys.set(pageKey, []);
      seenPageKeys.get(pageKey).push(rel);
    }

    // Batch 20 — registrierte Sonderseiten erzeugen keine D1-Befunde mehr.
    // Sie sind in `docs/02-architektur/sonderseiten-register.json` dokumentiert
    // (z. B. Login, Passwort vergessen, Registrieren — parkiert) und stehen
    // unter eigener Pflege.
    if (isRegistered) continue;

    for (const m of missing) {
      ignoredFindings.push({
        finding_class: "AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD",
        page_key: pageKey,
        page_file: rel,
        section_key: m.section_key,
        section_type: m.section_type,
        normalized_type: m.normalized_type,
        sort_order: m.sort_order,
        is_registered_sonderseite: isRegistered,
        reason:
          cls.renderClass === "hart_codiert"
            ? "Page-Datei ruft renderPageSectionByType nicht auf — section bleibt unsichtbar."
            : "Page-Datei behandelt nur ausgewaehlte section_keys/typen — section faellt durch.",
      });
    }
  }


  // Konsolidierte Renderpfad-Liste
  const summary = {
    generated_at: new Date().toISOString(),
    renderer_types: [...rendererTypes].sort(),
    skip_types: [...skipTypes].sort(),
    aliases,
    counts: {
      total_page_files: pages.length,
      generisch_cms: pages.filter((p) => p.render_class === "generisch_cms").length,
      generisch_iteration: pages.filter((p) => p.render_class === "generisch_iteration").length,
      teilweise_generisch: pages.filter((p) => p.render_class === "teilweise_generisch").length,
      hart_codiert: pages.filter((p) => p.render_class === "hart_codiert").length,
      registrierte_sonderseiten: pages.filter((p) => p.is_registered_sonderseite).length,
      pages_ohne_page_key: pages.filter((p) => !p.page_key).length,
      ignored_findings: ignoredFindings.length,
      pages_with_ignored_sections: uniq(ignoredFindings.map((f) => f.page_key)).length,
    },
  };

  const coverageJson = { summary, pages };
  await fs.writeFile(
    path.join(OUT_DIR, "page-renderer-coverage.json"),
    JSON.stringify(coverageJson, null, 2) + "\n",
    "utf8",
  );

  // page-renderer-coverage.md
  const lines = [];
  lines.push("# Page-Renderer-Coverage (D1)");
  lines.push("");
  lines.push(`Stand: ${summary.generated_at}`);
  lines.push("");
  lines.push("Read-only Inventar aller Page-Dateien unter `src/features/**/pages/*Page.tsx`.");
  lines.push("Klassifiziert, wie eine Seite ihre CMS-Sections rendert, und prueft, welche");
  lines.push("aktiven DB-Sections die Page-Datei stillschweigend ignoriert.");
  lines.push("");
  lines.push("## Zaehlung");
  lines.push("");
  for (const [k, v] of Object.entries(summary.counts)) {
    lines.push(`- ${k}: ${v}`);
  }
  lines.push("");
  lines.push("## Renderpfad je Page-Datei");
  lines.push("");
  lines.push("| Page-Datei | page_key | Klasse | Sonderseite | DB-Top-Sections | Ignoriert |");
  lines.push("|---|---|---|---|---:|---:|");
  for (const p of pages) {
    lines.push(
      `| \`${p.page_file}\` | ${p.page_key ?? "-"} | ${p.render_class} | ${p.is_registered_sonderseite ? "ja" : "nein"} | ${p.db_active_top_section_count} | ${p.ignored_section_count} |`,
    );
  }
  lines.push("");
  lines.push("## Legende");
  lines.push("");
  lines.push("- `generisch_cms`         — nutzt `<GenericCmsPage>` oder `<CmsBodyRenderer>` (rendert alle aktiven Top-Sections automatisch).");
  lines.push("- `generisch_iteration`   — iteriert selbst ueber `cms.sections` und ruft `renderPageSectionByType` ohne Key-Whitelist auf.");
  lines.push("- `teilweise_generisch`   — ruft `renderPageSectionByType` nur fuer ausgewaehlte section_keys/typen auf; uebrige Sections fallen durch.");
  lines.push("- `hart_codiert`          — kein zentraler Renderer-Aufruf; alle Sections muessen explizit im Code stehen.");
  lines.push("- Ignoriert               — aktive DB-Sections mit zentralem Renderer, die weder global (hero/cta) noch explizit behandelt werden.");
  await fs.writeFile(path.join(OUT_DIR, "page-renderer-coverage.md"), lines.join("\n") + "\n", "utf8");

  // aktive-db-sections-ohne-renderpfad.json + md
  await fs.writeFile(
    path.join(OUT_DIR, "aktive-db-sections-ohne-renderpfad.json"),
    JSON.stringify(
      {
        generated_at: summary.generated_at,
        finding_class: "AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD",
        count: ignoredFindings.length,
        findings: ignoredFindings,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  const mdF = [];
  mdF.push("# Aktive DB-Sections ohne Public-Renderpfad (D1)");
  mdF.push("");
  mdF.push(`Stand: ${summary.generated_at}`);
  mdF.push("");
  mdF.push("Befundklasse: `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD`");
  mdF.push("");
  mdF.push("Diese Sections sind in der DB aktiv, haben einen zentralen Renderer in");
  mdF.push("`RENDERERS`, sind nicht in `SKIP_TYPES` (also nicht global ueber Hero/CTA");
  mdF.push("abgedeckt) und werden trotzdem von der zugehoerigen Page-Datei nicht aufgerufen.");
  mdF.push("");
  mdF.push(`Gesamtzahl: **${ignoredFindings.length}**`);
  mdF.push("");
  if (ignoredFindings.length === 0) {
    mdF.push("Keine Befunde.");
  } else {
    mdF.push("| page_key | section_key | section_type | Page-Datei | Sonderseite | Grund |");
    mdF.push("|---|---|---|---|---|---|");
    for (const f of ignoredFindings) {
      mdF.push(
        `| ${f.page_key ?? "-"} | ${f.section_key} | ${f.section_type} | \`${f.page_file}\` | ${f.is_registered_sonderseite ? "ja" : "nein"} | ${f.reason} |`,
      );
    }
  }
  await fs.writeFile(
    path.join(OUT_DIR, "aktive-db-sections-ohne-renderpfad.md"),
    mdF.join("\n") + "\n",
    "utf8",
  );

  console.log(
    `[D1] ${pages.length} Page-Dateien, ${ignoredFindings.length} Befunde der Klasse AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD.`,
  );
})();
