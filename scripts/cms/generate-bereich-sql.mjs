#!/usr/bin/env node
/**
 * Bereichs-Runner: erzeugt eine kombinierte Migrations-SQL für einen
 * gesamten Bereich (z. B. `gebaeudekommunikation`).
 *
 * Aufruf:
 *   node scripts/cms/generate-bereich-sql.mjs gebaeudekommunikation > /tmp/bereich1.sql
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { BEREICHE } from "./page-config.mjs";

const bereich = process.argv[2];
if (!bereich || !BEREICHE[bereich]) {
  console.error(`Unknown bereich: ${bereich}. Verfügbar: ${Object.keys(BEREICHE).join(", ")}`);
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const generator = path.join(scriptDir, "generate-page-migration.mjs");

const out = [];
out.push(`-- ============================================`);
out.push(`-- CMS-Light Bereichs-Migration: ${bereich}`);
out.push(`-- Pages: ${BEREICHE[bereich].length}`);
out.push(`-- ============================================`);
out.push("");

for (const cfg of BEREICHE[bereich]) {
  const res = spawnSync("node", [generator, JSON.stringify(cfg)], { encoding: "utf8" });
  if (res.status !== 0) {
    console.error(`FAIL ${cfg.page_key}:`, res.stderr);
    process.exit(1);
  }
  out.push(res.stdout);
  out.push("");
}

process.stdout.write(out.join("\n"));
