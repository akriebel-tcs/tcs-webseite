#!/usr/bin/env node
/**
 * d9-owner-buckets.mjs — Sprint 2c (read-only).
 *
 * Gruppiert die D9-Fälle (Parent/Child-Vertragsverletzungen) aus dem
 * Drift-Audit nach Mustern, leitet daraus Owner-Entscheidungsklassen
 * (O1–O5) ab und schreibt einen markdown-Bericht.
 *
 * Schreibt:
 *   scripts/cms/output/d9-owner-buckets.json
 *   docs/04-betrieb/sprint-2c-d9-owner-entscheidungen.md
 *
 * Read-only: keine DB-Schreibvorgänge, kein Schreib-RPC. Nutzt dieselbe
 * Diagnose-RPC `rpc_admin_export_contract_drift` wie das Drift-Audit.
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const RENDERER_FILE = resolve(ROOT, "src/features/cms/components/CmsBodyRenderer.tsx");
const CONTRACT_FILE = resolve(ROOT, "src/features/cms/contract/sectionTypes.ts");
const OUT_DIR = resolve(ROOT, "scripts/cms/output");
const OUT_JSON = resolve(OUT_DIR, "d9-owner-buckets.json");
const OUT_MD = resolve(ROOT, "docs/04-betrieb/sprint-2c-d9-owner-entscheidungen.md");

// -------- Vertrag/Alias-Parser (gespiegelt aus contract-drift-audit) --------

function read(p) { return readFileSync(p, "utf8"); }
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
    out.set(starts[i].name, {
      section_type: starts[i].name,
      status,
      top_level: topLevel,
      allowed_parents: matchArray(block, "allowed_parents"),
      allowed_children: matchArray(block, "allowed_children"),
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
    headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
    body: "{}",
  });
  if (!res.ok) return { ok: false, reason: "http", status: res.status, body: await res.text() };
  return { ok: true, data: await res.json() };
}

// -------- D9-Klassifikation (feiner als das Hauptaudit) --------

const PATTERNS = {
  P_CHILD_AT_TOP: "child_only_at_top_level",                    // child-only Typ liegt Top-Level
  P_TOPONLY_UNDER_PARENT: "top_level_only_under_parent",        // Top-Level-only Typ liegt unter Parent
  P_NOT_IN_ALLOWED_CHILDREN: "child_not_in_allowed_children",   // Kind-Typ nicht in allowed_children
  P_PARENT_NOT_ALLOWED: "parent_not_in_allowed_parents",        // Parent nicht in allowed_parents
  P_PARENT_UNKNOWN: "parent_type_unknown_or_legacy",            // Parent-Typ unbekannt/legacy/special
  P_ORPHAN: "child_only_orphan",                                // Kind-Typ ohne Parent (Parent fehlt)
};

const OWNER_HINTS = {
  [PATTERNS.P_CHILD_AT_TOP]:
    "O2/O5 — historische Top-Level-Karten/Tabs. Vertrag korrigieren ist riskant; spätere Strukturmigration (Container einziehen oder Typ erweitern).",
  [PATTERNS.P_TOPONLY_UNDER_PARENT]:
    "O1 — Vertrag prüfen, evtl. top_level lockern oder allowed_parents erweitern.",
  [PATTERNS.P_NOT_IN_ALLOWED_CHILDREN]:
    "O1/O2 — entweder Vertrag erweitern (allowed_children) oder Kind später umhängen.",
  [PATTERNS.P_PARENT_NOT_ALLOWED]:
    "O1/O2 — entweder Vertrag erweitern (allowed_parents) oder Kind später umhängen.",
  [PATTERNS.P_PARENT_UNKNOWN]:
    "O3/O4 — Parent-Typ ist legacy/special/ohne Vertrag. Spezialowner dokumentieren oder Cleanup planen.",
  [PATTERNS.P_ORPHAN]:
    "O5 — Parent fehlt komplett (Datenfehler). Fachliche Prüfung nötig.",
};

function classify({ contracts, aliasMap, drift }) {
  const sectionById = new Map(drift.sections.map((s) => [s.id, s]));
  const normalize = (t) => (t ? aliasMap.get(t) ?? t : null);

  const all = []; // detaillierte D9-Treffer

  for (const sec of drift.sections) {
    const canon = normalize(sec.section_type);
    const contract = canon ? contracts.get(canon) : null;
    if (!contract) continue; // ohne Vertrag → D1, hier nicht relevant
    const hasParent = sec.parent_section_id != null;

    if (!hasParent) {
      if (contract.top_level === false) {
        all.push({
          pattern: PATTERNS.P_CHILD_AT_TOP,
          page_key: sec.page_key, section_key: sec.section_key,
          section_type: canon, parent_type: null, is_active: sec.is_active,
        });
      }
      continue;
    }

    const parent = sectionById.get(sec.parent_section_id);
    if (!parent) {
      all.push({
        pattern: contract.top_level === false ? PATTERNS.P_ORPHAN : PATTERNS.P_PARENT_UNKNOWN,
        page_key: sec.page_key, section_key: sec.section_key,
        section_type: canon, parent_type: null, is_active: sec.is_active,
      });
      continue;
    }

    const parentType = normalize(parent.section_type);
    const parentContract = parentType ? contracts.get(parentType) : null;

    // Top-Level-only Typ unter einem Parent? (z. B. hero_v1 unter container)
    if (contract.top_level === true && contract.allowed_parents.length === 0) {
      all.push({
        pattern: PATTERNS.P_TOPONLY_UNDER_PARENT,
        page_key: sec.page_key, section_key: sec.section_key,
        section_type: canon, parent_type: parentType, is_active: sec.is_active,
      });
      continue;
    }

    if (!parentContract) {
      all.push({
        pattern: PATTERNS.P_PARENT_UNKNOWN,
        page_key: sec.page_key, section_key: sec.section_key,
        section_type: canon, parent_type: parentType, is_active: sec.is_active,
      });
      continue;
    }

    const childOk = parentContract.allowed_children.includes(canon);
    const parentOk = contract.allowed_parents.length === 0
      || contract.allowed_parents.includes("*")
      || contract.allowed_parents.includes(parentType);

    if (!childOk) {
      all.push({
        pattern: PATTERNS.P_NOT_IN_ALLOWED_CHILDREN,
        page_key: sec.page_key, section_key: sec.section_key,
        section_type: canon, parent_type: parentType, is_active: sec.is_active,
      });
    }
    if (!parentOk) {
      all.push({
        pattern: PATTERNS.P_PARENT_NOT_ALLOWED,
        page_key: sec.page_key, section_key: sec.section_key,
        section_type: canon, parent_type: parentType, is_active: sec.is_active,
      });
    }
  }
  return all;
}

// -------- Aggregation --------

function groupBy(all) {
  // pattern → section_type → parent_type → { count, pages: Set, sections: [] }
  const out = {};
  for (const f of all) {
    const pat = (out[f.pattern] ||= { count: 0, by_type: {} });
    pat.count++;
    const t = (pat.by_type[f.section_type] ||= { count: 0, by_parent: {} });
    t.count++;
    const pk = f.parent_type ?? "(none)";
    const p = (t.by_parent[pk] ||= { count: 0, pages: new Set(), sample: [] });
    p.count++;
    p.pages.add(f.page_key);
    if (p.sample.length < 6) p.sample.push(`${f.page_key} / ${f.section_key}${f.is_active ? "" : " (inactive)"}`);
  }
  return out;
}

function inspectMobileTkPreview(all) {
  const hits = all.filter((f) =>
    f.section_type === "tab_v1" && f.page_key === "mobile-tk-preview.root"
  );
  const onTopLevel = hits.filter((f) => f.pattern === PATTERNS.P_CHILD_AT_TOP);
  return {
    total: hits.length,
    top_level_count: onTopLevel.length,
    sample: onTopLevel.slice(0, 10).map((f) => `${f.section_key}${f.is_active ? "" : " (inactive)"}`),
  };
}

// -------- Markdown --------

function md(report) {
  const { totals, grouped, mobileTk, generated_at } = report;
  let s = `# Sprint 2c — D9 Owner-Entscheidungen\n\n`;
  s += `_Generiert: ${generated_at}_\n\n`;
  s += `Quelle: \`scripts/cms/d9-owner-buckets.mjs\` (read-only, nutzt \`rpc_admin_export_contract_drift\`).\n\n`;
  s += `## Zusammenfassung\n\n`;
  s += `- D9-Treffer gesamt: **${totals.d9_total}**\n`;
  s += `- Verteilt auf **${totals.distinct_pages}** Seiten und **${totals.distinct_section_types}** Section-Typen.\n`;
  s += `- Davon aktiv (\`is_active = true\`): **${totals.active}**, inaktiv: **${totals.inactive}**.\n\n`;

  s += `## Entscheidungsklassen\n\n`;
  s += `| Klasse | Bedeutung |\n|---|---|\n`;
  s += `| **O1** | Vertrag falsch oder zu eng — Vertrag korrigieren möglich (allowed_parents/allowed_children erweitern, top_level lockern) |\n`;
  s += `| **O2** | Historische Struktur, öffentlich korrekt gerendert — spätere Strukturmigration nötig (Container einziehen / Typ ändern) |\n`;
  s += `| **O3** | Source-only / Legacy — spätere Cleanup- oder Deaktivierungsentscheidung |\n`;
  s += `| **O4** | Spezialrenderer-Owner — Vertrag/Audit muss Owner kennen (special status) |\n`;
  s += `| **O5** | Unklar — nicht anfassen, fachliche Prüfung nötig |\n\n`;

  s += `## D9-Muster im Überblick\n\n`;
  s += `| Muster | Count | Empfehlung |\n|---|---:|---|\n`;
  for (const [pat, payload] of Object.entries(grouped).sort((a, b) => b[1].count - a[1].count)) {
    s += `| \`${pat}\` | ${payload.count} | ${OWNER_HINTS[pat] ?? "—"} |\n`;
  }
  s += `\n`;

  for (const [pat, payload] of Object.entries(grouped).sort((a, b) => b[1].count - a[1].count)) {
    s += `### Muster: \`${pat}\` — ${payload.count} Treffer\n\n`;
    s += `**Owner-Empfehlung:** ${OWNER_HINTS[pat] ?? "—"}\n\n`;
    s += `| section_type | parent_type | Count | Beispiele |\n|---|---|---:|---|\n`;
    const types = Object.entries(payload.by_type).sort((a, b) => b[1].count - a[1].count);
    for (const [t, tp] of types) {
      const parents = Object.entries(tp.by_parent).sort((a, b) => b[1].count - a[1].count);
      for (const [pType, pp] of parents) {
        const ex = pp.sample.map((s) => `\`${s}\``).join("<br>");
        s += `| ${t} | ${pType} | ${pp.count} | ${ex} |\n`;
      }
    }
    s += `\n`;
  }

  s += `## Spezialfall: \`tab_v1\` auf \`mobile-tk-preview.root\`\n\n`;
  if (mobileTk.total === 0) {
    s += `Keine \`tab_v1\`-Treffer auf \`mobile-tk-preview.root\` im aktuellen D9-Set.\n\n`;
  } else {
    s += `- \`tab_v1\`-Sections gesamt im D9-Set: **${mobileTk.total}**\n`;
    s += `- davon Top-Level (\`child_only_at_top_level\`): **${mobileTk.top_level_count}**\n`;
    s += `- Beispiele:\n`;
    for (const sk of mobileTk.sample) s += `  - \`${sk}\`\n`;
    s += `\n**Befund (read-only):**\n\n`;
    s += `- Seite \`mobile-tk-preview.root\` ist eine interne Preview/Stage-Seite. \`tab_v1\` ist laut Vertrag child-only (Parent = \`tabs_v1\`) und sollte deshalb nicht Top-Level liegen.\n`;
    s += `- Aktuell existiert kein \`tabs_v1\`-Parent auf dieser Seite, unter den die Tabs „einfach" rutschen könnten — eine spätere Strukturmigration muss zuerst einen \`tabs_v1\`-Container einziehen und die Tabs gesammelt umhängen.\n`;
    s += `- Öffentliche Renderer iterieren über \`cms.sections\` der jeweiligen Seite. Solange die Preview-Seite nicht öffentlich verlinkt ist, hat die Verletzung keine sichtbare Public-Wirkung.\n`;
    s += `- Empfehlung: **O2 — historische Struktur, spätere Strukturmigration in Sprint 2d planen.** Nicht in dieser Etappe reparieren.\n\n`;
  }

  s += `## Was Sprint 2c NICHT tut\n\n`;
  s += `- Keine Parent/Child-Struktur wird verändert.\n`;
  s += `- Keine Section wird aktiviert oder deaktiviert.\n`;
  s += `- Keine Inhalte, Bilder, Whitelist oder Feldwerte werden berührt.\n`;
  s += `- Kein neuer Schreib-RPC. Keine Vertragsänderung in diesem Lauf.\n`;
  s += `- Kein Public-Renderer, keine Route, keine Navigation, kein Footer, keine i18n-Datei verändert.\n\n`;
  s += `---\n\n`;
  s += `Nächste Etappe: \`cms-light-eine-wahrheit-sprint-2d-d9-strukturmigration-pilot-1\` — Pilot-Migration für ein klar abgegrenztes D9-Muster (Owner-Pick).\n`;
  return s;
}

// -------- main --------

async function main() {
  const rendererSrc = read(RENDERER_FILE);
  const contractSrc = read(CONTRACT_FILE);
  const aliasMap = extractTypeAliases(rendererSrc);
  const contracts = parseContracts(contractSrc);

  const db = await fetchDrift();
  if (!db.ok) {
    console.error("DB-RPC nicht verfügbar:", db);
    process.exit(0);
  }

  const all = classify({ contracts, aliasMap, drift: db.data });
  const grouped = groupBy(all);
  const mobileTk = inspectMobileTkPreview(all);

  const pages = new Set();
  const types = new Set();
  let active = 0;
  let inactive = 0;
  for (const f of all) {
    pages.add(f.page_key);
    types.add(f.section_type);
    if (f.is_active) active++; else inactive++;
  }

  const totals = {
    d9_total: all.length,
    distinct_pages: pages.size,
    distinct_section_types: types.size,
    active, inactive,
  };

  // JSON-serialisierbar machen (Sets/Sample-Arrays)
  const groupedJson = {};
  for (const [pat, p] of Object.entries(grouped)) {
    const by_type = {};
    for (const [t, tp] of Object.entries(p.by_type)) {
      const by_parent = {};
      for (const [k, pp] of Object.entries(tp.by_parent)) {
        by_parent[k] = { count: pp.count, distinct_pages: pp.pages.size, sample: pp.sample };
      }
      by_type[t] = { count: tp.count, by_parent };
    }
    groupedJson[pat] = { count: p.count, by_type };
  }

  const report = {
    generated_at: new Date().toISOString(),
    totals,
    grouped: groupedJson,
    mobileTk,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  writeFileSync(OUT_MD, md(report));

  console.log("D9 Owner-Buckets (read-only)");
  console.log(`  D9 gesamt: ${totals.d9_total}`);
  console.log(`  aktiv: ${totals.active} · inaktiv: ${totals.inactive}`);
  console.log("  Muster:");
  for (const [pat, p] of Object.entries(grouped).sort((a, b) => b[1].count - a[1].count)) {
    console.log(`    ${String(p.count).padStart(4)}  ${pat}`);
  }
  console.log(`\nJSON → ${OUT_JSON}`);
  console.log(`MD   → ${OUT_MD}`);
}

main().catch((e) => { console.error(e); process.exit(0); });
