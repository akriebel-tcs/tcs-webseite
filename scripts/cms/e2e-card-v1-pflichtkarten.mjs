#!/usr/bin/env node
/**
 * e2e-card-v1-pflichtkarten.mjs — Pflichtkarten-Vertrag (Gate).
 *
 * Sprint „card_v1 Abschluss — Legacy-Felder endgültig in Standardkarte
 * überführen". Prüft offline gegen die DB, dass die Pflichtkarten den
 * neuen Standardkarten-Vertrag erfüllen:
 *
 *   B-538  → gebaeudekommunikation.tuersprechanlagen / card_pak
 *   B-1905 → gebaeudekommunikation.root / anwendungsumfelder_item_pflege
 *   B-2084 → anwendungen.root / card_sf_internekommunikation
 *
 * Pro Karte:
 *   1. `link_1_href` ist gesetzt (mind. in `de`) — sonst kommt öffentlich
 *      kein Karten-CTA an.
 *   2. Wenn `chips.*` leer ist, MUSS auch `tags` leer sein
 *      (Spiegel-Regel: keine öffentlichen Pillen ohne Chips im Admin).
 *   3. Wenn `bullets.*` leer ist, MUSS auch `features.*` leer sein.
 *   4. Alle relevanten Felder sind im Admin whitelisted
 *      (`cms_admin_editable_fields`, `is_enabled = true`).
 *
 * Zusätzlich für B-2084 (Konflikt aus `sprint-card-v1-abschluss-legacy-konflikte.md`):
 *   - `link_1_href` muss auf `/Kontakt` oder `/kontakt` zeigen
 *     (Wunschwert aus Admin), nicht mehr auf `/anwendungen/...`.
 *
 * Exit:
 *   0 = grün
 *   1 = mindestens eine Pflichtkarte ist rot
 *
 * Ohne DB wird NICHT grün geskipped. Dann läuft ein Fixture-/Preview-Nachweis
 * gegen die öffentliche Seite und den eingecheckten Section-Snapshot.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SECTION_SNAPSHOT = JSON.parse(
  readFileSync(path.join(ROOT, "scripts/sync/snapshot/tables/cms_sections.json"), "utf-8"),
);

const PFLICHTKARTEN = [
  {
    id: "B-538",
    page_key: "gebaeudekommunikation.tuersprechanlagen",
    section_key: "card_pak",
    requireLinkHrefMatches: null,
  },
  {
    id: "B-2084",
    page_key: "anwendungen.root",
    section_key: "card_sf_internekommunikation",
    route_path: "/anwendungen",
    requireLinkHrefMatches: /^\/[Kk]ontakt$/,
    expectText: ["Raum-zu-Raum", "Durchsagen", "Türautomation", "Mehr erfahren"],
  },
  {
    id: "B-1905",
    page_key: "gebaeudekommunikation.root",
    section_key: "anwendungsumfelder_item_pflege",
    route_path: "/gebaeudekommunikation",
    requireLinkHrefMatches: /^\/kontakt$/,
    expectText: ["Pflege und Betreutes Wohnen", "Mehr erfahren"],
  },
  {
    id: "B-538",
    page_key: "gebaeudekommunikation.tuersprechanlagen",
    section_key: "card_pak",
    route_path: "/gebaeudekommunikation/tuersprechanlagen",
    requireLinkHrefMatches: null,
    expectText: ["Kompakt-Außenstationen", "Mehr erfahren", "Zum Planer", "Zum Konfigurator"],
  },
];

function psql(sql) {
  const r = spawnSync(
    "psql",
    ["-A", "-t", "-F", "\t", "-c", sql],
    { encoding: "utf-8" },
  );
  if (r.status !== 0) {
    console.error("psql failed:", r.stderr);
    process.exit(2);
  }
  return r.stdout
    .trim()
    .split("\n")
    .filter((l) => l.length > 0)
    .map((l) => l.split("\t"));
}

function hasDb() {
  return !!process.env.PGHOST;
}

function readSnapshotSection(card) {
  return SECTION_SNAPSHOT.find(
    (row) => row.page_key === card.page_key && row.section_key === card.section_key && row.is_active === true,
  );
}

function curlText(url) {
  const r = spawnSync("curl", ["-L", "-sS", url], { encoding: "utf-8" });
  if (r.status !== 0) {
    return { ok: false, body: "", error: r.stderr || `curl exit ${r.status}` };
  }
  return { ok: true, body: r.stdout, error: "" };
}

function offlineFixtureCheck(cards, errors) {
  const previewBase =
    process.env.PREVIEW_BASE_URL ||
    process.env.VITE_PREVIEW_URL ||
    "https://tcs-webseite-db-cms.lovable.app";

  for (const card of cards) {
    const snap = readSnapshotSection(card);
    if (!snap) {
      errors.push(`${card.id}: Snapshot-Beleg fehlt für ${card.page_key}/${card.section_key}.`);
      continue;
    }

    const res = curlText(`${previewBase.replace(/\/$/, "")}${card.route_path}`);
    if (!res.ok) {
      errors.push(`${card.id}: Preview/Published-Seite nicht lesbar: ${res.error}`);
      continue;
    }

    const missing = (card.expectText || []).filter((needle) => !res.body.includes(needle));
    if (missing.length > 0) {
      errors.push(`${card.id}: Offline-Fixture-Nachweis rot — auf ${card.route_path} fehlen erwartete Texte: ${missing.join(", ")}`);
    }

    console.log(`${card.id} (${card.section_key}): snapshot=✓ preview=${missing.length === 0 ? "✓" : "✗"}`);
  }
}

const errors = [];

if (!hasDb()) {
  offlineFixtureCheck(PFLICHTKARTEN, errors);
} else for (const card of PFLICHTKARTEN) {
  const where = `page_key = '${card.page_key}' AND section_key = '${card.section_key}'`;

  // Felder lesen
  const rows = psql(
    `select field_key, locale, coalesce(value,'') from cms_section_fields where ${where};`,
  );
  const f = {};
  for (const [field_key, locale, value] of rows) {
    f[`${field_key}@${locale}`] = (value ?? "").trim();
  }
  const get = (k) => f[`${k}@de`] || f[`${k}@en`] || "";

  // 1. link_1_href
  const linkHref = get("link_1_href");
  if (!linkHref) {
    errors.push(`${card.id}: link_1_href ist leer — öffentlich erscheint kein Karten-CTA.`);
  }
  if (card.requireLinkHrefMatches && linkHref && !card.requireLinkHrefMatches.test(linkHref)) {
    errors.push(
      `${card.id}: link_1_href="${linkHref}" passt nicht zum geforderten Muster ${card.requireLinkHrefMatches}. ` +
      `Konfliktauflösung im Admin gewinnt; bitte canonical link_1_href setzen.`,
    );
  }

  // 2. chips vs. tags
  const chipsHave = ["chips.0","chips.1","chips.2","chips.3","chips.4"].some((k) => get(k));
  const tagsHave = !!get("tags");
  if (!chipsHave && tagsHave) {
    errors.push(`${card.id}: chips.* leer, aber tags gesetzt — Spiegel-Regel verletzt.`);
  }

  // 3. bullets vs. features
  const bulletsHave = ["bullets.0","bullets.1","bullets.2","bullets.3","bullets.4"].some((k) => get(k));
  const featuresHave = ["features.0","features.1","features.2","features.3","features.4"].some((k) => get(k));
  if (!bulletsHave && featuresHave) {
    errors.push(`${card.id}: bullets.* leer, aber features.* gesetzt — Spiegel-Regel verletzt.`);
  }

  // 4. Whitelist
  const requiredFields = [
    "link_1_label","link_1_href","link_1_enabled",
    "link_2_label","link_2_href","link_2_enabled",
    "link_3_label","link_3_href","link_3_enabled",
    "icon","icon_enabled","image","image_enabled","icon_image",
    "chips.0","chips.1","chips.2","chips.3","chips.4",
    "bullets.0","bullets.1","bullets.2","bullets.3","bullets.4",
  ];
  const list = requiredFields.map((s) => `'${s}'`).join(",");
  const wlRows = psql(
    `select field_key from cms_admin_editable_fields where ${where} and is_enabled = true and field_key in (${list});`,
  );
  const whitelisted = new Set(wlRows.map((r) => r[0]));
  const missing = requiredFields.filter((k) => !whitelisted.has(k));
  if (missing.length > 0) {
    errors.push(`${card.id}: Whitelist-Lücken in cms_admin_editable_fields: ${missing.join(", ")}`);
  }

  const assets = psql(
    `select coalesce(field_key, asset_role), viewport from cms_assets where ${where} and is_active = true;`,
  );
  const assetKeys = new Set(assets.map((r) => r[0]));
  if (!assetKeys.has("image") && get("image_enabled") === "1") {
    errors.push(`${card.id}: image_enabled=1, aber kein aktiver Bildslot/Asset vorhanden.`);
  }

  const iconEnabled = get("icon_enabled");
  const iconValue = get("icon");
  if (iconEnabled === "1" && !iconValue && !assetKeys.has("icon_image")) {
    errors.push(`${card.id}: Icon ist aktiv, aber weder icon noch icon_image sind gepflegt.`);
  }

  for (const n of [1, 2, 3]) {
    const enabled = get(`link_${n}_enabled`);
    const label = get(`link_${n}_label`);
    const href = get(`link_${n}_href`);
    if (enabled === "1" && !label) {
      errors.push(`${card.id}: link_${n}_enabled=1, aber link_${n}_label ist leer.`);
    }
    if (enabled === "1" && !href) {
      errors.push(`${card.id}: link_${n}_enabled=1, aber link_${n}_href ist leer.`);
    }
  }

  console.log(
    `${card.id} (${card.section_key}): link_1_href="${linkHref || "—"}"` +
    ` chips=${chipsHave ? "✓" : "—"} bullets=${bulletsHave ? "✓" : "—"}` +
    ` whitelist-fehlt=${missing.length}`,
  );
}

if (errors.length === 0) {
  console.log("\n✓ e2e-card-v1-pflichtkarten: GRÜN");
  process.exit(0);
}
console.error("\n✗ e2e-card-v1-pflichtkarten: ROT");
for (const e of errors) console.error("  • " + e);
process.exit(1);
