#!/usr/bin/env node
/**
 * Codemod 2: Anwendungs-Container & Restpages auf useCmsI18n heben.
 *
 * Erkennt:
 *   const { t[, i18n] } = useTranslation("ns");
 *   const base = "<a.b[.c]>"        // optional
 *
 * Leitet pageKey ab:
 *   - wenn `base` existiert und in /anwendungen/ path → "anwendungen.<base>"
 *   - sonst aus Datei-Pfad → letzter Pfadsegment-Container (für nicht-anwendungen-Cases)
 *
 * Wenn pageKey nicht eindeutig ableitbar ist → skip, manuell prüfen.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src/features"];
function walk(d, out=[]) {
  for (const e of readdirSync(d)) {
    const p = join(d,e); const s = statSync(p);
    if (s.isDirectory()) walk(p,out);
    else if (/Page\.tsx$/.test(e)) out.push(p);
  }
  return out;
}

const files = ROOTS.flatMap(r => { try { return walk(r); } catch { return []; }});
let done = 0; const skipped = [];

for (const file of files) {
  const src0 = readFileSync(file,"utf8");
  if (src0.includes("useCmsI18n(")) continue;

  const utRe = /const\s*\{\s*([^}]+)\}\s*=\s*useTranslation\(\s*"([^"]+)"\s*\)\s*;?/;
  const m = src0.match(utRe);
  if (!m) { skipped.push([file,"no useTranslation literal"]); continue; }
  const destructured = m[1];
  const ns = m[2];

  // base finden
  let baseLiteral = "";
  const baseM = src0.match(/const\s+base\s*=\s*"([^"]+)"/);
  if (baseM) baseLiteral = baseM[1];

  // pageKey ableiten
  let pageKey = "";
  let rootPrefix = baseLiteral;
  if (/\/anwendungen\/pages\//.test(file)) {
    if (baseLiteral) pageKey = `anwendungen.${baseLiteral}`;
    else {
      // Container nutzt funktionen.<key>; aus Dateinamen den Key holen
      const fname = file.split("/").pop().replace("Page.tsx","");
      // funktionen.<camelToKebab oder lower>
      // Wir suchen den häufigsten 2-Segment-Prefix in t-Calls
      const counts = new Map();
      for (const tm of src0.matchAll(/\bt\(\s*[`"']([^`"']+)/g)) {
        const parts = tm[1].split(".");
        if (parts.length >= 2 && parts[0] !== "shared") {
          const k = `${parts[0]}.${parts[1]}`;
          counts.set(k,(counts.get(k)??0)+1);
        }
      }
      const sorted = [...counts.entries()].sort((a,b)=>b[1]-a[1]);
      if (sorted.length) {
        rootPrefix = sorted[0][0];
        pageKey = `anwendungen.${rootPrefix}`;
      }
    }
  } else {
    skipped.push([file, `outside /anwendungen — needs manual`]); continue;
  }
  if (!pageKey) { skipped.push([file,"no pageKey derivable"]); continue; }

  const wantsI18n = /\bi18n\b/.test(destructured);
  const newLine = `const { t, cms, loc${wantsI18n?", i18n":""} } = useCmsI18n(${JSON.stringify(pageKey)}, ${JSON.stringify(ns)}${rootPrefix?`, ${JSON.stringify(rootPrefix)}`:""});`;

  let src = src0.replace(utRe, newLine);

  // useCmsI18n import hinzufügen
  if (!src.includes(`from "@/features/cms/hooks/useCmsI18n"`)) {
    const imports = [...src.matchAll(/^import .*$/gm)];
    const last = imports[imports.length-1];
    const idx = last.index + last[0].length;
    src = src.slice(0,idx) + `\nimport { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";` + src.slice(idx);
  }
  // useTranslation-Import entfernen wenn ungenutzt
  if (!/useTranslation\s*\(/.test(src)) {
    src = src.replace(/import\s*\{\s*useTranslation\s*\}\s*from\s*["']react-i18next["'];?\s*\n/g,"");
  }

  writeFileSync(file, src);
  done++;
  console.log(`✓ ${file}  ns=${ns}  pageKey=${pageKey}  rootPrefix=${rootPrefix||"(none)"}`);
}

console.log(`\nConverted: ${done}`);
console.log(`Skipped:   ${skipped.length}`);
for (const [f,r] of skipped) console.log(`  - ${f}  ::  ${r}`);
