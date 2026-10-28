#!/usr/bin/env node
/**
 * Codemod 3: Restliche Pages mit expliziten Mappings.
 */
import { readFileSync, writeFileSync } from "node:fs";

const MAPPINGS = [
  { file: "src/features/eingangssysteme/pages/EntryIntegrationsformenPage.tsx", pageKey: "eingangssysteme.integrationsformen", ns: "eingangssysteme", rootPrefix: "integrationsformen" },
  { file: "src/features/eingangssysteme/pages/EntryMaterialPage.tsx", pageKey: "eingangssysteme.material", ns: "eingangssysteme", rootPrefix: "material" },
  { file: "src/features/gebaeudekommunikation/pages/BriefkastenanlagenPage.tsx", pageKey: "gebaeudekommunikation.briefkastenanlagen", ns: "gebaeudekommunikation", rootPrefix: "briefkastenanlagen" },
  { file: "src/features/kontakt/pages/KontaktBcmPage.tsx", pageKey: "kontakt-bcm.root", ns: "kontakt-bcm", rootPrefix: "" },
  { file: "src/features/signage/pages/BeschilderungPage.tsx", pageKey: "signage.root", ns: "gebaeudekommunikation", rootPrefix: "beschilderung" },
  { file: "src/features/anwendungen/pages/BildungseinrichtungenPage.tsx", pageKey: "anwendungen.bildungseinrichtungen", ns: "anwendungen", rootPrefix: "uebersichten.bildung" },
];

let done = 0;
for (const { file, pageKey, ns, rootPrefix } of MAPPINGS) {
  let src;
  try { src = readFileSync(file, "utf8"); } catch { console.log(`! missing ${file}`); continue; }
  if (src.includes("useCmsI18n(")) { console.log(`= already ${file}`); continue; }

  const utRe = /const\s*\{\s*([^}]+)\}\s*=\s*useTranslation\(\s*"([^"]+)"\s*\)\s*;?/;
  const m = src.match(utRe);
  if (!m) { console.log(`! no useTranslation literal in ${file}`); continue; }
  const wantsI18n = /\bi18n\b/.test(m[1]);
  const newLine = `const { t, cms, loc${wantsI18n?", i18n":""} } = useCmsI18n(${JSON.stringify(pageKey)}, ${JSON.stringify(ns)}${rootPrefix?`, ${JSON.stringify(rootPrefix)}`:""});`;

  // Nur EINE Ersetzung
  src = src.replace(utRe, newLine);

  if (!src.includes(`from "@/features/cms/hooks/useCmsI18n"`)) {
    const imports = [...src.matchAll(/^import .*$/gm)];
    const last = imports[imports.length-1];
    const idx = last.index + last[0].length;
    src = src.slice(0,idx) + `\nimport { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";` + src.slice(idx);
  }
  if (!/useTranslation\s*\(/.test(src)) {
    src = src.replace(/import\s*\{\s*useTranslation\s*\}\s*from\s*["']react-i18next["'];?\s*\n/g,"");
  }
  writeFileSync(file, src);
  done++;
  console.log(`✓ ${file}`);
}
console.log(`\nConverted: ${done}`);
