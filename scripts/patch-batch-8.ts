/**
 * Patch script: add hero + inline optional CMS image slots to 12 pages
 * that currently have no images. Idempotent (skips if already patched).
 */
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = "/dev-server";

interface Patch {
  file: string;
  pageKey: string;
  /** marker to insert hero slot AFTER (regex string with one capture). */
  afterHero: RegExp;
  heroIndent: string;
  /** marker to insert inline slot BEFORE. */
  beforeInline: RegExp;
  inlineIndent: string;
}

const patches: Patch[] = [
  {
    file: "src/features/home/pages/UeberTCSPage.tsx",
    pageKey: "home.ueber-tcs",
    afterHero: /(<AutoBreadcrumb \/>\n)/,
    heroIndent: "      ",
    beforeInline: /(\n      \{\/\* CTA \*\/\})/,
    inlineIndent: "      ",
  },
  {
    file: "src/features/karriere/pages/KarrierePage.tsx",
    pageKey: "karriere.root",
    afterHero: /(<AutoBreadcrumb \/>\n)/,
    heroIndent: "      ",
    beforeInline: /(\n      <section className="container mx-auto py-16 lg:py-24 text-center">)/,
    inlineIndent: "      ",
  },
  {
    file: "src/features/kontakt/pages/KontaktPage.tsx",
    pageKey: "kontakt.root",
    afterHero: /(<AutoBreadcrumb \/>\n)/,
    heroIndent: "      ",
    beforeInline: /(\n      <div className="container mx-auto py-16 lg:py-24">)/,
    inlineIndent: "      ",
  },
  {
    file: "src/features/kontakt/pages/KontaktBcmPage.tsx",
    pageKey: "kontakt.bcm",
    afterHero: /(<AutoBreadcrumb \/>\n)/,
    heroIndent: "      ",
    beforeInline: /(\n      <div className="container mx-auto py-16 lg:py-24">)/,
    inlineIndent: "      ",
  },
  {
    file: "src/features/presse/pages/PressePage.tsx",
    pageKey: "presse.root",
    afterHero: /(<AutoBreadcrumb \/>\n)/,
    heroIndent: "      ",
    beforeInline: /(\n      <section className="bg-secondary\/30">)/,
    inlineIndent: "      ",
  },
  {
    file: "src/features/serviceportal/pages/ServiceportalPage.tsx",
    pageKey: "serviceportal.login",
    afterHero: /(<AutoBreadcrumb \/>\n)/,
    heroIndent: "      ",
    // fall back to closing fragment marker
    beforeInline: /(\n    <\/>\n  \);)/,
    inlineIndent: "      ",
  },
  {
    file: "src/features/serviceportal/pages/PasswortVergessenPage.tsx",
    pageKey: "serviceportal.passwort-vergessen",
    afterHero: /(<AutoBreadcrumb \/>\n)/,
    heroIndent: "      ",
    beforeInline: /(\n    <\/>\n  \);)/,
    inlineIndent: "      ",
  },
  {
    file: "src/features/serviceportal/pages/RegistrierenPage.tsx",
    pageKey: "serviceportal.registrieren",
    afterHero: /(<AutoBreadcrumb \/>\n)/,
    heroIndent: "      ",
    beforeInline: /(\n    <\/>\n  \);)/,
    inlineIndent: "      ",
  },
];

// Legal pages use PageLayout — inject slots around it via fragment wrapping.
const legalPages = [
  { file: "src/features/legal/pages/AgbPage.tsx", pageKey: "legal.agb" },
  { file: "src/features/legal/pages/DatenschutzPage.tsx", pageKey: "legal.datenschutz" },
  { file: "src/features/legal/pages/ImpressumPage.tsx", pageKey: "legal.impressum" },
];

// Home page: hero before .map, inline after .map (inside fragment)
const homePatch = {
  file: "src/features/home/pages/HomePage.tsx",
  pageKey: "home.start",
};

function injectImports(src: string, pageKeyAlreadyImported = false): string {
  if (src.includes("CmsOptionalImage")) return src;
  // find last import line
  const importRegex = /^(import .*?;\n)+/m;
  const match = src.match(importRegex);
  if (!match) throw new Error("no imports found");
  const newImports = pageKeyAlreadyImported
    ? `import { CmsOptionalImage } from "@/features/cms/components/CmsOptionalImage";\n`
    : `import { useCmsPageContent } from "@/features/cms/hooks/useCmsPageContent";\nimport { CmsOptionalImage } from "@/features/cms/components/CmsOptionalImage";\n`;
  return src.replace(importRegex, (m) => m + newImports);
}

function injectHook(src: string, pageKey: string): string {
  if (src.includes(`useCmsPageContent(`) && src.includes(pageKey)) return src;
  // Find first occurrence of `const { t } = useTranslation` or similar
  const hookRegex = /(\n {2}const \{ t \} = useTranslation\([^)]*\);)/;
  if (!hookRegex.test(src)) {
    // Try `const [` (state) — insert before
    const stateRegex = /(\n {2}const \[)/;
    if (stateRegex.test(src)) {
      return src.replace(stateRegex, `\n  const cms = useCmsPageContent("${pageKey}");$1`);
    }
    // Try after function opening — fallback
    const fnRegex = /(=> \{\n)/;
    return src.replace(fnRegex, `$1  const cms = useCmsPageContent("${pageKey}");\n`);
  }
  return src.replace(hookRegex, `$1\n  const cms = useCmsPageContent("${pageKey}");`);
}

function patchOne(p: Patch) {
  const path = `${ROOT}/${p.file}`;
  let src = readFileSync(path, "utf8");
  const before = src;

  src = injectImports(src);
  src = injectHook(src, p.pageKey);

  // Insert hero slot
  if (!src.includes(`sectionKey="hero"`) || !src.includes("CmsOptionalImage")) {
    if (p.afterHero.test(src)) {
      const heroSlot = `${p.heroIndent}<CmsOptionalImage cms={cms} variant="hero" sectionKey="hero" />\n`;
      src = src.replace(p.afterHero, `$1${heroSlot}`);
    } else {
      console.warn(`!! hero marker missing in ${p.file}`);
    }
  }

  // Insert inline slot (only once)
  const inlineMarker = `sectionKey="inline"`;
  if (!src.includes(inlineMarker)) {
    if (p.beforeInline.test(src)) {
      const inlineSlot = `\n${p.inlineIndent}<CmsOptionalImage cms={cms} variant="inline" sectionKey="inline" />`;
      src = src.replace(p.beforeInline, `${inlineSlot}$1`);
    } else {
      console.warn(`!! inline marker missing in ${p.file}`);
    }
  }

  if (src !== before) {
    writeFileSync(path, src, "utf8");
    console.log(`✓ patched ${p.file}`);
  } else {
    console.log(`= unchanged ${p.file}`);
  }
}

function patchLegal(file: string, pageKey: string) {
  const path = `${ROOT}/${file}`;
  let src = readFileSync(path, "utf8");
  const before = src;
  src = injectImports(src);
  src = injectHook(src, pageKey);

  // Wrap PageLayout with fragment + hero before, inline after.
  if (!src.includes(`sectionKey="hero"`)) {
    src = src.replace(
      /(\n {2}return \(\n {4})(<PageLayout)/,
      `$1<>\n      <CmsOptionalImage cms={cms} variant="hero" sectionKey="hero" />\n      $2`,
    );
    src = src.replace(
      /(\n {4}<\/PageLayout>)(\n {2}\);)/,
      `$1\n      <CmsOptionalImage cms={cms} variant="inline" sectionKey="inline" />\n    </>$2`,
    );
  }

  if (src !== before) {
    writeFileSync(path, src, "utf8");
    console.log(`✓ patched ${file}`);
  } else {
    console.log(`= unchanged ${file}`);
  }
}

function patchHome() {
  const path = `${ROOT}/${homePatch.file}`;
  let src = readFileSync(path, "utf8");
  const before = src;
  src = injectImports(src, /* pageKeyAlreadyImported */ true);
  // hook already present
  // hero before {orderedKeys.map (inside <>...</>)
  if (!src.includes(`sectionKey="hero"`)) {
    src = src.replace(
      /(\n {4}<>\n)( {6}\{orderedKeys\.map)/,
      `$1      <CmsOptionalImage cms={cms} variant="hero" sectionKey="hero" />\n$2`,
    );
    src = src.replace(
      /(\n {6}\}\)\}\n)( {4}<\/>)/,
      `$1      <CmsOptionalImage cms={cms} variant="inline" sectionKey="inline" />\n$2`,
    );
  }
  if (src !== before) {
    writeFileSync(path, src, "utf8");
    console.log(`✓ patched ${homePatch.file}`);
  } else {
    console.log(`= unchanged ${homePatch.file}`);
  }
}

for (const p of patches) patchOne(p);
for (const lp of legalPages) patchLegal(lp.file, lp.pageKey);
patchHome();
console.log("done");
