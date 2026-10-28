#!/usr/bin/env node
/**
 * FAQ-Section-Toggle-Audit (read-only).
 *
 * Prüft für jede Seite mit FAQ-Section (`section_type='faq_v1'`):
 *   - Section in DB vorhanden, aktiv/inaktiv?
 *   - Wieviele Items (`items.<slug>.frage|antwort`) hängen dran?
 *   - Wieviele Items haben bereits einen `items.<slug>.enabled`-Schalter?
 *   - Whitelist-Eintrag für die Section vorhanden (admin-pflegbar)?
 *
 * Ergebnis als JSON + Markdown nach
 *   - scripts/cms/output/faq-section-toggle-audit.{json,md}
 *   - docs/04-betrieb/audit-snapshot/faq-section-toggle-audit.{json,md}
 *
 * KEINE DB-Schreibvorgänge.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

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

const sections = psql(`
  SELECT s.page_key, s.section_key, s.is_active,
         (SELECT count(DISTINCT split_part(substring(f.field_key from 7), '.', 1))
            FROM cms_section_fields f
            WHERE f.page_key=s.page_key AND f.section_key=s.section_key
              AND f.field_key LIKE 'items.%'),
         (SELECT count(DISTINCT split_part(substring(f.field_key from 7), '.', 1))
            FROM cms_section_fields f
            WHERE f.page_key=s.page_key AND f.section_key=s.section_key
              AND f.field_key LIKE 'items.%.enabled'),
         (SELECT count(*) FROM cms_admin_editable_fields w
            WHERE w.page_key=s.page_key AND w.section_key=s.section_key
              AND w.field_key='__section__'
              AND w.is_enabled=true)
  FROM cms_sections s
  WHERE s.section_type='faq_v1'
  ORDER BY s.page_key
`);

const rows = sections.map(([page_key, section_key, is_active, items, items_with_toggle, whitelisted]) => ({
  page_key,
  section_key,
  is_active: is_active === "t",
  items: Number(items),
  items_with_toggle: Number(items_with_toggle),
  items_missing_toggle: Number(items) - Number(items_with_toggle),
  section_whitelisted: Number(whitelisted) > 0,
}));

const summary = {
  total_pages_with_faq: rows.length,
  active_sections: rows.filter((r) => r.is_active).length,
  inactive_sections: rows.filter((r) => !r.is_active).length,
  total_items: rows.reduce((s, r) => s + r.items, 0),
  items_with_toggle: rows.reduce((s, r) => s + r.items_with_toggle, 0),
  items_missing_toggle: rows.reduce((s, r) => s + r.items_missing_toggle, 0),
  pages_without_section_whitelist: rows.filter((r) => !r.section_whitelisted).length,
};

const targets = [
  path.resolve("scripts/cms/output"),
  path.resolve("docs/04-betrieb/audit-snapshot"),
];
for (const dir of targets) mkdirSync(dir, { recursive: true });

function writeBoth(name, content) {
  for (const dir of targets) writeFileSync(path.join(dir, name), content);
}

writeBoth("faq-section-toggle-audit.json", JSON.stringify({ generated_at: new Date().toISOString(), summary, rows }, null, 2));

const md = [];
md.push(`# FAQ-Section-Toggle-Audit`);
md.push("");
md.push(`Stand: ${new Date().toISOString()} · Read-only.`);
md.push("");
md.push("## Zusammenfassung");
md.push("");
md.push(`- Seiten mit FAQ-Section: **${summary.total_pages_with_faq}**`);
md.push(`- Davon aktiv: **${summary.active_sections}**, inaktiv: **${summary.inactive_sections}**`);
md.push(`- FAQ-Items insgesamt: **${summary.total_items}**`);
md.push(`- Items mit Sichtbarkeits-Schalter (`+"`enabled`)"+`: **${summary.items_with_toggle}**`);
md.push(`- Items ohne Schalter (Default: sichtbar): **${summary.items_missing_toggle}**`);
md.push("");
md.push("## Seiten");
md.push("");
md.push("| Seite | Section | aktiv | Items | mit Schalter | ohne Schalter |");
md.push("|-------|---------|-------|------:|-------------:|--------------:|");
for (const r of rows) {
  md.push(
    `| \`${r.page_key}\` | \`${r.section_key}\` | ${r.is_active ? "✅" : "⛔"} | ${r.items} | ${r.items_with_toggle} | ${r.items_missing_toggle} |`,
  );
}
md.push("");
md.push("## Hinweis");
md.push("");
md.push('- Aktiv bezieht sich auf `cms_sections.is_active` - diesen Schalter findest du im Admin-Baum direkt an der Section.');
md.push('- Items ohne Schalter sind sichtbar (Back-Compat). Wer Items gezielt ausblenden will, legt im Admin das Feld `items.<slug>.enabled = "0"` an.');
md.push('- Das Feld kann auch alternativ `is_active`/`hidden`/`visible` heissen - der Renderer akzeptiert alle vier (siehe `FaqV1.tsx`).');
writeBoth("faq-section-toggle-audit.md", md.join("\n") + "\n");

console.log(`FAQ-Audit: ${summary.total_pages_with_faq} Seiten, ${summary.total_items} Items, ${summary.items_missing_toggle} ohne Schalter.`);
