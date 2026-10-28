#!/usr/bin/env node
/**
 * persona-eine-wahrheit.mjs
 *
 * Etappe 9 – verifiziert, dass die 6 Persona-Content-Komponenten keine
 * lokalen Karten-Renderer mehr enthalten (keine Icon-Maps, keine i18n-
 * geführten Karten-Loops für `cards_v1`-äquivalente Inhalte). Alle
 * Persona-Karten müssen über den zentralen Standardbaustein-Renderer
 * (`renderPageSectionByType` via `PersonaCmsSection`) aus der DB kommen.
 *
 * Exit-Codes: 0 = grün, 1 = Verstoß gefunden.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const PERSONAS = [
  ["bauherr",            "src/features/personas/bauherr/components/BauherrenContent.tsx"],
  ["architekt",          "src/features/personas/architekt/components/ArchitektenContent.tsx"],
  ["fachhandel",         "src/features/personas/fachhandel/components/FachhandelContent.tsx"],
  ["fachplaner",         "src/features/personas/fachplaner/components/FachplanerContent.tsx"],
  ["handwerk",           "src/features/personas/handwerk/components/HandwerkContent.tsx"],
  ["wohnungswirtschaft", "src/features/personas/wohnungswirtschaft/components/WohnungswirtschaftContent.tsx"],
];

// Karten-Sektionen, die in der DB als cards_v1 stehen und im Public
// zwingend über den zentralen Renderer kommen müssen.
const CARD_SECTIONS = ["highlights", "tools", "tips", "partnerServices", "cases"];

const LEGACY_DETAIL_IMPORTS = [
  { re: /from\s+["'][^"']*WoWiDetailSections["']/,
    why: "Importiert WoWiDetailSections – harte Persona-Detail-Komponente rendert Long-Form aus i18n statt aus cms_sections (PERSONA_DETAILSECTIONS_LEGACY)." },
];

const FORBIDDEN = [
  { re: /\b(highlight|tool|tip|partnerService|case)\w*IconByKey\b/i,
    why: "Lokale Icon-Map – Icons müssen aus cms_section_fields.field_key='icon' kommen." },
  { re: /\bhighlightItems\s*=/, why: "Hartcodierte highlightItems-Liste – Items kommen aus cms_sections (children)." },
  { re: /\btoolItems\s*=/,      why: "Hartcodierte toolItems-Liste – Items kommen aus cms_sections (children)." },
  { re: /\btipItems\s*=/,       why: "Hartcodierte tipItems-Liste – Items kommen aus cms_sections (children)." },
  { re: /\bpartnerServiceItems\s*=/, why: "Hartcodierte partnerServiceItems-Liste – Items kommen aus cms_sections (children)." },
  { re: /\btx\(\s*["']cta["']/, why: "Lokaler CTA-Block aus tx('cta',…) – CTA muss aus cms_sections.standard_cta via PersonaCmsSection kommen." },
  { re: /data-cms-section=["']cta["']/, why: "Lokale <section data-cms-section=\"cta\"> – CTA muss zentral über cta_v1 / PersonaCmsSection rendern." },
  { re: /\btx\(\s*["']faq["']/, why: "Lokaler FAQ-Block aus tx('faq',…) – FAQ muss aus cms_sections.faq via PersonaCmsSection kommen." },
  { re: /data-cms-section=["']faq["']/, why: "Lokale <section data-cms-section=\"faq\"> – FAQ muss zentral über faq_v1 / PersonaCmsSection rendern." },
  { re: /sectionKey=["']cta["']/, why: "Legacy-CTA per sectionKey=\"cta\" referenziert – erlaubt ist nur standard_cta." },
  { re: /\bsolutionLinkByKey\b/, why: "Lokale solutionLinkByKey-Map – Solutions müssen aus DB-Teasern (teaser_2col_v1) kommen (PERSONA_FALLBACK_RENDERER_AKTIV)." },
  { re: /\bsolutionKeys\.map\(/, why: "Lokaler solutionKeys.map()-Loop – Solutions-Reihenfolge muss aus cms.sections.sort_order kommen." },
];

// Vorab: PersonaBodyRenderer prüfen. Nur wenn er tatsächlich über
// renderPageSectionByType rendert und standard_cta / faq NICHT skippt,
// gilt sein Einsatz als gültige zentrale Render-Quelle für diese Keys.
const BODY_RENDERER_REL = "src/features/personas/shared/PersonaBodyRenderer.tsx";
const bodyRendererFull = path.join(ROOT, BODY_RENDERER_REL);
let bodyRendererRendersCta = false;
let bodyRendererRendersFaq = false;
if (fs.existsSync(bodyRendererFull)) {
  const brSrc = fs.readFileSync(bodyRendererFull, "utf8");
  const usesCentralRenderer = /renderPageSectionByType\s*\(/.test(brSrc);
  const skipMatch = brSrc.match(/DEFAULT_SKIP_KEYS[^\[]*\[([^\]]*)\]/);
  const skipKeys = skipMatch
    ? Array.from(skipMatch[1].matchAll(/["']([^"']+)["']/g)).map((m) => m[1])
    : [];
  bodyRendererRendersCta = usesCentralRenderer && !skipKeys.includes("standard_cta");
  bodyRendererRendersFaq = usesCentralRenderer && !skipKeys.includes("faq");
}

const violations = [];
for (const [name, rel] of PERSONAS) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    violations.push({ persona: name, kind: "missing-file", detail: rel });
    continue;
  }
  const src = fs.readFileSync(full, "utf8");

  for (const rule of LEGACY_DETAIL_IMPORTS) {
    if (rule.re.test(src)) {
      violations.push({ persona: name, kind: "legacy-detail-import", detail: rule.why });
    }
  }

  for (const rule of FORBIDDEN) {
    if (rule.re.test(src)) {
      violations.push({ persona: name, kind: "forbidden-pattern", detail: `${rule.re} – ${rule.why}` });
    }
  }

  // Heuristik: Karten-Sektionen müssen über PersonaCmsSection ODER
  // renderPageSectionByType rendern, sobald sie im Quellcode erwähnt sind.
  for (const sec of CARD_SECTIONS) {
    const mentioned = new RegExp(`data-cms-section=["']${sec}["']|sectionKey=["']${sec}["']|listItems\\(["']${sec}["']`).test(src);
    if (!mentioned) continue;
    const viaCentral =
      new RegExp(`PersonaCmsSection[^/]*sectionKey=["']${sec}["']`).test(src) ||
      new RegExp(`renderPageSectionByType[^)]*sectionKey:\\s*["']${sec}["']`).test(src);
    // Wenn die Sektion lokal mit `.map(` und `txItem("${sec}"` als Karte gerendert wird, ist das verboten.
    const localCardLoop = new RegExp(`${sec}Keys\\.map\\(`).test(src) &&
                          new RegExp(`txItem\\(["']${sec}["']`).test(src);
    if (localCardLoop && !viaCentral) {
      violations.push({
        persona: name,
        kind: "local-card-loop",
        detail: `Sektion '${sec}' wird lokal aus i18n/txItem gerendert. Muss über PersonaCmsSection (cards_v1) kommen.`,
      });
    }
  }

  // standard_cta / faq dürfen entweder direkt per PersonaCmsSection ODER
  // zentral via PersonaBodyRenderer (renderPageSectionByType, ohne Skip)
  // gerendert werden.
  const usesBodyRenderer = /<\s*PersonaBodyRenderer\b/.test(src);

  if (!/sectionKey=["']standard_cta["']/.test(src) && !(usesBodyRenderer && bodyRendererRendersCta)) {
    violations.push({
      persona: name,
      kind: "missing-standard-cta",
      detail: "standard_cta wird nicht zentral gerendert. Persona-Abschluss-CTA muss über PersonaCmsSection oder PersonaBodyRenderer (renderPageSectionByType, ohne Skip von 'standard_cta') kommen.",
    });
  }

  if (!/sectionKey=["']faq["']/.test(src) && !(usesBodyRenderer && bodyRendererRendersFaq)) {
    violations.push({
      persona: name,
      kind: "missing-standard-faq",
      detail: "faq wird nicht zentral gerendert. Aktivierte faq_v1-Sections wären öffentlich unerreichbar (weder PersonaCmsSection noch PersonaBodyRenderer rendert sie).",
    });
  }
}

if (violations.length === 0) {
  console.log("✓ persona-eine-wahrheit: 6/6 Personas grün – keine lokalen Karten-/CTA-/FAQ-Renderer.");
  process.exit(0);
}

console.error("✗ persona-eine-wahrheit: Verstöße gegen ‚Eine Wahrheit'\n");
for (const v of violations) {
  console.error(`  • [${v.persona}] ${v.kind}: ${v.detail}`);
}
console.error(`\n${violations.length} Verstoß(e). Persona-Karten müssen aus cms_sections + cms_section_fields kommen, gerendert über PersonaCmsSection / renderPageSectionByType.`);
process.exit(1);
