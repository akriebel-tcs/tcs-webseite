#!/usr/bin/env node
/**
 * public-blocks-ignorieren-admin-visibility.mjs  (Etappe D2b.2)
 *
 * READ-ONLY. Erzeugt das globale Inventar fuer die Gegenrichtung der
 * Spiegel-Regel:
 *
 *   "Admin/DB ist ausgeblendet, aber Public zeigt trotzdem etwas."
 *
 * Zwei Befundklassen:
 *
 *   PUBLIC_BLOCK_IGNORIERT_DB_VISIBILITY
 *     Eine CMS-Section mit gleichem section_key existiert in der DB,
 *     der Public-Code rendert den Block aber hartcodiert
 *     (via t("<rootPrefix>.<section_key>.…") oder
 *     <ContentSection> + section_key-Marker), ohne den is_active-Wert
 *     der Section zu pruefen. Schalten im Admin hat keine Wirkung.
 *
 *   PUBLIC_BLOCK_OHNE_DB_BINDUNG
 *     Der Public-Code rendert einen erkennbaren Block (t-Aufruf mit
 *     "<rootPrefix>.<key>.…"), zu dem ueberhaupt keine DB-Section
 *     existiert. Schwaecherer Befund — Admin kann hier nichts steuern,
 *     aber Inhalt ist still im Code.
 *
 * Heuristik (regex-basiert, mit confidence-Level):
 *
 *   - Page-Datei wird via Regex eingelesen. Aus useCmsI18n(pageKey, ns,
 *     rootPrefix) wird rootPrefix extrahiert. Fallback: "root".
 *   - Fuer jede DB-Section der Page wird im Source nach folgenden
 *     Markern gesucht:
 *       * t("<rootPrefix>.<section_key>.…")
 *       * t(`<rootPrefix>.<section_key>.…`)
 *       * "<section_key>" in einem <ContentSection>- oder JSX-Kontext,
 *         in dem kein renderPageSectionByType-Aufruf in 8 Zeilen
 *         Umkreis steht.
 *   - Wird ein Marker gefunden, wird geprueft, ob in derselben Datei
 *     ein cms.sections.find/some/filter-Aufruf mit demselben
 *     section_key existiert (= Hinweis auf Visibility-Gating).
 *
 *   - Confidence:
 *       high   — Marker gefunden, kein passender find/some/filter im File
 *       medium — Marker gefunden, find/some/filter existiert, aber Block
 *                liegt nicht innerhalb dieses Gate-Blocks (Heuristik per
 *                Zeilenabstand)
 *       low    — Marker gefunden, find/some/filter direkt im Umkreis
 *                (mutmasslich korrekt gegated)
 *
 * Inputs:
 *   - src/features/** /pages/*Page.tsx
 *   - DB:  cms_pages / cms_sections (alle Top-Level-Sections,
 *          aktiv und inaktiv)
 *
 * Outputs:
 *   - docs/04-betrieb/audit-snapshot/public-blocks-ignorieren-admin-visibility.json
 *   - docs/04-betrieb/audit-snapshot/public-blocks-ignorieren-admin-visibility.md
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const PAGES_GLOB_ROOT = path.join(ROOT, "src/features");
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

const read = (p) => fs.readFile(p, "utf8");

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractPageKey(src) {
  const patterns = [
    /<GenericCmsPage[^>]*pageKey=["']([^"']+)["']/,
    /<CmsPageLayout[^>]*pageKey=["']([^"']+)["']/,
    /useCmsI18n\(\s*["']([^"']+)["']/,
    /useCmsPageContent\(\s*["']([^"']+)["']/,
    /pageKey:\s*["']([^"']+)["']/,
    /pageKey=["']([^"']+)["']/,
    /data-cms-page=["']([^"']+)["']/,
  ];
  for (const re of patterns) {
    const m = src.match(re);
    if (m) return m[1];
  }
  return null;
}

function extractRootPrefix(src) {
  // useCmsI18n("pageKey", "namespace", "rootPrefix")
  const m = src.match(/useCmsI18n\(\s*["'][^"']+["']\s*,\s*["'][^"']+["']\s*,\s*["']([^"']+)["']/);
  return m ? m[1] : "root";
}

function lineOf(src, idx) {
  return src.slice(0, idx).split("\n").length;
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

function loadAllTopSections() {
  // Alle Top-Level Sections (auch is_active=false), nur fuer veroeffentlichte
  // Seiten — fuer alles andere kann der Admin sowieso nichts steuern.
  const rows = psql(`
    select s.page_key, s.section_key, coalesce(s.section_type,''),
           s.is_active, s.sort_order, s.section_uid
    from cms_sections s
    join cms_pages p on p.page_key = s.page_key
    where s.parent_section_id is null
      and p.status = 'published' and p.is_active = true
    order by s.page_key, s.sort_order, s.section_key;
  `);
  const map = new Map();
  for (const [pk, sk, st, isA, so, uid] of rows) {
    if (!map.has(pk)) map.set(pk, []);
    map.get(pk).push({
      section_key: sk,
      section_type: st,
      is_active: isA === "t" || isA === "true",
      sort_order: Number(so),
      section_uid: Number(uid),
    });
  }
  return map;
}

/* --------------------------- detection --------------------------- */

function findMarkers(src, rootPrefix, sectionKey) {
  const markers = [];
  const sk = escapeRe(sectionKey);
  const rp = escapeRe(rootPrefix);

  // t("<rootPrefix>.<section_key>.…") oder t(`<rootPrefix>.<section_key>.…`)
  const tReDouble = new RegExp(`t\\(\\s*["\`]${rp}\\.${sk}\\.`, "g");
  let m;
  while ((m = tReDouble.exec(src)) !== null) {
    markers.push({ kind: "i18n_t_call", line: lineOf(src, m.index), snippet: src.substr(m.index, 60).replace(/\n.*/s, "") });
    if (markers.length > 5) break;
  }

  // data-cms-section="<section_key>"
  const dataRe = new RegExp(`data-cms-section=["']${sk}["']`, "g");
  while ((m = dataRe.exec(src)) !== null) {
    markers.push({ kind: "data_cms_section", line: lineOf(src, m.index), snippet: src.substr(m.index, 60).replace(/\n.*/s, "") });
  }

  return markers;
}

function hasGate(src, sectionKey) {
  // Prueft, ob die Datei irgendwo `cms.sections.find/some/filter` mit
  // diesem section_key benutzt — heuristisch als Visibility-Gate.
  const sk = escapeRe(sectionKey);
  const reFind = new RegExp(
    `cms\\.sections\\.(find|some|filter)\\([^)]*section_key\\s*===\\s*["']${sk}["']`,
    "s",
  );
  if (reFind.test(src)) return true;

  // Batch 1 — zentraler Hero-Guard:
  // Wenn die Seite ueber `CmsPageLayout` oder `GenericCmsPage` laeuft, wird
  // die Hero-Section zentral in `CmsPageLayout` (siehe `hideHero`-Logik)
  // an `cms.sections` gebunden. Hero gilt damit als gegated.
  if (sectionKey === "hero") {
    if (/from\s+["']@\/features\/cms\/components\/CmsPageLayout["']/.test(src)) return true;
    if (/from\s+["']@\/features\/cms\/components\/GenericCmsPage["']/.test(src)) return true;
  }

  // Batch 19 — zentraler Anwendungs-Guard:
  // `AnwendungDetailPage` gated die 4 Standard-Sections (anforderungen,
  // leistungen, systembausteine, broschure) zentral an `cms.sections`.
  // Seiten, die ueber diese Komponente rendern und einen pageKey uebergeben,
  // gelten fuer diese 4 Keys als gegated.
  const ANWENDUNG_CENTRAL_GATED = new Set(["anforderungen", "leistungen", "systembausteine", "broschure"]);
  if (ANWENDUNG_CENTRAL_GATED.has(sectionKey)) {
    const usesAnwendungDetail = /from\s+["'][^"']*AnwendungDetailPage["']/.test(src)
      || /<AnwendungDetailPage[^>]*pageKey=/.test(src);
    if (usesAnwendungDetail) return true;
  }

  return false;
}

function isHandledByRestRenderer(src, sectionKey) {
  // Section steht in der handledSectionKeys-Whitelist — d. h. der
  // Rest-Renderer ueberspringt sie bewusst, aber der hartcodierte Block
  // davor laeuft trotzdem.
  const setBlock =
    src.match(/handledSectionKeys\s*=\s*new Set<[^>]*>?\(\[([\s\S]*?)\]\)/) ??
    src.match(/handledSectionKeys\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
  if (!setBlock) return false;
  return setBlock[1].includes(`"${sectionKey}"`) || setBlock[1].includes(`'${sectionKey}'`);
}

/* --------------------------- main --------------------------- */

(async () => {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const allFiles = await walk(PAGES_GLOB_ROOT);
  const pageFiles = allFiles.filter((p) => /\/pages\/[^/]+Page\.tsx$/.test(p));

  const dbAll = loadAllTopSections();

  const findings = [];
  const ohneBindung = [];

  for (const file of pageFiles.sort()) {
    const rel = path.relative(ROOT, file);
    const src = await read(file);
    const pageKey = extractPageKey(src);
    if (!pageKey) continue;
    const rootPrefix = extractRootPrefix(src);
    const dbSections = dbAll.get(pageKey) ?? [];

    // 1) Klasse A: DB-Section existiert, Public-Block hartcodiert
    for (const sec of dbSections) {
      const markers = findMarkers(src, rootPrefix, sec.section_key);
      if (markers.length === 0) continue;

      const gate = hasGate(src, sec.section_key);
      const inRestWhitelist = isHandledByRestRenderer(src, sec.section_key);

      // Confidence
      let confidence;
      if (!sec.is_active && !gate) confidence = "high";
      else if (sec.is_active && !gate) confidence = "medium";
      else confidence = "low";

      // Skip low+active — das ist vermutlich ein DB-getriebener Renderer
      // ueber cms.sections, kein hartcodierter Block.
      if (confidence === "low" && sec.is_active) continue;

      findings.push({
        finding_class: "PUBLIC_BLOCK_IGNORIERT_DB_VISIBILITY",
        confidence,
        page_key: pageKey,
        page_file: rel,
        section_key: sec.section_key,
        section_type: sec.section_type,
        section_uid: sec.section_uid,
        db_is_active: sec.is_active,
        has_visibility_gate: gate,
        in_rest_renderer_whitelist: inRestWhitelist,
        markers,
        bewertung:
          confidence === "high"
            ? "Blocker: Admin-Schalter steht auf aus, Public zeigt trotzdem."
            : confidence === "medium"
              ? "Kandidat: Admin-Schalter steht auf an, ist aber wirkungslos — Aus-Schalten haette keinen Effekt."
              : "Vermutlich gegated; Heuristik unsicher.",
      });
    }

    // 2) Klasse B: Hartcodierter t-Block ohne DB-Gegenpart
    // Sammle alle t("<rootPrefix>.<key>.…") und prüfe, ob <key> in dbSections vorkommt.
    const rp = escapeRe(rootPrefix);
    const tAny = new RegExp(`t\\(\\s*["\`]${rp}\\.([a-zA-Z0-9_]+)\\.`, "g");
    const keysFound = new Set();
    let m;
    while ((m = tAny.exec(src)) !== null) keysFound.add(m[1]);

    const dbKeys = new Set(dbSections.map((s) => s.section_key));
    // Bekannte i18n-only Top-Level-Keys, die keine Sections sind (hero/cta
    // laufen global) — diese sind erwartete Fallbacks.
    const expectedTopLevel = new Set(["hero", "common", "page", "meta", "seo"]);
    // Batch 19 — KNOWN_HARDCODED_OK:
    // Infrastruktur- und Helper-Keys, die bewusst kein CMS-Section sind und
    // auch nicht als Restschuld zaehlen. Diese decken Layout-/Navigations-
    // Helpers (Listen, Not-Found, CTA-Wrapper, parkierte Bereiche) ab und
    // sind durch eine getrennte Quelle (Code/Konfig/anderes CMS) gepflegt.
    const KNOWN_HARDCODED_OK = new Map([
      // pageKey -> Set<hardcoded_key>; "*" = alle pageKeys
      ["anwendungen.referenzen.detail", new Set(["notFound", "sections", "cta"])],
      ["anwendungen.referenzprojekte", new Set(["projekte"])],
      ["eingangssysteme.root", new Set(["discover"])],
      ["gebaeudekommunikation.root", new Set(["bereiche"])],
      ["gebaeudemanagement.root", new Set(["functions"])],
      ["serviceportal.login", new Set(["sections"])],
    ]);
    // Batch 19 — Anwendungs-Standardkeys: AnwendungDetailPage gated diese 4
    // Keys zentral an `cms.sections`. Ist die DB-Section vorhanden, wird der
    // Block sichtbar; ist sie nicht vorhanden, bleibt er versteckt. Beides
    // ist Admin-gesteuert, der hartcodierte t-Fallback ist nur Inhalt fuer
    // den Renderer.
    const ANWENDUNG_STANDARD_KEYS = new Set(["anforderungen", "leistungen", "systembausteine", "broschure"]);
    const usesAnwendungDetail = /from\s+["'][^"']*AnwendungDetailPage["']/.test(src);
    const okSet = KNOWN_HARDCODED_OK.get(pageKey);
    for (const k of keysFound) {
      if (dbKeys.has(k)) continue;
      if (expectedTopLevel.has(k)) continue;
      if (okSet && okSet.has(k)) continue;
      if (usesAnwendungDetail && ANWENDUNG_STANDARD_KEYS.has(k)) continue;
      ohneBindung.push({
        finding_class: "PUBLIC_BLOCK_OHNE_DB_BINDUNG",
        confidence: "medium",
        page_key: pageKey,
        page_file: rel,
        i18n_root: rootPrefix,
        hardcoded_key: k,
        bewertung:
          "Block wird ueber i18n-Pfad gerendert, fuer den keine CMS-Section existiert — Admin kann hier nichts steuern.",
      });
    }
  }


  const highList = findings.filter((f) => f.confidence === "high");
  const mediumList = findings.filter((f) => f.confidence === "medium");
  const lowList = findings.filter((f) => f.confidence === "low");

  const summary = {
    generated_at: new Date().toISOString(),
    counts: {
      total_page_files: pageFiles.length,
      public_block_ignoriert_db_visibility: findings.length,
      davon_high_blocker_rot: highList.length,
      davon_medium_kandidat_gelb: mediumList.length,
      davon_low_vermutlich_gegated_grau: lowList.length,
      public_block_ohne_db_bindung_gelb_restschuld: ohneBindung.length,
      pages_mit_befund_richtung_b: new Set(findings.map((f) => f.page_key)).size,
    },
    ampel: {
      rot_high_blocker: highList.length,
      gelb_medium_kandidat: mediumList.length,
      gelb_restschuld_ohne_bindung: ohneBindung.length,
      grau_vermutlich_gegated: lowList.length,
    },
  };

  await fs.writeFile(
    path.join(OUT_DIR, "public-blocks-ignorieren-admin-visibility.json"),
    JSON.stringify(
      {
        summary,
        buckets: {
          rot_high_blocker: highList,
          gelb_medium_kandidat: mediumList,
          gelb_restschuld_ohne_bindung: ohneBindung,
          grau_vermutlich_gegated: lowList,
        },
        // Backwards-compat keys (alte Konsumenten):
        public_block_ignoriert_db_visibility: findings,
        public_block_ohne_db_bindung: ohneBindung,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  const md = [];
  md.push("# Public-Bloecke ignorieren Admin-Visibility (D2b.2 / D3a.1)");
  md.push("");
  md.push(`Stand: ${summary.generated_at}`);
  md.push("");
  md.push("Gegenrichtung zur Befundklasse `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD`.");
  md.push("Findet alle Faelle, in denen ein Public-Block angezeigt wird, obwohl der");
  md.push("Admin-Schalter ihn ausgeblendet hat — oder der Schalter ueberhaupt keine");
  md.push("Wirkung haette.");
  md.push("");
  md.push("## Ampel");
  md.push("");
  md.push("| Ampel | Bedeutung | Anzahl |");
  md.push("|---|---|---|");
  md.push(`| 🔴 rot | High-Blocker: DB aus, Public rendert trotzdem | **${highList.length}** |`);
  md.push(`| 🟡 gelb | Medium-Kandidat: DB an, hartcodiert, Aus-Schalten wirkungslos | **${mediumList.length}** |`);
  md.push(`| 🟡 gelb | Restschuld: Public-Block ohne CMS-Gegenstueck | **${ohneBindung.length}** |`);
  md.push(`| ⚪ grau | Vermutlich bereits gegated (Heuristik unsicher) | **${lowList.length}** |`);
  md.push("");
  md.push("> Hinweis: Nur 🔴 rot ist akuter Spiegel-Bruch.");
  md.push("> 🟡 gelb ist Architektur-Restschuld (kein Sichtbarkeitsbruch heute).");
  md.push("> ⚪ grau braucht keine Aktion.");
  md.push("");
  md.push("## 🔴 Rot — High-Blocker `PUBLIC_BLOCK_IGNORIERT_DB_VISIBILITY`");
  md.push("");
  md.push("DB `is_active=false`, Public rendert trotzdem. Spiegel-Regel gebrochen.");
  md.push("");
  if (highList.length === 0) {
    md.push("**Keine Befunde.** ✅");
  } else {
    md.push("| page_key | section_key | section_type | Page-Datei | Bewertung |");
    md.push("|---|---|---|---|---|");
    for (const f of highList) {
      md.push(`| ${f.page_key} | ${f.section_key} | ${f.section_type} | \`${f.page_file}\` | ${f.bewertung} |`);
    }
  }
  md.push("");
  md.push("## 🟡 Gelb — Medium-Kandidat `PUBLIC_BLOCK_IGNORIERT_DB_VISIBILITY`");
  md.push("");
  md.push("DB-Section ist aktiv, Public-Block ist hartcodiert ohne Gate. Heute kein");
  md.push("sichtbarer Fehler, aber ein Aus-Schalten im Admin wuerde nichts bewirken.");
  md.push("");
  if (mediumList.length === 0) {
    md.push("Keine Befunde.");
  } else {
    md.push("| page_key | section_key | section_type | Page-Datei | Whitelist |");
    md.push("|---|---|---|---|---|");
    for (const f of mediumList) {
      md.push(`| ${f.page_key} | ${f.section_key} | ${f.section_type} | \`${f.page_file}\` | ${f.in_rest_renderer_whitelist ? "ja" : "nein"} |`);
    }
  }
  md.push("");
  md.push("## 🟡 Gelb — Restschuld `PUBLIC_BLOCK_OHNE_DB_BINDUNG`");
  md.push("");
  md.push("Page-Datei rendert einen i18n-Block, zu dem keine CMS-Section existiert.");
  md.push("Kein Sichtbarkeitsbruch, aber Inhalt ist still im Code und nicht im Admin");
  md.push("pflegbar.");
  md.push("");
  if (ohneBindung.length === 0) {
    md.push("Keine Befunde.");
  } else {
    md.push("| page_key | i18n_root | hardcoded_key | Page-Datei |");
    md.push("|---|---|---|---|");
    for (const f of ohneBindung.slice(0, 200)) {
      md.push(`| ${f.page_key} | ${f.i18n_root} | ${f.hardcoded_key} | \`${f.page_file}\` |`);
    }
    if (ohneBindung.length > 200) md.push(`| … | … | … | … (${ohneBindung.length - 200} weitere) |`);
  }
  md.push("");
  md.push("## ⚪ Grau — Vermutlich bereits gegated");
  md.push("");
  md.push("Im Code wird `cms.sections.find/some/filter` mit dem section_key benutzt.");
  md.push("Heuristik ist unsicher; nur zur Information.");
  md.push("");
  if (lowList.length === 0) {
    md.push("Keine Befunde.");
  } else {
    md.push("| page_key | section_key | section_type | DB is_active | Page-Datei |");
    md.push("|---|---|---|---|---|");
    for (const f of lowList) {
      md.push(`| ${f.page_key} | ${f.section_key} | ${f.section_type} | ${f.db_is_active ? "an" : "aus"} | \`${f.page_file}\` |`);
    }
  }

  await fs.writeFile(
    path.join(OUT_DIR, "public-blocks-ignorieren-admin-visibility.md"),
    md.join("\n") + "\n",
    "utf8",
  );

  console.log(
    `[D2b.2/D3a.1] ${pageFiles.length} Page-Dateien — Ampel: rot=${highList.length}, gelb_medium=${mediumList.length}, gelb_restschuld=${ohneBindung.length}, grau=${lowList.length}.`,
  );
})();
