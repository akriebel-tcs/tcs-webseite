#!/usr/bin/env node
/**
 * CMS-Light Admin-Hygiene-Audit (Tranche 21).
 *
 * Read-only. Klassifiziert Admin-Lärm in:
 *   H0 OK            — pflegbar, sichtbar
 *   H1 Feld fehlt    — Whitelist sinnvoll, aber `cms_section_fields`-Zeile fehlt
 *                      (Asset-Slots zählen nicht als Feld; sie leben in `cms_assets`)
 *   H2 Verwaiste Whitelist — Whitelist aktiv, aber Section/Page fehlt oder inaktiv
 *   H3 Inaktives Asset — Asset aktiv, aber Page/Section inaktiv oder fehlt
 *   H4 Renderer-ignoriert — aktiver Asset-Slot oder Whitelist auf einem
 *                          `field_key`, den der Renderer für den
 *                          Section-Typ nicht liest (laut RENDERER_SLOT_MAP)
 *   H5 Bewusster Fallback — bekannter Legacy-Slot (z. B. items.*) bei
 *                          gleichzeitig vorhandenen Kind-Sections
 *   H6 Needs decision — uneindeutig, nicht automatisch ändern
 *
 * DB-Zugriff via psql ($PGHOST).
 *
 * Aufruf:  node scripts/cms/admin-hygiene-audit.mjs [--json] [--examples=N]
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const asJson = process.argv.includes("--json");
const exArg = process.argv.find((a) => a.startsWith("--examples="));
const EXAMPLES = exArg ? Math.max(1, Number(exArg.split("=")[1]) || 5) : 5;

function psql(sql) {
  const out = execSync(`psql -At -F $'\\t' -c "${sql.replace(/"/g, '\\"')}"`, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return out.trim().split("\n").filter(Boolean).map((l) => l.split("\t"));
}

// Renderer-Slot-Map aus TS-Quelle parsen (statisch, ohne ts-loader).
const SLOT_MAP_SRC = readFileSync(
  join(__dirname, "..", "..", "src", "features", "admin", "lib", "rendererSlotMap.ts"),
  "utf8",
);
function parseRendererSlots() {
  const map = new Map(); // section_type -> Set<field_key>
  const re = /(\w+):\s*\[([^\]]*)\]/g;
  const body = SLOT_MAP_SRC.split("RENDERER_SLOT_MAP")[1] ?? "";
  const block = body.split("};")[0] ?? "";
  let m;
  while ((m = re.exec(block))) {
    const t = m[1];
    const slots = new Set();
    const inner = m[2];
    const sre = /fieldKey:\s*"([^"]+)"/g;
    let s;
    while ((s = sre.exec(inner))) slots.add(s[1]);
    map.set(t, slots);
  }
  return map;
}
const RENDERER_SLOTS = parseRendererSlots();
const KNOWN_TYPES = new Set(RENDERER_SLOTS.keys());

const TYPE_ALIAS = {
  hero: "hero_v1",
  content: "content_v1",
  intro: "content_v1",
  content_block_v1: "content_v1",
  content_blocks_intro_v1: "content_v1",
  cta: "cta_v1",
  rich: "rich_v1",
  "feature-grid": "feature_grid_v1",
  "product-scroller": "product_scroller_v1",
  products: "product_scroller_v1",
};
const normType = (t) => TYPE_ALIAS[t] ?? t;

// Legacy/Fallback-Heuristik
const LEGACY_FIELD_RE = /^(image_desktop|image_tablet|image_mobile)$/;
const ITEMS_FIELD_RE = /^items(\.|$)/;
const NESTED_ICON_RE = /\.icon$/;
const ASSET_LIKE_KEYS = new Set([
  "image", "thumbnail", "icon_image", "hero_image", "og_image", "logo",
]);

console.error("→ DB lesen …");

const pages = psql(`SELECT page_key, status, is_active FROM cms_pages`);
const pageInfo = new Map(pages.map(([pk, st, act]) => [pk, { status: st, active: act === "t" }]));

const sections = psql(
  `SELECT page_key, section_key, section_type, is_active, COALESCE(parent_section_id::text,'') AS pid FROM cms_sections`,
);
const sectionInfo = new Map(); // page|section -> {type, active, hasParent}
for (const [pk, sk, st, act, pid] of sections) {
  sectionInfo.set(`${pk}|${sk}`, { type: normType(st), active: act === "t", hasParent: !!pid });
}
const childrenByParent = new Map(); // page|parent_section_key -> count
{
  const childRows = psql(
    `SELECT s.page_key, p.section_key
     FROM cms_sections s JOIN cms_sections p ON p.id = s.parent_section_id`,
  );
  for (const [pk, parentKey] of childRows) {
    const k = `${pk}|${parentKey}`;
    childrenByParent.set(k, (childrenByParent.get(k) ?? 0) + 1);
  }
}

const fields = psql(`SELECT page_key, section_key, field_key, locale FROM cms_section_fields`);
const fieldKeySet = new Set(fields.map((r) => `${r[0]}|${r[1]}|${r[2]}|${r[3]}`));
const fieldKeyByLoc = new Set(fields.map((r) => `${r[0]}|${r[1]}|${r[2]}`));

const whitelist = psql(
  `SELECT page_key, section_key, field_key, locale, is_enabled FROM cms_admin_editable_fields`,
);
const assets = psql(
  `SELECT page_key, section_key, field_key, viewport, is_active FROM cms_assets`,
);

const findings = {
  H0: [], H1: [], H2: [], H3: [], H4: [], H5: [], H6: [],
};

function push(klass, item) {
  findings[klass].push(item);
}

// --- A: Whitelist-Analyse ----------------------------------------------------
for (const [pk, sk, fk, loc, en] of whitelist) {
  if (en !== "t") continue;
  const pi = pageInfo.get(pk);
  const si = sectionInfo.get(`${pk}|${sk}`);

  if (!pi) {
    push("H2", { kind: "whitelist", page: pk, section: sk, field: fk, locale: loc, reason: "page fehlt" });
    continue;
  }
  if (!si) {
    push("H2", { kind: "whitelist", page: pk, section: sk, field: fk, locale: loc, reason: "section fehlt" });
    continue;
  }
  if (!si.active || !pi.active || pi.status !== "published") {
    push("H2", {
      kind: "whitelist", page: pk, section: sk, field: fk, locale: loc,
      reason: !si.active ? "section inaktiv" : !pi.active ? "page inaktiv" : "page nicht published",
    });
    continue;
  }
  // Renderer-Erwartung
  const slots = RENDERER_SLOTS.get(si.type);
  const isAssetSlot = ASSET_LIKE_KEYS.has(fk) || /(^|_)image$|^thumbnail$|^icon_image$/.test(fk);
  const isIconText = fk === "icon" || NESTED_ICON_RE.test(fk);
  if (LEGACY_FIELD_RE.test(fk)) {
    push("H4", { kind: "whitelist-legacy-viewport", page: pk, section: sk, field: fk, locale: loc });
    continue;
  }
  if (isAssetSlot && slots && !slots.has(fk)) {
    push("H4", {
      kind: "whitelist-renderer-ignoriert", page: pk, section: sk, field: fk,
      locale: loc, section_type: si.type,
    });
    continue;
  }
  // H1: Whitelist sinnvoll, aber kein Feld-Wert vorhanden (nur Text/Icon-Felder)
  if (!isAssetSlot) {
    if (!fieldKeyByLoc.has(`${pk}|${sk}|${fk}`)) {
      // ITEMS_FIELD & Kind-Sections vorhanden → H5 (Fallback) statt H1
      if (ITEMS_FIELD_RE.test(fk) && (childrenByParent.get(`${pk}|${sk}`) ?? 0) > 0) {
        push("H5", { kind: "items-fallback-leer", page: pk, section: sk, field: fk, locale: loc });
        continue;
      }
      push("H1", { kind: "whitelist-ohne-feld", page: pk, section: sk, field: fk, locale: loc, section_type: si.type, isIconText });
      continue;
    }
  }
  // ITEMS_FIELD aktiv + Kind-Sections vorhanden → H5
  if (ITEMS_FIELD_RE.test(fk) && (childrenByParent.get(`${pk}|${sk}`) ?? 0) > 0) {
    push("H5", { kind: "items-konkurriert-mit-kindsections", page: pk, section: sk, field: fk, locale: loc });
    continue;
  }
  push("H0", { kind: "whitelist", page: pk, section: sk, field: fk, locale: loc });
}

// --- B: Asset-Analyse --------------------------------------------------------
for (const [pk, sk, fk, vp, en] of assets) {
  if (en !== "t") continue;
  const pi = pageInfo.get(pk);
  const si = sectionInfo.get(`${pk}|${sk}`);
  if (!pi || !pi.active || pi.status !== "published") {
    push("H3", {
      kind: "asset-page-inaktiv", page: pk, section: sk, field: fk, viewport: vp,
      reason: !pi ? "page fehlt" : !pi.active ? "page inaktiv" : "page nicht published",
    });
    continue;
  }
  if (!si) {
    push("H3", { kind: "asset-section-fehlt", page: pk, section: sk, field: fk, viewport: vp });
    continue;
  }
  if (!si.active) {
    push("H3", { kind: "asset-section-inaktiv", page: pk, section: sk, field: fk, viewport: vp });
    continue;
  }
  if (LEGACY_FIELD_RE.test(fk)) {
    push("H4", { kind: "asset-legacy-viewport-feldname", page: pk, section: sk, field: fk, viewport: vp });
    continue;
  }
  const slots = RENDERER_SLOTS.get(si.type);
  if (slots && slots.size > 0 && !slots.has(fk)) {
    push("H4", {
      kind: "asset-renderer-ignoriert", page: pk, section: sk, field: fk,
      viewport: vp, section_type: si.type,
    });
    continue;
  }
  push("H0", { kind: "asset", page: pk, section: sk, field: fk, viewport: vp });
}

// --- Report ------------------------------------------------------------------
const summary = Object.fromEntries(
  Object.entries(findings).map(([k, v]) => [k, v.length]),
);

if (asJson) {
  console.log(JSON.stringify({ summary, findings }, null, 2));
} else {
  console.log("\n=== Admin-Hygiene-Audit ===\n");
  for (const [k, v] of Object.entries(findings)) {
    console.log(`${k}: ${v.length}`);
  }
  console.log("\n--- Beispiele je Klasse ---");
  for (const [k, v] of Object.entries(findings)) {
    if (k === "H0") continue;
    if (v.length === 0) continue;
    console.log(`\n[${k}] (${v.length})`);
    for (const ex of v.slice(0, EXAMPLES)) {
      console.log("  " + JSON.stringify(ex));
    }
    if (v.length > EXAMPLES) console.log(`  … +${v.length - EXAMPLES} weitere`);
  }
  console.log("");
}
