#!/usr/bin/env node
/**
 * d3-d5-rest-triage.mjs — Sprint 2k Read-only Triage.
 *
 * Klassifiziert die verbleibenden D3/D5-Funde aus dem Contract-Drift-Audit
 * nach fachlichen Kategorien S1..S7 und gibt einen Dry-Run-Seed-Plan
 * aus. Schreibt NICHTS in die DB.
 *
 * Outputs:
 *   scripts/cms/output/d3-d5-rest-triage-latest.json
 *   docs/04-betrieb/d3-d5-rest-triage-latest.md
 *
 * Klassen:
 *   S1 sicher seedbar, redaktionell sinnvoll
 *   S2 sicher whitelistingfähig, DB-Feld nur bei Bedarf
 *   S3 optional/variantenspezifisch, nicht pauschal seeden
 *   S4 Vertrag wahrscheinlich zu breit (Varianten nötig)
 *   S5 Spezialrenderer / i18n-Fallback (späterer Sprint)
 *   S6 Legacy/Alias, nicht seeden
 *   S7 D9/inaktiv/archiviert — nicht seeden
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const CONTRACT_FILE = resolve(ROOT, "src/features/cms/contract/sectionTypes.ts");
const RENDERER_FILE = resolve(ROOT, "src/features/cms/components/CmsBodyRenderer.tsx");
const OUT_DIR = resolve(ROOT, "scripts/cms/output");
const OUT_JSON = resolve(OUT_DIR, "d3-d5-rest-triage-latest.json");
const OUT_MD = resolve(ROOT, "docs/04-betrieb/d3-d5-rest-triage-latest.md");

// ---------- Parser (Minimalkopie aus contract-drift-audit.mjs) ----------

function rf(p) { return readFileSync(p, "utf8"); }

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
    out.push({ field_key, label, required, aliases, admin: adminMatch ? adminMatch[1] === "true" : true });
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
    out.set(starts[i].name, {
      section_type: starts[i].name,
      top_level: /top_level:\s*true/.test(block),
      is_container: /is_container:\s*true/.test(block),
      allowed_parents: matchArray(block, "allowed_parents"),
      allowed_children: matchArray(block, "allowed_children"),
      text_fields: extractFields(block, /T\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*(?:,\s*\{([^}]*)\})?\s*\)/g),
      technical_fields: extractFields(block, /TOGGLE\(\s*"([^"]+)"\s*,\s*"([^"]+)"/g, true),
      asset_slots: (() => {
        const out = [];
        const r = /IMG\(\s*"([^"]+)"\s*,\s*"([^"]+)"/g;
        let mm;
        while ((mm = r.exec(block))) out.push({ field_key: mm[1] });
        return out;
      })(),
    });
  }
  return out;
}

const DYN = [/^items\.[A-Za-z0-9_-]+\./, /^features\.\d+$/, /^features\.\d+\.[a-z]+$/,
  /^tabs\.[A-Za-z0-9_-]+\.(label|headline|p1|p2)$/, /^vorteile\.\d+\.(headline|body)$/];
const isDynamic = (fk) => DYN.some((r) => r.test(fk));

function readEnvFile() {
  const p = resolve(ROOT, ".env");
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, "utf8").split("\n")) {
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

// ---------- Klassifikator (Sprint 2l: card_v1-variantenbewusst) ----------

const CARD_BASE_FIELDS = new Set(["title", "description"]);
const CARD_LINK_N = /^link_[123]_(label|href|kind)$/;
const CARD_FEATURE_N = /^features\.\d+$/;

function detectCardVariant({ parent, fields, assets }) {
  if (assets.has("icon_image")) return "icon_card_image";
  if (assets.has("thumbnail") && (!parent || ["card_grid_v1", "catalog_filter_grid_v1"].includes(parent))) return "thumbnail_card";
  if (parent === "download_list_v1") return "download_card";
  if (parent === "feature_grid_v1") return "icon_card_lucide";
  if (parent === "card_grid_v1" || parent === "catalog_filter_grid_v1") return "thumbnail_card";
  if (parent === "cards_v1" || parent === "product_scroller_v1") return "image_card";
  for (const sig of ["link_1_label", "link_1_href", "link_2_label", "link_3_label"]) if (fields.has(sig)) return "multi_link_card";
  if (assets.has("image")) return "image_card";
  if (fields.has("icon")) return "icon_card_lucide";
  return "text_card";
}

const VARIANT_EXPECTED = {
  image_card: new Set(["title", "description", "subtitle", "cta_label", "cta_href", "href"]),
  thumbnail_card: new Set(["title", "description", "subtitle", "cta_label", "cta_href", "href"]),
  icon_card_lucide: new Set(["title", "description", "icon", "features.0", "features.1", "features.2", "features.3", "features.4"]),
  icon_card_image: new Set(["title", "description", "features.0", "features.1", "features.2", "features.3", "features.4"]),
  download_card: new Set(["title", "description", "cta_href", "cta_label"]),
  multi_link_card: new Set(["title", "description", "subtitle",
    "link_1_label", "link_1_href", "link_1_kind",
    "link_2_label", "link_2_href", "link_2_kind",
    "link_3_label", "link_3_href", "link_3_kind"]),
  text_card: new Set(["title", "description", "subtitle", "cta_label", "cta_href", "href"]),
};

function classify(section_type, field_key, variant) {
  if (/^(image|thumbnail|background|icon_svg|hero_image|file|icon_image)$/.test(field_key)) {
    return { class: "S6", reason: "Asset-Slot — gehört in cms_assets, nicht in cms_section_fields" };
  }
  if (isDynamic(field_key) && !CARD_FEATURE_N.test(field_key)) {
    return { class: "S5", reason: "Dynamisches Pattern (items/tabs/vorteile) — nur bei Bedarf seeden" };
  }
  if (section_type === "card_v1") {
    if (CARD_BASE_FIELDS.has(field_key)) return { class: "S1", reason: "Karten-Basisfeld (gilt für alle Varianten) — sicher seedbar" };
    const expected = VARIANT_EXPECTED[variant];
    if (expected && !expected.has(field_key)) {
      return { class: "S3", reason: `Für Variante \`${variant}\` nicht vorgesehen — Admin filtert es heraus, kein Seeding` };
    }
    if (CARD_FEATURE_N.test(field_key)) return { class: "S3", reason: `Feature-Bullet variantenspezifisch (\`${variant}\`)` };
    if (CARD_LINK_N.test(field_key)) return { class: "S3", reason: `Mehrfach-Link-Slot (\`${variant}\`)` };
    if (field_key === "href") return { class: "S4", reason: "href dupliziert cta_href — Variantenmodell trennt Click-/CTA-Karte" };
    if (field_key === "cta_label" || field_key === "cta_href") return { class: "S3", reason: `CTA-Feld nur in Varianten mit CTA (\`${variant}\`)` };
    if (field_key === "icon") return { class: "S3", reason: "Icon-Slot nur in Lucide-Iconkarten" };
    if (field_key === "subtitle") return { class: "S3", reason: "Subtitle optional, variantenspezifisch" };
  }
  if (section_type === "hero_v1") {
    if (field_key === "cta_label" || field_key === "cta_href") return { class: "S5", reason: "Hero-CTA heute oft aus i18n; Abbau geplant" };
    if (["eyebrow", "subline", "headline"].includes(field_key)) return { class: "S5", reason: "Hero-Header heute oft aus i18n (S2-Seiten)" };
  }
  if ((section_type === "cards_v1" || section_type === "content_v1") && ["label", "title", "intro"].includes(field_key)) {
    return { class: "S2", reason: "Container-Header sinnvoll — Whitelist eintragen, DB-Zeile bei Bedarf" };
  }
  return { class: "S3", reason: "Standard-Default: optional, vor Seeding fachlich prüfen" };
}

// ---------- Main ----------

async function main() {
  const contractSrc = rf(CONTRACT_FILE);
  const contracts = parseContracts(contractSrc);
  const aliasMap = extractTypeAliases(rf(RENDERER_FILE));
  const db = await fetchDrift();
  mkdirSync(OUT_DIR, { recursive: true });

  if (!db.ok) {
    const err = { generated_at: new Date().toISOString(), error: db };
    writeFileSync(OUT_JSON, JSON.stringify(err, null, 2));
    console.error("DB nicht erreichbar:", db);
    process.exit(0);
  }

  const drift = db.data;
  const normalize = (t) => (t ? aliasMap.get(t) ?? t : null);

  // Fields/WL/Assets pro Section indexieren
  const idx = (rows, getKey) => {
    const m = new Map();
    for (const r of rows) {
      const k = `${r.page_key}|${r.section_key}`;
      if (!m.has(k)) m.set(k, new Set());
      m.get(k).add(getKey(r));
    }
    return m;
  };
  const fieldsBySec = idx(drift.section_fields, (r) => r.field_key);
  const wlBySec = idx(drift.editable_fields, (r) => r.field_key);
  const assetsBySec = drift.assets
    ? idx(drift.assets.filter((a) => a.is_active !== false), (r) => r.field_key ?? r.asset_role)
    : new Map();

  // D9-Sections markieren
  const d9Sections = new Set();
  const sectionByPid = new Map(drift.sections.map((s) => [s.id, s]));
  const sectionTypeByPid = new Map(drift.sections.map((s) => [s.id, normalize(s.section_type)]));
  for (const sec of drift.sections) {
    const canon = normalize(sec.section_type);
    const c = canon ? contracts.get(canon) : null;
    if (!c) continue;
    if (!sec.parent_section_id && c.allowed_parents.length > 0 && !c.top_level) {
      d9Sections.add(`${sec.page_key}|${sec.section_key}`);
    }
    if (sec.parent_section_id) {
      const p = sectionByPid.get(sec.parent_section_id);
      if (p) {
        const pcanon = normalize(p.section_type);
        const pc = pcanon ? contracts.get(pcanon) : null;
        if (pc && pc.allowed_children.length > 0 && !pc.allowed_children.includes(canon)) {
          d9Sections.add(`${sec.page_key}|${sec.section_key}`);
        }
      }
    }
  }

  // D3 & D5 berechnen + klassifizieren (Sprint 2l: variantenbewusst)
  const D3 = [];
  const D5 = [];
  const variantCounts = {};
  for (const sec of drift.sections) {
    if (!sec.is_active) continue;
    const canon = normalize(sec.section_type);
    const c = canon ? contracts.get(canon) : null;
    if (!c) continue;
    const k = `${sec.page_key}|${sec.section_key}`;
    const dbf = fieldsBySec.get(k) ?? new Set();
    const wl = wlBySec.get(k) ?? new Set();
    const ass = assetsBySec.get(k) ?? new Set();
    const isD9 = d9Sections.has(k);

    let variant = null;
    if (canon === "card_v1") {
      const parentType = sec.parent_section_id ? sectionTypeByPid.get(sec.parent_section_id) ?? null : null;
      variant = detectCardVariant({ parent: parentType, fields: dbf, assets: ass });
      variantCounts[variant] = (variantCounts[variant] ?? 0) + 1;
    }

    for (const f of c.text_fields) {
      const has = dbf.has(f.field_key) || (f.aliases ?? []).some((a) => dbf.has(a));
      const inWL = wl.has(f.field_key) || (f.aliases ?? []).some((a) => wl.has(a));
      if (!has) {
        const cls = isD9
          ? { class: "S7", reason: "Section ist in D9 (Vertragsverletzung) — kein Seeding bevor D9 entschieden" }
          : classify(canon, f.field_key, variant);
        D3.push({ page_key: sec.page_key, section_key: sec.section_key, section_type: canon, field_key: f.field_key, required: f.required, variant, ...cls });
      }
      if (f.admin !== false && !inWL) {
        const cls = isD9
          ? { class: "S7", reason: "Section ist in D9" }
          : classify(canon, f.field_key, variant);
        D5.push({ page_key: sec.page_key, section_key: sec.section_key, section_type: canon, field_key: f.field_key, variant, ...cls });
      }
    }
  }

  // Aggregieren
  const agg = (rows) => {
    const m = new Map();
    for (const r of rows) {
      const k = `${r.section_type}|${r.field_key}|${r.class}`;
      const cur = m.get(k) ?? { section_type: r.section_type, field_key: r.field_key, class: r.class, reason: r.reason, count: 0, pages: new Set() };
      cur.count++;
      cur.pages.add(r.page_key);
      m.set(k, cur);
    }
    return [...m.values()].map((x) => ({ ...x, page_count: x.pages.size, pages: undefined })).sort((a, b) => b.count - a.count);
  };

  const D3agg = agg(D3);
  const D5agg = agg(D5);

  const classTotal = (rows) => {
    const m = {};
    for (const r of rows) m[r.class] = (m[r.class] ?? 0) + 1;
    return m;
  };

  const report = {
    generated_at: new Date().toISOString(),
    totals: { D3: D3.length, D5: D5.length },
    class_totals: { D3: classTotal(D3), D5: classTotal(D5) },
    card_variant_counts: variantCounts,
    D3_grouped: D3agg,
    D5_grouped: D5agg,
    seed_plan: {
      mode: "dry-run",
      apply: false,
      reason: "Sprint 2k: keine S1-Gruppe ist klein/sauber genug für blindes Seeding. card_v1.title/description ist über alle 165+ aktiven Karten verteilt — zuerst Variantenmodell (Sprint 2l) klären, dann gezielt seeden.",
      S1_candidates_total: D3agg.filter((x) => x.class === "S1").reduce((s, x) => s + x.count, 0),
      S2_candidates_total: D3agg.filter((x) => x.class === "S2").reduce((s, x) => s + x.count, 0),
    },
  };

  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

  // Markdown
  const md = buildMd(report);
  writeFileSync(OUT_MD, md);

  console.log(`D3=${D3.length} D5=${D5.length}`);
  console.log("Klassen D3:", report.class_totals.D3);
  console.log("Klassen D5:", report.class_totals.D5);
  console.log(`JSON → ${OUT_JSON}`);
  console.log(`MD   → ${OUT_MD}`);
}

function buildMd(r) {
  let md = `# D3/D5-Rest — Triage (Sprint 2k)\n\n`;
  md += `_Generiert: ${r.generated_at}_\n\n`;
  md += `Quelle: \`scripts/cms/d3-d5-rest-triage.mjs\` (read-only RPC \`rpc_admin_export_contract_drift\`).\n\n`;
  md += `## Klassen\n\n`;
  md += `| Klasse | Bedeutung |\n|---|---|\n`;
  md += `| S1 | sicher seedbar, redaktionell sinnvoll |\n`;
  md += `| S2 | sicher whitelistingfähig, DB-Feld nur bei Bedarf |\n`;
  md += `| S3 | optional/variantenspezifisch, nicht pauschal seeden |\n`;
  md += `| S4 | Vertrag wahrscheinlich zu breit (Varianten nötig) |\n`;
  md += `| S5 | Spezialrenderer / i18n-Fallback — späterer Sprint |\n`;
  md += `| S6 | Legacy/Alias/Asset-Slot — nicht seeden |\n`;
  md += `| S7 | D9 / inaktiv / archiviert — nicht seeden |\n\n`;
  md += `## Summen\n\n`;
  md += `- D3 (Vertragsfelder ohne DB-Zeile, nur aktive Sections): **${r.totals.D3}**\n`;
  md += `- D5 (Vertragsfelder ohne Whitelist-Eintrag, nur aktive Sections): **${r.totals.D5}**\n\n`;
  md += `### D3 nach Klasse\n\n| Klasse | Count |\n|---|---:|\n`;
  for (const [k, v] of Object.entries(r.class_totals.D3).sort()) md += `| ${k} | ${v} |\n`;
  md += `\n### D5 nach Klasse\n\n| Klasse | Count |\n|---|---:|\n`;
  for (const [k, v] of Object.entries(r.class_totals.D5).sort()) md += `| ${k} | ${v} |\n`;
  md += `\n## D3 — Top-Gruppen (section_type · field_key · Klasse)\n\n`;
  md += `| section_type | field_key | Klasse | Sections | Pages | Begründung |\n|---|---|---|---:|---:|---|\n`;
  for (const g of r.D3_grouped.slice(0, 50)) {
    md += `| ${g.section_type} | \`${g.field_key}\` | ${g.class} | ${g.count} | ${g.page_count} | ${g.reason} |\n`;
  }
  md += `\n## D5 — Top-Gruppen\n\n`;
  md += `| section_type | field_key | Klasse | Sections | Pages | Begründung |\n|---|---|---|---:|---:|---|\n`;
  for (const g of r.D5_grouped.slice(0, 50)) {
    md += `| ${g.section_type} | \`${g.field_key}\` | ${g.class} | ${g.count} | ${g.page_count} | ${g.reason} |\n`;
  }
  md += `\n## Seed-Entscheidung\n\n`;
  md += `- Modus: **${r.seed_plan.mode}**\n`;
  md += `- Anwenden in Sprint 2k: **${r.seed_plan.apply ? "ja" : "nein"}**\n`;
  md += `- S1-Kandidaten (D3): ${r.seed_plan.S1_candidates_total}\n`;
  md += `- S2-Kandidaten (D3): ${r.seed_plan.S2_candidates_total}\n`;
  md += `- Begründung: ${r.seed_plan.reason}\n\n`;
  md += `## Empfehlung Sprint 2l (Vertragsschärfung)\n\n`;
  md += `1. **\`card_v1\` aufteilen oder Feldgruppen einführen** — heute deklariert der Vertrag \`href\`, \`cta_label\`, \`cta_href\`, \`link_1..3_*\`, \`features.0..4\`, \`icon\`, \`subtitle\` als Pflicht/Standardfelder für **alle** Karten. Renderer-seitig sind das aber Variantenfelder:\n`;
  md += `   - Click-Card: nur \`href\` (oder \`cta_href\`)\n`;
  md += `   - CTA-Card: \`cta_label\`+\`cta_href\`\n`;
  md += `   - Icon-Card (feature_grid_v1-Kinder): \`icon\`, kein \`image\`\n`;
  md += `   - Download-Card (download_list_v1-Kinder): \`file_label\`, \`cta_href\`\n`;
  md += `   - Multi-Link-Card: \`link_1..3_*\`\n`;
  md += `   - Feature-Card: \`features.0..4\`\n`;
  md += `   Vorschlag: \`card_v1\` behält nur \`title\`/\`description\` als Standard, alle anderen werden in **Variantengruppen** verschoben, die abhängig vom Parent-Container freigegeben werden.\n`;
  md += `2. **\`hero_v1\`-i18n-Fallback** für S2-Seiten in Sprint 2l auflösen — gezielt pro Bereich, nicht pauschal.\n`;
  md += `3. **\`cards_v1\`/\`content_v1\` Container-Header** (\`label\`/\`title\`/\`intro\`) optional kennzeichnen statt erwartet — Renderer behandelt sie bereits als optional.\n\n`;
  md += `---\n\n**Hinweis:** Dieses Triage-Audit ist read-only. Es ändert keine Inhalte, keine Bilder, keine Whitelist und keine Public-Renderer.\n`;
  return md;
}

main().catch((e) => { console.error(e); process.exit(0); });
