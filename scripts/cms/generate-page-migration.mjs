#!/usr/bin/env node
/**
 * CMS-Light Migrations-Generator.
 *
 * Liest i18n-JSON (DE/EN) für eine Seite und erzeugt eine idempotente
 * SQL-Migration (cms_pages, cms_sections, cms_section_fields, Whitelist).
 *
 * Konvention: page_key = `${namespace}.${baseKey}` (z. B.
 * `gebaeudekommunikation.tuersprechanlagen`). Jeder Top-Level-Key unter
 * baseKey wird zu einer Section; tiefer geschachtelte Pfade werden als
 * field_key mit Punktnotation übernommen (`items.qualitaet.title`).
 *
 * Aufruf:
 *   node scripts/cms/generate-page-migration.mjs '<json-config>'
 *
 * Config-Schema (JSON):
 * {
 *   page_key: "gebaeudekommunikation.tuersprechanlagen",
 *   route_path: "/gebaeudekommunikation/tuersprechanlagen",
 *   page_type: "T05",
 *   title_de: "Türsprechanlagen",
 *   title_en: "Door intercom systems",
 *   namespace: "gebaeudekommunikation",
 *   base_key: "tuersprechanlagen",
 *   skip?: ["seo", "breadcrumbFallback", "subnav"],   // pfade, die übersprungen werden
 *   section_order?: ["hero", "ueberblick", ...],      // optional: feste Reihenfolge
 *   section_types?: { hero: "hero", snipdoo: "cta" }  // optional: section_type-Override
 * }
 *
 * Idempotent: alle INSERTs nutzen ON CONFLICT DO NOTHING. Wiederholtes
 * Ausführen ändert keine bestehenden Daten (Admin-Edits bleiben erhalten).
 */

import fs from "node:fs";
import path from "node:path";

const cfgArg = process.argv[2];
if (!cfgArg) {
  console.error("Usage: generate-page-migration.mjs '<json-config>'");
  process.exit(1);
}
const cfg = JSON.parse(cfgArg);

const required = ["page_key", "page_type", "namespace"];
for (const k of required) {
  if (!cfg[k]) { console.error(`config.${k} required`); process.exit(1); }
}

const repoRoot = process.cwd();
const deJson = JSON.parse(fs.readFileSync(path.join(repoRoot, `src/i18n/locales/de/${cfg.namespace}.json`), "utf8"));
const enJson = JSON.parse(fs.readFileSync(path.join(repoRoot, `src/i18n/locales/en/${cfg.namespace}.json`), "utf8"));

const pickBase = (root, key) => {
  if (!key) {
    // Flat namespace: ganzen Namespace nehmen, _meta entfernen
    const out = {};
    for (const [k, v] of Object.entries(root)) if (!k.startsWith("_")) out[k] = v;
    return out;
  }
  return key.split(".").reduce((o, k) => (o == null ? o : o[k]), root);
};
const deBase = pickBase(deJson, cfg.base_key) || {};
const enBase = pickBase(enJson, cfg.base_key) || {};

function flatten(obj, prefix = "", out = {}) {
  if (obj == null) return out;
  for (const [k, v] of Object.entries(obj)) {
    const np = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      flatten(v, np, out);
    } else if (Array.isArray(v)) {
      // Array → numerische Indizes, nur primitive Werte
      v.forEach((item, i) => {
        if (item && typeof item === "object") {
          flatten(item, `${np}.${i}`, out);
        } else if (item != null) {
          out[`${np}.${i}`] = String(item);
        }
      });
    } else if (v != null) {
      out[np] = String(v);
    }
  }
  return out;
}

const flatDe = flatten(deBase);
const flatEn = flatten(enBase);

const skip = new Set(cfg.skip || []);
const isSkipped = (k) => {
  for (const s of skip) {
    if (k === s || k.startsWith(s + ".")) return true;
  }
  return false;
};

// Gruppiere nach Top-Level-Section. Top-level Skalare landen in einer
// virtuellen Section "content", damit auch flache Seiten (z. B. legal,
// serviceportal-Login) sauber als Section/Felder geführt werden.
const sectionFields = new Map(); // section_key -> Map<field_key, {de?, en?}>
const allKeys = new Set([...Object.keys(flatDe), ...Object.keys(flatEn)]);
for (const fullKey of allKeys) {
  if (isSkipped(fullKey)) continue;
  let sec, fld;
  const dot = fullKey.indexOf(".");
  if (dot < 0) { sec = "content"; fld = fullKey; }
  else { sec = fullKey.slice(0, dot); fld = fullKey.slice(dot + 1); }
  if (!sectionFields.has(sec)) sectionFields.set(sec, new Map());
  const inner = sectionFields.get(sec);
  if (!inner.has(fld)) inner.set(fld, {});
  const entry = inner.get(fld);
  if (flatDe[fullKey] != null) entry.de = flatDe[fullKey];
  if (flatEn[fullKey] != null) entry.en = flatEn[fullKey];
}

// Reihenfolge: explizit > Erstauftritt im DE-JSON
const allSections = [...sectionFields.keys()];
const order = cfg.section_order || [];
const naturalOrder = Object.keys(deBase).filter((k) => sectionFields.has(k));
if (sectionFields.has("content") && !naturalOrder.includes("content")) naturalOrder.unshift("content");
allSections.sort((a, b) => {
  const ia = order.indexOf(a), ib = order.indexOf(b);
  if (ia >= 0 && ib >= 0) return ia - ib;
  if (ia >= 0) return -1;
  if (ib >= 0) return 1;
  return naturalOrder.indexOf(a) - naturalOrder.indexOf(b);
});

const sectionTypes = cfg.section_types || {};
const E = (s) => (s == null ? "NULL" : `'${String(s).replace(/'/g, "''")}'`);

const lines = [];
lines.push(`-- Auto-generated CMS-Light migration for ${cfg.page_key}`);
lines.push(`-- Source: i18n/${cfg.namespace}.json [${cfg.base_key}]`);
lines.push(`-- Sections: ${allSections.length}, Fields: ${[...sectionFields.values()].reduce((n, m) => n + m.size, 0)}`);
lines.push("");

lines.push(`INSERT INTO public.cms_pages (page_key, route_path, page_type, title_de, title_en, status, is_active) VALUES (`);
lines.push(`  ${E(cfg.page_key)}, ${E(cfg.route_path || null)}, ${E(cfg.page_type)}, ${E(cfg.title_de || null)}, ${E(cfg.title_en || null)}, 'draft', false`);
lines.push(`) ON CONFLICT (page_key) DO NOTHING;`);
lines.push("");

if (allSections.length > 0) {
  let so = 0;
  const secRows = allSections.map((sk) => {
    so += 10;
    const stype = sectionTypes[sk] || "content";
    return `  (${E(cfg.page_key)}, ${E(sk)}, ${E(stype)}, ${so}, true)`;
  });
  lines.push(`INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active) VALUES`);
  lines.push(secRows.join(",\n"));
  lines.push(`ON CONFLICT (page_key, section_key) DO NOTHING;`);
  lines.push("");
}

const fieldRows = [];
for (const sk of allSections) {
  const inner = sectionFields.get(sk);
  for (const fk of [...inner.keys()].sort()) {
    const v = inner.get(fk);
    if (v.de != null) fieldRows.push(`  (${E(cfg.page_key)}, ${E(sk)}, ${E(fk)}, 'de', ${E(v.de)})`);
    if (v.en != null) fieldRows.push(`  (${E(cfg.page_key)}, ${E(sk)}, ${E(fk)}, 'en', ${E(v.en)})`);
  }
}
if (fieldRows.length > 0) {
  lines.push(`INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES`);
  lines.push(fieldRows.join(",\n"));
  lines.push(`ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;`);
  lines.push("");
}

lines.push(`INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)`);
lines.push(`SELECT page_key, section_key, field_key, locale, true`);
lines.push(`  FROM public.cms_section_fields`);
lines.push(` WHERE page_key = ${E(cfg.page_key)}`);
lines.push(`ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;`);
lines.push("");
lines.push(`SELECT public.cms_renumber_sections(${E(cfg.page_key)});`);

console.log(lines.join("\n"));
