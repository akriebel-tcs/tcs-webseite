#!/usr/bin/env node
/**
 * Erzeugt eine kombinierte Migrations-SQL für ALLE Bereiche.
 * Vor jedem Insert werden Seiten mit "altem" Modell (falsches base_key)
 * geleert: anwendungen.pflege + anwendungen.gesundheitseinrichtungen.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { BEREICHE } from "./page-config.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const generator = path.join(scriptDir, "generate-page-migration.mjs");

const out = [];
out.push("-- ============================================");
out.push("-- CMS-Light: Vollständige Migration aller Bereiche");
out.push("-- ============================================\n");

// Alte Stub-Seiten löschen (base_key hat sich geändert)
out.push(`DELETE FROM public.cms_admin_editable_fields WHERE page_key IN ('anwendungen.pflege','anwendungen.gesundheitseinrichtungen');`);
out.push(`DELETE FROM public.cms_section_fields       WHERE page_key IN ('anwendungen.pflege','anwendungen.gesundheitseinrichtungen');`);
out.push(`DELETE FROM public.cms_sections             WHERE page_key IN ('anwendungen.pflege','anwendungen.gesundheitseinrichtungen');`);
out.push(`DELETE FROM public.cms_pages                WHERE page_key IN ('anwendungen.pflege','anwendungen.gesundheitseinrichtungen');\n`);

for (const [bereich, pages] of Object.entries(BEREICHE)) {
  out.push(`-- === Bereich: ${bereich} (${pages.length} Seiten) ===\n`);
  for (const cfg of pages) {
    const res = spawnSync("node", [generator, JSON.stringify(cfg)], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
    if (res.status !== 0) {
      console.error(`FAIL ${cfg.page_key}:`, res.stderr);
      process.exit(1);
    }
    out.push(res.stdout, "");
  }
}

// Am Ende: alle migrierten Seiten publishen + aktivieren
out.push("-- Live-Schaltung aller migrierten Seiten");
out.push(`UPDATE public.cms_pages SET status='published', is_active=true, updated_at=now()
 WHERE page_key IN (`);
const allKeys = Object.values(BEREICHE).flat().map(c => `'${c.page_key}'`).join(",\n   ");
out.push(`   ${allKeys}\n );`);

process.stdout.write(out.join("\n"));
