/**
 * Etappe S1 — Snapshot aus dem Quellprojekt bauen.
 *
 * Liest die zuvor per cross_project--copy_project_asset nach
 * `scripts/sync/source-raw/` kopierten Dateien und erzeugt normalisierte
 * Snapshot-JSONs in `scripts/sync/snapshot/`.
 *
 * Nutzung:
 *   bun scripts/sync/pull-source-snapshot.mjs
 *
 * Output:
 *   scripts/sync/snapshot/navigation.json   — alle 4 nav_areas, mit DE/EN-Labels
 *   scripts/sync/snapshot/pages.json        — abgeleitet aus Nav-Knoten mit path
 *
 * Quellen für weitere Snapshot-Dateien (sections, fields, assets) folgen
 * in Etappe S1.2.
 */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = resolve(__dirname, "source-raw");
const OUT_DIR = resolve(__dirname, "snapshot");

const KEY_MAPPING = JSON.parse(
  readFileSync(resolve(__dirname, "key-mapping.json"), "utf8"),
);

function loadJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

/** Liest einen i18n-Key aus dem geladenen Locale-Objekt (z.B. "nav.produkte.label"). */
function readKey(locale, key) {
  if (!key) return null;
  const parts = key.split(".");
  let cur = locale;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return null;
    cur = cur[p];
  }
  return typeof cur === "string" ? cur : null;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // Nav-Module dynamisch importieren (bun versteht TS).
  const { mainNavigation } = await import(
    resolve(RAW_DIR, "navigation/mainNavigation.ts")
  );
  const { metaNavigation } = await import(
    resolve(RAW_DIR, "navigation/metaNavigation.ts")
  );
  const { footerNavigation, footerBottomNavigation } = await import(
    resolve(RAW_DIR, "navigation/footerNavigation.ts")
  );
  const { personaNavigation } = await import(
    resolve(RAW_DIR, "navigation/personaNavigation.ts")
  );

  const navDe = loadJson(resolve(RAW_DIR, "i18n/de/navigation.json"));
  const navEn = loadJson(resolve(RAW_DIR, "i18n/en/navigation.json"));

  const nodeKeyMap = KEY_MAPPING.node_key ?? {};
  const footerKeyMap = KEY_MAPPING.footer_node_key ?? {};
  const personaKeyMap = KEY_MAPPING.persona_node_key ?? {};
  const unmapped = new Set();

  function mapNodeKey(srcKey) {
    if (nodeKeyMap[srcKey]) return nodeKeyMap[srcKey];
    unmapped.add(`main/meta:${srcKey}`);
    return srcKey;
  }
  function mapFooterKey(srcKey) {
    if (footerKeyMap[srcKey]) return footerKeyMap[srcKey];
    unmapped.add(`footer:${srcKey}`);
    return `footer.${srcKey}`;
  }
  function mapPersonaKey(srcKey) {
    if (personaKeyMap[srcKey]) return personaKeyMap[srcKey];
    unmapped.add(`persona:${srcKey}`);
    return srcKey;
  }

  function flattenItems(items, navArea, parentSrcKey = null, depth = 0) {
    const out = [];
    items.forEach((item, idx) => {
      const dbKey = mapNodeKey(item.key);
      out.push({
        nav_area: navArea,
        node_key: dbKey,
        source_key: item.key,
        parent_node_key: parentSrcKey ? mapNodeKey(parentSrcKey) : null,
        sort_order: idx,
        depth,
        node_type: item.linkType === "external" ? "external_link" : "page",
        external_url: item.externalUrl ?? null,
        route_path: item.path && item.path !== "#" ? item.path : null,
        label_de: readKey(navDe, item.labelKey),
        label_en: readKey(navEn, item.labelKey),
        description_de: readKey(navDe, item.descriptionKey),
        description_en: readKey(navEn, item.descriptionKey),
        status: item.status ?? null,
        target_domain: item.targetDomain ?? null,
        note: item.note ?? null,
      });
      if (item.children?.length) {
        out.push(...flattenItems(item.children, navArea, item.key, depth + 1));
      }
    });
    return out;
  }

  const mainNodes = flattenItems(mainNavigation, "main");
  const metaNodes = flattenItems(metaNavigation, "meta");

  // Footer ist anders strukturiert (FooterColumn[]): jede Spalte ist ein
  // Top-Level-Knoten in nav_area "footer", titleKey wird zum Label.
  const footerNodes = [];
  footerNavigation.forEach((col, idx) => {
    const colKey = mapFooterKey(col.key);
    footerNodes.push({
      nav_area: "footer",
      node_key: colKey,
      source_key: col.key,
      parent_node_key: null,
      sort_order: idx,
      depth: 0,
      node_type: "group",
      external_url: null,
      route_path: null,
      label_de: readKey(navDe, col.titleKey),
      label_en: readKey(navEn, col.titleKey),
      description_de: null,
      description_en: null,
      status: "active",
      target_domain: null,
      note: null,
    });
    col.items.forEach((item, j) => {
      // item.key hat bereits die Form "<col>.<item>", also direkt mappen.
      const childKey = mapFooterKey(item.key);
      footerNodes.push({
        nav_area: "footer",
        node_key: childKey,
        source_key: item.key,
        parent_node_key: colKey,
        sort_order: j,
        depth: 1,
        node_type: item.linkType === "external" ? "external_link" : "page",
        external_url: item.externalUrl ?? null,
        route_path: item.path && item.path !== "#" ? item.path : null,
        label_de: readKey(navDe, item.labelKey),
        label_en: readKey(navEn, item.labelKey),
        description_de: readKey(navDe, item.descriptionKey),
        description_en: readKey(navEn, item.descriptionKey),
        status: item.status ?? null,
        target_domain: item.targetDomain ?? null,
        note: item.note ?? null,
      });
    });
  });

  const personaNodes = personaNavigation.map((p, idx) => ({
    nav_area: "persona",
    node_key: mapPersonaKey(p.id),
    source_key: p.id,
    parent_node_key: null,
    sort_order: idx,
    depth: 0,
    node_type: "page",
    external_url: null,
    route_path: null, // wird in S1.2 aus pageRegistry/Routen ergänzt
    label_de: readKey(navDe, p.labelKey),
    label_en: readKey(navEn, p.labelKey),
    description_de: null,
    description_en: null,
    status: "active",
    target_domain: p.targetDomain,
    note: null,
  }));

  const footerBottomNodes = (footerBottomNavigation ?? []).map((item, idx) => ({
    nav_area: "footer_bottom",
    node_key: item.key,
    source_key: item.key,
    parent_node_key: null,
    sort_order: idx,
    depth: 0,
    node_type: item.linkType === "external" ? "external_link" : "page",
    external_url: item.externalUrl ?? null,
    route_path: item.path && item.path !== "#" ? item.path : null,
    label_de: readKey(navDe, item.labelKey),
    label_en: readKey(navEn, item.labelKey),
    description_de: null,
    description_en: null,
    status: item.status ?? null,
    target_domain: item.targetDomain ?? null,
    note: item.note ?? null,
  }));

  const allNodes = [...mainNodes, ...metaNodes, ...footerNodes, ...footerBottomNodes, ...personaNodes];

  const navOut = {
    generated_at: new Date().toISOString(),
    source_project: "TCS-Unternehmenswebseite_Content_V1",
    counts: {
      main: mainNodes.length,
      meta: metaNodes.length,
      footer: footerNodes.length,
      footer_bottom: footerBottomNodes.length,
      persona: personaNodes.length,
      total: allNodes.length,
    },
    unmapped_source_keys: Array.from(unmapped).sort(),
    nodes: allNodes,
  };
  writeFileSync(
    resolve(OUT_DIR, "navigation.json"),
    JSON.stringify(navOut, null, 2),
  );

  // Pages: alle Knoten mit route_path → eine Page-Instanz (page_key noch leer,
  // wird in S1.2 anhand pageRegistry/Routen erzeugt).
  const pageCandidates = allNodes
    .filter((n) => n.route_path)
    .map((n) => ({
      route_path: n.route_path,
      from_nav_area: n.nav_area,
      from_node_key: n.node_key,
      title_de: n.label_de,
      title_en: n.label_en,
    }));
  const uniquePages = [];
  const seenRoutes = new Set();
  for (const p of pageCandidates) {
    if (seenRoutes.has(p.route_path)) continue;
    seenRoutes.add(p.route_path);
    uniquePages.push(p);
  }
  writeFileSync(
    resolve(OUT_DIR, "pages.json"),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        count: uniquePages.length,
        pages: uniquePages,
      },
      null,
      2,
    ),
  );

  console.log("Snapshot geschrieben:");
  console.log(`  navigation.json — ${allNodes.length} Knoten`);
  console.log(`  pages.json      — ${uniquePages.length} Routen`);
  if (unmapped.size > 0) {
    console.log(
      `\nNICHT GEMAPPTE Quellkeys (bitte in key-mapping.json ergänzen):`,
    );
    for (const k of Array.from(unmapped).sort()) console.log(`  - ${k}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
