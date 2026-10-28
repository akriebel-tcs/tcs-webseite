#!/usr/bin/env node
/**
 * standardbaustein-vertrag.mjs — Eine-Wahrheit-Gate.
 *
 * Stellt für alle Standardbausteine sicher, dass DB-Wahrheit, Whitelist
 * und Renderer dieselbe Wahrheit nutzen — keine stillen Lücken, keine
 * lokalen Sonderpfade. Läuft DB-getrieben; ohne DB hart Exit 2.
 *
 * Geprüft (Exit 1 bei jeder Verletzung):
 *
 *   A) Container-Header-Whitelist
 *      Jede aktive `cards_v1`/`product_scroller_v1`/`teaser_2col_v1`/
 *      `feature_grid_v1`-Section MUSS `label`+`title`+`intro` für DE+EN
 *      in `cms_admin_editable_fields` whitelisten.
 *
 *   B) Link-Ziel-Vollständigkeit
 *      Jedes `link_N_label` mit Wert MUSS ein nicht-leeres `link_N_href`
 *      derselben Section haben (sonst zeigt der Renderer einen Link ohne
 *      Ziel).
 *
 *   C) Feld-Whitelist-Vollständigkeit
 *      Jedes nicht-leere `cms_section_fields`-Feld einer aktiven
 *      Standardsection MUSS einen passenden Whitelist-Eintrag haben.
 *
 *   D) Hero-Pflicht
 *      Jede aktive `hero_v1`-Section MUSS mindestens `headline` (DE+EN)
 *      mit Wert haben.
 *
 * Skip-Verbot: `SKIP_DB=1` allein zählt nicht als grün — verlangt
 * zusätzlich `ALLOW_FIXTURE_ONLY=1` + `CMS_FIXTURE_PATH`.
 *
 * Exit: 0 = sauber · 1 = Vertragsbruch · 2 = Konfigurationsfehler.
 */
import { spawnSync } from "node:child_process";

if (process.env.SKIP_DB === "1") {
  if (process.env.ALLOW_FIXTURE_ONLY !== "1" || !process.env.CMS_FIXTURE_PATH) {
    console.error(
      "standardbaustein-vertrag: SKIP_DB=1 ohne ALLOW_FIXTURE_ONLY=1 + CMS_FIXTURE_PATH ist nicht erlaubt.",
    );
    process.exit(2);
  }
  console.log(
    `standardbaustein-vertrag: Fixture-Pfad ${process.env.CMS_FIXTURE_PATH} — übersprungen.`,
  );
  process.exit(0);
}

if (!process.env.PGHOST) {
  console.error("standardbaustein-vertrag: PGHOST nicht gesetzt — DB-Zugang fehlt.");
  process.exit(2);
}

function psql(sql) {
  const r = spawnSync("psql", ["-t", "-A", "-F", "\t", "-c", sql], { encoding: "utf-8" });
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

const checks = [
  {
    name: "A_container_header_whitelist",
    sql: `
      with containers as (
        select page_key, section_key from cms_sections
        where is_active and section_type in ('cards_v1','product_scroller_v1','teaser_2col_v1','feature_grid_v1')
      ),
      need as (
        select c.page_key, c.section_key, fk.field_key, loc.locale
        from containers c
        cross join (values ('label'),('title'),('intro')) as fk(field_key)
        cross join (values ('de'),('en')) as loc(locale)
      )
      select n.page_key, n.section_key, n.field_key, n.locale
      from need n
      where not exists (
        select 1 from cms_admin_editable_fields w
        where w.page_key=n.page_key and w.section_key=n.section_key
          and w.field_key=n.field_key and w.locale=n.locale and w.is_enabled=true
      )
      limit 50;
    `,
  },
  {
    name: "B_link_label_without_href",
    sql: `
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
      limit 50;
    `,
  },
  {
    name: "C_field_without_whitelist",
    sql: `
      with relevant as (
        select page_key, section_key from cms_sections
        where is_active and section_type in
          ('card_v1','teaser_2col_v1','faq_v1','cta_v1','feature_grid_v1',
           'content_v1','hero_v1','stats_v1','cards_v1','product_scroller_v1')
      ),
      fields as (
        select page_key, section_key, field_key, locale
        from cms_section_fields where value is not null and value <> ''
      )
      select f.page_key, f.section_key, f.field_key, f.locale
      from fields f
      join relevant r using(page_key, section_key)
      where not exists (
        select 1 from cms_admin_editable_fields w
        where w.page_key=f.page_key and w.section_key=f.section_key
          and w.field_key=f.field_key and w.locale=f.locale and w.is_enabled=true
      )
      limit 50;
    `,
  },
  {
    name: "D_hero_without_headline",
    sql: `
      with heroes as (
        select page_key, section_key from cms_sections
        where is_active and section_type in ('hero_v1','hero')
      ),
      need as (
        select h.page_key, h.section_key, loc.locale
        from heroes h cross join (values ('de'),('en')) as loc(locale)
      )
      select n.page_key, n.section_key, n.locale
      from need n
      where not exists (
        select 1 from cms_section_fields f
        where f.page_key=n.page_key and f.section_key=n.section_key
          and f.locale=n.locale and f.field_key='headline'
          and f.value is not null and f.value <> ''
      )
      limit 50;
    `,
  },
];

let totalViolations = 0;
const summary = [];
for (const c of checks) {
  const rows = psql(c.sql);
  summary.push({ check: c.name, violations: rows.length, sample: rows.slice(0, 5) });
  totalViolations += rows.length;
}

console.log("standardbaustein-vertrag — Ergebnis:");
for (const s of summary) {
  const icon = s.violations === 0 ? "✓" : "✗";
  console.log(`  ${icon} ${s.check}: ${s.violations}`);
  for (const row of s.sample) {
    console.log(`      • ${row.join(" / ")}`);
  }
}

if (totalViolations === 0) {
  console.log("\n✓ standardbaustein-vertrag: GRÜN — Eine Wahrheit bestätigt.");
  process.exit(0);
}
console.error(`\n✗ standardbaustein-vertrag: ROT — ${totalViolations} Verstöße.`);
process.exit(1);
