#!/usr/bin/env node
/**
 * Eine-Wahrheit-Systemaudit · Teil A (read-only)
 *
 * Erzeugt eine vollständige Landkarte aller öffentlichen Seiten, Bausteine,
 * harten Sonderlogiken und CMS/Public-Sperren. KEINE Code- oder DB-Schreibwege.
 *
 * Pflichtartefakte (alle unter scripts/cms/output/):
 *   - seiten-klassifikation.{json,md}
 *   - bausteine-inventar.{json,md}
 *   - harte-sonderlogik.{json,md}
 *   - cms-public-sperren.{json,md}
 *
 * Quellen:
 *   - /tmp/pages.tsv, /tmp/sections.tsv, /tmp/fields.tsv, /tmp/whitelist.tsv
 *     (vorab via psql gezogen; siehe Header-Kommentar im Bericht)
 *   - src/features/** *.tsx (Routen + Page-Komponenten)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "scripts/cms/output");
const MIRROR = path.join(ROOT, "docs/04-betrieb/audit-snapshot");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(MIRROR, { recursive: true });
// Schreibt parallel in OUT (gitignored) und MIRROR (im Repo sichtbar, landet im Download-ZIP).
function writeBoth(name, content) {
  fs.writeFileSync(path.join(OUT, name), content);
  fs.writeFileSync(path.join(MIRROR, name), content);
}

// ---------- DB-Snapshots laden ----------
function readTsv(file, cols) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|");
      const row = {};
      cols.forEach((c, i) => (row[c] = parts[i]));
      return row;
    });
}
const pagesDb = readTsv("/tmp/pages.tsv", [
  "page_key",
  "route_path",
  "page_type",
  "status",
  "is_active",
  "title_de",
]);
const sectionsDb = readTsv("/tmp/sections.tsv", [
  "page_key",
  "section_key",
  "section_type",
  "is_active",
  "sort_order",
]);
const fieldsDb = readTsv("/tmp/fields.tsv", [
  "page_key",
  "section_key",
  "field_key",
  "locale",
  "has_v",
  "has_j",
]);
const whitelistDb = readTsv("/tmp/whitelist.tsv", [
  "page_key",
  "section_key",
  "field_key",
  "locale",
  "is_enabled",
]);

const pagesByKey = new Map(pagesDb.map((p) => [p.page_key, p]));
const pagesByRoute = new Map(pagesDb.filter((p) => p.route_path).map((p) => [p.route_path, p]));

const sectionsByPage = new Map();
for (const s of sectionsDb) {
  if (!sectionsByPage.has(s.page_key)) sectionsByPage.set(s.page_key, []);
  sectionsByPage.get(s.page_key).push(s);
}
const fieldsByPS = new Map();
for (const f of fieldsDb) {
  const k = `${f.page_key}|${f.section_key}`;
  if (!fieldsByPS.has(k)) fieldsByPS.set(k, new Set());
  fieldsByPS.get(k).add(f.field_key);
}
const whitelistByPSF = new Set();
const whitelistByPS = new Map();
for (const w of whitelistDb) {
  whitelistByPSF.add(`${w.page_key}|${w.section_key}|${w.field_key}`);
  const k = `${w.page_key}|${w.section_key}`;
  if (!whitelistByPS.has(k)) whitelistByPS.set(k, new Set());
  whitelistByPS.get(k).add(w.field_key);
}

// ---------- Routen-Discovery ----------
const FEATURES_DIR = path.join(ROOT, "src/features");
const routeFiles = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === "routes.tsx") routeFiles.push(p);
  }
}
walk(FEATURES_DIR);

const SRC = path.join(ROOT, "src");
function resolveImport(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  for (const ext of [".tsx", ".ts", "/index.tsx", "/index.ts"]) {
    if (fs.existsSync(base + ext)) return base + ext;
  }
  if (fs.existsSync(base)) return base;
  return null;
}

const routes = []; // {route, component, file, pageKeyProp, raw}
for (const rf of routeFiles) {
  const src = fs.readFileSync(rf, "utf8");
  const imports = {};
  const importRe = /import\s+([A-Za-z0-9_]+)\s+from\s+["']([^"']+)["']/g;
  let m;
  while ((m = importRe.exec(src))) imports[m[1]] = resolveImport(m[2], rf);

  const routeRe = /<Route\s+path=["']([^"']+)["']\s+element=\{([\s\S]*?)\}\s*\/>/g;
  while ((m = routeRe.exec(src))) {
    const routePath = m[1];
    const elem = m[2].trim();
    const compMatch = elem.match(/<([A-Za-z0-9_]+)/);
    const comp = compMatch ? compMatch[1] : "?";
    const pkMatch = elem.match(/pageKey=["']([^"']+)["']/);
    routes.push({
      route: routePath,
      component: comp,
      file: imports[comp] || null,
      pageKeyProp: pkMatch ? pkMatch[1] : null,
      isNavigate: comp === "Navigate",
      raw: elem.slice(0, 400),
      definedIn: path.relative(ROOT, rf),
    });
  }
}

// ---------- Page-Datei analysieren ----------
const PAGE_MARKERS = [
  ["GenericCmsPage", /GenericCmsPage/],
  ["CmsOnlyShell", /CmsOnlyShell/],
  ["CmsProductSolutionShell", /CmsProductSolutionShell/],
  ["CategoryListPage", /CategoryListPage/],
  ["CmsBodyRenderer", /CmsBodyRenderer/],
  ["renderPageSectionByType", /renderPageSectionByType/],
  ["useCmsBody", /useCmsBody/],
  ["useCmsI18n", /useCmsI18n/],
  ["useCmsPageContent", /useCmsPageContent/],
  ["usePersonaCms", /usePersonaCms/],
  ["useTranslation", /useTranslation\s*\(/],
];
const HARD_PATTERNS = [
  ["lokales_items_array", /const\s+items\s*=\s*\[/],
  ["lokale_linkmap", /linkMap\s*[:=]/],
  ["lokale_iconmap", /iconMap\s*[:=]/],
  ["hardcodierte_haeufung", /\bconst\s+(features|cards|teasers|sections|blocks)\s*=\s*\[[\s\S]{200,}/],
  ["formular_submit", /<form[^>]*onSubmit/],
  ["auth_supabase_signin", /supabase\.auth\.(signIn|signUp|signOut|resetPassword)/i],
];

function analyzePage(file) {
  if (!file || !fs.existsSync(file)) return null;
  const src = fs.readFileSync(file, "utf8");
  const markers = {};
  for (const [name, re] of PAGE_MARKERS) markers[name] = re.test(src);
  const hardHits = [];
  for (const [name, re] of HARD_PATTERNS) if (re.test(src)) hardHits.push(name);
  // page_key aus Quelltext (pageKey="..." in Komponente selbst, falls Wrapper)
  const pkMatches = [...src.matchAll(/pageKey=["']([^"']+)["']/g)].map((m) => m[1]);
  const pageKeyFromSrc = pkMatches[0] || null;
  return { markers, hardHits, src, pageKeyFromSrc, lines: src.split("\n").length };
}

// ---------- Seiten-Klassifikation ----------
const STANDARD_SHELLS = new Set([
  "GenericCmsPage",
  "CmsOnlyShell",
  "CmsProductSolutionShell",
]);
const DETAIL_SHELLS = new Set(["CmsProductSolutionShell"]);

const seitenKlassifikation = [];
const sonderlogikFunde = [];

for (const r of routes) {
  if (r.isNavigate) {
    seitenKlassifikation.push({
      route: r.route,
      page_key: null,
      klasse: "nicht_cms_route",
      renderer_komponente: "Navigate",
      renderer_datei: null,
      nutzt_generic_cms_page: false,
      nutzt_zentral_renderer: false,
      nutzt_custom_page_logik: false,
      hat_db_eintrag: false,
      anzahl_sections: 0,
      cms_steuerbar_prozent: null,
      begruendung: "Legacy-Slug-Redirect.",
      risiko: "gruen",
      empfehlung: "Belassen, Bestandslinks erreichbar halten.",
      definiert_in: r.definedIn,
    });
    continue;
  }
  const analysis = analyzePage(r.file);
  let pageKey = r.pageKeyProp || (analysis && analysis.pageKeyFromSrc) || null;
  if (!pageKey) {
    const p = pagesByRoute.get(r.route);
    if (p) pageKey = p.page_key;
  }
  const dbPage = pageKey ? pagesByKey.get(pageKey) : null;
  const sections = pageKey ? sectionsByPage.get(pageKey) || [] : [];
  const activeSections = sections.filter((s) => s.is_active === "t");

  const usesStandardShell =
    STANDARD_SHELLS.has(r.component) ||
    (analysis &&
      (analysis.markers.GenericCmsPage ||
        analysis.markers.CmsOnlyShell ||
        analysis.markers.CmsProductSolutionShell));
  const usesCentralRenderer =
    analysis &&
    (analysis.markers.CmsBodyRenderer ||
      analysis.markers.renderPageSectionByType ||
      analysis.markers.useCmsBody);
  const usesCmsHooks =
    analysis &&
    (analysis.markers.useCmsI18n ||
      analysis.markers.useCmsPageContent ||
      analysis.markers.usePersonaCms);
  const hasCustomLogic =
    analysis && (analysis.hardHits.length > 0 || (!usesStandardShell && !usesCentralRenderer));

  // Klassifizieren
  let klasse;
  let risiko = "gruen";
  let begruendung = [];
  let empfehlung = "";

  const isDetail =
    r.route.includes("/produkte/") ||
    r.route.split("/").filter(Boolean).length >= 2 &&
      (r.component === "CmsProductSolutionShell" ||
        /Detail/i.test(r.component) ||
        /:[a-zA-Z]/.test(r.route));

  if (!analysis) {
    klasse = "legacy_unklar";
    risiko = "rot";
    begruendung.push("Renderer-Datei konnte nicht aufgelöst werden.");
    empfehlung = "Datei-Auflösung manuell prüfen.";
  } else if (r.component === "CmsProductSolutionShell") {
    klasse = "detailseite";
    begruendung.push("Produkt-/Lösungsdetailseite über CmsProductSolutionShell.");
  } else if (r.component === "CmsOnlyShell" || r.component === "GenericCmsPage") {
    klasse = "standardseite";
    begruendung.push(`Reine CMS-Shell (${r.component}).`);
  } else if (r.component === "CategoryListPage") {
    klasse = "sonderseite_unregistriert";
    risiko = "gelb";
    begruendung.push(
      "Listen-Hub mit lokaler linkMap/externalActionMap — Verlinkungen sind hartcodiert."
    );
    empfehlung =
      "Linkziele in cms_section_fields (z. B. card_v1.link_1_href) heben; CategoryListPage als registrierte Sonderseite dokumentieren.";
  } else if (usesStandardShell) {
    klasse = "standardseite";
    begruendung.push("Wrapper um Standard-CMS-Shell.");
  } else if (usesCentralRenderer) {
    klasse = isDetail ? "detailseite" : "standardseite";
    begruendung.push("Eigene Komponente, aber zentraler Renderer.");
  } else if (usesCmsHooks && !analysis.hardHits.length) {
    klasse = "standardseite";
    risiko = "gelb";
    begruendung.push(
      "Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch."
    );
    empfehlung = "Auf GenericCmsPage / CmsBodyRenderer migrieren, sobald Sections-Vertrag erfüllt.";
  } else {
    // Heuristik für Sonderseiten
    const isKontakt = /\/kontakt/.test(r.route);
    const isAuth = /\/(login|register|registrieren|passwort)/i.test(r.route);
    const isLegal = /\/(impressum|datenschutz|agb)/i.test(r.route);
    const isFormy =
      analysis.hardHits.includes("formular_submit") ||
      analysis.hardHits.includes("auth_supabase_signin");
    if (isKontakt || isAuth || isLegal || isFormy) {
      klasse = "sonderseite_unregistriert";
      risiko = "gelb";
      begruendung.push(
        `Sonderseite (Kontakt/Auth/Recht/Formular). Hartfunde: ${analysis.hardHits.join(", ") || "–"}.`
      );
      empfehlung =
        "In sonderseiten-register aufnehmen; Inhaltsfelder schrittweise nach cms_section_fields heben.";
    } else {
      klasse = "sonderseite_unregistriert";
      risiko = "rot";
      begruendung.push(
        `Custom *Page ohne CMS-Shell. Hartfunde: ${analysis.hardHits.join(", ") || "keine"}.`
      );
      empfehlung =
        "Entscheiden: zu Standardbausteinen migrieren ODER als registrierte Sonderseite dokumentieren.";
    }
  }

  // cms_steuerbar_prozent grob schätzen
  let cmsPct = null;
  if (activeSections.length) {
    let fieldsTotal = 0;
    let fieldsCovered = 0;
    for (const s of activeSections) {
      const k = `${s.page_key}|${s.section_key}`;
      const wl = whitelistByPS.get(k) || new Set();
      const fl = fieldsByPS.get(k) || new Set();
      const all = new Set([...wl, ...fl]);
      fieldsTotal += all.size;
      for (const f of all) if (wl.has(f) && fl.has(f)) fieldsCovered += 1;
    }
    cmsPct = fieldsTotal ? Math.round((fieldsCovered / fieldsTotal) * 100) : null;
  }
  if (klasse === "sonderseite_unregistriert" && cmsPct === null) cmsPct = 0;
  if (klasse === "standardseite" && cmsPct !== null && cmsPct < 60) {
    risiko = risiko === "gruen" ? "gelb" : risiko;
    begruendung.push(`CMS-Abdeckung niedrig (${cmsPct}%).`);
  }

  seitenKlassifikation.push({
    route: r.route,
    page_key: pageKey,
    klasse,
    renderer_komponente: r.component,
    renderer_datei: r.file ? path.relative(ROOT, r.file) : null,
    nutzt_generic_cms_page: !!(analysis && analysis.markers.GenericCmsPage),
    nutzt_zentral_renderer: !!usesCentralRenderer,
    nutzt_custom_page_logik: !!hasCustomLogic,
    hat_db_eintrag: !!dbPage,
    anzahl_sections: activeSections.length,
    cms_steuerbar_prozent: cmsPct,
    begruendung: begruendung.join(" "),
    risiko,
    empfehlung,
    definiert_in: r.definedIn,
  });

  if (analysis && analysis.hardHits.length) {
    sonderlogikFunde.push({
      datei: r.file ? path.relative(ROOT, r.file) : null,
      route: r.route,
      page_key: pageKey,
      art: analysis.hardHits,
      legitim_vermutet: /\/(kontakt|login|register|passwort|impressum|datenschutz|agb)/i.test(
        r.route
      ),
      empfehlung:
        klasse === "sonderseite_unregistriert"
          ? "Als Sonderseite registrieren ODER auf Standardbausteine migrieren."
          : "Hartcodierte Daten nach cms_section_fields heben.",
    });
  }
}

// ---------- Bausteine-Inventar ----------
const RENDERER_DIR = path.join(SRC, "features/cms/components/sections");
const rendererFiles = fs.existsSync(RENDERER_DIR) ? fs.readdirSync(RENDERER_DIR) : [];
const SECTION_RENDERER_REGISTRY = (() => {
  // Aus CmsBodyRenderer.tsx ableiten
  const f = path.join(SRC, "features/cms/components/CmsBodyRenderer.tsx");
  if (!fs.existsSync(f)) return {};
  const src = fs.readFileSync(f, "utf8");
  const map = {};
  // Form 1: section_type: ComponentName
  for (const m of src.matchAll(/["']?([a-z_]+_v1)["']?\s*:\s*([A-Z][A-Za-z0-9_]+)\b/g)) {
    map[m[1]] = m[2];
  }
  // Form 2: section_type: (ctx) => <Component .../> – Komponentenname aus JSX ziehen
  for (const m of src.matchAll(/\b([a-z_]+_v1)\s*:\s*\([^)]*\)\s*=>\s*<([A-Z][A-Za-z0-9_]+)/g)) {
    map[m[1]] = m[2];
  }
  // Form 3: bloße Erwähnung als Renderer-Key (auch ohne aufgelösten Komponentennamen)
  for (const m of src.matchAll(/\b([a-z_]+_v1)\s*:\s*\(/g)) {
    if (!map[m[1]]) map[m[1]] = "(inline)";
  }
  return map;
})();

const typeCounts = {};
const typeActive = {};
for (const s of sectionsDb) {
  typeCounts[s.section_type] = (typeCounts[s.section_type] || 0) + 1;
  if (s.is_active === "t") typeActive[s.section_type] = (typeActive[s.section_type] || 0) + 1;
}

const bausteineInventar = Object.keys(typeCounts)
  .sort()
  .map((st) => {
    const renderer = SECTION_RENDERER_REGISTRY[st] || null;
    const hasRenderer = !!renderer || rendererFiles.some((f) => f.toLowerCase().includes(st.replace(/_/g, "")));
    const aktive = typeActive[st] || 0;
    let status = "gruen";
    const hinweise = [];
    if (!hasRenderer) {
      status = "rot";
      hinweise.push("Kein registrierter Renderer im CmsBodyRenderer.");
    }
    if (aktive === 0) {
      status = status === "rot" ? "rot" : "gelb";
      hinweise.push("Keine aktiven Instanzen in DB.");
    }
    return {
      section_type: st,
      anzahl_total: typeCounts[st],
      anzahl_aktiv: aktive,
      oeffentlicher_renderer: renderer,
      renderer_registriert: hasRenderer,
      status,
      hinweise,
    };
  });

// ---------- CMS/Public-Sperren ----------
const sperren = [];

// 1) Whitelist-Eintrag, aber Section/Page nicht aktiv
for (const w of whitelistDb) {
  const dbP = pagesByKey.get(w.page_key);
  if (!dbP) {
    sperren.push({
      typ: "whitelist_ohne_page",
      page_key: w.page_key,
      section_key: w.section_key,
      field_key: w.field_key,
      bedeutung: "Whitelist-Eintrag verweist auf nicht-existente Page.",
    });
  }
}
// 2) DB-Wert vorhanden, Whitelist fehlt
const seenMissingWl = new Set();
for (const f of fieldsDb) {
  if (f.has_v !== "1" && f.has_j !== "1") continue;
  const key = `${f.page_key}|${f.section_key}|${f.field_key}`;
  if (whitelistByPSF.has(key)) continue;
  if (seenMissingWl.has(key)) continue;
  seenMissingWl.add(key);
  sperren.push({
    typ: "wert_ohne_whitelist",
    page_key: f.page_key,
    section_key: f.section_key,
    field_key: f.field_key,
    bedeutung: "Inhalt liegt in DB, Admin kann nicht pflegen (Whitelist fehlt).",
  });
}
// 3) Whitelist-Eintrag, aber Section existiert nicht
const sectionExists = new Set(sectionsDb.map((s) => `${s.page_key}|${s.section_key}`));
const seenOrphanWl = new Set();
for (const w of whitelistDb) {
  const k = `${w.page_key}|${w.section_key}`;
  if (sectionExists.has(k)) continue;
  if (seenOrphanWl.has(k)) continue;
  seenOrphanWl.add(k);
  sperren.push({
    typ: "whitelist_ohne_section",
    page_key: w.page_key,
    section_key: w.section_key,
    field_key: "*",
    bedeutung: "Whitelist erlaubt Pflege, Section existiert aber nicht in cms_sections.",
  });
}
// 4) Section-Typ ohne registrierten Renderer
for (const b of bausteineInventar) {
  if (!b.renderer_registriert) {
    sperren.push({
      typ: "section_type_ohne_renderer",
      page_key: "*",
      section_key: "*",
      field_key: b.section_type,
      bedeutung: `Section-Typ ${b.section_type} hat ${b.anzahl_aktiv} aktive Instanzen, aber keinen registrierten zentralen Renderer.`,
    });
  }
}
// 5) Sonderseiten ohne CMS-Page-Eintrag
for (const r of seitenKlassifikation) {
  if (r.klasse === "sonderseite_unregistriert" && !r.hat_db_eintrag) {
    sperren.push({
      typ: "sonderseite_ohne_cms_page",
      page_key: r.page_key || `(route:${r.route})`,
      section_key: "-",
      field_key: "-",
      bedeutung: `${r.route} ist Sonderseite und hat keinen Eintrag in cms_pages — Inhalte ausschließlich im Code.`,
    });
  }
}

// ---------- Export-/Privatserver-Risiko ----------
const exportRisiko = sonderlogikFunde.map((s) => ({
  datei: s.datei,
  route: s.route,
  art: s.art,
  liegt_in_code: true,
  liegt_in_migration: false,
  liegt_in_audit_script: false,
  haengt_an_lovable_admin: false,
  hinweis:
    "Sonderlogik nur im React-Code — bei Server-Migration ohne Lovable-Admin nachbaubar, aber nicht im Migrations-Pfad dokumentiert.",
}));

// ---------- Schreiben ----------
function writeJson(name, data) {
  writeBoth(name + ".json", JSON.stringify(data, null, 2));
}

writeJson("seiten-klassifikation", seitenKlassifikation);
writeJson("bausteine-inventar", bausteineInventar);
writeJson("harte-sonderlogik", { funde: sonderlogikFunde, export_risiko: exportRisiko });
writeJson("cms-public-sperren", sperren);

// ---------- Markdown-Berichte ----------
const counts = seitenKlassifikation.reduce(
  (acc, r) => {
    acc[r.klasse] = (acc[r.klasse] || 0) + 1;
    acc._risiko[r.risiko] = (acc._risiko[r.risiko] || 0) + 1;
    return acc;
  },
  { _risiko: {} }
);

function mdTable(headers, rows) {
  return [
    "| " + headers.join(" | ") + " |",
    "| " + headers.map(() => "---").join(" | ") + " |",
    ...rows.map((r) => "| " + r.map((c) => String(c ?? "").replace(/\|/g, "\\|")).join(" | ") + " |"),
  ].join("\n");
}

// seiten-klassifikation.md
{
  const groups = {};
  for (const r of seitenKlassifikation) {
    if (!groups[r.klasse]) groups[r.klasse] = [];
    groups[r.klasse].push(r);
  }
  const klasseOrder = [
    "standardseite",
    "detailseite",
    "sonderseite_registriert",
    "sonderseite_unregistriert",
    "legacy_unklar",
    "nicht_cms_route",
  ];
  const lines = [
    "# Seiten-Klassifikation (Teil A1)",
    "",
    "_Read-only Inventar. Keine Code-/DB-Änderungen._",
    "",
    "## Übersicht",
    "",
    mdTable(
      ["Klasse", "Anzahl"],
      klasseOrder.filter((k) => groups[k]).map((k) => [k, groups[k].length])
    ),
    "",
    `Risiko: grün ${counts._risiko.gruen || 0} · gelb ${counts._risiko.gelb || 0} · rot ${counts._risiko.rot || 0}`,
    "",
  ];
  for (const k of klasseOrder) {
    if (!groups[k]) continue;
    lines.push(`## ${k} (${groups[k].length})`);
    lines.push("");
    lines.push(
      mdTable(
        ["route", "page_key", "renderer", "sections", "cms_%", "risiko", "begründung"],
        groups[k]
          .sort((a, b) => a.route.localeCompare(b.route))
          .map((r) => [
            r.route,
            r.page_key || "—",
            r.renderer_komponente,
            r.anzahl_sections,
            r.cms_steuerbar_prozent ?? "—",
            r.risiko,
            r.begruendung,
          ])
      )
    );
    lines.push("");
  }
  writeBoth("seiten-klassifikation.md", lines.join("\n"));
}

// bausteine-inventar.md
{
  const lines = [
    "# Bausteine-Inventar (Teil A4)",
    "",
    mdTable(
      ["section_type", "aktiv", "gesamt", "renderer", "registriert", "status", "hinweise"],
      bausteineInventar.map((b) => [
        b.section_type,
        b.anzahl_aktiv,
        b.anzahl_total,
        b.oeffentlicher_renderer || "—",
        b.renderer_registriert ? "ja" : "NEIN",
        b.status,
        b.hinweise.join(" · ") || "—",
      ])
    ),
    "",
  ];
  writeBoth("bausteine-inventar.md", lines.join("\n"));
}

// harte-sonderlogik.md
{
  const lines = [
    "# Harte Sonderlogik (Teil A5)",
    "",
    `Funde: ${sonderlogikFunde.length}`,
    "",
    mdTable(
      ["datei", "route", "page_key", "arten", "legitim?", "empfehlung"],
      sonderlogikFunde.map((s) => [
        s.datei || "—",
        s.route,
        s.page_key || "—",
        s.art.join(", "),
        s.legitim_vermutet ? "ja" : "?",
        s.empfehlung,
      ])
    ),
    "",
    "## Export-/Privatserver-Risiko (A7)",
    "",
    mdTable(
      ["datei", "in_code", "in_migration", "in_audit_script", "an_lovable_admin", "hinweis"],
      exportRisiko.map((e) => [
        e.datei || "—",
        e.liegt_in_code ? "ja" : "—",
        e.liegt_in_migration ? "ja" : "—",
        e.liegt_in_audit_script ? "ja" : "—",
        e.haengt_an_lovable_admin ? "ja" : "—",
        e.hinweis,
      ])
    ),
    "",
  ];
  writeBoth("harte-sonderlogik.md", lines.join("\n"));
}

// cms-public-sperren.md
{
  const byTyp = {};
  for (const s of sperren) (byTyp[s.typ] ||= []).push(s);
  const lines = ["# CMS/Public-Sperren (Teil A6)", ""];
  for (const [typ, arr] of Object.entries(byTyp).sort()) {
    lines.push(`## ${typ} (${arr.length})`);
    lines.push("");
    lines.push(
      mdTable(
        ["page_key", "section_key", "field_key", "bedeutung"],
        arr.slice(0, 200).map((s) => [s.page_key, s.section_key, s.field_key, s.bedeutung])
      )
    );
    if (arr.length > 200) lines.push(`\n_… ${arr.length - 200} weitere Einträge in JSON._`);
    lines.push("");
  }
  writeBoth("cms-public-sperren.md", lines.join("\n"));
}

// ---------- A8: Management-Zusammenfassung ----------
const sonderUnreg = seitenKlassifikation.filter((r) => r.klasse === "sonderseite_unregistriert");
const standard = seitenKlassifikation.filter((r) => r.klasse === "standardseite");
const detail = seitenKlassifikation.filter((r) => r.klasse === "detailseite");
const legacy = seitenKlassifikation.filter((r) => r.klasse === "legacy_unklar");
const navigates = seitenKlassifikation.filter((r) => r.klasse === "nicht_cms_route");

const ampel =
  counts._risiko.rot > 0 ? "rot" : counts._risiko.gelb > 0 ? "gelb" : "gruen";

const top10 = [
  ...sperren.filter((s) => s.typ === "section_type_ohne_renderer"),
  ...sperren.filter((s) => s.typ === "sonderseite_ohne_cms_page").slice(0, 5),
  ...seitenKlassifikation.filter((r) => r.risiko === "rot").slice(0, 5),
].slice(0, 10);

const mgmt = [
  "# Eine-Wahrheit-Systemaudit · Management-Zusammenfassung (Teil A8)",
  "",
  "_Read-only Lauf. Quelle: Live-DB-Dump (psql) + Code-Scan unter `src/features/**`._",
  "",
  `**Gesamtstatus:** \`${ampel}\``,
  "",
  "## Zahlen",
  "",
  mdTable(
    ["Kennzahl", "Wert"],
    [
      ["Standardseiten", standard.length],
      ["Detailseiten", detail.length],
      ["Sonderseiten (unregistriert)", sonderUnreg.length],
      ["Sonderseiten (registriert)", (counts.sonderseite_registriert || 0)],
      ["Legacy/unklar", legacy.length],
      ["Redirects (Navigate)", navigates.length],
      ["Harte Sonderlogik-Funde", sonderlogikFunde.length],
      ["CMS/Public-Sperren gesamt", sperren.length],
      ["… davon `wert_ohne_whitelist`", sperren.filter((s) => s.typ === "wert_ohne_whitelist").length],
      ["… davon `whitelist_ohne_section`", sperren.filter((s) => s.typ === "whitelist_ohne_section").length],
      ["… davon `whitelist_ohne_page`", sperren.filter((s) => s.typ === "whitelist_ohne_page").length],
      ["… davon `section_type_ohne_renderer`", sperren.filter((s) => s.typ === "section_type_ohne_renderer").length],
      ["… davon `sonderseite_ohne_cms_page`", sperren.filter((s) => s.typ === "sonderseite_ohne_cms_page").length],
      ["Risiko grün/gelb/rot (Seiten)", `${counts._risiko.gruen || 0} / ${counts._risiko.gelb || 0} / ${counts._risiko.rot || 0}`],
    ]
  ),
  "",
  "## Top-Risiken",
  "",
  mdTable(
    ["Typ", "Ziel", "Bedeutung/Begründung"],
    top10.map((x) => [
      x.typ || x.klasse,
      x.page_key || x.route || "—",
      x.bedeutung || x.begruendung || "—",
    ])
  ),
  "",
  "## Vorschlag für Teil B (zur fachlichen Entscheidung)",
  "",
  "### Als registrierte Sonderseite dokumentieren",
  ...sonderUnreg
    .filter((r) => /\/(kontakt|impressum|datenschutz|agb|login|register|passwort)/i.test(r.route))
    .map((r) => `- ${r.route} (${r.renderer_komponente})`),
  "",
  "### Auf Standardbausteine migrieren prüfen",
  ...sonderUnreg
    .filter((r) => !/\/(kontakt|impressum|datenschutz|agb|login|register|passwort)/i.test(r.route))
    .map((r) => `- ${r.route} (${r.renderer_komponente}) — ${r.begruendung}`),
  "",
  "### Noch fehlende Gates / Folge-Audits",
  "- Gate `gate-sonderseiten-register.mjs`: jede `*Page.tsx`, die nicht in `sonderseiten-register.json` steht und kein Standard-Shell nutzt, lässt CI rot werden.",
  "- Gate `gate-section-type-renderer.mjs`: jeder aktive `section_type` ohne registrierten Renderer = rot.",
  "- Gate `gate-whitelist-coverage.mjs` strikt: `wert_ohne_whitelist` > 0 → rot (statt nur Bericht).",
  "",
  "### Prototyp-Blocker",
  counts._risiko.rot > 0
    ? `- ${counts._risiko.rot} Seiten mit Risiko rot — Prototyp-Abnahme nicht „eine Wahrheit".`
    : "- Keine roten Seiten.",
  sperren.filter((s) => s.typ === "section_type_ohne_renderer").length
    ? "- Aktive Section-Typen ohne Renderer (siehe cms-public-sperren.md)."
    : "- Alle aktiven Section-Typen haben einen Renderer.",
  "",
  "_Wenn diese Liste passt: Teil B startet erst, nachdem du je Sonderseite entschieden hast: registrieren · migrieren · archivieren._",
  "",
];
writeBoth("eine-wahrheit-management.md", mgmt.join("\n"));

// ---------- Stdout ----------
console.log("OK · Eine-Wahrheit-Systemaudit · Teil A");
console.log("  Seiten:", seitenKlassifikation.length);
console.log("  Standard:", standard.length, "· Detail:", detail.length, "· Sonder:", sonderUnreg.length, "· Legacy:", legacy.length, "· Navigate:", navigates.length);
console.log("  Bausteine:", bausteineInventar.length);
console.log("  Sonderlogik-Funde:", sonderlogikFunde.length);
console.log("  CMS/Public-Sperren:", sperren.length);
console.log("  Gesamt-Ampel:", ampel);
console.log("Artefakte unter scripts/cms/output/");
