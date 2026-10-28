#!/usr/bin/env node
/**
 * contract-drift-audit.mjs — Sprint 1b (read-only).
 *
 * Aggregiertes Drift-Audit zwischen Section-Type-Vertrag
 * (`src/features/cms/contract/sectionTypes.ts`), aktivem Renderer-Set
 * (`src/features/cms/components/CmsBodyRenderer.tsx`) und dem aktuellen
 * Stand in der CMS-Light-DB (über die read-only RPC
 * `rpc_admin_export_contract_drift`).
 *
 * Erkennt die Drift-Klassen D0–D10:
 *   D0  ok
 *   D1  contract_missing                   — section_type ohne Vertrag
 *   D2  fields_unknown_to_contract         — DB-field_key weder Vertrag/Alias/Dynamic
 *   D3  contract_fields_missing_in_db      — Vertragsfeld ohne DB-Zeile
 *   D4  whitelist_unknown_to_contract      — Whitelist-Feld ohne Vertrag/Alias
 *   D5  whitelist_missing_for_contract_field
 *   D6  asset_slot_unknown_to_contract     — cms_assets.field_key nicht im Vertrag
 *   D7  contract_asset_slot_missing        — Vertrag erwartet Slot, aber DB/Whitelist leer
 *   D8  active_without_renderer            — aktive Top-Level-Section ohne Renderer
 *   D9  invalid_parent_child               — Vertrag verletzt (parent/child)
 *   D10 i18n_or_special_owner_risk         — bewusste Spezial-/i18n-Übernahme
 *
 * Schreibt:
 *   docs/04-betrieb/contract-drift-audit-latest.md
 *   scripts/cms/output/contract-drift-audit-latest.json
 *
 * Aufruf:
 *   node scripts/cms/contract-drift-audit.mjs
 *
 * Env (Pflicht für DB-Teil):
 *   VITE_SUPABASE_URL              (oder SUPABASE_URL)
 *   VITE_SUPABASE_PUBLISHABLE_KEY  (oder SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY)
 *
 * Ohne DB-Env wird der statische Vertrags-/Renderer-Teil trotzdem geprüft.
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const RENDERER_FILE = resolve(ROOT, "src/features/cms/components/CmsBodyRenderer.tsx");
const CONTRACT_FILE = resolve(ROOT, "src/features/cms/contract/sectionTypes.ts");
const OUT_DIR = resolve(ROOT, "scripts/cms/output");
const OUT_JSON = resolve(OUT_DIR, "contract-drift-audit-latest.json");
const OUT_MD = resolve(ROOT, "docs/04-betrieb/contract-drift-audit-latest.md");

const c = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  red: "\x1b[31m", yellow: "\x1b[33m", green: "\x1b[32m", cyan: "\x1b[36m",
};

// ---------------------------------------------------------------------------
// 1) Statische Quellen: Vertrag + Renderer einlesen (regex-basiert, ohne tsc)
// ---------------------------------------------------------------------------

function readFile(p) {
  return readFileSync(p, "utf8");
}

function extractRendererTypes(src) {
  const out = new Set();
  const idx = src.indexOf("RENDERERS");
  if (idx < 0) return out;
  const braceStart = src.indexOf("= {", idx);
  if (braceStart < 0) return out;
  const end = src.indexOf("\n};", braceStart);
  for (const line of src.slice(braceStart + 3, end).split("\n")) {
    const km = line.match(/^\s*([a-z0-9_]+)\s*:/i);
    if (km) out.add(km[1]);
  }
  return out;
}

function extractSkipTypes(src) {
  const out = new Set();
  const m = src.match(/SKIP_TYPES\s*=\s*new Set\(\[(.*?)\]\)/s);
  if (!m) return out;
  for (const s of m[1].matchAll(/["']([^"']+)["']/g)) out.add(s[1]);
  return out;
}

function extractTypeAliases(src) {
  // const map: Record<string, string> = { hero: "hero_v1", ... };
  const out = new Map();
  const m = src.match(/const map:\s*Record<string,\s*string>\s*=\s*\{([\s\S]*?)\};/);
  if (!m) return out;
  for (const mm of m[1].matchAll(/["']([^"']+)["']\s*:\s*["']([^"']+)["']/g)) {
    out.set(mm[1], mm[2]);
  }
  return out;
}

function parseContracts(src) {
  // Robusteres Splitten am Top-Level der SECTION_TYPE_CONTRACTS-Records.
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
    const isContainer = /is_container:\s*true/.test(block);
    const parents = matchArray(block, "allowed_parents");
    const children = matchArray(block, "allowed_children");
    const textFields = extractFields(block, /T\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*(?:,\s*\{([^}]*)\})?\s*\)/g);
    const toggleFields = extractFields(block, /TOGGLE\(\s*"([^"]+)"\s*,\s*"([^"]+)"/g, true);
    const assetSlots = extractAssetSlots(block);
    const knownSpecials = [...block.matchAll(/known_specials:\s*\[([\s\S]*?)\]/g)].flatMap((x) =>
      [...x[1].matchAll(/"([^"]+)"/g)].map((y) => y[1]),
    );
    const knownConflicts = [...block.matchAll(/known_conflicts:\s*\[([\s\S]*?)\]/g)].flatMap((x) =>
      [...x[1].matchAll(/"([^"]+)"/g)].map((y) => y[1]),
    );
    out.set(starts[i].name, {
      section_type: starts[i].name,
      status, top_level: topLevel, is_container: isContainer,
      allowed_parents: parents, allowed_children: children,
      text_fields: textFields, technical_fields: toggleFields,
      asset_slots: assetSlots,
      known_specials: knownSpecials, known_conflicts: knownConflicts,
    });
  }
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
    out.push({ field_key, label, required, aliases, admin: adminMatch ? adminMatch[1] === "true" : true });
  }
  return out;
}

function extractAssetSlots(block) {
  const out = [];
  const re = /IMG\(\s*"([^"]+)"\s*,\s*"([^"]+)"(?:\s*,\s*"([^"]+)")?/g;
  let mm;
  while ((mm = re.exec(block))) {
    out.push({ field_key: mm[1], kind: mm[2], required: mm[3] || "optional" });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2) DB-Daten via RPC ziehen (optional)
// ---------------------------------------------------------------------------

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
  const key =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { ok: false, reason: "missing-env", missing: [
      url ? null : "VITE_SUPABASE_URL",
      key ? null : "VITE_SUPABASE_PUBLISHABLE_KEY",
    ].filter(Boolean) };
  }
  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/rpc/rpc_admin_export_contract_drift`;
  let res;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: "{}",
    });
  } catch (e) {
    return { ok: false, reason: "network", error: String(e?.message ?? e) };
  }
  if (!res.ok) {
    return { ok: false, reason: "http", status: res.status, body: await res.text() };
  }
  const data = await res.json();
  return { ok: true, data };
}

// ---------------------------------------------------------------------------
// 3) Drift-Klassen aggregieren
// ---------------------------------------------------------------------------

const DYNAMIC_FIELD_PATTERNS = [
  /^items\.[A-Za-z0-9_-]+\./,
  /^features\.\d+$/,
  /^features\.\d+\.[a-z]+$/,
  // Sprint 2a: role_tabs_v1 (snipdoo IP) — tabs.<roleKey>.label|headline|p1|p2
  /^tabs\.[A-Za-z0-9_-]+\.(label|headline|p1|p2)$/,
  // Sprint 2a: tab_v1 (mobile-tk-preview) — vorteile.<n>.headline|body
  /^vorteile\.\d+\.(headline|body)$/,
];
const isDynamicKey = (fk) => DYNAMIC_FIELD_PATTERNS.some((re) => re.test(fk));

function analyze({ contracts, renderers, skips, aliasMap, drift }) {
  const findings = {
    D1: [], D2: [], D3: [], D4: [], D5: [],
    D6: [], D7: [], D8: [], D9: [], D10: [],
  };
  const counts = Object.fromEntries(Object.keys(findings).map((k) => [k, 0]));
  let okSections = 0;

  // Vertragsstatus D10 (Spezial/i18n-Risiken aus Vertrag)
  for (const ct of contracts.values()) {
    for (const s of ct.known_specials) findings.D10.push({ section_type: ct.section_type, note: s });
    for (const s of ct.known_conflicts) findings.D10.push({ section_type: ct.section_type, note: s, kind: "conflict" });
  }
  counts.D10 = findings.D10.length;

  if (!drift) return { findings, counts, okSections, totals: null };

  const sectionsByPage = new Map();
  for (const s of drift.sections) {
    if (!sectionsByPage.has(s.page_key)) sectionsByPage.set(s.page_key, []);
    sectionsByPage.get(s.page_key).push(s);
  }
  const sectionById = new Map(drift.sections.map((s) => [s.id, s]));

  // Felder pro Section gruppieren
  const fieldsBySec = new Map();
  for (const f of drift.section_fields) {
    const k = `${f.page_key}|${f.section_key}`;
    if (!fieldsBySec.has(k)) fieldsBySec.set(k, new Set());
    fieldsBySec.get(k).add(f.field_key);
  }
  const assetsBySec = new Map();
  for (const a of drift.assets) {
    const k = `${a.page_key}|${a.section_key}`;
    if (!assetsBySec.has(k)) assetsBySec.set(k, new Set());
    if (a.field_key) assetsBySec.get(k).add(a.field_key);
  }
  const wlBySec = new Map();
  for (const w of drift.editable_fields) {
    const k = `${w.page_key}|${w.section_key}`;
    if (!wlBySec.has(k)) wlBySec.set(k, new Set());
    wlBySec.get(k).add(w.field_key);
  }

  const normalize = (t) => (t ? aliasMap.get(t) ?? t : null);

  for (const sec of drift.sections) {
    const canon = normalize(sec.section_type);
    const k = `${sec.page_key}|${sec.section_key}`;
    const dbFields = fieldsBySec.get(k) ?? new Set();
    const dbAssets = assetsBySec.get(k) ?? new Set();
    const wl = wlBySec.get(k) ?? new Set();

    // D1 contract_missing
    const contract = canon ? contracts.get(canon) : null;
    if (!contract) {
      findings.D1.push({
        page_key: sec.page_key, section_key: sec.section_key,
        section_type: sec.section_type, is_active: sec.is_active,
      });
      counts.D1++;
      continue;
    }

    // Bekannte Vertragsfelder
    const contractKeys = new Set();
    const aliasToCanon = new Map();
    for (const f of [...contract.text_fields, ...contract.technical_fields]) {
      contractKeys.add(f.field_key);
      for (const a of f.aliases) aliasToCanon.set(a, f.field_key);
    }
    const assetKeys = new Set(contract.asset_slots.map((a) => a.field_key));

    // D2 fields_unknown_to_contract
    for (const fk of dbFields) {
      if (contractKeys.has(fk)) continue;
      if (aliasToCanon.has(fk)) continue;
      if (assetKeys.has(fk)) continue;
      if (isDynamicKey(fk)) continue;
      findings.D2.push({
        page_key: sec.page_key, section_key: sec.section_key,
        section_type: canon, field_key: fk,
      });
      counts.D2++;
    }

    // D3 contract_fields_missing_in_db
    for (const f of contract.text_fields) {
      const has = dbFields.has(f.field_key) || (f.aliases ?? []).some((a) => dbFields.has(a));
      if (!has) {
        findings.D3.push({
          page_key: sec.page_key, section_key: sec.section_key,
          section_type: canon, field_key: f.field_key, required: f.required,
        });
        counts.D3++;
      }
    }

    // D4 whitelist_unknown_to_contract
    for (const fk of wl) {
      if (contractKeys.has(fk) || aliasToCanon.has(fk) || assetKeys.has(fk)) continue;
      if (isDynamicKey(fk)) continue;
      findings.D4.push({
        page_key: sec.page_key, section_key: sec.section_key,
        section_type: canon, field_key: fk,
      });
      counts.D4++;
    }

    // D5 whitelist_missing_for_contract_field (nur admin:true Felder)
    for (const f of contract.text_fields) {
      if (f.admin === false) continue;
      const inWL = wl.has(f.field_key) || (f.aliases ?? []).some((a) => wl.has(a));
      if (!inWL) {
        findings.D5.push({
          page_key: sec.page_key, section_key: sec.section_key,
          section_type: canon, field_key: f.field_key,
        });
        counts.D5++;
      }
    }

    // D6 asset_slot_unknown_to_contract
    for (const ak of dbAssets) {
      if (!assetKeys.has(ak)) {
        findings.D6.push({
          page_key: sec.page_key, section_key: sec.section_key,
          section_type: canon, field_key: ak,
        });
        counts.D6++;
      }
    }

    // D7 contract_asset_slot_missing (nur required/recommended)
    for (const a of contract.asset_slots) {
      if (a.required === "optional") continue;
      if (dbAssets.has(a.field_key)) continue;
      findings.D7.push({
        page_key: sec.page_key, section_key: sec.section_key,
        section_type: canon, field_key: a.field_key, required: a.required,
      });
      counts.D7++;
    }

    // D8 active_without_renderer (nur Top-Level)
    const hasParent = sec.parent_section_id != null;
    if (sec.is_active && !hasParent) {
      const isSkip = skips.has(canon);
      const isLegacy = contract.status === "legacy";
      const isSpecial = contract.status === "special";
      const hasRenderer = renderers.has(canon);
      // Child-only Typen (top_level=false) sollen NICHT als D8 zählen — sie
      // werden weiter unten als D9 (child_only_at_top_level) markiert.
      const isChildOnly = contract.top_level === false;
      if (!hasRenderer && !isSkip && !isLegacy && !isSpecial && !isChildOnly) {
        findings.D8.push({
          page_key: sec.page_key, section_key: sec.section_key,
          section_type: canon, status: contract.status,
        });
        counts.D8++;
      }
    }

    // D9 invalid_parent_child
    if (hasParent) {
      const parent = sectionById.get(sec.parent_section_id);
      const parentType = parent ? normalize(parent.section_type) : null;
      const parentContract = parentType ? contracts.get(parentType) : null;
      if (contract.top_level === false && !parent) {
        findings.D9.push({
          page_key: sec.page_key, section_key: sec.section_key,
          section_type: canon, kind: "child_only_orphan",
        });
        counts.D9++;
      } else if (parent && parentContract) {
        const allowed = parentContract.allowed_children;
        if (!allowed.includes(canon)) {
          findings.D9.push({
            page_key: sec.page_key, section_key: sec.section_key,
            section_type: canon, parent_type: parentType,
            kind: "child_not_in_allowed_children",
          });
          counts.D9++;
        }
        const allowedParents = contract.allowed_parents;
        if (allowedParents.length > 0 && !allowedParents.includes(parentType) && !allowedParents.includes("*")) {
          findings.D9.push({
            page_key: sec.page_key, section_key: sec.section_key,
            section_type: canon, parent_type: parentType,
            kind: "parent_not_in_allowed_parents",
          });
          counts.D9++;
        }
      }
    } else {
      // Top-Level: child-only Typen sind hier verboten
      if (contract.top_level === false) {
        findings.D9.push({
          page_key: sec.page_key, section_key: sec.section_key,
          section_type: canon, kind: "child_only_at_top_level",
        });
        counts.D9++;
      }
    }

    if (
      counts.D1 === 0 && counts.D2 === 0 && counts.D3 === 0 &&
      counts.D8 === 0 && counts.D9 === 0
    ) okSections++;
  }

  const totals = {
    pages: drift.pages.length,
    sections: drift.sections.length,
    section_fields: drift.section_fields.length,
    assets: drift.assets.length,
    editable_fields: drift.editable_fields.length,
  };
  return { findings, counts, okSections, totals };
}

// ---------------------------------------------------------------------------
// 4) Top-Listen + Reparatur-Tranchen
// ---------------------------------------------------------------------------

function topN(arr, n, keyFn) {
  const map = new Map();
  for (const x of arr) {
    const k = keyFn(x);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function buildTranches(counts) {
  const out = [];
  if (counts.D1 > 0) out.push({
    priority: "P1", risk: "mittel",
    title: `Vertrag für ${counts.D1} Section(s) ohne Vertragstyp ergänzen oder als legacy markieren`,
    rationale: "section_type existiert in DB, aber nicht in sectionTypes.ts → Renderer-/Admin-Verhalten ist undefiniert.",
  });
  if (counts.D8 > 0) out.push({
    priority: "P1", risk: "hoch",
    title: `${counts.D8} aktive Top-Level-Sections ohne Renderer prüfen/deaktivieren`,
    rationale: "Werden öffentlich nicht angezeigt — wahrscheinlich Karteileichen oder Falschtyp.",
  });
  if (counts.D9 > 0) out.push({
    priority: "P2", risk: "hoch",
    title: `${counts.D9} Parent/Child-Verletzungen kuratieren`,
    rationale: "Verletzen den Vertrag (child-only an Top-Level oder Kind-Typ nicht erlaubt). Risiko bei Copy/Paste.",
  });
  if (counts.D5 > 0) out.push({
    priority: "P2", risk: "niedrig",
    title: `Whitelist für ${counts.D5} Vertragsfelder ergänzen (Sprint 2 Seeding)`,
    rationale: "Vertrag erwartet Admin-Pflege, aber cms_admin_editable_fields hat keine Zeile.",
  });
  if (counts.D3 > 0) out.push({
    priority: "P3", risk: "niedrig",
    title: `${counts.D3} fehlende Vertragsfelder als leere DB-Zeilen anlegen (Sprint 2 Seeding)`,
    rationale: "Vertrag erwartet Feld, DB hat keine Zeile → Admin zeigt 'fehlt in DB'.",
  });
  if (counts.D2 > 0) out.push({
    priority: "P3", risk: "mittel",
    title: `${counts.D2} Legacy-DB-Felder auswerten: Vertrag erweitern ODER stilllegen`,
    rationale: "DB hat Feld, Vertrag kennt es nicht. Mögliche Aliase oder echte Legacy-Daten.",
  });
  if (counts.D4 > 0) out.push({
    priority: "P3", risk: "mittel",
    title: `${counts.D4} Whitelist-Einträge ohne Vertrag prüfen`,
    rationale: "Whitelist erlaubt Felder, die der Vertrag nicht kennt — Admin könnte hier verwirrend wirken.",
  });
  if (counts.D6 > 0) out.push({
    priority: "P3", risk: "mittel",
    title: `${counts.D6} Asset-Slots außerhalb des Vertrags klären`,
    rationale: "cms_assets.field_key wird vom Vertrag nicht erwartet — entweder Vertrag erweitern oder Asset entfernen.",
  });
  if (counts.D7 > 0) out.push({
    priority: "P4", risk: "niedrig",
    title: `${counts.D7} fehlende erforderliche Asset-Slots erfassen`,
    rationale: "Vertrag erwartet Asset, Section hat keines — meist redaktioneller Nachtrag.",
  });
  return out;
}

// ---------------------------------------------------------------------------
// 5) Reporting
// ---------------------------------------------------------------------------

function formatSummary(report) {
  const { counts, okSections, totals, dbStatus } = report;
  let s = `${c.bold}${c.cyan}Contract-Drift-Audit (read-only)${c.reset}\n`;
  if (!dbStatus.ok) {
    s += `${c.yellow}DB-Teil übersprungen: ${dbStatus.reason}${c.reset}`;
    if (dbStatus.missing) s += ` (fehlt: ${dbStatus.missing.join(", ")})`;
    s += "\nStatische Vertrags-/Renderer-Prüfung läuft trotzdem.\n";
  } else if (totals) {
    s += `${c.dim}Seiten: ${totals.pages} · Sections: ${totals.sections} · Felder: ${totals.section_fields} · Assets: ${totals.assets} · Whitelist: ${totals.editable_fields}${c.reset}\n`;
  }
  s += "\n";
  s += `${c.bold}Drift-Klassen:${c.reset}\n`;
  const labels = {
    D1: "contract_missing", D2: "fields_unknown_to_contract",
    D3: "contract_fields_missing_in_db", D4: "whitelist_unknown_to_contract",
    D5: "whitelist_missing_for_contract_field", D6: "asset_slot_unknown_to_contract",
    D7: "contract_asset_slot_missing", D8: "active_without_renderer",
    D9: "invalid_parent_child", D10: "i18n_or_special_owner_risk",
  };
  for (const k of Object.keys(labels)) {
    const n = counts[k];
    const col = n === 0 ? c.green : (k === "D1" || k === "D8" || k === "D9") ? c.red : c.yellow;
    s += `  ${col}${k.padEnd(4)}${c.reset} ${String(n).padStart(5)}  ${labels[k]}\n`;
  }
  s += `  ${c.green}D0${c.reset}      ${String(okSections).padStart(5)}  ok_sections\n`;
  return s;
}

function buildMarkdown(report) {
  const { counts, okSections, totals, dbStatus, findings, tranches, generated_at } = report;
  const labels = {
    D1: "contract_missing", D2: "fields_unknown_to_contract",
    D3: "contract_fields_missing_in_db", D4: "whitelist_unknown_to_contract",
    D5: "whitelist_missing_for_contract_field", D6: "asset_slot_unknown_to_contract",
    D7: "contract_asset_slot_missing", D8: "active_without_renderer",
    D9: "invalid_parent_child", D10: "i18n_or_special_owner_risk",
  };
  let md = `# Contract-Drift-Audit — Aktueller Stand\n\n`;
  md += `_Generiert: ${generated_at}_\n\n`;
  md += `Quelle: \`scripts/cms/contract-drift-audit.mjs\` über die read-only RPC \`rpc_admin_export_contract_drift\`.\n\n`;
  if (!dbStatus.ok) {
    md += `> ⚠️ DB-Teil übersprungen (${dbStatus.reason}). Statischer Teil wurde geprüft.\n\n`;
  } else if (totals) {
    md += `## Datenstand\n\n`;
    md += `- Seiten: **${totals.pages}**\n- Sections: **${totals.sections}**\n- Section-Felder: **${totals.section_fields}**\n- Assets: **${totals.assets}**\n- Whitelist-Zeilen: **${totals.editable_fields}**\n\n`;
  }
  md += `## Drift-Klassen\n\n| Klasse | Beschreibung | Count |\n|---|---|---:|\n`;
  for (const k of Object.keys(labels)) md += `| ${k} | ${labels[k]} | ${counts[k]} |\n`;
  md += `| D0 | ok_sections (keine D1/D2/D3/D8/D9) | ${okSections} |\n\n`;

  md += `## Top 20 betroffene Sections\n\n`;
  const sectionLoad = new Map();
  for (const k of Object.keys(findings)) {
    if (k === "D10") continue;
    for (const f of findings[k]) {
      if (!f.page_key) continue;
      const key = `${f.page_key} / ${f.section_key} (${f.section_type})`;
      sectionLoad.set(key, (sectionLoad.get(key) ?? 0) + 1);
    }
  }
  const topSec = [...sectionLoad.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  md += topSec.length ? `| Section | Drift-Treffer |\n|---|---:|\n` : "_(keine)_\n";
  for (const [k, n] of topSec) md += `| ${k} | ${n} |\n`;
  md += `\n`;

  md += `## Top 20 unbekannte field_keys (D2)\n\n`;
  const topFields = topN(findings.D2, 20, (x) => x.field_key);
  md += topFields.length ? `| field_key | Anzahl |\n|---|---:|\n` : "_(keine)_\n";
  for (const [k, n] of topFields) md += `| \`${k}\` | ${n} |\n`;
  md += `\n`;

  md += `## Fehlende Vertragsfelder je section_type (D3)\n\n`;
  const missingByType = new Map();
  for (const f of findings.D3) {
    const k = `${f.section_type} · ${f.field_key}`;
    missingByType.set(k, (missingByType.get(k) ?? 0) + 1);
  }
  const topMiss = [...missingByType.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  md += topMiss.length ? `| section_type · field_key | Sections ohne DB-Zeile |\n|---|---:|\n` : "_(keine)_\n";
  for (const [k, n] of topMiss) md += `| ${k} | ${n} |\n`;
  md += `\n`;

  md += `## Aktive Top-Level-Sections ohne Renderer (D8)\n\n`;
  md += findings.D8.length ? `| Seite | Section | Typ |\n|---|---|---|\n` : "_(keine)_\n";
  for (const f of findings.D8.slice(0, 50)) md += `| ${f.page_key} | ${f.section_key} | ${f.section_type} |\n`;
  md += `\n`;

  md += `## Parent/Child-Vertragsverletzungen (D9)\n\n`;
  md += findings.D9.length ? `| Seite | Section | Typ | Kind-Status |\n|---|---|---|---|\n` : "_(keine)_\n";
  for (const f of findings.D9.slice(0, 50)) {
    md += `| ${f.page_key} | ${f.section_key} | ${f.section_type} | ${f.kind}${f.parent_type ? ` (parent=${f.parent_type})` : ""} |\n`;
  }
  md += `\n`;

  md += `## Spezial-/i18n-Risiken (D10, aus Vertrag)\n\n`;
  md += findings.D10.length ? `| section_type | Hinweis |\n|---|---|\n` : "_(keine)_\n";
  for (const f of findings.D10) md += `| ${f.section_type} | ${f.note} |\n`;
  md += `\n`;

  md += `## Empfohlene Reparatur-Tranchen\n\n`;
  md += tranches.length ? `| Priorität | Risiko | Tranche | Begründung |\n|---|---|---|---|\n` : "_(keine — Stand sauber)_\n";
  for (const t of tranches) md += `| ${t.priority} | ${t.risk} | ${t.title} | ${t.rationale} |\n`;

  md += `\n---\n\n`;
  md += `**Hinweis:** Dieses Audit ist read-only. Es ändert keine Inhalte, keine Bilder, keine Whitelist und keine Public-Renderer.\n`;
  return md;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const rendererSrc = readFile(RENDERER_FILE);
  const contractSrc = readFile(CONTRACT_FILE);

  const renderers = extractRendererTypes(rendererSrc);
  const skips = extractSkipTypes(rendererSrc);
  const aliasMap = extractTypeAliases(rendererSrc);
  const contracts = parseContracts(contractSrc);

  const db = await fetchDrift();
  const drift = db.ok ? db.data : null;

  const analyzed = analyze({ contracts, renderers, skips, aliasMap, drift });
  const tranches = buildTranches(analyzed.counts);
  // Kompakte Zusammenfassung — keine vollständigen Findings (kann 15+ MB werden).
  // Pro Klasse nur Counts + Top-Listen + erste Beispiele.
  const sample = (arr, n = 50) => arr.slice(0, n);
  const findingsSample = Object.fromEntries(
    Object.entries(analyzed.findings).map(([k, v]) => [k, sample(v)]),
  );
  const topUnknownFields = topN(analyzed.findings.D2, 50, (x) => x.field_key)
    .map(([field_key, count]) => ({ field_key, count }));
  const topMissingByType = (() => {
    const map = new Map();
    for (const f of analyzed.findings.D3) {
      const k = `${f.section_type}|${f.field_key}`;
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50)
      .map(([k, count]) => {
        const [section_type, field_key] = k.split("|");
        return { section_type, field_key, count };
      });
  })();

  const report = {
    generated_at: new Date().toISOString(),
    dbStatus: db.ok ? { ok: true } : db,
    totals: analyzed.totals,
    counts: analyzed.counts,
    okSections: analyzed.okSections,
    tranches,
    top_unknown_fields_D2: topUnknownFields,
    top_missing_contract_fields_D3: topMissingByType,
    findings_sample: findingsSample,
  };

  process.stdout.write(formatSummary({ ...report, dbStatus: db }));
  if (tranches.length) {
    console.log("\n" + c.bold + "Empfohlene Reparatur-Tranchen:" + c.reset);
    for (const t of tranches) console.log(`  [${t.priority}/${t.risk}] ${t.title}`);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  writeFileSync(OUT_MD, buildMarkdown({ ...report, findings: analyzed.findings, dbStatus: db }));

  console.log(`\n${c.dim}JSON  → ${OUT_JSON}${c.reset}`);
  console.log(`${c.dim}MD    → ${OUT_MD}${c.reset}`);

  // read-only: nie fail
  process.exit(0);
}

main().catch((e) => {
  console.error("contract-drift-audit failed:", e);
  process.exit(0);
});
