#!/usr/bin/env node
/**
 * d3a-masterliste.mjs (Etappe D3a.2 + D3a.3 + D3a.4)
 *
 * Zweck:
 *   Fuehrt die drei offenen Spiegel-Befundklassen in EINE Masterliste zusammen,
 *   ordnet jedem Befund einen Cluster (A–E) zu und schreibt Markdown + JSON.
 *
 * Quellen (bereits vorhanden):
 *   - aktive-db-sections-ohne-renderpfad.json      (Richtung A)
 *   - public-blocks-ignorieren-admin-visibility.json (Richtung B + C)
 *
 * Output:
 *   - docs/04-betrieb/audit-snapshot/eine-wahrheit-offene-befunde-masterliste.json
 *   - docs/04-betrieb/audit-snapshot/eine-wahrheit-offene-befunde-masterliste.md
 *
 * Hinweis: rein lesend, keine Code-Fixes.
 */
import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs/04-betrieb/audit-snapshot");

const A = JSON.parse(await fs.readFile(path.join(OUT, "aktive-db-sections-ohne-renderpfad.json"), "utf8"));
const B = JSON.parse(await fs.readFile(path.join(OUT, "public-blocks-ignorieren-admin-visibility.json"), "utf8"));

// Routen aus DB (best effort — wenn psql nicht da, leer lassen)
const routes = new Map();
try {
  const out = execSync(`psql -t -A -F '|' -c "select page_key, route_path from cms_pages where route_path is not null"`, { encoding: "utf8" });
  for (const line of out.split("\n")) {
    const [pk, rp] = line.split("|");
    if (pk && rp) routes.set(pk.trim(), rp.trim());
  }
} catch {
  // ignorieren — Routen optional
}

/* ----------------------- Clusterung ----------------------- */

function cluster(pageKey, pageFile) {
  if (/SnipdooIp|snipdoo-ip/i.test(pageFile)) return "D — Spezialseite mit vielen ignorierten Sections";
  if (pageKey.startsWith("anwendungen.")) return "A — Anwendungen-Detailseiten";
  if (pageKey.startsWith("eingangssysteme.") && pageKey !== "eingangssysteme.root") return "B — Eingangssysteme-Sub-Pages";
  if (pageKey === "kontakt" || pageKey.startsWith("kontakt.") || pageKey.startsWith("serviceportal") ||
      pageKey === "presse" || pageKey === "karriere" || pageKey.startsWith("legal.") ||
      pageKey === "login" || pageKey === "wissen.akademie")
    return "E — Registrierte Sonderseiten";
  if (/SnipdooIp/.test(pageFile)) return "D — Spezialseite";
  return "F — Sonstige (Einzelfall)";
}

function severityFromA() { return "medium"; } // Richtung A: DB an, Public unsichtbar — Spiegel gebrochen, aber kein Layout-Bruch
function recommendationFromA(sectionType) {
  if (sectionType === "faq" || sectionType === "cta_v1" || sectionType === "standard_cta") {
    return "Generischen Rest-Renderer in Page eintragen (Pattern wie P027/TuerkommunikationPage).";
  }
  return "Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren.";
}

function recommendationFromB(f) {
  if (f.confidence === "high") return "Sofort: Visibility-Guard `cms.sections.some(...)` einbauen.";
  if (f.section_type === "hero" || f.section_type === "hero_v1")
    return "Cluster C: zentral in `CmsPageLayout` loesen — nicht pro Page.";
  return "Visibility-Guard einbauen oder Section in DB auf is_active=false setzen.";
}

function effort(cluster, section_type) {
  if (cluster.startsWith("C")) return "S (zentral)";
  if (cluster.startsWith("D")) return "L (Sonderseite)";
  return "S (Codemod-faehig)";
}

function risiko(direction, sectionType) {
  if (direction === "A") return "niedrig (zusaetzliche Section erscheint)";
  if (direction === "B") return "mittel (Block kann verschwinden, wenn DB aus)";
  return "niedrig (kein Sichtbarkeitsbruch)";
}

/* ----------------------- Mergen ----------------------- */

const master = [];

for (const f of A.findings) {
  master.push({
    direction: "A",
    direction_name: "AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD",
    severity: f.section_key === "snipdoo" || f.section_key === "cta" ? "high" : "medium",
    page_key: f.page_key,
    route_path: routes.get(f.page_key) ?? null,
    page_file: f.page_file,
    section_key: f.section_key,
    section_type: f.section_type,
    cluster: cluster(f.page_key, f.page_file),
    empfehlung: recommendationFromA(f.section_type),
    risiko: risiko("A", f.section_type),
    aufwand: effort(cluster(f.page_key, f.page_file), f.section_type),
    quelle: "aktive-db-sections-ohne-renderpfad.json",
  });
}

for (const f of B.buckets.rot_high_blocker) {
  master.push({
    direction: "B",
    direction_name: "PUBLIC_BLOCK_IGNORIERT_DB_VISIBILITY",
    severity: "high",
    page_key: f.page_key,
    route_path: routes.get(f.page_key) ?? null,
    page_file: f.page_file,
    section_key: f.section_key,
    section_type: f.section_type,
    cluster: cluster(f.page_key, f.page_file),
    empfehlung: recommendationFromB(f),
    risiko: risiko("B", f.section_type),
    aufwand: "S",
    quelle: "public-blocks-ignorieren-admin-visibility.json#rot",
  });
}

for (const f of B.buckets.gelb_medium_kandidat) {
  master.push({
    direction: "B",
    direction_name: "PUBLIC_BLOCK_IGNORIERT_DB_VISIBILITY",
    severity: "medium",
    page_key: f.page_key,
    route_path: routes.get(f.page_key) ?? null,
    page_file: f.page_file,
    section_key: f.section_key,
    section_type: f.section_type,
    cluster: cluster(f.page_key, f.page_file),
    empfehlung: recommendationFromB(f),
    risiko: risiko("B", f.section_type),
    aufwand: effort(cluster(f.page_key, f.page_file), f.section_type),
    quelle: "public-blocks-ignorieren-admin-visibility.json#gelb_medium",
  });
}

for (const f of B.buckets.gelb_restschuld_ohne_bindung) {
  master.push({
    direction: "C",
    direction_name: "PUBLIC_BLOCK_OHNE_DB_BINDUNG",
    severity: "restschuld",
    page_key: f.page_key,
    route_path: routes.get(f.page_key) ?? null,
    page_file: f.page_file,
    section_key: f.hardcoded_key,
    section_type: "(kein CMS-Pendant)",
    cluster: cluster(f.page_key, f.page_file),
    empfehlung: "Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren.",
    risiko: risiko("C"),
    aufwand: "M (Inhaltsmigration)",
    quelle: "public-blocks-ignorieren-admin-visibility.json#restschuld",
  });
}

/* ----------------------- Cluster-Aggregat ----------------------- */

const byCluster = new Map();
for (const m of master) {
  if (!byCluster.has(m.cluster)) byCluster.set(m.cluster, { count: 0, pages: new Set(), bySev: { high: 0, medium: 0, restschuld: 0, low: 0 } });
  const c = byCluster.get(m.cluster);
  c.count++;
  c.pages.add(m.page_key);
  c.bySev[m.severity] = (c.bySev[m.severity] ?? 0) + 1;
}

const clusterRows = [...byCluster.entries()]
  .map(([name, c]) => ({ name, befunde: c.count, seiten: c.pages.size, ...c.bySev }))
  .sort((a, b) => b.befunde - a.befunde);

/* ----------------------- Batch-Empfehlung ----------------------- */

const batches = [
  {
    nr: 1,
    titel: "Cluster C — Hero zentral in CmsPageLayout gaten",
    seiten: master.filter((m) => (m.section_type === "hero" || m.section_type === "hero_v1") && m.direction === "B").map((m) => m.page_key),
    befunde: master.filter((m) => (m.section_type === "hero" || m.section_type === "hero_v1") && m.direction === "B").length,
    effekt: "Eliminiert ~30 Medium-Befunde in einem zentralen Patch.",
    risiko: "mittel — CmsPageLayout wird zentral angefasst, viele Pages betroffen.",
    browser_abnahme: "ja (Stichprobe ueber alle Cluster-Pages)",
  },
  {
    nr: 2,
    titel: "Cluster A — Anwendungen-Detailseiten per Codemod",
    seiten: [...new Set(master.filter((m) => m.cluster.startsWith("A")).map((m) => m.page_key))],
    befunde: master.filter((m) => m.cluster.startsWith("A")).length,
    effekt: "Wiederholbares Visibility-Guard-Pattern auf gleich gebaute Detailseiten.",
    risiko: "niedrig — gleichfoermige Pages, einheitlicher Slot-Satz.",
    browser_abnahme: "ja (Stichprobe 3 Pages)",
  },
  {
    nr: 3,
    titel: "Cluster B — Eingangssysteme-Sub-Pages per Codemod",
    seiten: [...new Set(master.filter((m) => m.cluster.startsWith("B —")).map((m) => m.page_key))],
    befunde: master.filter((m) => m.cluster.startsWith("B —")).length,
    effekt: "Gleicher Slot-Satz (hero/nav/items/topics/cta), Pattern wie Batch 2.",
    risiko: "niedrig.",
    browser_abnahme: "ja (Stichprobe 3 Pages)",
  },
  {
    nr: 4,
    titel: "Cluster A-Renderpfad — generischer Rest-Renderer auf Detailseiten",
    seiten: [...new Set(master.filter((m) => m.direction === "A" && m.cluster.startsWith("A")).map((m) => m.page_key))],
    befunde: master.filter((m) => m.direction === "A" && m.cluster.startsWith("A")).length,
    effekt: "Aktive DB-Sections (FAQ, CTA) werden auf gleichartigen Pages sichtbar.",
    risiko: "niedrig-mittel — neue Bloecke erscheinen Public.",
    browser_abnahme: "ja (jede Page pruefen)",
  },
  {
    nr: 5,
    titel: "Cluster D — SnipdooIpPage und aehnliche Sonderseiten",
    seiten: [...new Set(master.filter((m) => m.cluster.startsWith("D")).map((m) => m.page_key))],
    befunde: master.filter((m) => m.cluster.startsWith("D")).length,
    effekt: "Speziallayout entweder vollstaendig CMS-gefuehrt oder als bewusste Sonderseite registrieren.",
    risiko: "hoch — Layout-Eingriff.",
    browser_abnahme: "ja (volle Page-Abnahme).",
  },
  {
    nr: 6,
    titel: "Cluster E — Sonderseiten-Register pflegen",
    seiten: [...new Set(master.filter((m) => m.cluster.startsWith("E")).map((m) => m.page_key))],
    befunde: master.filter((m) => m.cluster.startsWith("E")).length,
    effekt: "Klare Trennung CMS-getrieben vs. bewusst hartcodiert.",
    risiko: "niedrig (nur Registereintraege).",
    browser_abnahme: "nein.",
  },
  {
    nr: 7,
    titel: "Klasse C (Restschuld) — Inhalt-zuerst-Migration",
    seiten: [...new Set(master.filter((m) => m.direction === "C").map((m) => m.page_key))],
    befunde: master.filter((m) => m.direction === "C").length,
    effekt: "Pflegbarkeit im Admin; kein Sichtbarkeitsbruch.",
    risiko: "niedrig.",
    browser_abnahme: "nein (Inhalt unveraendert).",
  },
];

/* ----------------------- Schreiben ----------------------- */

await fs.writeFile(
  path.join(OUT, "eine-wahrheit-offene-befunde-masterliste.json"),
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      counts: {
        total: master.length,
        by_direction: {
          A_aktive_db_ohne_renderpfad: master.filter((m) => m.direction === "A").length,
          B_public_ignoriert_visibility: master.filter((m) => m.direction === "B").length,
          C_public_ohne_db_bindung: master.filter((m) => m.direction === "C").length,
        },
        by_severity: {
          high: master.filter((m) => m.severity === "high").length,
          medium: master.filter((m) => m.severity === "medium").length,
          restschuld: master.filter((m) => m.severity === "restschuld").length,
        },
        by_cluster: Object.fromEntries(clusterRows.map((r) => [r.name, r.befunde])),
      },
      cluster: clusterRows,
      batches,
      master,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

const md = [];
md.push("# Eine Wahrheit — offene Befunde Masterliste (D3a.2 + D3a.3 + D3a.4)");
md.push("");
md.push(`Stand: ${new Date().toISOString()}`);
md.push("");
md.push("Fuehrt die drei offenen Spiegel-Befundklassen in EINE Liste zusammen, ordnet");
md.push("jedem Eintrag einen Cluster zu und schlaegt eine Umsetzungs-Reihenfolge vor.");
md.push("");
md.push("> D3a liefert nur Analyse + Plan. Noch keine Code-Fixes.");
md.push("");
md.push("## Ampel-Gesamtbild");
md.push("");
md.push("| Ampel | Bedeutung | Anzahl |");
md.push("|---|---|---|");
md.push(`| 🔴 rot | High-Blocker (Spiegel gebrochen, Public falsch) | **${master.filter((m) => m.severity === "high").length}** |`);
md.push(`| 🟡 gelb | Medium-Kandidat (Spiegel unwirksam, kein Sichtbarkeitsbruch heute) | **${master.filter((m) => m.severity === "medium").length}** |`);
md.push(`| 🟡 gelb | Restschuld (Inhalt im Code, nicht im Admin) | **${master.filter((m) => m.severity === "restschuld").length}** |`);
md.push("");
md.push("### Verteilung nach Richtung");
md.push("");
md.push("| Richtung | Beschreibung | Anzahl |");
md.push("|---|---|---|");
md.push(`| A | DB an, Public rendert nicht | ${master.filter((m) => m.direction === "A").length} |`);
md.push(`| B | Public rendert, Admin-Schalter ohne Wirkung | ${master.filter((m) => m.direction === "B").length} |`);
md.push(`| C | Public-Block ohne CMS-Gegenstueck | ${master.filter((m) => m.direction === "C").length} |`);
md.push("");
md.push("## Cluster-Uebersicht");
md.push("");
md.push("| Cluster | Befunde | Seiten | high | medium | restschuld |");
md.push("|---|---|---|---|---|---|");
for (const c of clusterRows) {
  md.push(`| ${c.name} | ${c.befunde} | ${c.seiten} | ${c.high ?? 0} | ${c.medium ?? 0} | ${c.restschuld ?? 0} |`);
}
md.push("");
md.push("## Empfohlene Batch-Reihenfolge");
md.push("");
for (const b of batches) {
  md.push(`### Batch ${b.nr} — ${b.titel}`);
  md.push("");
  md.push(`- Seitenanzahl: **${b.seiten.length}**`);
  md.push(`- Befundanzahl: **${b.befunde}**`);
  md.push(`- Erwarteter Effekt: ${b.effekt}`);
  md.push(`- Risiko: ${b.risiko}`);
  md.push(`- Browser-Abnahme: ${b.browser_abnahme}`);
  md.push("");
}
md.push("## Masterliste (alle Befunde)");
md.push("");
md.push("| Sev | Richt. | Cluster | page_key | Route | section_key | Typ | Page-Datei | Empfehlung | Aufwand |");
md.push("|---|---|---|---|---|---|---|---|---|---|");
const sortKey = (m) => ({ high: 0, medium: 1, restschuld: 2 }[m.severity] ?? 9);
master.sort((a, b) => sortKey(a) - sortKey(b) || a.cluster.localeCompare(b.cluster) || a.page_key.localeCompare(b.page_key));
for (const m of master) {
  const sev = m.severity === "high" ? "🔴" : m.severity === "medium" ? "🟡" : "🟡R";
  md.push(`| ${sev} | ${m.direction} | ${m.cluster.split(" — ")[0]} | ${m.page_key} | ${m.route_path ?? "—"} | ${m.section_key} | ${m.section_type} | \`${m.page_file}\` | ${m.empfehlung} | ${m.aufwand} |`);
}
md.push("");

await fs.writeFile(path.join(OUT, "eine-wahrheit-offene-befunde-masterliste.md"), md.join("\n") + "\n", "utf8");

console.log(`[D3a] ${master.length} Befunde -> Masterliste geschrieben. Cluster: ${clusterRows.length}, Batches: ${batches.length}.`);
