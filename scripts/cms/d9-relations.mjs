#!/usr/bin/env node
/**
 * d9-relations.mjs — Sprint 2f (read-only).
 *
 * Aggregiert die D9-Treffer aus `d9-owner-buckets.json` zu echten
 * Parent/Child-Relationsgruppen (parent_section_type -> child_section_type),
 * damit symmetrische Vertragslücken (gleiche Beziehung in mehreren
 * Symptom-Buckets) als EIN Problem sichtbar werden.
 *
 * Schreibt:
 *   scripts/cms/output/d9-relations-latest.json
 *   docs/04-betrieb/d9-relations-latest.md
 *
 * Read-only: keine DB-Schreibvorgänge, kein RPC-Aufruf. Nutzt das bereits
 * vorhandene Output-File der Owner-Buckets als Quelle und gleicht es gegen
 * den Vertrag (sectionTypes.ts) und die Renderer-Map ab.
 */

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const BUCKETS = resolve(ROOT, "scripts/cms/output/d9-owner-buckets.json");
const RENDERER_FILE = resolve(ROOT, "src/features/cms/components/CmsBodyRenderer.tsx");
const CONTRACT_FILE = resolve(ROOT, "src/features/cms/contract/sectionTypes.ts");
const OUT_DIR = resolve(ROOT, "scripts/cms/output");
const OUT_JSON = resolve(OUT_DIR, "d9-relations-latest.json");
const OUT_MD = resolve(ROOT, "docs/04-betrieb/d9-relations-latest.md");

function read(p) { return readFileSync(p, "utf8"); }

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
    const ac = block.match(/allowed_children:\s*\[([^\]]*)\]/);
    const ap = block.match(/allowed_parents:\s*\[([^\]]*)\]/);
    const list = (m) => m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
    out.set(starts[i].name, {
      status,
      allowed_children: list(ac),
      allowed_parents: list(ap),
      top_level: /top_level:\s*true/.test(block),
    });
  }
  return out;
}

function parseRendererMap(src) {
  // Sucht RENDERERS-Keys und SKIP_TYPES.
  const renderers = new Set();
  const rb = src.match(/const RENDERERS[^=]*=\s*\{([\s\S]*?)\};/);
  if (rb) for (const m of rb[1].matchAll(/^\s*([a-z0-9_]+):/gm)) renderers.add(m[1]);
  const skips = new Set();
  const sb = src.match(/SKIP_TYPES[^=]*=\s*new Set\(\[([\s\S]*?)\]\)/);
  if (sb) for (const m of sb[1].matchAll(/"([^"]+)"/g)) skips.add(m[1]);
  return { renderers, skips };
}

function main() {
  const buckets = JSON.parse(read(BUCKETS));
  const contracts = parseContracts(read(CONTRACT_FILE));
  const { renderers, skips } = parseRendererMap(read(RENDERER_FILE));

  // relation_key = `${parent_type}->${child_type}`
  const rels = new Map();
  const ensure = (k, parent, child) => {
    if (!rels.has(k)) rels.set(k, {
      relation_key: k,
      parent_section_type: parent,
      child_section_type: child,
      patterns: new Set(),
      count: 0,
      active: 0,
      inactive: 0,
      pages: new Set(),
      samples: [],
    });
    return rels.get(k);
  };

  for (const [pattern, payload] of Object.entries(buckets.grouped)) {
    for (const [childType, ct] of Object.entries(payload.by_type)) {
      for (const [parentKey, pp] of Object.entries(ct.by_parent)) {
        const parentType = parentKey === "(none)" ? "(none/top-level)" : parentKey;
        const key = `${parentType}->${childType}`;
        const r = ensure(key, parentType, childType);
        r.patterns.add(pattern);
        r.count += pp.count;
        // Pages/samples: pp.sample ist "page / section_key (inactive)?"
        for (const s of pp.sample) {
          const pk = s.split(" / ")[0];
          r.pages.add(pk);
          if (r.samples.length < 8) r.samples.push(s);
          if (/\(inactive\)/.test(s)) r.inactive++; else r.active++;
        }
      }
    }
  }

  // active/inactive aus samples ist ein Schätzwert — die DB-RPC liefert die
  // exakten Zahlen in `d9-owner-buckets.json` nicht pro Pattern aufgeschlüsselt.
  // Wir behalten count als Wahrheit und markieren active/inactive als „aus Samples".

  const out = [...rels.values()]
    .map((r) => {
      const pc = contracts.get(r.parent_section_type);
      const cc = contracts.get(r.child_section_type);
      const parentHasChildInList = pc?.allowed_children?.includes(r.child_section_type) ?? null;
      const childHasParentInList = cc?.allowed_parents?.includes(r.parent_section_type) ?? null;
      const parentRendererKind = pc
        ? (skips.has(r.parent_section_type) ? "skip"
           : renderers.has(r.parent_section_type) ? "generic"
           : pc.status)
        : "no-contract";
      return {
        relation_key: r.relation_key,
        parent_section_type: r.parent_section_type,
        child_section_type: r.child_section_type,
        d9_patterns: [...r.patterns].sort(),
        count: r.count,
        approx_active_from_samples: r.active,
        approx_inactive_from_samples: r.inactive,
        pages: [...r.pages].sort(),
        samples: r.samples,
        parent_contract_exists: !!pc,
        child_contract_exists: !!cc,
        parent_allowed_children_lists_child: parentHasChildInList,
        child_allowed_parents_lists_parent: childHasParentInList,
        parent_renderer_kind: parentRendererKind,
        child_renderer_kind: cc
          ? (skips.has(r.child_section_type) ? "skip"
             : renderers.has(r.child_section_type) ? "generic"
             : cc.status)
          : "no-contract",
      };
    })
    .sort((a, b) => b.count - a.count);

  const total = out.reduce((n, r) => n + r.count, 0);
  const report = {
    generated_at: new Date().toISOString(),
    source: "scripts/cms/output/d9-owner-buckets.json",
    d9_total_from_patterns: total,
    relation_groups_count: out.length,
    relations: out,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

  let md = `# D9 Relationsgruppen — aktueller Stand\n\n`;
  md += `_Generiert: ${report.generated_at}_\n\n`;
  md += `Quelle: \`${report.source}\` (read-only). Aggregiert die D9-Treffer aus den\n`;
  md += `Symptom-Buckets (\`child_not_in_allowed_children\`, \`parent_not_in_allowed_parents\`, …)\n`;
  md += `zu echten \`parent -> child\`-Beziehungen, damit symmetrische Vertragslücken nicht\n`;
  md += `doppelt gezählt werden müssen.\n\n`;
  md += `## Summen\n\n`;
  md += `- D9-Treffer (Summe aller Pattern-Vorkommen, kann symmetrische Beziehungen doppelt zählen): **${total}**\n`;
  md += `- Distinct Parent→Child-Beziehungen: **${out.length}**\n\n`;
  md += `## Relationen (sortiert nach Count)\n\n`;
  md += `| Parent | Child | Count | Patterns | Parent→Child? | Child→Parent? | Parent-Renderer |\n`;
  md += `|---|---|---:|---|---|---|---|\n`;
  for (const r of out) {
    md += `| \`${r.parent_section_type}\` | \`${r.child_section_type}\` | ${r.count} | ${r.d9_patterns.join(", ")} | ${r.parent_allowed_children_lists_child} | ${r.child_allowed_parents_lists_parent} | ${r.parent_renderer_kind} |\n`;
  }
  md += `\n## Detail je Relation\n\n`;
  for (const r of out) {
    md += `### \`${r.parent_section_type}\` → \`${r.child_section_type}\` (${r.count})\n\n`;
    md += `- D9-Patterns: ${r.d9_patterns.map((p) => `\`${p}\``).join(", ")}\n`;
    md += `- Parent-Vertrag vorhanden: **${r.parent_contract_exists}**, Child-Vertrag vorhanden: **${r.child_contract_exists}**\n`;
    md += `- \`parent.allowed_children\` enthält Child: **${r.parent_allowed_children_lists_child}**\n`;
    md += `- \`child.allowed_parents\` enthält Parent: **${r.child_allowed_parents_lists_parent}**\n`;
    md += `- Parent-Renderer-Art: **${r.parent_renderer_kind}**, Child-Renderer-Art: **${r.child_renderer_kind}**\n`;
    md += `- Betroffene Seiten (${r.pages.length}): ${r.pages.slice(0, 8).map((p) => `\`${p}\``).join(", ")}${r.pages.length > 8 ? " …" : ""}\n`;
    md += `- Beispiele:\n`;
    for (const s of r.samples) md += `  - \`${s}\`\n`;
    md += `\n`;
  }
  writeFileSync(OUT_MD, md);

  console.log("D9 Relations (read-only)");
  console.log(`  D9-Pattern-Summe: ${total}`);
  console.log(`  Distinct Beziehungen: ${out.length}`);
  for (const r of out) {
    console.log(`    ${String(r.count).padStart(4)}  ${r.relation_key}  [${r.d9_patterns.join(",")}]`);
  }
  console.log(`\nJSON → ${OUT_JSON}`);
  console.log(`MD   → ${OUT_MD}`);
}

main();
