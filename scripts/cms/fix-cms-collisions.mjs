#!/usr/bin/env node
/**
 * Fix collisions: When useCmsI18n destructures `cms`/`loc` but the page
 * also has a local `const cms = ...` / `const loc = ...` further down,
 * remove the conflicting names from the useCmsI18n destructure.
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILES = [
  "src/features/anwendungen/pages/BildungseinrichtungenPage.tsx",
  "src/features/eingangssysteme/pages/EntryIntegrationsformenPage.tsx",
  "src/features/eingangssysteme/pages/EntryMaterialPage.tsx",
  "src/features/gebaeudekommunikation/pages/BriefkastenanlagenPage.tsx",
  "src/features/kontakt/pages/KontaktBcmPage.tsx",
  "src/features/signage/pages/BeschilderungPage.tsx",
];

for (const f of FILES) {
  let src = readFileSync(f, "utf8");
  const re = /const\s*\{\s*([^}]+)\}\s*=\s*useCmsI18n\(/;
  const m = src.match(re);
  if (!m) { console.log(`! no useCmsI18n in ${f}`); continue; }
  const fields = m[1].split(",").map(s=>s.trim()).filter(Boolean);
  const kept = fields.filter(name => {
    // Conflict if `const <name> = ` exists elsewhere in same file
    const otherDecl = new RegExp(`const\\s+${name}\\s*[:=]`, "g");
    const matches = [...src.matchAll(otherDecl)];
    return matches.length === 0; // destructure is not counted by this regex
  });
  if (kept.length === fields.length) { console.log(`= ${f} no conflict`); continue; }
  const newDest = `const { ${kept.join(", ")} } = useCmsI18n(`;
  src = src.replace(re, newDest);
  writeFileSync(f, src);
  console.log(`✓ ${f}  kept=${kept.join(",")}  dropped=${fields.filter(x=>!kept.includes(x)).join(",")}`);
}
