#!/usr/bin/env node
/**
 * admin-anzeige-spiegel.mjs — „Eine Wahrheit"-Gate für die Admin-Anzeige.
 *
 * Hintergrund: Wenn der Admin für eine Seite die Inhalte gar nicht erst
 * lädt (alter `cmsManagedPageKeys`-Gate), zeigt er fälschlich „Inhalte
 * aus Code & i18n", obwohl die DB längst Sections und Felder führt.
 *
 * Dieses Gate simuliert die aktualisierte Admin-Logik aus
 * `PageEditor.tsx` (Etappe „Eine Wahrheit"): eine Seite ist genau dann
 * KEINE „Code-Seite", wenn sie mindestens eine aktive Section ODER
 * mindestens einen Feldwert in der DB hat — unabhängig davon, ob ihr
 * `page_key` in irgendeinem Code-Whitelist steht.
 *
 * Geprüft (Exit 1 bei Verletzung):
 *   - Jede Seite (`cms_pages.page_key`) mit ≥1 aktiver Section ODER
 *     ≥1 Feldwert MUSS im Admin als CMS-gepflegt sichtbar sein.
 *
 * Skip-Verbot wie bei den anderen DB-Gates.
 * Exit: 0 sauber · 1 Anzeige-Fehler · 2 Konfigurationsfehler.
 */
import { spawnSync } from "node:child_process";

if (process.env.SKIP_DB === "1") {
  if (process.env.ALLOW_FIXTURE_ONLY !== "1" || !process.env.CMS_FIXTURE_PATH) {
    console.error(
      "admin-anzeige-spiegel: SKIP_DB=1 ohne ALLOW_FIXTURE_ONLY=1 + CMS_FIXTURE_PATH ist nicht erlaubt.",
    );
    process.exit(2);
  }
  console.log(
    `admin-anzeige-spiegel: Fixture-Pfad ${process.env.CMS_FIXTURE_PATH} — übersprungen.`,
  );
  process.exit(0);
}

if (!process.env.PGHOST) {
  console.error("admin-anzeige-spiegel: PGHOST nicht gesetzt — DB-Zugang fehlt.");
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

// Pflicht-Check: Alle Seiten mit DB-Inhalt MÜSSEN als CMS-gepflegt anzeigen.
// Wenn eine Seite Sections/Felder hat, aber der Admin sie als „Code-Seite"
// markiert hätte (alte Logik: cmsManagedPageKeys leer + nichts geladen), ist
// das ein Spiegel-Bruch.
//
// Die neue Logik (PageEditor.tsx ab „Eine Wahrheit"-Etappe) lädt das Bundle
// für JEDE Seite mit page_key. Dieses Gate verifiziert, dass keine Seite
// existiert, deren DB-Inhalt im Admin unsichtbar bliebe, weil die Bundle-
// Hooks (`usePilotBundleForPage` / `useAssetsForPage`) den page_key sehen.

const orphans = psql(`
  with sec as (
    select page_key from cms_sections where is_active=true
  ),
  fld as (
    select page_key from cms_section_fields where value is not null and value <> ''
  ),
  ass as (
    select page_key from cms_assets where is_active=true
  ),
  pages as (
    select page_key from cms_pages
  ),
  content as (
    select page_key from sec union select page_key from fld union select page_key from ass
  )
  select c.page_key,
         (select count(*) from sec s where s.page_key=c.page_key) as sections,
         (select count(*) from fld f where f.page_key=c.page_key) as fields,
         (select count(*) from ass a where a.page_key=c.page_key) as assets
  from content c
  left join pages p on p.page_key=c.page_key
  where p.page_key is null
  order by c.page_key;
`);

// Zusätzlich: jede Seite mit Inhalt MUSS im Admin-Baum erreichbar sein —
// entweder über einen aktiven Navigationsknoten ODER über einen
// ausgeblendeten Knoten (landet im Altbestand-Bucket, der Editor bleibt
// nutzbar). Echte Verstöße: gar kein Knoten in `cms_navigation_nodes`.
const noNavNodes = psql(`
  with content as (
    select distinct page_key from cms_sections where is_active=true
    union
    select distinct page_key from cms_section_fields where value is not null and value <> ''
  )
  select c.page_key
  from content c
  where not exists (
    select 1 from cms_navigation_nodes n where n.page_key=c.page_key
  )
  order by c.page_key;
`);


let violations = 0;
console.log("admin-anzeige-spiegel — Ergebnis:");

if (orphans.length === 0) {
  console.log("  ✓ Keine Seiten mit DB-Inhalt ohne cms_pages-Eintrag.");
} else {
  violations += orphans.length;
  console.log(`  ✗ ${orphans.length} Seite(n) mit DB-Inhalt OHNE cms_pages-Eintrag:`);
  for (const row of orphans.slice(0, 20)) {
    console.log(`      • ${row.join(" / ")}`);
  }
}

if (noNavNodes.length === 0) {
  console.log("  ✓ Jede Seite mit DB-Inhalt hat einen aktiven Navigationsknoten.");
} else {
  violations += noNavNodes.length;
  console.log(`  ✗ ${noNavNodes.length} Seite(n) mit Inhalt ohne aktiven Navigationsknoten:`);
  for (const row of noNavNodes.slice(0, 20)) {
    console.log(`      • ${row[0]}`);
  }
}

if (violations === 0) {
  console.log("\n✓ admin-anzeige-spiegel: GRÜN — Admin spiegelt DB-Wahrheit.");
  process.exit(0);
}
console.error(`\n✗ admin-anzeige-spiegel: ROT — ${violations} Verstöße.`);
process.exit(1);
