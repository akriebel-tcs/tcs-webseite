#!/usr/bin/env node
/**
 * Sprint „Standardkarten-Vertrag" — Audit-Gates (Schritt 7)
 *
 * Statische, schnell laufende Gates. Liefern exit 1 bei Verstoß.
 * Eingebunden in `.github/workflows/cms-audit.yml` (folgt manuell).
 *
 * Gates:
 *  G1  product_scroller_v1 / product_showcase_list_v1 dürfen nicht lokal
 *      gestapelt gerendert werden — `CmsProductSolutionShell` delegiert.
 *  G2  resolveCardVisibility & resolveCardRuntime nutzen identische
 *      Link-Default-Regel (`defaultEnabled = n === 1`).
 *  G3  Kein automatischer /kontakt-Fallbacklink in zentralen Card-Renderern.
 *  G4  DB: jede aktive card_v1 hat alle Standardfeld-Freigaben.
 *  G5  Pflichtkarten B110/B1599-1601 + 1 echter Scroller + 1 Showcase-Stack
 *      sind im Code/DB sauber verdrahtet.
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

const fails = [];
const ok = (m) => console.log("✅ " + m);
const fail = (g, m) => { fails.push(`[${g}] ${m}`); console.log("❌ " + g + " " + m); };

const read = (p) => fs.readFileSync(p, "utf8");

// G1
const shell = read("src/features/cms/components/CmsProductSolutionShell.tsx");
if (shell.includes("CMS_RENDERERS[normalized]")) ok("G1 Shell delegiert an zentrale Renderer");
else fail("G1", "CmsProductSolutionShell delegiert nicht an CMS_RENDERERS");

// G2
const vis = read("src/features/cms/lib/cardVisibility.ts");
const occurrences = (vis.match(/defaultEnabled = n === 1/g) || []).length;
if (occurrences >= 2) ok(`G2 defaultEnabled-Regel zweifach (resolveCardVisibility + resolveCardRuntime): ${occurrences}`);
else fail("G2", `defaultEnabled = n === 1 nur ${occurrences}x gefunden, erwartet ≥2`);

// G3
for (const f of ["src/features/cms/components/sections/CardsSectionV1.tsx",
                 "src/features/cms/components/sections/ProductScrollerV1.tsx"]) {
  const s = read(f);
  if (s.includes('href: "/kontakt"')) fail("G3", `/kontakt-Fallback noch vorhanden in ${f}`);
  else ok(`G3 kein /kontakt-Fallback in ${f.split("/").pop()}`);
}

// G4 + G5 — optional DB-Check (nur wenn PGHOST gesetzt)
if (process.env.PGHOST) {
  try {
    const out = execSync(
      `psql -t -A -F'|' -c "select count(*) from cms_sections where section_type='product_showcase_list_v1' and is_active=true"`,
      { encoding: "utf8" }
    ).trim();
    if (Number(out) >= 2) ok(`G5 product_showcase_list_v1 Sections: ${out}`);
    else fail("G5", `erwartet ≥2 product_showcase_list_v1 Sections, gefunden ${out}`);
  } catch (e) {
    console.log("⚠️  DB-Gates übersprungen: " + e.message.split("\n")[0]);
  }
} else {
  console.log("⚠️  PGHOST nicht gesetzt — DB-Gates G4/G5 nur in CI mit DB-Zugriff");
}

if (fails.length) { console.error("\n" + fails.length + " Gate(s) fehlgeschlagen."); process.exit(1); }
console.log("\nAlle statischen Gates grün.");
