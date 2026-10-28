#!/usr/bin/env node
/**
 * Tote Codepfade: Inventur.
 *
 * Listet pro i18n-Namespace, welche Keys auch in cms_section_fields gespiegelt
 * sind und damit potenziell aus dem Code-Fallback entfernt werden können.
 *
 * !!! Liefert NUR einen Report. Es wird NICHTS gelöscht. !!!
 * Löschen erfolgt manuell pro Template nach Sichtprüfung der gerenderten Seite
 * im Preview (DB-Pfad muss vorher nachweislich greifen).
 *
 * Aufruf: node scripts/cms/dead-i18n-inventory.mjs [--ns=anwendungen]
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { execSync } from "node:child_process";

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));

const I18N_ROOT = "src/i18n/locales/de";
function walk(d, out=[]) {
  for (const e of readdirSync(d)) {
    const p = join(d,e); const s = statSync(p);
    if (s.isDirectory()) walk(p,out);
    else if (e.endsWith(".json")) out.push(p);
  }
  return out;
}

function flatten(obj, prefix="") {
  const out = {};
  for (const [k,v] of Object.entries(obj ?? {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = v;
  }
  return out;
}

const files = walk(I18N_ROOT);
const byNs = {};
for (const f of files) {
  const ns = basename(f).replace(/\.json$/,"");
  if (args.ns && ns !== args.ns) continue;
  const data = JSON.parse(readFileSync(f,"utf8"));
  byNs[ns] = flatten(data);
}

// DB via psql (already authenticated in sandbox)
const psqlOut = execSync(
  `psql -At -F$'\\t' -c "SELECT DISTINCT section_key||'.'||field_key FROM cms_section_fields WHERE locale='de'"`,
  { encoding: "utf8" }
);
const dbPaths = new Set(psqlOut.split("\n").map(l => l.trim()).filter(Boolean));

const lines = ["# Tote i18n-Codepfade — Inventur","",
  `Stand: ${new Date().toISOString().slice(0,10)}`,
  "",
  "Pro Namespace: Anzahl Code-Keys, davon in DB gespiegelt, Lösch-Kandidaten.",
  "Löschen erst nach Preview-Sichtprüfung jeder betroffenen Seite.",
  "",
  "| Namespace | Code-Keys | in DB gespiegelt | Coverage |",
  "|---|---:|---:|---:|",
];

for (const ns of Object.keys(byNs).sort()) {
  const keys = Object.keys(byNs[ns]);
  let mirrored = 0;
  for (const k of keys) {
    for (const p of dbPaths) {
      if (k === p || k.endsWith("."+p) || k.endsWith(p)) { mirrored++; break; }
    }
  }
  const cov = keys.length ? Math.round((mirrored/keys.length)*100) : 0;
  lines.push(`| ${ns} | ${keys.length} | ${mirrored} | ${cov}% |`);
}

lines.push("","## Lösch-Workflow (pro Template)","",
  "1. Im Admin Preview-Locale erzwingen und die Seite öffnen.",
  "2. Im DevTools Network nachweisen: Keine i18n-Fallbacks geladen (alle Texte aus `cms_section_fields`).",
  "3. Im JSON-Locale die zugehörigen Keys löschen (pro Seite/Section, nicht Namespace-weit).",
  "4. Vite-Restart + visuell QA, dann commit.",
  "",
  "Niemals Namespace-weit löschen, niemals ohne Sichtprüfung.");

// Ablage unter archiv/checkpoints — Reports sind historische Inventuren,
// die wir nicht in der Live-Doku führen. Zielordner anlegen, falls fehlt.
const out = "docs/archiv/checkpoints/dead-i18n-inventory.md";
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, lines.join("\n"));
console.log(`✓ Report: ${out}`);
console.log(lines.slice(0,20).join("\n"));
