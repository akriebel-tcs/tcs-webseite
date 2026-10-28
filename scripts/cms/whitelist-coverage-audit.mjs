#!/usr/bin/env node
/**
 * whitelist-coverage-audit.mjs — DB-seitiger Gate.
 *
 * Stellt sicher, dass die Admin-Whitelist (`cms_admin_editable_fields`)
 * vollständig zur tatsächlichen DB-Wahrheit passt:
 *
 *   1) Jedes Text-Feld in `cms_section_fields` mit Wert MUSS einen
 *      Whitelist-Eintrag (de+en) haben — sonst kann es im Admin nicht
 *      gepflegt werden, obwohl es öffentlich sichtbar ist.
 *   2) Jede `card_v1`-Section mit hochgeladenem Bild MUSS einen
 *      passenden Whitelist-Eintrag haben.
 *   3) Jede `card_v1`-Section MUSS image/thumbnail/icon_image als
 *      pflegbares Feld führen (damit Redaktion ein NEUES Bild laden
 *      kann, auch ohne Vorbestand).
 *
 * Voraussetzung: PGHOST/PGUSER/PGPASSWORD/PGDATABASE gesetzt.
 *
 * Skip-Verbot (Etappe 7 — „Eine Wahrheit"-Abschluss):
 *   - `SKIP_DB=1` allein zählt NICHT als grün. Wer ohne DB laufen muss,
 *     setzt zusätzlich `ALLOW_FIXTURE_ONLY=1` UND verweist auf einen
 *     `CMS_FIXTURE_PATH=...` mit eingecheckter Snapshot-Wahrheit. Sonst
 *     bricht das Skript hart mit Exit 2 ab.
 *
 * Exit:
 *   0 = sauber
 *   1 = Lücken gefunden → CI rot, mit konkreter Auflistung
 *   2 = Skip ohne Fixture (Konfigurations-/CI-Fehler)
 */
import { spawnSync } from "node:child_process";

if (process.env.SKIP_DB === "1") {
  if (process.env.ALLOW_FIXTURE_ONLY !== "1" || !process.env.CMS_FIXTURE_PATH) {
    console.error(
      "whitelist-coverage-audit: SKIP_DB=1 ist ohne ALLOW_FIXTURE_ONLY=1 + CMS_FIXTURE_PATH NICHT als grün erlaubt.",
    );
    process.exit(2);
  }
  console.log(
    `whitelist-coverage-audit: Fixture-Pfad ${process.env.CMS_FIXTURE_PATH} — DB-Audit übersprungen.`,
  );
  process.exit(0);
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
    kind: "text-field-without-whitelist",
    sql: `
      with relevant as (
        select page_key, section_key from cms_sections
        where is_active and section_type in
          ('card_v1','teaser_2col_v1','faq_v1','cta_v1','feature_grid_v1',
           'content_v1','hero_v1','stat_v1','tab_v1','list_v1','rich_v1')
      ),
      fields as (
        select page_key, section_key, field_key, locale
        from cms_section_fields where value is not null and value <> ''
      )
      select f.page_key, f.section_key, f.field_key, f.locale
      from fields f
      join relevant r using(page_key, section_key)
      left join cms_admin_editable_fields w
        on w.page_key=f.page_key and w.section_key=f.section_key
       and w.field_key=f.field_key and w.locale=f.locale and w.is_enabled
      where w.field_key is null
      order by f.page_key, f.section_key, f.field_key, f.locale
    `,
  },
  {
    kind: "card-asset-without-whitelist",
    sql: `
      with cards as (
        select page_key, section_key from cms_sections
        where is_active and section_type = 'card_v1'
      )
      select distinct a.page_key, a.section_key, a.field_key
      from cms_assets a
      join cards c using(page_key, section_key)
      left join cms_admin_editable_fields w
        on w.page_key=a.page_key and w.section_key=a.section_key
       and w.field_key=a.field_key and w.is_enabled
      where a.is_active
        and a.field_key in ('image','thumbnail','icon_image')
        and w.field_key is null
      order by a.page_key, a.section_key, a.field_key
    `,
  },
  {
    kind: "card-without-upload-slot-whitelist",
    sql: `
      with cards as (
        select page_key, section_key from cms_sections
        where is_active and section_type = 'card_v1'
      ),
      needed as (
        select c.page_key, c.section_key, fk.field_key, l.locale
        from cards c
        cross join (values ('image'),('thumbnail'),('icon_image')) as fk(field_key)
        cross join (values ('de'),('en')) as l(locale)
      )
      select n.page_key, n.section_key, n.field_key, n.locale
      from needed n
      left join cms_admin_editable_fields w
        on w.page_key=n.page_key and w.section_key=n.section_key
       and w.field_key=n.field_key and w.locale=n.locale and w.is_enabled
      where w.field_key is null
      order by n.page_key, n.section_key, n.field_key, n.locale
    `,
  },
];

const gaps = [];
for (const c of checks) {
  const rows = psql(c.sql);
  if (rows.length > 0) gaps.push({ kind: c.kind, rows });
}

if (gaps.length === 0) {
  console.log("✓ whitelist-coverage-audit: GRÜN — Admin-Whitelist deckt alle Felder.");
  process.exit(0);
}

console.error("✗ whitelist-coverage-audit: ROT — Whitelist-Lücken gefunden.");
for (const g of gaps) {
  console.error(`\n[${g.kind}] ${g.rows.length} Treffer:`);
  for (const r of g.rows.slice(0, 50)) console.error("  ", r.join(" · "));
  if (g.rows.length > 50) console.error(`  … (${g.rows.length - 50} weitere)`);
}
process.exit(1);
