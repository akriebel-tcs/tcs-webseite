#!/usr/bin/env node
/**
 * sprint-2b-seed-plan.mjs — Sprint 2b (Dry-Run + Migrations-Generator).
 *
 * Berechnet, welche LEEREN Vertragsfelder als cms_section_fields-Zeilen
 * und welche fehlenden cms_admin_editable_fields-Zeilen idempotent
 * angelegt werden dürfen, ohne Inhalte zu verändern oder Public-Renderer
 * zu beeinflussen.
 *
 * Schreibt:
 *   scripts/cms/output/sprint-2b-seed-plan.json   (Dry-Run-Zahlen)
 *   docs/04-betrieb/sprint-2b-seed-plan.md         (Dry-Run-Bericht)
 *
 * Nutzt dieselbe read-only RPC wie das Drift-Audit
 * (`rpc_admin_export_contract_drift`) und denselben Vertrag/Renderer-Parser.
 *
 * Read-only: schreibt NICHTS in die DB.
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const RENDERER_FILE = resolve(ROOT, "src/features/cms/components/CmsBodyRenderer.tsx");
const CONTRACT_FILE = resolve(ROOT, "src/features/cms/contract/sectionTypes.ts");
const OUT_DIR = resolve(ROOT, "scripts/cms/output");
const OUT_JSON = resolve(OUT_DIR, "sprint-2b-seed-plan.json");
const OUT_MD = resolve(ROOT, "docs/04-betrieb/sprint-2b-seed-plan.md");
const OUT_SQL = resolve(OUT_DIR, "sprint-2b-seed.sql");

// Sicher seedbare Vertragstypen — siehe Sprint-2b-Briefing.
const SAFE_TYPES = new Set([
  "content_v1",
  "cards_v1",
  "card_v1",
  "feature_grid_v1",
  "teaser_2col_v1",
  "faq_v1",
  "cta_v1",
  "rich_v1",
  "tabs_v1",
  "tab_v1",
  "stats_v1",
  "stat_v1",
  "contact_block_v1",
  "download_list_v1",
  "product_scroller_v1",
]);

// -------- Vertrag/Renderer-Parser (gespiegelt aus contract-drift-audit) --------

function readFile(p) { return readFileSync(p, "utf8"); }
function extractTypeAliases(src) {
  const out = new Map();
  const m = src.match(/const map:\s*Record<string,\s*string>\s*=\s*\{([\s\S]*?)\};/);
  if (!m) return out;
  for (const mm of m[1].matchAll(/["']([^"']+)["']\s*:\s*["']([^"']+)["']/g)) out.set(mm[1], mm[2]);
  return out;
}
function matchArray(block, key) {
  const m = block.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`));
  if (!m) return [];
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}
function extractFields(block, re, isToggle = false) {
  const out = [];
  let mm;
  while ((mm = re.exec(block))) {
    const field_key = mm[1];
    const label = mm[2];
    const required = isToggle ? "optional" : (mm[3] || "optional");
    const extra = !isToggle ? (mm[4] || "") : "";
    const aliasesMatch = extra.match(/aliases:\s*\[([^\]]*)\]/);
    const aliases = aliasesMatch ? [...aliasesMatch[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
    const adminMatch = extra.match(/admin:\s*(true|false)/);
    const localeMatch = extra.match(/locale:\s*"([^"]+)"/);
    out.push({
      field_key, label, required, aliases,
      admin: adminMatch ? adminMatch[1] === "true" : true,
      locale: localeMatch ? localeMatch[1] : "de-en",
    });
  }
  return out;
}
function parseContracts(src) {
  const out = new Map();
  const m = src.match(/SECTION_TYPE_CONTRACTS[^=]*=\s*\{([\s\S]*)\};\s*\n/);
  if (!m) return out;
  const body = m[1];
  const re = /^\s{2}([a-z0-9_]+):\s*\{/gm;
  const starts = [];
  let mm;
  while ((mm = re.exec(body))) starts.push({ name: mm[1], idx: mm.index });
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i].idx;
    const to = i + 1 < starts.length ? starts[i + 1].idx : body.length;
    const block = body.slice(from, to);
    const status = (block.match(/status:\s*"([^"]+)"/) || [])[1] || "unknown";
    const topLevel = /top_level:\s*true/.test(block);
    const parents = matchArray(block, "allowed_parents");
    const children = matchArray(block, "allowed_children");
    const textFields = extractFields(block, /T\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*(?:,\s*\{([^}]*)\})?\s*\)/g);
    const toggleFields = extractFields(block, /TOGGLE\(\s*"([^"]+)"\s*,\s*"([^"]+)"/g, true);
    out.set(starts[i].name, {
      section_type: starts[i].name,
      status, top_level: topLevel,
      allowed_parents: parents, allowed_children: children,
      text_fields: textFields, technical_fields: toggleFields,
    });
  }
  return out;
}

// -------- DB-Drift via read-only RPC --------

function readEnvFile() {
  const envPath = resolve(ROOT, ".env");
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
  return out;
}
async function fetchDrift() {
  const env = { ...readEnvFile(), ...process.env };
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  if (!url || !key) return { ok: false, reason: "missing-env" };
  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/rpc/rpc_admin_export_contract_drift`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: "{}",
  });
  if (!res.ok) return { ok: false, reason: "http", status: res.status, body: await res.text() };
  return { ok: true, data: await res.json() };
}

// -------- D9-Check: hat eine Section ein Strukturproblem? --------

function isInvalidParentChild(sec, sectionById, contracts, aliasMap) {
  const canon = aliasMap.get(sec.section_type) ?? sec.section_type;
  const contract = contracts.get(canon);
  if (!contract) return true;
  const hasParent = sec.parent_section_id != null;
  if (!hasParent) {
    if (contract.top_level === false) return true; // child_only_at_top_level
    return false;
  }
  const parent = sectionById.get(sec.parent_section_id);
  if (!parent) {
    if (contract.top_level === false) return true; // child_only_orphan
    return false;
  }
  const parentType = aliasMap.get(parent.section_type) ?? parent.section_type;
  const parentContract = contracts.get(parentType);
  if (!parentContract) return false;
  if (!parentContract.allowed_children.includes(canon)) return true;
  if (contract.allowed_parents.length > 0
      && !contract.allowed_parents.includes(parentType)
      && !contract.allowed_parents.includes("*")) return true;
  return false;
}

// -------- Hauptberechnung --------

function buildPlan({ drift, contracts, aliasMap }) {
  const sectionById = new Map(drift.sections.map((s) => [s.id, s]));
  const pageByKey = new Map(drift.pages.map((p) => [p.page_key, p]));

  const fieldsBySec = new Map();
  for (const f of drift.section_fields) {
    const k = `${f.page_key}|${f.section_key}|${f.locale}`;
    if (!fieldsBySec.has(k)) fieldsBySec.set(k, new Set());
    fieldsBySec.get(k).add(f.field_key);
  }
  const wlBySec = new Map();
  for (const w of drift.editable_fields) {
    const k = `${w.page_key}|${w.section_key}|${w.locale}`;
    if (!wlBySec.has(k)) wlBySec.set(k, new Set());
    wlBySec.get(k).add(w.field_key);
  }

  const fieldInserts = [];        // {page_key, section_key, field_key, locale, section_type}
  const whitelistInserts = [];    // {page_key, section_key, field_key, locale, section_type}

  const skipped = {
    page_archived: 0,
    section_inactive: 0,
    type_unsafe: 0,
    type_unknown: 0,
    d9_invalid_parent_child: 0,
    alias_covered_field: 0,
    alias_covered_wl: 0,
  };

  const byType = {};       // section_type -> {fields, wl}
  const byFieldKey = {};   // "<section_type>.<field_key>" -> {fields, wl}

  function bump(map, key, kind) {
    if (!map[key]) map[key] = { fields: 0, wl: 0 };
    map[key][kind]++;
  }

  for (const sec of drift.sections) {
    const page = pageByKey.get(sec.page_key);
    if (!page || page.status === "archived" || page.is_active === false) {
      skipped.page_archived++;
      continue;
    }
    if (!sec.is_active) { skipped.section_inactive++; continue; }

    const canon = aliasMap.get(sec.section_type) ?? sec.section_type;
    if (!contracts.has(canon)) { skipped.type_unknown++; continue; }
    if (!SAFE_TYPES.has(canon)) { skipped.type_unsafe++; continue; }

    if (isInvalidParentChild(sec, sectionById, contracts, aliasMap)) {
      skipped.d9_invalid_parent_child++;
      continue;
    }

    const contract = contracts.get(canon);
    // Nur text_fields mit admin: true seeden — keine technical_fields, keine asset_slots.
    for (const f of contract.text_fields) {
      if (f.admin === false) continue;
      const locales = f.locale === "de-only" ? ["de"] : ["de", "en"];
      for (const loc of locales) {
        const dbFields = fieldsBySec.get(`${sec.page_key}|${sec.section_key}|${loc}`) ?? new Set();
        const wl = wlBySec.get(`${sec.page_key}|${sec.section_key}|${loc}`) ?? new Set();

        const aliasInDb = (f.aliases ?? []).some((a) => dbFields.has(a));
        const aliasInWl = (f.aliases ?? []).some((a) => wl.has(a));

        // ---- cms_section_fields ----
        if (!dbFields.has(f.field_key)) {
          if (aliasInDb) {
            skipped.alias_covered_field++;
          } else {
            fieldInserts.push({
              page_key: sec.page_key,
              section_key: sec.section_key,
              field_key: f.field_key,
              locale: loc,
              section_type: canon,
            });
            bump(byType, canon, "fields");
            bump(byFieldKey, `${canon}.${f.field_key}`, "fields");
          }
        }

        // ---- cms_admin_editable_fields ----
        if (!wl.has(f.field_key)) {
          if (aliasInWl) {
            skipped.alias_covered_wl++;
          } else {
            whitelistInserts.push({
              page_key: sec.page_key,
              section_key: sec.section_key,
              field_key: f.field_key,
              locale: loc,
              section_type: canon,
            });
            bump(byType, canon, "wl");
            bump(byFieldKey, `${canon}.${f.field_key}`, "wl");
          }
        }
      }
    }
  }

  return { fieldInserts, whitelistInserts, skipped, byType, byFieldKey };
}

// -------- Reporting --------

function buildMarkdown(plan, totals, generatedAt) {
  const { fieldInserts, whitelistInserts, skipped, byType, byFieldKey } = plan;
  let md = `# Sprint 2b — Seeding-Dry-Run\n\n`;
  md += `_Generiert: ${generatedAt}_\n\n`;
  md += `Quelle: \`scripts/cms/sprint-2b-seed-plan.mjs\` (read-only).\n\n`;
  md += `## Daten\n\n`;
  md += `- Seiten gesamt: **${totals.pages}**\n`;
  md += `- Sections gesamt: **${totals.sections}**\n`;
  md += `- cms_section_fields gesamt: **${totals.section_fields}**\n`;
  md += `- cms_admin_editable_fields gesamt: **${totals.editable_fields}**\n\n`;

  md += `## Geplante Inserts (Dry-Run)\n\n`;
  md += `- **${fieldInserts.length}** neue cms_section_fields-Zeilen (value = '')\n`;
  md += `- **${whitelistInserts.length}** neue cms_admin_editable_fields-Zeilen (is_enabled = true)\n\n`;

  md += `## Übersprungene Klassen\n\n`;
  md += `| Klasse | Anzahl |\n|---|---:|\n`;
  md += `| Page archived / inactive | ${skipped.page_archived} |\n`;
  md += `| Section inactive | ${skipped.section_inactive} |\n`;
  md += `| Typ unsicher (legacy/special/etc.) | ${skipped.type_unsafe} |\n`;
  md += `| Typ unbekannt (kein Vertrag) | ${skipped.type_unknown} |\n`;
  md += `| D9 Parent/Child-Verletzung | ${skipped.d9_invalid_parent_child} |\n`;
  md += `| Alias deckt cms_section_fields ab | ${skipped.alias_covered_field} |\n`;
  md += `| Alias deckt Whitelist ab | ${skipped.alias_covered_wl} |\n\n`;

  md += `## Inserts pro section_type\n\n`;
  md += `| section_type | cms_section_fields | cms_admin_editable_fields |\n|---|---:|---:|\n`;
  for (const t of Object.keys(byType).sort()) {
    md += `| ${t} | ${byType[t].fields} | ${byType[t].wl} |\n`;
  }
  md += `\n`;

  md += `## Top Inserts pro (section_type · field_key)\n\n`;
  md += `| section_type · field_key | cms_section_fields | cms_admin_editable_fields |\n|---|---:|---:|\n`;
  const rows = Object.entries(byFieldKey).map(([k, v]) => ({
    k, total: v.fields + v.wl, fields: v.fields, wl: v.wl,
  })).sort((a, b) => b.total - a.total).slice(0, 60);
  for (const r of rows) md += `| ${r.k} | ${r.fields} | ${r.wl} |\n`;
  md += `\n---\n\n`;
  md += `**Garantien:** keine bestehenden Werte werden überschrieben, keine Aliase migriert, keine Asset-Slots berührt, keine technical_fields/Toggles, keine D9-Sections, keine archivierten Seiten, keine inaktiven Sections.\n`;
  return md;
}

// -------- main --------

async function main() {
  const rendererSrc = readFile(RENDERER_FILE);
  const contractSrc = readFile(CONTRACT_FILE);
  const aliasMap = extractTypeAliases(rendererSrc);
  const contracts = parseContracts(contractSrc);

  const db = await fetchDrift();
  if (!db.ok) {
    console.error("DB-RPC nicht verfügbar:", db);
    process.exit(1);
  }
  const drift = db.data;
  const plan = buildPlan({ drift, contracts, aliasMap });
  const totals = {
    pages: drift.pages.length,
    sections: drift.sections.length,
    section_fields: drift.section_fields.length,
    editable_fields: drift.editable_fields.length,
  };

  const summary = {
    generated_at: new Date().toISOString(),
    totals,
    counts: {
      field_inserts: plan.fieldInserts.length,
      whitelist_inserts: plan.whitelistInserts.length,
    },
    skipped: plan.skipped,
    by_type: plan.byType,
    by_type_field: plan.byFieldKey,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2));
  writeFileSync(OUT_MD, buildMarkdown(plan, totals, summary.generated_at));
  writeFileSync(OUT_SQL, buildSql(plan, summary.generated_at));

  console.log("Sprint 2b — Dry-Run");
  console.log(`  cms_section_fields-Inserts:       ${plan.fieldInserts.length}`);
  console.log(`  cms_admin_editable_fields-Inserts: ${plan.whitelistInserts.length}`);
  console.log("  Übersprungen:", plan.skipped);
  console.log("\nJSON →", OUT_JSON);
  console.log("MD   →", OUT_MD);
  console.log("SQL  →", OUT_SQL);
}

function sqlEscape(s) { return String(s).replace(/'/g, "''"); }

function buildSql(plan, generatedAt) {
  const { fieldInserts, whitelistInserts } = plan;
  const lines = [];
  lines.push(`-- Sprint 2b — Seeding leerer Vertragsfelder + fehlender Whitelist-Einträge.`);
  lines.push(`-- Generiert: ${generatedAt}`);
  lines.push(`-- Quelle: scripts/cms/sprint-2b-seed-plan.mjs (Dry-Run).`);
  lines.push(`-- Eigenschaften:`);
  lines.push(`--   * Idempotent (ON CONFLICT DO NOTHING auf unique-Keys).`);
  lines.push(`--   * Verändert KEINE bestehenden Werte.`);
  lines.push(`--   * Berührt KEINE Assets, KEINE Produktdatenbank, KEINE Public-Renderer.`);
  lines.push(`--   * Scope: nur sichere Vertragstypen, aktive Sections, nicht-archivierte Seiten,`);
  lines.push(`--     keine D9-Parent/Child-Verletzungen, keine Alias-Dubletten.`);
  lines.push(``);

  function chunked(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  // cms_section_fields
  lines.push(`-- ${fieldInserts.length} leere cms_section_fields-Zeilen (value = '').`);
  for (const batch of chunked(fieldInserts, 500)) {
    lines.push(`INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES`);
    const rows = batch.map((r) =>
      `  ('${sqlEscape(r.page_key)}','${sqlEscape(r.section_key)}','${sqlEscape(r.field_key)}','${r.locale}','')`,
    );
    lines.push(rows.join(",\n"));
    lines.push(`ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;`);
    lines.push(``);
  }

  // cms_admin_editable_fields
  lines.push(`-- ${whitelistInserts.length} fehlende cms_admin_editable_fields-Zeilen (is_enabled = true).`);
  for (const batch of chunked(whitelistInserts, 500)) {
    lines.push(`INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled) VALUES`);
    const rows = batch.map((r) =>
      `  ('${sqlEscape(r.page_key)}','${sqlEscape(r.section_key)}','${sqlEscape(r.field_key)}','${r.locale}', true)`,
    );
    lines.push(rows.join(",\n"));
    lines.push(`ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;`);
    lines.push(``);
  }

  return lines.join("\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
