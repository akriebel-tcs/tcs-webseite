/**
 * Etappe S2 — Diff-Report Snapshot ↔ DB.
 *
 * Liest scripts/sync/snapshot/navigation.json und vergleicht mit dem
 * aktuellen DB-Stand. Schreibt Markdown-Report nach docs/sync/diff-report.md.
 *
 * Read-only. Keine Schreibzugriffe.
 *
 * Nutzung:
 *   bun scripts/sync/diff-report.mjs
 *
 * Voraussetzung: PGHOST/PGUSER/PGDATABASE/PGPASSWORD sind gesetzt
 * (Lovable-Sandbox stellt das automatisch bereit).
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_DIR = resolve(__dirname, "snapshot");
const OUT_PATH = resolve(__dirname, "../../docs/archiv/sync/diff-report.md");

function psqlJson(sql) {
  const out = execFileSync(
    "psql",
    ["-At", "-c", `select coalesce(jsonb_agg(t), '[]'::jsonb) from (${sql}) t`],
    { encoding: "utf8" },
  );
  return JSON.parse(out.trim());
}

function main() {
  const snapshot = JSON.parse(
    readFileSync(resolve(SNAPSHOT_DIR, "navigation.json"), "utf8"),
  );

  const dbNodes = psqlJson(
    `select nav_area, node_key, is_active, sort_order, page_key
       from public.cms_navigation_nodes`,
  );
  const dbPages = psqlJson(
    `select page_key, route_path, status, is_active
       from public.cms_pages`,
  );

  // Index DB
  const dbByAreaKey = new Map(
    dbNodes.map((n) => [`${n.nav_area}::${n.node_key}`, n]),
  );
  const dbByRoute = new Map(
    dbPages.filter((p) => p.route_path).map((p) => [p.route_path, p]),
  );

  // Index Snapshot
  const snapByAreaKey = new Map(
    snapshot.nodes.map((n) => [`${n.nav_area}::${n.node_key}`, n]),
  );
  const snapRoutes = new Set(
    snapshot.nodes.filter((n) => n.route_path).map((n) => n.route_path),
  );

  // Diff Navigation
  const navMissingInDb = []; // Snapshot hat es, DB nicht (aktiv)
  const navExtraInDb = []; // DB hat aktive Knoten, Snapshot nicht
  const navInactiveInDbButInSnap = []; // DB hat es inaktiv, Snapshot aktiv
  const navMatched = [];

  for (const [k, snap] of snapByAreaKey) {
    const db = dbByAreaKey.get(k);
    if (!db) {
      navMissingInDb.push(snap);
    } else if (!db.is_active) {
      navInactiveInDbButInSnap.push({ ...snap, db });
    } else {
      navMatched.push({ snap, db });
    }
  }
  for (const [k, db] of dbByAreaKey) {
    if (!snapByAreaKey.has(k) && db.is_active) {
      navExtraInDb.push(db);
    }
  }

  // Diff Pages (über route_path)
  const routesMissingInDb = [];
  const routesExtraInDb = [];
  for (const route of snapRoutes) {
    if (!dbByRoute.has(route)) routesMissingInDb.push(route);
  }
  for (const [route] of dbByRoute) {
    if (!snapRoutes.has(route)) routesExtraInDb.push(route);
  }

  const lines = [];
  lines.push(`# Diff-Report Snapshot ↔ DB`);
  lines.push(``);
  lines.push(`Generiert: ${new Date().toISOString()}`);
  lines.push(``);
  lines.push(`Snapshot-Quelle: \`${snapshot.source_project}\``);
  lines.push(`Snapshot generiert: ${snapshot.generated_at}`);
  lines.push(``);
  lines.push(`## Zusammenfassung`);
  lines.push(``);
  lines.push(`| Bereich | Snapshot | DB (aktiv) | DB (inaktiv) | Δ fehlt in DB | Δ überzählig in DB |`);
  lines.push(`|---|---:|---:|---:|---:|---:|`);
  for (const area of ["main", "meta", "footer", "persona"]) {
    const snapCount = snapshot.nodes.filter((n) => n.nav_area === area).length;
    const dbActive = dbNodes.filter(
      (n) => n.nav_area === area && n.is_active,
    ).length;
    const dbInactive = dbNodes.filter(
      (n) => n.nav_area === area && !n.is_active,
    ).length;
    const missing = navMissingInDb.filter((n) => n.nav_area === area).length;
    const extra = navExtraInDb.filter((n) => n.nav_area === area).length;
    lines.push(
      `| ${area} | ${snapCount} | ${dbActive} | ${dbInactive} | ${missing} | ${extra} |`,
    );
  }
  lines.push(``);
  lines.push(`Pages (route_path-Match):`);
  lines.push(`- Snapshot: ${snapRoutes.size} eindeutige Routen`);
  lines.push(`- DB: ${dbPages.length} cms_pages-Einträge`);
  lines.push(`- Routen fehlen in DB: ${routesMissingInDb.length}`);
  lines.push(`- Routen überzählig in DB: ${routesExtraInDb.length}`);
  lines.push(``);

  function tableNodes(title, list) {
    lines.push(`## ${title} (${list.length})`);
    lines.push(``);
    if (list.length === 0) {
      lines.push(`_keine_`);
      lines.push(``);
      return;
    }
    lines.push(`| nav_area | node_key | route_path | label_de |`);
    lines.push(`|---|---|---|---|`);
    for (const n of list) {
      lines.push(
        `| ${n.nav_area} | \`${n.node_key}\` | ${n.route_path ?? "—"} | ${n.label_de ?? "—"} |`,
      );
    }
    lines.push(``);
  }

  tableNodes("Navigation: in Snapshot, fehlt in DB", navMissingInDb);
  tableNodes(
    "Navigation: in DB inaktiv, in Snapshot aktiv (S0-Kandidaten zum Reaktivieren)",
    navInactiveInDbButInSnap,
  );
  lines.push(`## Navigation: in DB aktiv, NICHT in Snapshot (${navExtraInDb.length})`);
  lines.push(``);
  if (navExtraInDb.length === 0) {
    lines.push(`_keine_`);
  } else {
    lines.push(`| nav_area | node_key | page_key |`);
    lines.push(`|---|---|---|`);
    for (const n of navExtraInDb) {
      lines.push(
        `| ${n.nav_area} | \`${n.node_key}\` | ${n.page_key ?? "—"} |`,
      );
    }
  }
  lines.push(``);

  lines.push(`## Routen: fehlen in DB (${routesMissingInDb.length})`);
  lines.push(``);
  if (routesMissingInDb.length === 0) {
    lines.push(`_keine_`);
  } else {
    for (const r of routesMissingInDb.sort()) lines.push(`- \`${r}\``);
  }
  lines.push(``);

  lines.push(`## Routen: überzählig in DB (${routesExtraInDb.length})`);
  lines.push(``);
  if (routesExtraInDb.length === 0) {
    lines.push(`_keine_`);
  } else {
    for (const r of routesExtraInDb.sort()) lines.push(`- \`${r}\``);
  }
  lines.push(``);

  lines.push(`## Hinweise`);
  lines.push(``);
  lines.push(`- "fehlt in DB" = muss durch S4 (apply-snapshot) angelegt werden.`);
  lines.push(`- "überzählig in DB, aktiv" = Knoten in DB ohne Quellgegenstück; vor Public-Schaltung prüfen.`);
  lines.push(`- "in DB inaktiv, in Snapshot aktiv" = wurden in S0 deaktiviert; werden in S4 wieder aktiv geschaltet.`);
  lines.push(`- DB-Pages mit Routen, die im Snapshot fehlen, werden NICHT automatisch archiviert. Manueller Review nötig.`);

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, lines.join("\n"));
  console.log(`Diff-Report geschrieben: ${OUT_PATH}`);
  console.log(``);
  console.log(`Schnellübersicht:`);
  console.log(`  Nav fehlt in DB:           ${navMissingInDb.length}`);
  console.log(`  Nav inaktiv (Snapshot=aktiv): ${navInactiveInDbButInSnap.length}`);
  console.log(`  Nav überzählig (DB=aktiv): ${navExtraInDb.length}`);
  console.log(`  Routen fehlen in DB:       ${routesMissingInDb.length}`);
  console.log(`  Routen überzählig in DB:   ${routesExtraInDb.length}`);
}

main();
