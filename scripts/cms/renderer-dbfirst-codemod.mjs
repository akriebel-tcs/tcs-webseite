#!/usr/bin/env node
/**
 * Codemod: Renderer DB-first.
 *
 * Für jede *.tsx-Page-Datei mit genau einem `useTranslation("ns")` und genau
 * einem `useCmsPageContent("pageKey")` ersetzen wir das durch den Wrapper
 *   const { t, cms, loc, i18n } = useCmsI18n("pageKey", "ns", "rootPrefix");
 *
 * `rootPrefix` = häufigstes erstes Dot-Segment aller `t("seg.rest...")`-Calls.
 *
 * Vorhandene `cms.text(...)` / `cms.asset(...)` / Hilfsvars bleiben unberührt.
 * Aufrufe an `t("…")` werden NICHT verändert.
 */
import { readFileSync, writeFileSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src/features", "src/app/pages"];

function walk(d, out = []) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(e)) out.push(p);
  }
  return out;
}

let converted = 0;
let skipped = 0;
const skipReasons = {};
const skipList = [];

const files = ROOTS.flatMap((r) => {
  try { return walk(r); } catch { return []; }
});

for (const file of files) {
  const src0 = readFileSync(file, "utf8");
  let src = src0;

  // Nur Page-Dateien anfassen.
  if (!/Page\.tsx$/.test(file)) continue;
  // Schon migriert?
  if (src.includes("useCmsI18n(")) { skipList.push([file, "already-migrated"]); continue; }

  // useTranslation("ns") — entweder mit oder ohne ns. Wir verlangen genau einen Aufruf.
  const utRe = /useTranslation\(\s*("([^"]+)"|'([^']+)')?\s*\)/g;
  const utMatches = [...src.matchAll(utRe)];
  if (utMatches.length !== 1) { skipList.push([file, `useTranslation x${utMatches.length}`]); continue; }
  const ns = utMatches[0][2] ?? utMatches[0][3] ?? "";

  // useCmsPageContent("key") — genau einer mit Literal.
  const ucpRe = /useCmsPageContent\(\s*"([^"]+)"\s*\)/g;
  const ucpMatches = [...src.matchAll(ucpRe)];
  if (ucpMatches.length !== 1) { skipList.push([file, `useCmsPageContent literal x${ucpMatches.length}`]); continue; }
  const pageKey = ucpMatches[0][1];

  // RootPrefix per Häufigkeit ermitteln.
  const tCallRe = /\bt\(\s*["'`]([^"'`]+)["'`]/g;
  const prefixCount = new Map();
  let totalT = 0;
  for (const m of src.matchAll(tCallRe)) {
    totalT++;
    const k = m[1];
    const dot = k.indexOf(".");
    if (dot < 0) continue;
    const head = k.slice(0, dot);
    prefixCount.set(head, (prefixCount.get(head) ?? 0) + 1);
  }
  let rootPrefix = "";
  if (prefixCount.size > 0) {
    const sorted = [...prefixCount.entries()].sort((a, b) => b[1] - a[1]);
    const sum = [...prefixCount.values()].reduce((a, b) => a + b, 0);
    if (sorted[0][1] / sum >= 0.6) rootPrefix = sorted[0][0];
  }
  // Template-Literal-Prefix wie ${base} → lokale Konstante `const base = "X"` auflösen.
  const varMatch = rootPrefix.match(/^\$\{(\w+)\}$/);
  if (varMatch) {
    const varName = varMatch[1];
    const constRe = new RegExp(`const\\s+${varName}\\s*=\\s*["']([^"']+)["']`);
    const cm = src.match(constRe);
    rootPrefix = cm ? cm[1] : "";
  }

  // Bestehende `const ... = useTranslation(...)` Zeile finden.
  const destructureRe = /const\s*\{\s*([^}]+)\}\s*=\s*useTranslation\(([^)]*)\)\s*;?/;
  const destMatch = src.match(destructureRe);
  if (!destMatch) { skipList.push([file, "no-destructure useTranslation"]); continue; }
  const destructured = destMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
  const wantsI18n = destructured.includes("i18n");
  // wir liefern: t, cms, loc, i18n (alles harmlos zu destructuren)
  const newDestructure = `const { t, cms, loc${wantsI18n ? ", i18n" : ""} } = useCmsI18n(${JSON.stringify(pageKey)}, ${JSON.stringify(ns)}${rootPrefix ? `, ${JSON.stringify(rootPrefix)}` : ""});`;

  src = src.replace(destructureRe, newDestructure);

  // Vorhandene `const cms = useCmsPageContent("…");` Zeile entfernen (kommt jetzt aus Hook).
  src = src.replace(/\n\s*const\s+cms\s*=\s*useCmsPageContent\(\s*"[^"]+"\s*\)\s*;?/g, "");

  // Vorhandene loc-Ableitung "const loc … = i18n.language…" entfernen, wir liefern loc selbst.
  src = src.replace(/\n\s*const\s+loc(?:\s*:\s*[^=]+)?\s*=\s*(?:normalizeLocale\([^)]+\)|i18n\.language[^;]+);?/g, "");

  // Import-Anpassung:
  //   - useCmsPageContent / normalizeLocale-Imports lassen wir stehen, falls noch verwendet.
  //   - useCmsI18n-Import hinzufügen, falls noch nicht vorhanden.
  if (!src.includes(`from "@/features/cms/hooks/useCmsI18n"`)) {
    // Nach dem letzten Import einfügen.
    const importLines = [...src.matchAll(/^import .*$/gm)];
    if (importLines.length > 0) {
      const last = importLines[importLines.length - 1];
      const idx = last.index + last[0].length;
      src = src.slice(0, idx) + `\nimport { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";` + src.slice(idx);
    }
  }

  // Wenn useTranslation-Import nicht mehr genutzt wird, entfernen.
  if (!/useTranslation\s*\(/.test(src)) {
    src = src.replace(/import\s*\{\s*useTranslation\s*\}\s*from\s*["']react-i18next["'];?\s*\n/g, "");
  }
  // Wenn useCmsPageContent nicht mehr genutzt wird, Import entfernen.
  if (!/useCmsPageContent\s*\(/.test(src)) {
    src = src.replace(/import\s*\{\s*useCmsPageContent\s*\}\s*from\s*["']@\/features\/cms\/hooks\/useCmsPageContent["'];?\s*\n/g, "");
    src = src.replace(/import\s*\{\s*useCmsPageContent\s*,\s*normalizeLocale\s*\}\s*from\s*["']@\/features\/cms\/hooks\/useCmsPageContent["'];?\s*\n/g, "");
  }

  if (src !== src0) {
    writeFileSync(file, src);
    converted++;
    console.log(`✓ ${file}  ns=${ns}  pageKey=${pageKey}  prefix=${rootPrefix || "(none)"}  tCalls=${totalT}`);
  } else {
    skipList.push([file, "no-change"]);
  }
}

console.log(`\nConverted: ${converted}`);
console.log(`Skipped:   ${skipList.length}`);
for (const [f, r] of skipList) console.log(`  - ${f}  ::  ${r}`);
