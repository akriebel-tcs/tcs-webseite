#!/usr/bin/env node
/**
 * Altbestand-Report (read-only).
 *
 * Listet alle inaktiven Root-Sections (`is_active=false`, parent_section_id IS NULL)
 * und trennt Vertragsblöcke (FAQ/CTA → behalten) von echtem Altbestand
 * (Löschkandidaten). Zählt hängende Felder, Assets und Whitelist-Einträge.
 *
 * Schreibt:
 *   - scripts/cms/output/altbestand-report.json
 *   - scripts/cms/output/altbestand-report.md
 *
 * KEINE DB-Schreibvorgänge.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const CORE_SECTION_KEYS = new Set(["standard_cta", "cta", "faq"]);
const CORE_SECTION_TYPES = new Set(["cta_v1", "faq_v1"]);

function psql(sql) {
  const out = execSync(`psql -At -F $'\\t'`, {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
    input: sql,
  });
  return out
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t"));
}

const sectionsRows = psql(`
  SELECT s.id::text, s.page_key, s.section_key, s.section_type,
         COALESCE(s.sort_order,0),
         (SELECT count(*) FROM cms_section_fields f
            WHERE f.page_key=s.page_key AND f.section_key=s.section_key),
         (SELECT count(*) FROM cms_assets a
            WHERE a.page_key=s.page_key AND a.section_key=s.section_key),
         (SELECT count(*) FROM cms_admin_editable_fields w
            WHERE w.page_key=s.page_key AND w.section_key=s.section_key),
         (SELECT count(*) FROM cms_sections c
            WHERE c.parent_section_id=s.id)
  FROM cms_sections s
  WHERE s.is_active=false AND s.parent_section_id IS NULL
  ORDER BY s.page_key, s.sort_order, s.section_key
`);

const rows = sectionsRows.map(
  ([id, page_key, section_key, section_type, sort_order, fields, assets, whitelist, children]) => {
    const isContract =
      CORE_SECTION_KEYS.has(section_key) || CORE_SECTION_TYPES.has(section_type);
    return {
      id,
      page_key,
      section_key,
      section_type,
      sort_order: Number(sort_order),
      fields: Number(fields),
      assets: Number(assets),
      whitelist: Number(whitelist),
      children: Number(children),
      kind: isContract ? "contract" : "altbestand",
    };
  },
);

const contract = rows.filter((r) => r.kind === "contract");
const altbestand = rows.filter((r) => r.kind === "altbestand");

const sum = (arr, k) => arr.reduce((a, b) => a + b[k], 0);

const summary = {
  generated_at: new Date().toISOString(),
  total_inactive_root_sections: rows.length,
  contract_blocks: {
    count: contract.length,
    fields: sum(contract, "fields"),
    assets: sum(contract, "assets"),
    whitelist: sum(contract, "whitelist"),
    children: sum(contract, "children"),
    note: "Vertragsblöcke (FAQ/CTA). NICHT löschen — nur ein-/ausschalten.",
  },
  altbestand_candidates: {
    count: altbestand.length,
    fields: sum(altbestand, "fields"),
    assets: sum(altbestand, "assets"),
    whitelist: sum(altbestand, "whitelist"),
    children: sum(altbestand, "children"),
    note: "Echte Altlasten. Löschkandidaten — Entscheidung pro Seite oder pauschal.",
    pages_affected: [...new Set(altbestand.map((r) => r.page_key))].length,
  },
};

const byPage = new Map();
for (const r of altbestand) {
  if (!byPage.has(r.page_key)) byPage.set(r.page_key, []);
  byPage.get(r.page_key).push(r);
}

const typeTally = {};
for (const r of altbestand) {
  typeTally[r.section_type] = (typeTally[r.section_type] || 0) + 1;
}

mkdirSync("scripts/cms/output", { recursive: true });
mkdirSync("docs/04-betrieb/audit-snapshot", { recursive: true });
const jsonOut = JSON.stringify({ summary, contract, altbestand, by_page: Object.fromEntries(byPage), type_tally: typeTally }, null, 2);
writeFileSync("scripts/cms/output/altbestand-report.json", jsonOut);
writeFileSync("docs/04-betrieb/audit-snapshot/altbestand-report.json", jsonOut);

const md = [];
md.push("# Altbestand-Report (read-only)");
md.push("");
md.push(`Stand: ${summary.generated_at}`);
md.push("");
md.push("## Zusammenfassung");
md.push("");
md.push(`- Inaktive Root-Sections insgesamt: **${summary.total_inactive_root_sections}**`);
md.push(`- Davon Vertragsblöcke (behalten): **${contract.length}** · ${summary.contract_blocks.fields} Felder · ${summary.contract_blocks.assets} Assets · ${summary.contract_blocks.whitelist} Whitelist-Einträge · ${summary.contract_blocks.children} Kinder`);
md.push(`- Davon echter Altbestand (Löschkandidaten): **${altbestand.length}** auf ${summary.altbestand_candidates.pages_affected} Seiten · ${summary.altbestand_candidates.fields} Felder · ${summary.altbestand_candidates.assets} Assets · ${summary.altbestand_candidates.whitelist} Whitelist-Einträge · ${summary.altbestand_candidates.children} Kinder`);
md.push("");
md.push("> Vertragsblöcke (FAQ/CTA) bleiben Pflicht und werden NICHT gelöscht.");
md.push("> Altbestand = inaktive Root-Sections, die nicht zum Vertrag gehören.");
md.push("");
md.push("## Section-Typen im Altbestand");
md.push("");
md.push("| section_type | Anzahl |");
md.push("|---|---:|");
for (const [t, c] of Object.entries(typeTally).sort((a, b) => b[1] - a[1])) {
  md.push(`| \`${t}\` | ${c} |`);
}
md.push("");
md.push("## Altbestand pro Seite");
md.push("");
md.push("| page_key | section_key | section_type | sort | Felder | Assets | Whitelist | Kinder |");
md.push("|---|---|---|---:|---:|---:|---:|---:|");
for (const r of altbestand) {
  md.push(`| \`${r.page_key}\` | \`${r.section_key}\` | \`${r.section_type}\` | ${r.sort_order} | ${r.fields} | ${r.assets} | ${r.whitelist} | ${r.children} |`);
}
md.push("");
md.push("## Vertragsblöcke (inaktiv, behalten)");
md.push("");
md.push("| page_key | section_key | section_type | Felder | Assets | Whitelist |");
md.push("|---|---|---|---:|---:|---:|");
for (const r of contract) {
  md.push(`| \`${r.page_key}\` | \`${r.section_key}\` | \`${r.section_type}\` | ${r.fields} | ${r.assets} | ${r.whitelist} |`);
}
md.push("");

const mdOut = md.join("\n");
writeFileSync("scripts/cms/output/altbestand-report.md", mdOut);
writeFileSync("docs/04-betrieb/audit-snapshot/altbestand-report.md", mdOut);
console.log(JSON.stringify(summary, null, 2));
