#!/usr/bin/env node
/**
 * contract-audit.mjs — read-only Audit für den Section-Type-Vertrag.
 *
 * Prüft statisch (ohne DB):
 *   1. Sind alle CmsBodyRenderer.RENDERERS-Typen im Vertrag enthalten?
 *   2. Gibt es Vertragstypen ohne Renderer-Eintrag?
 *   3. Sind alle allowed_children-Typen selbst als Vertrag vorhanden?
 *   4. Asset-Slot-Konflikte (z. B. image + thumbnail am selben Typ ohne Hinweis)?
 *   5. Welche Typen sind als Spezial/Legacy/Skip bewusst markiert?
 *
 * Diese Etappe ändert nichts und schreibt nirgendwo hin.
 *
 * Aufruf:
 *   node scripts/cms/contract-audit.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

const RENDERER_FILE = resolve(ROOT, "src/features/cms/components/CmsBodyRenderer.tsx");
const CONTRACT_FILE = resolve(ROOT, "src/features/cms/contract/sectionTypes.ts");

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

function extractRendererTypes(src) {
  const out = new Set();
  // Anker: erste { nach "RENDERERS" auf dieser Zeile. Wir suchen bis "};\n\n".
  const idx = src.indexOf("RENDERERS");
  if (idx < 0) return out;
  const braceStart = src.indexOf("= {", idx);
  if (braceStart < 0) return out;
  const end = src.indexOf("\n};", braceStart);
  const body = src.slice(braceStart + 3, end);
  for (const line of body.split("\n")) {
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

function extractContractTypes(src) {
  // SECTION_TYPE_CONTRACTS: Record<...> = { hero_v1: { ... }, content_v1: { ... } }
  const out = new Map(); // type -> { status, allowed_children, asset_kinds }
  const m = src.match(/SECTION_TYPE_CONTRACTS[^=]*=\s*\{([\s\S]*)\};\s*\n/);
  if (!m) return out;
  const body = m[1];
  // Split on top-level keys "  foo_v1: {"
  const re = /^\s{2}([a-z0-9_]+):\s*\{/gm;
  const starts = [];
  let mm;
  while ((mm = re.exec(body))) starts.push({ name: mm[1], idx: mm.index });
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i].idx;
    const to = i + 1 < starts.length ? starts[i + 1].idx : body.length;
    const block = body.slice(from, to);
    const status = (block.match(/status:\s*"([^"]+)"/) || [])[1] || "unknown";
    const childrenMatch = block.match(/allowed_children:\s*\[([^\]]*)\]/);
    const allowed_children = childrenMatch
      ? [...childrenMatch[1].matchAll(/"([^"]+)"/g)].map((x) => x[1])
      : [];
    const asset_kinds = [...block.matchAll(/IMG\("[^"]+",\s*"([^"]+)"/g)].map((x) => x[1]);
    out.set(starts[i].name, { status, allowed_children, asset_kinds });
  }
  return out;
}

function main() {
  const rendererSrc = readFileSync(RENDERER_FILE, "utf8");
  const contractSrc = readFileSync(CONTRACT_FILE, "utf8");

  const renderers = extractRendererTypes(rendererSrc);
  const skips = extractSkipTypes(rendererSrc);
  const contracts = extractContractTypes(contractSrc);

  console.log(`${c.bold}${c.cyan}Section-Type-Vertrag — Audit (read-only)${c.reset}`);
  console.log(`Renderer-Datei: ${RENDERER_FILE}`);
  console.log(`Vertrag-Datei : ${CONTRACT_FILE}`);
  console.log();
  console.log(`${c.dim}Renderer-Typen: ${renderers.size} · Skip-Typen: ${skips.size} · Vertrags-Typen: ${contracts.size}${c.reset}`);
  console.log();

  let warnings = 0;
  let conflicts = 0;
  const oks = [];
  const legacys = [];

  // 1) Renderer ohne Vertrag
  for (const t of renderers) {
    if (!contracts.has(t)) {
      console.log(`${c.red}CONFLICT${c.reset}  Renderer "${t}" hat keinen Vertrag.`);
      conflicts++;
    } else {
      oks.push(`Renderer "${t}" ↔ Vertrag vorhanden (status=${contracts.get(t).status})`);
    }
  }

  // 2) Vertrag ohne Renderer (außer special/legacy/skip)
  for (const [t, info] of contracts) {
    const isSkip = skips.has(t);
    const hasRenderer = renderers.has(t);
    if (hasRenderer) continue;
    if (isSkip) {
      oks.push(`Vertrag "${t}" ist SKIP — bewusst nicht im RENDERERS-Set.`);
      continue;
    }
    if (info.status === "legacy") {
      legacys.push(`Vertrag "${t}" ist LEGACY ohne aktiven Renderer.`);
      continue;
    }
    if (info.status === "special") {
      console.log(`${c.yellow}WARN${c.reset}      Vertrag "${t}" ist SPECIAL — kein generischer Renderer. (ok, aber bewusst halten)`);
      warnings++;
      continue;
    }
    // child-only Typen (top_level=false) sind okay ohne eigenen Renderer-Eintrag
    if (info.status === "generic" && (t === "card_v1" || t === "stat_v1")) {
      oks.push(`Vertrag "${t}" rendert über Eltern — kein eigener RENDERERS-Eintrag erwartet.`);
      continue;
    }
    console.log(`${c.yellow}WARN${c.reset}      Vertrag "${t}" hat keinen Renderer-Eintrag.`);
    warnings++;
  }

  // 3) allowed_children, die selbst keinen Vertrag haben
  for (const [t, info] of contracts) {
    for (const child of info.allowed_children) {
      if (!contracts.has(child)) {
        console.log(`${c.red}CONFLICT${c.reset}  "${t}" erlaubt Kind "${child}", aber dieser Typ hat keinen Vertrag.`);
        conflicts++;
      }
    }
  }

  // 4) Asset-Slot-Konflikte (image + thumbnail nebeneinander = ok nur, wenn bewusst)
  for (const [t, info] of contracts) {
    const kinds = info.asset_kinds;
    const hasImage = kinds.includes("image");
    const hasThumb = kinds.includes("thumbnail");
    if (hasImage && hasThumb && t !== "card_v1") {
      console.log(`${c.yellow}WARN${c.reset}      "${t}" hat sowohl image als auch thumbnail — bitte prüfen.`);
      warnings++;
    }
  }

  // 5) Spezial/Legacy explizit auflisten
  console.log();
  console.log(`${c.bold}Spezial / Legacy / Skip (bewusst):${c.reset}`);
  for (const [t, info] of contracts) {
    if (info.status === "special" || info.status === "legacy" || info.status === "skip") {
      const tag = info.status.toUpperCase();
      const color = info.status === "legacy" ? c.dim : c.cyan;
      console.log(`  ${color}${tag.padEnd(8)}${c.reset} ${t}`);
    }
  }
  for (const l of legacys) console.log(`  ${c.dim}${l}${c.reset}`);

  // OK-Liste kompakt
  console.log();
  console.log(`${c.bold}${c.green}OK${c.reset} (${oks.length}):`);
  for (const o of oks) console.log(`  ${c.green}✓${c.reset} ${o}`);

  // Zusammenfassung
  console.log();
  console.log(
    `${c.bold}Ergebnis:${c.reset} ${c.green}${oks.length} OK${c.reset} · ` +
      `${c.yellow}${warnings} Warnung${c.reset} · ` +
      `${c.red}${conflicts} Konflikt${c.reset}`,
  );

  // Read-only: niemals fail. Exitcode 0, damit CI nicht in dieser Etappe rot wird.
  process.exit(0);
}

main();
