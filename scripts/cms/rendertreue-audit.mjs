#!/usr/bin/env node
/**
 * Rendertreue-Audit (Tranche 16)
 * ---------------------------------------------------------------------------
 * Prüft: Jede aktive Section auf einer aktiven/published CMS-Seite wird
 * auch tatsächlich gerendert — entweder über den zentralen Standard-
 * Renderer (CmsBodyRenderer/renderPageSectionByType) oder über einen
 * page-spezifischen Renderer, der den `section_key` explizit benutzt.
 *
 * Klassen (siehe docs/04-betrieb/prompts-vs-admin.md → „Admin-Wahrheit"):
 *   R0  OK             – aktiv, Renderer eindeutig vorhanden
 *   R1  OK-Container   – Eltern-Container, dessen Kinder gerendert werden
 *   R2  Legacy/Skip    – z. B. hero_v1 (vom Layout gerendert), bewusst aus
 *   R3  Risiko         – aktiv/editierbar, aber statisch nicht eindeutig gerendert
 *   R4  Fehler         – aktiv, aber definitiv kein Renderer
 *   R5  Spezialrenderer – section_key wird in einer page-spezifischen
 *                         Komponente explizit referenziert
 *
 * Heuristik:
 *   - „zentraler Standardtyp" = Typ existiert in der RENDERERS-Map
 *     (`src/features/cms/components/CmsBodyRenderer.tsx`).
 *   - „page hat zentralen Body-Mount" = irgendeine .tsx-Datei unter
 *     src/features mountet CmsBodyRenderer/useCmsBody/
 *     renderPageSectionByType UND referenziert den page_key als String.
 *   - „page-spezifischer Renderer" = section_key wird wortwörtlich als
 *     String in irgendeiner .tsx-Datei unter src/features gefunden.
 *
 * Aufruf:
 *   node scripts/cms/rendertreue-audit.mjs           # Bericht
 *   node scripts/cms/rendertreue-audit.mjs --json    # JSON-Ausgabe
 *   node scripts/cms/rendertreue-audit.mjs --focus=produkte.hub
 *
 * Exit-Code: 0 immer (Diagnose-Tool, kein Build-Breaker).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://uvkubrrljyzfvbvejepl.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2a3VicnJsanl6ZnZidmVqZXBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMDgyMjcsImV4cCI6MjA5Mzg4NDIyN30.UL-toX5FHrIArab9wHCixmjlufkm7X6507Hf0ZYvb3s";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const focusArg = args.find((a) => a.startsWith("--focus="));
const focusPage = focusArg ? focusArg.split("=")[1] : null;

// --- 1. Renderer-Wissen aus Code ableiten ------------------------------------

const bodyRendererSrc = readFileSync(
  join(ROOT, "src/features/cms/components/CmsBodyRenderer.tsx"),
  "utf8",
);
const CENTRAL_RENDERERS = new Set(
  [...bodyRendererSrc.matchAll(/^\s*([a-z_0-9]+_v\d+)\s*:/gm)].map((m) => m[1]),
);
const SKIP_TYPES = new Set(["hero_v1"]);
// Bekannte Kind-Typen → werden vom Eltern-Container gerendert
const CHILD_TYPES = new Set([
  "card_v1",
  "stat_v1",
  "tab_v1",
  "faq_item_v1",
]);
// Bewusst page-spezifisch / nicht im zentralen Renderer
const KNOWN_SPECIAL_TYPES = new Set([
  "catalog_filter_grid_v1",
  "role_tabs_v1",
  "list_v1",
  "series_override_container_v1",
  "series_override_v1",
  "card_grid_v1",
]);

// --- 2. Code-Index aufbauen --------------------------------------------------

const PAGE_FILES = [];
const SCAN_ROOTS = ["src/features", "src/components", "src/navigation"];
for (const rootRel of SCAN_ROOTS) {
  (function walk(dir) {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      const p = join(dir, name);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else if (/\.(tsx|ts)$/.test(name) && !/\.test\.|\.stories\./.test(name)) {
        PAGE_FILES.push(p);
      }
    }
  })(join(ROOT, rootRel));
}

const CODE_BY_FILE = new Map();
for (const f of PAGE_FILES) CODE_BY_FILE.set(f, readFileSync(f, "utf8"));

const FILES_WITH_CENTRAL_BODY = PAGE_FILES.filter((f) =>
  /CmsBodyRenderer|useCmsBody|renderPageSectionByType/.test(
    CODE_BY_FILE.get(f),
  ),
);

const FILES_WITH_DYNAMIC_ITERATION = PAGE_FILES.filter((f) => {
  const c = CODE_BY_FILE.get(f);
  return (
    /cms\.sections\s*\.(filter|map|forEach|find|some|reduce)\b/.test(c) ||
    /for\s*\(\s*const\s+\w+\s+of\s+cms\.sections\b/.test(c)
  );
});

function pageHasCentralBodyMount(pageKey) {
  for (const f of FILES_WITH_CENTRAL_BODY) {
    const code = CODE_BY_FILE.get(f);
    if (code.includes(`"${pageKey}"`) || code.includes(`'${pageKey}'`)) {
      return f;
    }
  }
  return null;
}

function pageHasDynamicIteration(pageKey) {
  for (const f of FILES_WITH_DYNAMIC_ITERATION) {
    const code = CODE_BY_FILE.get(f);
    if (code.includes(`"${pageKey}"`) || code.includes(`'${pageKey}'`)) {
      return f;
    }
  }
  return null;
}

function sectionKeyReferencedInCode(sectionKey) {
  // Suche section_key als wortgrenzen-begrenzte Token-Sequenz.
  // Erlaubte Folgezeichen sind ", ', `, ., ,, ), ], }, Whitespace —
  // damit treffen wir `t("foo.bar")`, `cms.text("foo", "bar")`,
  // `text("foo")` und JSX-`data-cms-section="foo"`.
  const re = new RegExp(
    `["'\`]${sectionKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=["'\`.,)\\]} \\n])`,
  );
  for (const f of PAGE_FILES) {
    if (re.test(CODE_BY_FILE.get(f))) return f;
  }
  return null;
}

function sectionKeyPrefixHandledInCode(sectionKey) {
  // Erkennt Renderer, die per Prefix-Konvention über cms.sections iterieren
  // (z. B. PersonaSection mit "persona_", TuerkommunikationPage mit
  // "bereich_"). Heuristik: erste underscore-getrennte Komponente +
  // Underscore wird als String-Literal im Code gesucht.
  const m = sectionKey.match(/^([a-z]+_)/);
  if (!m) return null;
  const prefix = m[1];
  for (const f of PAGE_FILES) {
    const code = CODE_BY_FILE.get(f);
    if (code.includes(`"${prefix}"`) || code.includes(`'${prefix}'`)) return f;
  }
  return null;
}

// --- 3. DB laden -------------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function fetchAll(table, select, filterFn) {
  const all = [];
  let from = 0;
  const PAGE = 1000;
  for (;;) {
    let q = supabase.from(table).select(select).range(from, from + PAGE - 1);
    q = filterFn ? filterFn(q) : q;
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

const pages = await fetchAll(
  "cms_pages",
  "page_key,route_path,status,is_active",
  (q) => q.eq("is_active", true).eq("status", "published"),
);
const pageMap = new Map(pages.map((p) => [p.page_key, p]));

const sections = await fetchAll(
  "cms_sections",
  "page_key,section_key,section_type,sort_order,parent_section_id,is_active",
  (q) => q.eq("is_active", true),
);
const visibleSections = sections.filter((s) => pageMap.has(s.page_key));

// parent_section_id → parent section_key
const sectionByUidPerPage = new Map();
for (const s of visibleSections) {
  // section_uid steht nicht im select; wir mappen via id… aber wir haben id nicht.
  // Stattdessen: parent_section_key über zweite Abfrage rekonstruieren.
}
// Zweiter Pass: id-basiertes Parent-Mapping nachladen
const sectionsWithId = await fetchAll(
  "cms_sections",
  "id,page_key,section_key,parent_section_id",
  (q) => q.eq("is_active", true),
);
const idToKey = new Map(sectionsWithId.map((s) => [s.id, s.section_key]));
const keyToParentKey = new Map();
for (const s of sectionsWithId) {
  if (s.parent_section_id) {
    keyToParentKey.set(
      `${s.page_key}::${s.section_key}`,
      idToKey.get(s.parent_section_id) ?? null,
    );
  }
}

// --- 4. Klassifizieren -------------------------------------------------------

const classes = { R0: [], R1: [], R2: [], R3: [], R4: [], R5: [] };

for (const s of visibleSections) {
  const isChild = !!s.parent_section_id;
  const parentKey = keyToParentKey.get(`${s.page_key}::${s.section_key}`) ?? null;
  const type = s.section_type;

  const rec = {
    page_key: s.page_key,
    route_path: pageMap.get(s.page_key)?.route_path ?? null,
    section_key: s.section_key,
    section_type: type,
    parent_section_key: parentKey,
    sort_order: s.sort_order,
    is_top_level: !isChild,
  };

  // R2: hero_v1 oder bewusste Skip-Typen
  if (SKIP_TYPES.has(type)) {
    classes.R2.push({ ...rec, reason: "skip-type (hero/layout)" });
    continue;
  }

  // Kind-Section: delegiert an Eltern-Container
  if (isChild) {
    if (CHILD_TYPES.has(type)) {
      classes.R0.push({ ...rec, reason: `Kind von ${parentKey} (delegiert)` });
    } else {
      // unbekannter Kind-Typ – page-spezifisch?
      const specialFile = sectionKeyReferencedInCode(s.section_key);
      if (specialFile) {
        classes.R5.push({ ...rec, reason: `Spezialrenderer: ${rel(specialFile)}` });
      } else {
        classes.R3.push({ ...rec, reason: `Kind, Typ ${type} ohne bekannten Renderer` });
      }
    }
    continue;
  }

  // Top-Level: zentraler Renderer-Pfad
  if (CENTRAL_RENDERERS.has(type)) {
    const mountFile = pageHasCentralBodyMount(s.page_key);
    if (mountFile) {
      classes.R0.push({ ...rec, reason: `zentraler Renderer + Mount in ${rel(mountFile)}` });
    } else {
      // Standardtyp, aber Seite mountet zentralen Body nicht.
      // Variante a) page-spezifisch (section_key wörtlich referenziert)
      const specialFile = sectionKeyReferencedInCode(s.section_key);
      if (specialFile) {
        classes.R5.push({ ...rec, reason: `page-spezifisch: ${rel(specialFile)}` });
      } else {
        // Variante b) dynamische Iteration über cms.sections im Page-Code
        const dynFile = pageHasDynamicIteration(s.page_key);
        if (dynFile) {
          classes.R5.push({
            ...rec,
            reason: `dynamische Iteration über cms.sections in ${rel(dynFile)}`,
          });
        } else {
          // Variante c) Prefix-Renderer (z. B. persona_*, bereich_*)
          const prefixFile = sectionKeyPrefixHandledInCode(s.section_key);
          if (prefixFile) {
            classes.R5.push({
              ...rec,
              reason: `Prefix-Renderer in ${rel(prefixFile)}`,
            });
          } else {
            classes.R3.push({
              ...rec,
              reason: `Standardtyp ${type}, aber kein zentraler Body-Mount auf ${s.page_key} und section_key nicht im Code referenziert`,
            });
          }
        }
      }
    }
    continue;
  }

  // Bekannter Sondertyp
  if (KNOWN_SPECIAL_TYPES.has(type)) {
    const specialFile = sectionKeyReferencedInCode(s.section_key);
    if (specialFile) {
      classes.R5.push({ ...rec, reason: `Sondertyp ${type} → ${rel(specialFile)}` });
    } else {
      classes.R3.push({ ...rec, reason: `Sondertyp ${type} ohne Code-Referenz` });
    }
    continue;
  }

  // Unbekannter Typ
  const specialFile = sectionKeyReferencedInCode(s.section_key);
  if (specialFile) {
    classes.R5.push({ ...rec, reason: `unbekannter Typ ${type} → ${rel(specialFile)}` });
  } else {
    classes.R3.push({ ...rec, reason: `unbekannter Typ ${type}, keine Code-Referenz` });
  }
}

function rel(p) {
  return p.replace(ROOT + "/", "");
}

// --- 5. Ausgabe --------------------------------------------------------------

if (asJson) {
  console.log(JSON.stringify({ summary: summary(), classes }, null, 2));
} else {
  printReport();
}

function summary() {
  return {
    pages: pages.length,
    sections_active: visibleSections.length,
    R0: classes.R0.length,
    R1: classes.R1.length,
    R2: classes.R2.length,
    R3: classes.R3.length,
    R4: classes.R4.length,
    R5: classes.R5.length,
    central_renderers: [...CENTRAL_RENDERERS].sort(),
  };
}

function printReport() {
  const s = summary();
  console.log("=== Rendertreue-Audit (Tranche 16) ===");
  console.log(
    `Seiten geprüft: ${s.pages} · aktive Sections: ${s.sections_active}`,
  );
  console.log(
    `R0 OK: ${s.R0} · R1 OK-Container: ${s.R1} · R2 Skip/Legacy: ${s.R2} · R3 Risiko: ${s.R3} · R4 Fehler: ${s.R4} · R5 Spezialrenderer: ${s.R5}`,
  );
  console.log("Zentrale Renderer:", s.central_renderers.join(", "));

  if (focusPage) {
    console.log(`\n--- Fokus: ${focusPage} ---`);
    const all = Object.entries(classes).flatMap(([cls, rows]) =>
      rows.filter((r) => r.page_key === focusPage).map((r) => ({ cls, ...r })),
    );
    all.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    for (const r of all) {
      console.log(
        `  [${r.cls}] #${r.sort_order} ${r.section_key} (${r.section_type})` +
          (r.parent_section_key ? ` ← ${r.parent_section_key}` : "") +
          `\n        ${r.reason}`,
      );
    }
  }

  if (classes.R3.length) {
    console.log(`\n--- R3 RISIKO (${classes.R3.length}) ---`);
    const grouped = new Map();
    for (const r of classes.R3) {
      const k = `${r.page_key} (${r.section_type})`;
      if (!grouped.has(k)) grouped.set(k, []);
      grouped.get(k).push(r.section_key);
    }
    for (const [k, keys] of [...grouped].sort()) {
      console.log(`  ${k}: ${keys.join(", ")}`);
    }
  }

  if (classes.R4.length) {
    console.log(`\n--- R4 FEHLER (${classes.R4.length}) ---`);
    for (const r of classes.R4) {
      console.log(`  ${r.page_key} / ${r.section_key} (${r.section_type}): ${r.reason}`);
    }
  }

  console.log("\nFertig. Diagnose-Tool, blockt nicht. JSON-Variante: --json");
}
