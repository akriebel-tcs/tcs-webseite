#!/usr/bin/env node
/**
 * globaler-spiegel-audit.mjs — Gesamtbeweis „Eine Wahrheit".
 *
 * Prüft alle aktiven Standardbausteine über DB + Whitelist + Admin + Code
 * in einem Lauf. Erzeugt eine strukturierte Trefferliste (Markdown +
 * JSON) unter `scripts/cms/output/globaler-spiegel-audit.{md,json}`.
 *
 * Geprüfte Bausteine (Pflicht-Set):
 *   card_v1, cards_v1, product_scroller_v1, cta_v1, faq_v1, hero_v1,
 *   content_v1, teaser_2col_v1, stats_v1
 *
 * Befunde haben das Schema:
 *   { code, severity, page_key, section_key, section_type, field, cause, fix }
 *
 * Skip-Verbot: SKIP_DB=1 allein ⇒ Exit 2. Mit ALLOW_FIXTURE_ONLY=1 +
 * CMS_FIXTURE_PATH wird übersprungen (Exit 0, klar markiert). CI muss in
 * dem Fall einen Snapshot-Lauf nachschieben.
 *
 * Exit-Codes:
 *   0  alle Pflicht-Checks grün (oder Fixture-Skip)
 *   1  rote Befunde vorhanden (CI rot)
 *   2  Konfigurationsfehler
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = "scripts/cms/output";
const MIRROR_DIR = "docs/04-betrieb/audit-snapshot";
const OUT_MD = path.join(OUT_DIR, "globaler-spiegel-audit.md");
const OUT_JSON = path.join(OUT_DIR, "globaler-spiegel-audit.json");
function writeBoth(name, content) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(MIRROR_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, name), content);
  fs.writeFileSync(path.join(MIRROR_DIR, name), content);
}

if (process.env.SKIP_DB === "1") {
  if (process.env.ALLOW_FIXTURE_ONLY !== "1" || !process.env.CMS_FIXTURE_PATH) {
    console.error("globaler-spiegel-audit: SKIP_DB=1 ohne ALLOW_FIXTURE_ONLY=1 + CMS_FIXTURE_PATH ist nicht erlaubt.");
    process.exit(2);
  }
  console.log(`globaler-spiegel-audit: Fixture-Pfad ${process.env.CMS_FIXTURE_PATH} — übersprungen.`);
  process.exit(0);
}
if (!process.env.PGHOST) {
  console.error("globaler-spiegel-audit: PGHOST nicht gesetzt — DB-Zugang fehlt.");
  process.exit(2);
}

function psql(sql) {
  const r = spawnSync("psql", ["-tA", "-F", "\t", "-c", sql], { encoding: "utf-8" });
  if (r.status !== 0) {
    console.error("psql failed:", r.stderr);
    process.exit(2);
  }
  return r.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split("\t"));
}

const STANDARD_TYPES = [
  "card_v1", "cards_v1", "product_scroller_v1", "cta_v1",
  "faq_v1", "hero_v1", "content_v1", "teaser_2col_v1", "stats_v1",
];

const findings = [];
const add = (f) => findings.push(f);

// ---------------------------------------------------------------------------
// 1) Whitelist-Lücken: Feld hat Wert, aber kein Whitelist-Eintrag (Admin
//    kann nicht pflegen → Spiegel-Bruch).
// ---------------------------------------------------------------------------
{
  const sql = `
    with relevant as (
      select page_key, section_key, section_type from cms_sections
      where is_active and section_type = any (string_to_array('${STANDARD_TYPES.join(",")}', ','))
    )
    select f.page_key, f.section_key, r.section_type, f.field_key, f.locale
    from cms_section_fields f
    join relevant r using (page_key, section_key)
    where f.value is not null and f.value <> ''
      and not exists (
        select 1 from cms_admin_editable_fields w
        where w.page_key=f.page_key and w.section_key=f.section_key
          and w.field_key=f.field_key and w.locale=f.locale and w.is_enabled
      )
    order by 1,2,4,5
  `;
  for (const [pk, sk, st, fk, lo] of psql(sql)) {
    add({
      code: "WHITELIST_FEHLT", severity: "rot",
      page_key: pk, section_key: sk, section_type: st, field: `${fk}@${lo}`,
      cause: "DB führt Wert, Admin-Whitelist fehlt — Feld nicht im Admin pflegbar.",
      fix: `INSERT in cms_admin_editable_fields (page_key,section_key,field_key,locale,is_enabled=true) für ${fk}@${lo}.`,
    });
  }
}

// ---------------------------------------------------------------------------
// 2) Container-Header-Whitelist (label/title/intro DE+EN)
// ---------------------------------------------------------------------------
{
  const sql = `
    with c as (
      select page_key, section_key, section_type from cms_sections
      where is_active and section_type in ('cards_v1','product_scroller_v1','teaser_2col_v1','feature_grid_v1')
    ), need as (
      select c.page_key, c.section_key, c.section_type, fk.field_key, lo.locale
      from c
      cross join (values ('label'),('title'),('intro')) as fk(field_key)
      cross join (values ('de'),('en')) as lo(locale)
    )
    select n.page_key, n.section_key, n.section_type, n.field_key, n.locale
    from need n
    where not exists (
      select 1 from cms_admin_editable_fields w
      where w.page_key=n.page_key and w.section_key=n.section_key
        and w.field_key=n.field_key and w.locale=n.locale and w.is_enabled
    )
    order by 1,2,4,5
  `;
  for (const [pk, sk, st, fk, lo] of psql(sql)) {
    add({
      code: "CONTAINER_HEADER_WHITELIST_FEHLT", severity: "rot",
      page_key: pk, section_key: sk, section_type: st, field: `${fk}@${lo}`,
      cause: "Container-Header (label/title/intro) ohne Whitelist — Admin-Spiegel unvollständig.",
      fix: `Whitelist-Eintrag für ${fk}@${lo} ergänzen.`,
    });
  }
}

// ---------------------------------------------------------------------------
// 3) link_N_label ohne link_N_href (gleiche Locale)
// ---------------------------------------------------------------------------
{
  const sql = `
    with labels as (
      select page_key, section_key, locale,
             substring(field_key from '^link_([0-9]+)_label$') as n
      from cms_section_fields
      where field_key ~ '^link_[0-9]+_label$' and value is not null and value <> ''
    )
    select l.page_key, l.section_key, l.locale, l.n
    from labels l
    where not exists (
      select 1 from cms_section_fields h
      where h.page_key=l.page_key and h.section_key=l.section_key
        and h.locale=l.locale and h.field_key='link_'||l.n||'_href'
        and h.value is not null and h.value <> ''
    )
    order by 1,2,4
  `;
  for (const [pk, sk, lo, n] of psql(sql)) {
    add({
      code: "LINK_OHNE_ZIEL", severity: "rot",
      page_key: pk, section_key: sk, section_type: "",
      field: `link_${n}_label@${lo}`,
      cause: "Link-Label gepflegt, link_N_href leer — Renderer würde Link ohne Ziel zeigen.",
      fix: `link_${n}_href@${lo} in cms_section_fields füllen (oder Label entfernen).`,
    });
  }
}

// ---------------------------------------------------------------------------
// 4) hero_v1 ohne headline (DE+EN)
// ---------------------------------------------------------------------------
{
  const sql = `
    with h as (
      select page_key, section_key from cms_sections
      where is_active and section_type in ('hero_v1','hero')
    ), need as (
      select h.page_key, h.section_key, lo.locale
      from h cross join (values ('de'),('en')) as lo(locale)
    )
    select n.page_key, n.section_key, n.locale
    from need n
    where not exists (
      select 1 from cms_section_fields f
      where f.page_key=n.page_key and f.section_key=n.section_key
        and f.locale=n.locale and f.field_key='headline'
        and f.value is not null and f.value <> ''
    )
    order by 1,2,3
  `;
  for (const [pk, sk, lo] of psql(sql)) {
    add({
      code: "HERO_OHNE_HEADLINE", severity: "rot",
      page_key: pk, section_key: sk, section_type: "hero_v1",
      field: `headline@${lo}`,
      cause: "Aktives hero_v1 ohne Headline — Public würde ohne Überschrift rendern.",
      fix: `headline@${lo} in cms_section_fields füllen.`,
    });
  }
}

// ---------------------------------------------------------------------------
// 5) card_v1 ohne title (weder DE noch EN)
// ---------------------------------------------------------------------------
{
  const sql = `
    select s.page_key, s.section_key
    from cms_sections s
    where s.is_active and s.section_type='card_v1'
      and not exists (
        select 1 from cms_section_fields f
        where f.page_key=s.page_key and f.section_key=s.section_key
          and f.field_key='title' and f.value is not null and f.value <> ''
      )
    order by 1,2
  `;
  for (const [pk, sk] of psql(sql)) {
    add({
      code: "CARD_OHNE_TITLE", severity: "rot",
      page_key: pk, section_key: sk, section_type: "card_v1",
      field: "title",
      cause: "Aktive card_v1 ohne Title — würde leer rendern.",
      fix: "title@de und title@en in cms_section_fields füllen.",
    });
  }
}

// ---------------------------------------------------------------------------
// 6) cta_v1 aktiv, aber Public würde null rendern. Locale-getrennt geprüft
//    über `public.cms_section_renderability()` (Single Source SQL-seitig,
//    Spiegel zu src/features/cms/contract/renderability.ts).
// ---------------------------------------------------------------------------
{
  const sql = `
    with active as (
      select s.page_key, s.section_key
      from cms_sections s
      where s.is_active and s.section_type='cta_v1'
    ), r as (
      select a.page_key, a.section_key,
             public.cms_section_renderability(a.page_key, a.section_key) as info
      from active a
    )
    select page_key, section_key,
           coalesce(m->>'locale','') as locale,
           coalesce(m->'field_keys'->>0,'') as field_key
    from r,
    lateral jsonb_array_elements(info->'missing') as m
    where (info->>'renderable')::bool = false
    order by 1,2,3,4
  `;
  for (const [pk, sk, lo, fk] of psql(sql)) {
    add({
      code: "CTA_AKTIV_ABER_NULL_RENDER", severity: "rot",
      page_key: pk, section_key: sk, section_type: "cta_v1",
      field: `${fk}@${lo}`,
      cause: `cta_v1 ist aktiv, aber Pflichtfeld '${fk}' fehlt in Locale '${lo}' — CtaV1 gibt null zurück.`,
      fix: `${fk}@${lo} in cms_section_fields füllen oder die Section deaktivieren.`,
    });
  }
}

// ---------------------------------------------------------------------------
// 6b) Legacy-CTA aktiv: section_key='cta', aber NICHT als cta_v1 geführt.
// ---------------------------------------------------------------------------
{
  const sql = `
    select s.page_key, s.section_key, s.section_type
    from cms_sections s
    where s.is_active
      and s.parent_section_id is null
      and s.section_key='cta'
      and coalesce(s.section_type, '') not in ('cta_v1', 'cta')
    order by 1,2
  `;
  for (const [pk, sk, st] of psql(sql)) {
    add({
      code: "LEGACY_CTA_AKTIV", severity: "rot",
      page_key: pk, section_key: sk, section_type: st,
      field: "section_key=cta",
      cause: "Aktive Top-Level-Section 'cta' ist kein cta_v1-Standardbaustein und bleibt als Alt-CTA parallel im CMS aktiv.",
      fix: "Legacy-CTA deaktivieren oder sauber nach standard_cta (cta_v1) migrieren.",
    });
  }
}

// ---------------------------------------------------------------------------
// 6c) Doppelte CTA-Wahrheit: standard_cta + aktive Legacy-CTA parallel.
// ---------------------------------------------------------------------------
{
  const sql = `
    select s.page_key, l.section_key, l.section_type
    from cms_sections s
    join cms_sections l on l.page_key = s.page_key
    where s.is_active
      and s.parent_section_id is null
      and s.section_key='standard_cta'
      and coalesce(s.section_type, '') in ('cta_v1', 'cta')
      and l.is_active
      and l.parent_section_id is null
      and l.section_key='cta'
      and coalesce(l.section_type, '') not in ('cta_v1', 'cta')
    order by 1,2
  `;
  for (const [pk, sk, st] of psql(sql)) {
    add({
      code: "DOPPELTE_CTA_WAHRHEIT", severity: "rot",
      page_key: pk, section_key: sk, section_type: st,
      field: "standard_cta + cta",
      cause: "Seite führt gleichzeitig standard_cta als neue Wahrheit und eine aktive Legacy-CTA unter section_key='cta'.",
      fix: "Legacy-CTA deaktivieren; pro Seite darf nur eine wirksame Abschluss-CTA aktiv sein.",
    });
  }
}

// ---------------------------------------------------------------------------
// 7) faq_v1 ohne Items (Schemata: items.<slug>.frage|question)
// ---------------------------------------------------------------------------
{
  const sql = `
    select s.page_key, s.section_key
    from cms_sections s
    where s.is_active and s.section_type='faq_v1'
      and not exists (
        select 1 from cms_section_fields f
        where f.page_key=s.page_key and f.section_key=s.section_key
          and (
            f.field_key ~ '^items\\..*\\.(frage|question|q)$' or
            f.field_key ~ '^q[0-9]+_(frage|question)$'
          )
          and f.value is not null and f.value <> ''
      )
    order by 1,2
  `;
  for (const [pk, sk] of psql(sql)) {
    add({
      code: "FAQ_OHNE_ITEMS", severity: "rot",
      page_key: pk, section_key: sk, section_type: "faq_v1",
      field: "items.*.frage",
      cause: "Aktives faq_v1 ohne Fragen — Public würde leere Liste zeigen.",
      fix: "Mindestens eine items.<slug>.frage/antwort-Reihe füllen.",
    });
  }
}


// ---------------------------------------------------------------------------
// 8) Container leer / falscher Kindtyp — Spiegel zur zentralen
//    Renderfähigkeitslogik (`public.cms_section_renderability`).
//    Container haben einen Title-Fallback (außer stats_v1 / tabs_v1, die in
//    Block 9 separat geprüft werden).
// ---------------------------------------------------------------------------
{
  const sql = `
    with active as (
      select s.page_key, s.section_key, s.section_type, s.id,
             public.cms_section_renderability(s.page_key, s.section_key) as info
      from cms_sections s
      where s.is_active and s.section_type in (
        'cards_v1','feature_grid_v1','product_scroller_v1',
        'product_showcase_list_v1','download_list_v1'
      )
    )
    select page_key, section_key, section_type,
           coalesce(m->>'reason', '') as reason
    from active,
    lateral jsonb_array_elements(info->'missing') as m
    where (info->>'renderable')::bool = false
    order by 1,2
  `;
  for (const [pk, sk, st, reason] of psql(sql)) {
    const isWrongType = reason === "wrong_child_type";
    add({
      code: isWrongType ? "CONTAINER_FALSCHER_KINDTYP" : "CONTAINER_LEER",
      severity: "rot",
      page_key: pk, section_key: sk, section_type: st,
      field: "children",
      cause: isWrongType
        ? `${st} aktiv, aber Kinder haben einen Typ, den der Renderer nicht akzeptiert.`
        : `${st} aktiv, ohne aktive Kinder vom akzeptierten Typ UND ohne Container-Titel — würde leer rendern.`,
      fix: isWrongType
        ? "Kind-Typ korrigieren (cards_v1/feature_grid_v1/product_scroller_v1/product_showcase_list_v1 → card_v1; download_list_v1 → download_item_v1)."
        : "Kinder vom akzeptierten Typ anlegen oder Container-Titel pflegen oder Container deaktivieren.",
    });
  }
}


// ---------------------------------------------------------------------------
// 9) stats_v1 ohne stat-Items
// ---------------------------------------------------------------------------
{
  const sql = `
    select s.page_key, s.section_key
    from cms_sections s
    where s.is_active and s.section_type='stats_v1'
      and not exists (
        select 1 from cms_sections c
        where c.parent_section_id=s.id and c.is_active and c.section_type='stat_v1'
      )
      and not exists (
        select 1 from cms_section_fields f
        where f.page_key=s.page_key and f.section_key=s.section_key
          and f.field_key ~ '^stat_[0-9]+_value$'
          and f.value is not null and f.value <> ''
      )
    order by 1,2
  `;
  for (const [pk, sk] of psql(sql)) {
    add({
      code: "STATS_LEER", severity: "rot",
      page_key: pk, section_key: sk, section_type: "stats_v1",
      field: "stat_*",
      cause: "stats_v1 aktiv, aber weder Kind-stat_v1 noch stat_N_value-Felder.",
      fix: "Stat-Items als children oder als stat_N_value-Felder ergänzen.",
    });
  }
}

// ---------------------------------------------------------------------------
// 10) Admin-Anzeige-Spiegel: DB-Inhalt, aber kein cms_pages-Eintrag
// ---------------------------------------------------------------------------
{
  const sql = `
    with content as (
      select distinct page_key from cms_sections where is_active
      union
      select distinct page_key from cms_section_fields where value is not null and value <> ''
    )
    select c.page_key
    from content c
    where not exists (select 1 from cms_pages p where p.page_key=c.page_key)
    order by 1
  `;
  for (const [pk] of psql(sql)) {
    add({
      code: "ADMIN_PAGE_FEHLT", severity: "rot",
      page_key: pk, section_key: "", section_type: "",
      field: "cms_pages",
      cause: "Seite hat DB-Inhalt, aber keinen cms_pages-Eintrag — Admin würde 'Code & i18n' melden.",
      fix: "cms_pages-Zeile anlegen (page_type, status, is_active).",
    });
  }
}

// ---------------------------------------------------------------------------
// 11) Kein Navigationsknoten für Seiten mit Inhalt
//     Archivierte/inaktive Arbeitskopien zählen hier NICHT als wirksame
//     Public-Seiten und dürfen den Audit nicht künstlich rot färben.
// ---------------------------------------------------------------------------
{
  const sql = `
    with content as (
      select distinct page_key from cms_sections where is_active
      union
      select distinct page_key from cms_section_fields where value is not null and value <> ''
    )
    select c.page_key
    from content c
    where exists (
      select 1 from cms_pages p
      where p.page_key=c.page_key and p.is_active and p.status <> 'archived'
    )
      and not exists (select 1 from cms_navigation_nodes n where n.page_key=c.page_key)
    order by 1
  `;
  for (const [pk] of psql(sql)) {
    add({
      code: "ADMIN_NAV_FEHLT", severity: "rot",
      page_key: pk, section_key: "", section_type: "",
      field: "cms_navigation_nodes",
      cause: "Seite mit Inhalt ist im Admin-Baum nicht erreichbar (kein Navigationsknoten).",
      fix: "cms_navigation_nodes-Knoten anlegen (sichtbar oder im Altbestand-Bucket).",
    });
  }
}

// ---------------------------------------------------------------------------
// 11b) Public-Render-Reachability für Persona-Seiten:
//      Jede aktive Top-Level cta_v1 / faq_v1 / cards_v1 / teaser_2col_v1
//      auf personas.* muss in der zugehörigen Persona-Content-Datei
//      über PersonaCmsSection oder den zentralen Renderer referenziert
//      sein. Sonst rendert Public den Baustein nicht, obwohl er in DB
//      und Admin als wirksam geführt wird.
// ---------------------------------------------------------------------------
{
  const PERSONA_FILE = {
    "personas.architekt":          "src/features/personas/architekt/components/ArchitektenContent.tsx",
    "personas.bauherr":            "src/features/personas/bauherr/components/BauherrenContent.tsx",
    "personas.fachhandel":         "src/features/personas/fachhandel/components/FachhandelContent.tsx",
    "personas.fachplaner":         "src/features/personas/fachplaner/components/FachplanerContent.tsx",
    "personas.handwerk":           "src/features/personas/handwerk/components/HandwerkContent.tsx",
    "personas.wohnungswirtschaft": "src/features/personas/wohnungswirtschaft/components/WohnungswirtschaftContent.tsx",
  };
  const REACH_TYPES = ["cta_v1", "faq_v1", "cards_v1", "teaser_2col_v1", "content_v1", "rich_v1"];
  const sql = `
    select s.page_key, s.section_key, s.section_type
    from cms_sections s
    join cms_pages p on p.page_key = s.page_key
    where s.is_active
      and s.page_key like 'personas.%'
      and s.parent_section_id is null
      and p.is_active
      and p.status <> 'archived'
      and s.section_type = any (string_to_array('${REACH_TYPES.join(",")}', ','))
    order by 1,2
  `;
  for (const [pk, sk, st] of psql(sql)) {
    const rel = PERSONA_FILE[pk];
    if (!rel || !fs.existsSync(rel)) {
      add({
        code: "PUBLIC_RENDER_UNREACHABLE", severity: "rot",
        page_key: pk, section_key: sk, section_type: st, field: "persona-content-file",
        cause: `Keine Persona-Content-Datei für ${pk} gefunden – ${st}/${sk} kann öffentlich nicht rendern.`,
        fix: `Persona-Content-Datei anlegen oder ${pk} aus dem Persona-Pfad nehmen.`,
      });
      continue;
    }
    const src = fs.readFileSync(rel, "utf8");
    // PersonaBodyRenderer rendert ALLE Top-Level-Sections aus
    // cms.sections.sort_order, ausgenommen hero/stats/solution_teaser_*.
    // Solche Sections gelten damit automatisch als erreichbar.
    const usesBodyRenderer = /<PersonaBodyRenderer\b/.test(src);
    const coveredByBodyRenderer =
      usesBodyRenderer &&
      sk !== "hero" && sk !== "stats" && !sk.startsWith("solution_teaser_");
    // erlaubt: explizite PersonaCmsSection mit sectionKey="<sk>" ODER
    // Spezialfall solution_teaser_* (wird per Filter über alle teaser_2col_v1 gerendert)
    const referenced =
      coveredByBodyRenderer ||
      new RegExp(`sectionKey=["']${sk}["']`).test(src) ||
      (st === "teaser_2col_v1" && /solution_teaser_/.test(sk) && /teaser_2col_v1/.test(src));
    if (!referenced) {
      add({
        code: "AKTIVE_SECTION_UNERREICHBAR", severity: "rot",
        page_key: pk, section_key: sk, section_type: st, field: "PersonaCmsSection",
        cause: `Aktive ${st}-Section '${sk}' wird in ${rel} nicht gerendert – Spiegel-Bruch zwischen Admin und Public.`,
        fix: `<PersonaCmsSection sectionKey="${sk}" …/> oder <PersonaBodyRenderer …/> in ${rel} einbinden oder die Section in der DB deaktivieren.`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 11c) Lokaler Persona-CTA-Block trotz aktivem cta_v1 (statisch+DB)
// ---------------------------------------------------------------------------
{
  const PERSONA_FILE = {
    "personas.architekt":          "src/features/personas/architekt/components/ArchitektenContent.tsx",
    "personas.bauherr":            "src/features/personas/bauherr/components/BauherrenContent.tsx",
    "personas.fachhandel":         "src/features/personas/fachhandel/components/FachhandelContent.tsx",
    "personas.fachplaner":         "src/features/personas/fachplaner/components/FachplanerContent.tsx",
    "personas.handwerk":           "src/features/personas/handwerk/components/HandwerkContent.tsx",
    "personas.wohnungswirtschaft": "src/features/personas/wohnungswirtschaft/components/WohnungswirtschaftContent.tsx",
  };
  const rows = psql(`
    select distinct page_key from cms_sections
    where is_active and section_type='cta_v1' and page_key like 'personas.%'
  `);
  for (const [pk] of rows) {
    const rel = PERSONA_FILE[pk];
    if (!rel || !fs.existsSync(rel)) continue;
    const src = fs.readFileSync(rel, "utf8");
    if (/data-cms-section=["']cta["']/.test(src) || /\btx\(\s*["']cta["']/.test(src)) {
      add({
        code: "PUBLIC_DOPPELCTA", severity: "rot",
        page_key: pk, section_key: "(local cta block)", section_type: "cta_v1",
        field: "tx('cta',…) / data-cms-section=\"cta\"",
        cause: `Persona-Datei ${rel} rendert noch einen lokalen CTA, während cta_v1 in der DB als Wahrheit aktiv ist.`,
        fix: "Lokalen CTA-Block durch <PersonaCmsSection sectionKey=\"standard_cta\" …/> ersetzen.",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 11d) SECTION_KEY_TYPE_MISMATCH
//      Vertrag zwischen section_key und section_type hart prüfen.
//      - standard_cta MUSS cta_v1 sein.
//      - faq MUSS faq_v1 sein, sobald die Section aktiv ist.
// ---------------------------------------------------------------------------
{
  const sql = `
    select page_key, section_key, coalesce(section_type,'(null)') as st
    from cms_sections
    where is_active and parent_section_id is null
      and (
        (section_key = 'standard_cta' and coalesce(section_type,'') <> 'cta_v1') or
        (section_key = 'faq'          and coalesce(section_type,'') <> 'faq_v1')
      )
    order by 1,2
  `;
  for (const [pk, sk, st] of psql(sql)) {
    add({
      code: "SECTION_KEY_TYPE_MISMATCH", severity: "rot",
      page_key: pk, section_key: sk, section_type: st,
      field: "section_type",
      cause: `Aktive Section '${sk}' hat falschen section_type '${st}' — Vertrag verletzt (standard_cta=cta_v1, faq=faq_v1).`,
      fix: `section_type in cms_sections korrigieren (oder die Section deaktivieren).`,
    });
  }
}

// ---------------------------------------------------------------------------
// 11e) SKIP_TYPE_OHNE_SONDERPFAD
//      Typen in CmsBodyRenderer.SKIP_TYPES sind im normalen Renderer
//      ausgeschlossen. Pro SKIP_TYPE muss MINDESTENS ein dokumentierter
//      Sonderpfad im Code existieren.
// ---------------------------------------------------------------------------
{
  const SKIP_TYPE_SONDERPFADE = {
    cta_v1: [
      // Batch 55: CmsTailSections löste CmsTailCta ab und rendert CTA+FAQ
      // gemeinsam nach sort_order. Beide Namen sind erlaubt, solange
      // mindestens einer in PageLayout eingebunden ist.
      { file: "src/components/PageLayout.tsx", needle: "CmsTailSections" },
      { file: "src/components/PageLayout.tsx", needle: "CmsTailCta" },
      { file: "src/features/personas/shared/PersonaCmsSection.tsx", needle: "cta_v1" },
    ],
    hero_v1: [
      { file: "src/features/cms/components/GenericCmsPage.tsx", needle: "hero" },
    ],
  };
  for (const [type, pfade] of Object.entries(SKIP_TYPE_SONDERPFADE)) {
    const hits = pfade.filter((p) => fs.existsSync(p.file) && fs.readFileSync(p.file, "utf8").includes(p.needle));
    if (hits.length === 0) {
      add({
        code: "SKIP_TYPE_OHNE_SONDERPFAD", severity: "rot",
        page_key: "(code)", section_key: "(code)", section_type: type,
        field: "SKIP_TYPES",
        cause: `${type} steht in SKIP_TYPES, aber kein dokumentierter Sonderpfad rendert ihn.`,
        fix: `Sonderpfad (z. B. CmsTailSections / CmsTailCta / PersonaCmsSection) einbinden oder ${type} aus SKIP_TYPES entfernen.`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 11f) CTA_AKTIV_ABER_UNERREICHBAR / FAQ_AKTIV_ABER_UNERREICHBAR
//      Nicht-Persona-Seiten: aktive cta_v1/faq_v1 erfordern, dass PageLayout
//      sie über CmsTailSections (Batch 55) oder das ältere CmsTailCta/
//      faq_v1-Renderer-Pattern erreichbar macht.
// ---------------------------------------------------------------------------
{
  const layoutSrc = fs.existsSync("src/components/PageLayout.tsx")
    ? fs.readFileSync("src/components/PageLayout.tsx", "utf8")
    : "";
  const tailSectionsActive = /CmsTailSections\s+pageKey/.test(layoutSrc);
  const ctaTailLegacy = /CmsTailCta\s+pageKey/.test(layoutSrc);
  const ctaReachable = tailSectionsActive || ctaTailLegacy;
  if (!ctaReachable) {
    const rows = psql(`
      select page_key, section_key from cms_sections
      where is_active and parent_section_id is null
        and section_type='cta_v1' and section_key='standard_cta'
        and page_key not like 'personas.%'
      order by 1,2
    `);
    for (const [pk, sk] of rows) {
      add({
        code: "CTA_AKTIV_ABER_UNERREICHBAR", severity: "rot",
        page_key: pk, section_key: sk, section_type: "cta_v1",
        field: "CmsTailSections",
        cause: "Aktive standard_cta (cta_v1), aber PageLayout bindet weder CmsTailSections noch CmsTailCta ein.",
        fix: "CmsTailSections in PageLayout einbinden (mit pageKey).",
      });
    }
  }
  const bodySrc = fs.existsSync("src/features/cms/components/CmsBodyRenderer.tsx")
    ? fs.readFileSync("src/features/cms/components/CmsBodyRenderer.tsx", "utf8")
    : "";
  const faqInCatalog = /faq_v1\s*:/.test(bodySrc);
  // Batch 55: CmsTailSections rendert faq_v1 auch dann, wenn der zentrale
  // Renderer den Typ noch nicht im RENDERERS-Katalog führt.
  const faqReachable = faqInCatalog || tailSectionsActive;
  if (!faqReachable) {
    const rows = psql(`
      select page_key, section_key from cms_sections
      where is_active and parent_section_id is null and section_type='faq_v1'
      order by 1,2
    `);
    for (const [pk, sk] of rows) {
      add({
        code: "FAQ_AKTIV_ABER_UNERREICHBAR", severity: "rot",
        page_key: pk, section_key: sk, section_type: "faq_v1",
        field: "RENDERERS.faq_v1 / CmsTailSections",
        cause: "Aktive faq_v1 ohne Renderer im zentralen Katalog UND ohne CmsTailSections — Public rendert null.",
        fix: "faq_v1-Renderer in CmsBodyRenderer registrieren oder CmsTailSections in PageLayout einbinden.",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 12) PUNKT_KEY_IN_INAKTIVER_CONTAINER
//      Inaktive Container-Sections, die noch gefüllte Punkt-Key-Felder
//      (z. B. `detailSections.barrierefrei.title`) führen. Solche Felder
//      sind CMS-Daten, aber nicht editierbar/wirksam — Spiegel-Bruch.
// ---------------------------------------------------------------------------
{
  const sql = `
    select f.page_key, f.section_key, count(*) as n,
           count(distinct split_part(f.field_key,'.',1)) as gruppen
    from cms_section_fields f
    join cms_sections s using (page_key, section_key)
    where s.is_active = false
      and f.field_key like '%.%'
      and f.value is not null and f.value <> ''
    group by f.page_key, f.section_key
    order by 1,2
  `;
  for (const [pk, sk, n, gruppen] of psql(sql)) {
    add({
      code: "PUNKT_KEY_IN_INAKTIVER_CONTAINER", severity: "rot",
      page_key: pk, section_key: sk, section_type: "",
      field: `${n} Punkt-Key-Felder in ${gruppen} Gruppen`,
      cause: "Inaktive Container-Section führt noch gefüllte Punkt-Key-Felder — Daten sind weder editierbar noch wirksam.",
      fix: "Felder in echte Sub-Sections überführen (content_v1/cards_v1) oder Punkt-Key-Container explizit als Legacy archivieren.",
    });
  }
}

// ---------------------------------------------------------------------------
// 13) PERSONA_DETAILSECTIONS_LEGACY
//      Harte Persona-Detail-Komponenten (z. B. WoWiDetailSections) sind
//      führende Public-Quelle für Inhalte, die nicht als echte
//      cms_sections geführt werden.
// ---------------------------------------------------------------------------
const KNOWN_JSX_SONDERPFADE = {
  // pageKey -> erlaubte section_keys, die im JSX als <section data-cms-section="X">
  // gerendert werden dürfen. Pflicht: jeweils dazugehörige cms_sections-Zeile
  // mit Whitelist muss separat existieren (DB-first Lesepfad).
  "personas.architekt":          ["hero", "stats"],
  "personas.bauherr":            ["hero", "stats"],
  "personas.fachhandel":         ["hero", "stats"],
  "personas.fachplaner":         ["hero", "stats"],
  "personas.handwerk":           ["hero", "stats"],
  "personas.wohnungswirtschaft": ["hero", "stats"],
};

{
  const PERSONA_LEGACY_DETAIL_COMPONENTS = [
    {
      pageKey: "personas.wohnungswirtschaft",
      file: "src/features/personas/wohnungswirtschaft/components/WoWiDetailSections.tsx",
      importer: "src/features/personas/wohnungswirtschaft/components/WohnungswirtschaftContent.tsx",
    },
  ];
  for (const entry of PERSONA_LEGACY_DETAIL_COMPONENTS) {
    if (!fs.existsSync(entry.file) || !fs.existsSync(entry.importer)) continue;
    const src = fs.readFileSync(entry.importer, "utf8");
    if (/from\s+["'][^"']*WoWiDetailSections["']/.test(src)) {
      add({
        code: "PERSONA_DETAILSECTIONS_LEGACY", severity: "rot",
        page_key: entry.pageKey, section_key: "(legacy-component)", section_type: "",
        field: entry.file,
        cause: `${entry.file} ist führende Public-Quelle für Persona-Detailblöcke (i18n-/Code-getrieben), die nicht als echte cms_sections existieren.`,
        fix: `Inhalte in echte cms_sections (content_v1/cards_v1) überführen und Import aus ${entry.importer} entfernen.`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 14) RENDER_ORDER_NICHT_AUS_DB
//      Persona-Seite hat aktive CMS-Sections, die Public-Seite rendert
//      sie aber nicht über einen DB-`sort_order`-Loop, sondern über feste
//      JSX-Positionen. Erlaubt nur, wenn Datei `PersonaBodyRenderer` nutzt.
// ---------------------------------------------------------------------------
const _PERSONA_FILES = {
  "personas.architekt":          "src/features/personas/architekt/components/ArchitektenContent.tsx",
  "personas.bauherr":            "src/features/personas/bauherr/components/BauherrenContent.tsx",
  "personas.fachhandel":         "src/features/personas/fachhandel/components/FachhandelContent.tsx",
  "personas.fachplaner":         "src/features/personas/fachplaner/components/FachplanerContent.tsx",
  "personas.handwerk":           "src/features/personas/handwerk/components/HandwerkContent.tsx",
  "personas.wohnungswirtschaft": "src/features/personas/wohnungswirtschaft/components/WohnungswirtschaftContent.tsx",
};
{
  for (const [pk, rel] of Object.entries(_PERSONA_FILES)) {
    if (!fs.existsSync(rel)) continue;
    const src = fs.readFileSync(rel, "utf8");
    const usesBodyRenderer = /PersonaBodyRenderer/.test(src);
    const hardcodedSections = (src.match(/<PersonaCmsSection\b/g) || []).length;
    if (!usesBodyRenderer && hardcodedSections >= 2) {
      add({
        code: "RENDER_ORDER_NICHT_AUS_DB", severity: "rot",
        page_key: pk, section_key: "(persona-content)", section_type: "",
        field: `${hardcodedSections}× hartcodierte PersonaCmsSection-Aufrufe`,
        cause: `${rel} verdrahtet die Body-Reihenfolge fest in JSX — Drag/drop im CMS-Light hat keine Wirkung auf Public.`,
        fix: "Body-Sections (alles außer hero/stats-Sonderpfad) über <PersonaBodyRenderer …/> aus cms.sections.sort_order rendern.",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 15) I18N_JSX_SECTION_OHNE_DB_GEGENSTUECK
//      Persona-Komponenten rendern eigene <section data-cms-section="X">,
//      ohne dass `X` als aktive cms_sections-Zeile existiert. Ausnahmen
//      nur per KNOWN_JSX_SONDERPFADE (UND aktive Section in DB).
// ---------------------------------------------------------------------------
{
  const activeSectionsByPage = {};
  for (const [pk, sk] of psql(`select page_key, section_key from cms_sections where is_active and page_key like 'personas.%'`)) {
    (activeSectionsByPage[pk] ||= new Set()).add(sk);
  }
  for (const [pk, rel] of Object.entries(_PERSONA_FILES)) {
    if (!fs.existsSync(rel)) continue;
    const src = fs.readFileSync(rel, "utf8");
    const dataKeys = new Set();
    for (const m of src.matchAll(/data-cms-section=["']([a-zA-Z0-9_]+)["']/g)) dataKeys.add(m[1]);
    const allowed = new Set(KNOWN_JSX_SONDERPFADE[pk] || []);
    const active = activeSectionsByPage[pk] || new Set();
    for (const sk of dataKeys) {
      if (allowed.has(sk)) {
        if (!active.has(sk)) {
          add({
            code: "I18N_JSX_SECTION_OHNE_DB_GEGENSTUECK", severity: "rot",
            page_key: pk, section_key: sk, section_type: "(JSX-Sonderpfad)",
            field: `data-cms-section="${sk}"`,
            cause: `Sonderpfad '${sk}' in ${rel} ist erlaubt, aber keine aktive cms_sections-Zeile existiert — Allowlist-Vertrag verletzt.`,
            fix: `cms_sections-Zeile für ${sk} anlegen und aktiv setzen, oder Sonderpfad entfernen.`,
          });
        }
        continue;
      }
      if (!active.has(sk)) {
        add({
          code: "I18N_JSX_SECTION_OHNE_DB_GEGENSTUECK", severity: "rot",
          page_key: pk, section_key: sk, section_type: "(JSX-only)",
          field: `data-cms-section="${sk}"`,
          cause: `Persona-Komponente rendert <section data-cms-section="${sk}">, weder existiert eine aktive cms_sections-Zeile noch ist sie in KNOWN_JSX_SONDERPFADE eingetragen.`,
          fix: `Entweder ${sk} als aktive cms_sections-Zeile + Whitelist anlegen, oder explizit in KNOWN_JSX_SONDERPFADE['${pk}'] aufnehmen (begründet).`,
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 16) PERSONA_FALLBACK_RENDERER_AKTIV
//      Lokale Fallback-Schleifen für Standardbausteine, obwohl DB-Sections
//      existieren (klassisch: solutions aus i18n statt aus teaser_2col_v1).
// ---------------------------------------------------------------------------
{
  const FALLBACK_NEEDLES = [
    { needle: "solutionLinkByKey", why: "Lokale solutionLinkByKey-Map — Solutions/Teaser müssen aus DB (teaser_2col_v1) kommen." },
    { needle: "solutionKeys.map(", why: "Lokaler solutionKeys.map()-Loop rendert Solutions aus i18n — DB-Teaser sind führende Wahrheit." },
  ];
  for (const [pk, rel] of Object.entries(_PERSONA_FILES)) {
    if (!fs.existsSync(rel)) continue;
    const src = fs.readFileSync(rel, "utf8");
    for (const f of FALLBACK_NEEDLES) {
      if (src.includes(f.needle)) {
        add({
          code: "PERSONA_FALLBACK_RENDERER_AKTIV", severity: "rot",
          page_key: pk, section_key: "(persona-content)", section_type: "",
          field: f.needle,
          cause: f.why,
          fix: `Fallback-Pfad in ${rel} entfernen; Inhalte aus cms_sections rendern.`,
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 17a) SECTION_TYPE_OHNE_RENDERER
//      Aktiver section_type in cms_sections ist weder in RENDERERS
//      registriert noch über normalizeType() aliasiert. Public würde null
//      rendern oder ein lokaler Sonderpfad müsste übernehmen — beides
//      Spiegel-Bruch.
// ---------------------------------------------------------------------------
{
  const bodySrc = fs.existsSync("src/features/cms/components/CmsBodyRenderer.tsx")
    ? fs.readFileSync("src/features/cms/components/CmsBodyRenderer.tsx", "utf8")
    : "";
  const registered = new Set();
  for (const m of bodySrc.matchAll(/^\s*([a-z][a-z0-9_]*_v1)\s*:/gm)) registered.add(m[1]);
  for (const m of bodySrc.matchAll(/['"]([a-zA-Z0-9_-]+)['"]\s*:\s*['"]([a-z0-9_]+_v1)['"]/g)) {
    registered.add(m[1]);
    registered.add(m[2]);
  }
  // Kind-Typen werden vom Eltern-Renderer konsumiert (kein eigener RENDERERS-Eintrag nötig).
  const CHILD_ONLY = new Set(["card_v1", "stat_v1", "tab_v1"]);
  const SKIP_OK = new Set(["hero_v1", "hero", "cta_v1", "cta"]);

  // DATA_ONLY: Pure Daten-Sections ohne eigenen visuellen Render-Block.
  // Werden von Page-/Detail-Komponenten programmatisch konsumiert
  // (z. B. Produktstammdaten-Overrides). Ein eigener RENDERERS-Eintrag wäre
  // sinnlos, weil die Section selbst nichts darstellt — sie liefert Felder.
  // Die Spiegel-Regel bleibt gewahrt, weil Sichtbarkeit/Reihenfolge im
  // konsumierenden Page-Renderer ohnehin nicht relevant ist (keine UI).
  const DATA_ONLY = new Set([
    "series_override_container_v1", // produkte.tuerkommunikation: Container für Serien-Overrides
    "series_override_v1",           // produkte.tuerkommunikation: einzelner Serien-Override (Stammdaten je Serie)
  ]);

  // BESPOKE_PAGE_BOUND: Section-Typ wird ausschließlich von EINER konkreten
  // Page-Komponente konsumiert (eigene UI, kein generischer Standardbaustein).
  // Der Audit erlaubt diese Typen, prüft aber explizit, dass die genannte
  // Page-Datei den Typ/section_key tatsächlich liest — sonst kippt der
  // Exempt-Status zurück auf rot (Spiegel-Bruch erkennbar).
  const BESPOKE_PAGE_BOUND = {
    "list_v1": {
      files: [
        "src/features/anwendungen/pages/ReferenzprojektDetailPage.tsx",
      ],
      needle: /cms\.text\(\s*["'](?:highlights|systems)["']/,
      hint: "Wird vom Referenzprojekt-Detail-Renderer (highlights / systems) konsumiert.",
    },
    "catalog_filter_grid_v1": {
      files: [
        "src/features/produkte/pages/TuerkommunikationHubPage.tsx",
        "src/features/produkte/pages/CategoryListPage.tsx",
      ],
      needle: /(filter-grid|category-grid)/,
      hint: "Wird vom Produkt-Katalog-Filter-Grid auf Kategorie-/Hub-Seiten konsumiert.",
    },
    "role_tabs_v1": {
      files: [
        "src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx",
      ],
      needle: /role_tabs/,
      hint: "Wird vom snipdoo-ip-Rollen-Tabs-Block konsumiert (eigene UI).",
    },
  };

  for (const [st] of psql(`
    select distinct section_type from cms_sections
    where is_active and section_type is not null
  `)) {
    if (registered.has(st) || CHILD_ONLY.has(st) || SKIP_OK.has(st) || DATA_ONLY.has(st)) continue;
    const bespoke = BESPOKE_PAGE_BOUND[st];
    if (bespoke) {
      // Mindestens eine der genannten Dateien muss den Typ tatsächlich konsumieren.
      const existingFiles = bespoke.files.filter((f) => fs.existsSync(f));
      const consumed = existingFiles.some((f) => bespoke.needle.test(fs.readFileSync(f, "utf8")));
      if (consumed) continue;
      add({
        code: "SECTION_TYPE_OHNE_RENDERER", severity: "rot",
        page_key: "(global)", section_key: "(bespoke binding broken)", section_type: st,
        field: bespoke.files.join(", "),
        cause: `section_type '${st}' ist als BESPOKE_PAGE_BOUND markiert, aber keine der gebundenen Dateien konsumiert den Typ noch — Binding ist gebrochen.`,
        fix: `Konsum in einer der Dateien wiederherstellen, BESPOKE_PAGE_BOUND-Eintrag aktualisieren oder Sections auf einen Standardtyp migrieren.`,
      });
      continue;
    }
    const cnt = psql(`select count(*) from cms_sections where is_active and section_type='${st.replace(/'/g, "''")}'`)[0]?.[0] ?? "?";
    add({
      code: "SECTION_TYPE_OHNE_RENDERER", severity: "rot",
      page_key: "(global)", section_key: "(diverse)", section_type: st,
      field: `${cnt} aktive Sections`,
      cause: `section_type '${st}' ist aktiv in DB, aber nicht in RENDERERS/normalizeType registriert — Public rendert über lokalen Sonderpfad oder gar nicht.`,
      fix: `Renderer für '${st}' registrieren, in DATA_ONLY/BESPOKE_PAGE_BOUND eintragen (mit konsumierender Datei) ODER aktive Sections auf einen Standardtyp migrieren (z. B. cards_v1).`,
    });
  }
}

// ---------------------------------------------------------------------------
// 17b) LOCALER_STANDARDSECTION_RENDERER
//      Page-Komponente rendert aktive Standardsections selbst, statt
//      `renderPageSectionByType` zu nutzen. Heuristik: Datei enthält ein
//      .map(...) das motion.article/article ausspielt — d. h. lokaler
//      Karten-Renderpfad statt zentraler CardsSectionV1.
// ---------------------------------------------------------------------------
{
  const PAGE_FILES = [
    { pageKey: "produkte.hub", file: "src/features/produkte/pages/ProduktHubPage.tsx" },
  ];
  for (const { pageKey, file } of PAGE_FILES) {
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, "utf8");
    // Heuristik: Datei enthält lokales <motion.article> oder <article …>
    // innerhalb einer .map(...)-Schleife → lokaler Karten-Renderpfad.
    const hasInlineCards = /<motion\.article\b/.test(src) || /\.map\([^)]*=>[\s\S]{0,200}?<article\b/.test(src);
    if (hasInlineCards) {
      add({
        code: "LOCALER_STANDARDSECTION_RENDERER", severity: "rot",
        page_key: pageKey, section_key: "(inline-grid)", section_type: "cards_v1?",
        field: file,
        cause: `${file} rendert eine Karten-Section als Inline-Grid (motion.article/.map). Standardkarten-Regeln (link_1..3, Chips, Bullets, Icon-Resolver) werden umgangen.`,
        fix: `Inline-Grid entfernen; Section über renderPageSectionByType('cards_v1') laufen lassen.`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 17c) CONTAINER_KINDER_NICHT_UEBER_STANDARDRENDERER
//      Container ist aktiv und hat card_v1-Kinder, aber eine Page-Datei
//      rendert diese Kinder lokal.
// ---------------------------------------------------------------------------
{
  const PAGE_FILES = [
    { pageKey: "produkte.hub", file: "src/features/produkte/pages/ProduktHubPage.tsx" },
  ];
  const rowsByPage = {};
  for (const [pk, ck] of psql(`
    select s.page_key, c.section_key
    from cms_sections s
    join cms_sections c on c.parent_section_id = s.id
    where s.is_active and c.is_active and c.section_type='card_v1'
      and s.section_type in ('cards_v1','card_grid_v1','product_scroller_v1','teaser_2col_v1')
  `)) {
    (rowsByPage[pk] ||= []).push(ck);
  }
  for (const { pageKey, file } of PAGE_FILES) {
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, "utf8");
    const kids = rowsByPage[pageKey] || [];
    if (kids.length === 0) continue;
    const inlineCardRender = /<motion\.article\b/.test(src) || /<article\b/.test(src);
    if (inlineCardRender) {
      add({
        code: "CONTAINER_KINDER_NICHT_UEBER_STANDARDRENDERER", severity: "rot",
        page_key: pageKey, section_key: "(container)", section_type: "cards_v1/card_v1",
        field: `${kids.length} card_v1-Kinder, Inline-Rendering in ${file}`,
        cause: `Container-Kinder (card_v1) werden in ${file} inline gerendert. link_1/2/3, Chips, Bullets und Icon-Resolver der Standardkarte fehlen.`,
        fix: `Inline-Karten entfernen; CardsSectionV1 übernimmt die card_v1-Kinder.`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 18) Code-Seite: lokale Karten-/Renderer-Sonderpfade (statisch)
// ---------------------------------------------------------------------------
function runGate(label, cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf-8" });
  return { label, status: r.status ?? 99, out: (r.stdout || "") + (r.stderr || "") };
}
const subGates = [
  runGate("persona-eine-wahrheit", "node", ["scripts/cms/persona-eine-wahrheit.mjs"]),
  runGate("card-renderer-paritaet", "node", ["scripts/cms/card-renderer-paritaet.mjs"]),
];
if (fs.existsSync("scripts/cms/persona-sort-order-wirksam.mjs")) {
  subGates.push(runGate("persona-sort-order-wirksam", "node", ["scripts/cms/persona-sort-order-wirksam.mjs"]));
}
for (const g of subGates) {
  if (g.status !== 0) {
    add({
      code: "CODE_SONDERRENDERER", severity: "rot",
      page_key: "(code)", section_key: "(code)", section_type: "",
      field: g.label,
      cause: `Statisches Gate ${g.label} schlug an — lokaler Karten-/Renderer-Sonderpfad oder Reihenfolge-Bruch im Code.`,
      fix: `Verstöße aus ${g.label} beheben (Details: \`node scripts/cms/${g.label}.mjs\`).`,
    });
  }
}

// ---------------------------------------------------------------------------
// Report schreiben
// ---------------------------------------------------------------------------
fs.mkdirSync(OUT_DIR, { recursive: true });

const byCode = {};
for (const f of findings) {
  byCode[f.code] = (byCode[f.code] || 0) + 1;
}

const json = {
  generated_at: new Date().toISOString(),
  total: findings.length,
  by_code: byCode,
  standard_types: STANDARD_TYPES,
  sub_gates: subGates.map((g) => ({ label: g.label, status: g.status })),
  findings,
};
writeBoth("globaler-spiegel-audit.json", JSON.stringify(json, null, 2));

const md = [];
md.push(`# Globaler Spiegel-Audit\n`);
md.push(`Stand: ${json.generated_at}\n`);
md.push(`Geprüfte Bausteine: ${STANDARD_TYPES.join(", ")}\n`);
md.push(`## Zusammenfassung\n`);
md.push(`| Befund | Anzahl |\n|---|---:|`);
const codes = Object.keys(byCode).sort();
for (const c of codes) md.push(`| ${c} | ${byCode[c]} |`);
if (codes.length === 0) md.push(`| — | 0 |`);
md.push(`\n**Gesamt: ${findings.length}**\n`);
md.push(`\n## Sub-Gates\n`);
md.push(`| Gate | Exit |\n|---|---:|`);
for (const g of subGates) md.push(`| ${g.label} | ${g.status} |`);

if (findings.length > 0) {
  md.push(`\n## Befunde im Detail\n`);
  for (const c of codes) {
    md.push(`\n### ${c} (${byCode[c]})\n`);
    md.push(`| page_key | section_key | section_type | field | cause | fix |`);
    md.push(`|---|---|---|---|---|---|`);
    for (const f of findings.filter((x) => x.code === c).slice(0, 200)) {
      md.push(`| ${f.page_key} | ${f.section_key} | ${f.section_type} | ${f.field} | ${f.cause} | ${f.fix} |`);
    }
    const rest = byCode[c] - 200;
    if (rest > 0) md.push(`\n_… ${rest} weitere Treffer in der JSON-Variante._`);
  }
}
writeBoth("globaler-spiegel-audit.md", md.join("\n"));

console.log(`globaler-spiegel-audit — ${findings.length} Befund(e).`);
for (const c of codes) console.log(`  • ${c}: ${byCode[c]}`);
console.log(`Report: ${OUT_MD}`);
console.log(`JSON  : ${OUT_JSON}`);

process.exit(findings.length > 0 ? 1 : 0);
