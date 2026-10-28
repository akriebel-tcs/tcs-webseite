#!/usr/bin/env node
/**
 * persona-sort-order-wirksam.mjs — Pflicht-CI-Gate (Eine Wahrheit Runde 12).
 *
 * Prüft statisch (ohne DB), dass die öffentliche Render-Reihenfolge auf
 * Persona-Seiten und im Produkte-Hub aus der DB-`sort_order` kommt und
 * nicht aus festem JSX. Heuristik pro Datei:
 *
 *   - Persona-Content-Datei MUSS einen `PersonaBodyRenderer`-Aufruf
 *     enthalten ODER zur Verwendung von `cms.sections.sort_order` über
 *     den zentralen Renderer (`renderPageSectionByType` mit Iteration)
 *     führen. Mehrere hartcodierte `<PersonaCmsSection sectionKey=…/>`
 *     im Body brechen das Gate.
 *   - Produkte-Hub (`ProduktHubPage.tsx`) darf KEIN lokales `motion.article`
 *     enthalten und MUSS die `cards`-Section über
 *     `renderPageSectionByType` rendern.
 *
 * Exit 0 = grün, Exit 1 = rot, Exit 2 = Konfigurationsfehler.
 */
import fs from "node:fs";

const PERSONA_FILES = {
  "personas.architekt":          "src/features/personas/architekt/components/ArchitektenContent.tsx",
  "personas.bauherr":            "src/features/personas/bauherr/components/BauherrenContent.tsx",
  "personas.fachhandel":         "src/features/personas/fachhandel/components/FachhandelContent.tsx",
  "personas.fachplaner":         "src/features/personas/fachplaner/components/FachplanerContent.tsx",
  "personas.handwerk":           "src/features/personas/handwerk/components/HandwerkContent.tsx",
  "personas.wohnungswirtschaft": "src/features/personas/wohnungswirtschaft/components/WohnungswirtschaftContent.tsx",
};

const HUB_FILE = "src/features/produkte/pages/ProduktHubPage.tsx";

const violations = [];

for (const [pk, file] of Object.entries(PERSONA_FILES)) {
  if (!fs.existsSync(file)) {
    violations.push({ pageKey: pk, file, reason: "Datei fehlt." });
    continue;
  }
  const src = fs.readFileSync(file, "utf8");
  const usesBodyRenderer = /PersonaBodyRenderer/.test(src);
  if (usesBodyRenderer) continue;
  const personaCmsSectionCount = (src.match(/<PersonaCmsSection\b/g) || []).length;
  if (personaCmsSectionCount >= 2) {
    violations.push({
      pageKey: pk,
      file,
      reason:
        `Body-Reihenfolge fest verdrahtet (${personaCmsSectionCount}× <PersonaCmsSection …/>). ` +
        `Drag/drop im CMS-Light wirkt nicht. Pflicht: <PersonaBodyRenderer …/> aus cms.sections.sort_order.`,
    });
  }
  if (/WoWiDetailSections/.test(src) || /<TuersprechanlagenSection|<BarrierefreiSection|<PlugPlaySection|<MietershopSection|<NamensanzeigeSection|<ZutrittParkraumSection|<GefahrenalarmierungSection|<BestandsmodernisierungSection|<ServiceGarantieSection/.test(src)) {
    violations.push({
      pageKey: pk,
      file,
      reason: "Harte Persona-Detail-Komponenten (WoWiDetailSections / *Section JSX) sind führende Public-Quelle. Inhalte müssen als echte cms_sections geführt werden.",
    });
  }
}

if (fs.existsSync(HUB_FILE)) {
  const src = fs.readFileSync(HUB_FILE, "utf8");
  if (/<motion\.article\b/.test(src)) {
    violations.push({
      pageKey: "produkte.hub",
      file: HUB_FILE,
      reason: "ProduktHubPage enthält lokales <motion.article> — Karten müssen über CardsSectionV1/renderPageSectionByType rendern.",
    });
  }
  if (!/renderPageSectionByType\s*\(/.test(src)) {
    violations.push({
      pageKey: "produkte.hub",
      file: HUB_FILE,
      reason: "ProduktHubPage ruft renderPageSectionByType() nicht auf — keine DB-sort_order-Iteration erkennbar.",
    });
  }
  // Special-Case auf 'cards' verboten — Standardrenderer muss übernehmen.
  if (/section_key\s*===\s*["']cards["']/.test(src)) {
    violations.push({
      pageKey: "produkte.hub",
      file: HUB_FILE,
      reason: "ProduktHubPage behandelt 'cards' als Sonderfall (if (section_key === 'cards')) — Sonderpfad untersagt. Standardrenderer entscheidet.",
    });
  }
} else {
  violations.push({ pageKey: "produkte.hub", file: HUB_FILE, reason: "Datei fehlt." });
}

if (violations.length === 0) {
  console.log("persona-sort-order-wirksam: grün — alle Pflichtfälle nutzen DB-sort_order.");
  process.exit(0);
}

console.error(`persona-sort-order-wirksam: ${violations.length} Verstoß/Verstöße.`);
for (const v of violations) {
  console.error(`  • ${v.pageKey} (${v.file}): ${v.reason}`);
}
process.exit(1);
