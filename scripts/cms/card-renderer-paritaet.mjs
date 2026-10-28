#!/usr/bin/env node
/**
 * card-renderer-paritaet.mjs — Gate (kein Bericht).
 *
 * Ziel: Sicherstellen, dass `card_v1` überall dieselbe Wahrheit nutzt.
 * Standardkarte ist eine: Bild · Icon · Eyebrow · Titel · Beschreibung ·
 * Bullets · Chips · Links. Container ordnet nur an, reduziert nicht.
 *
 * Das Skript läuft offline (kein DB-/Browser-Zugriff) und sucht in
 * src/features (ts/tsx, rekursiv) nach Verstößen:
 *
 *  V1) Lokaler Page-Renderer liest Karten-Felder direkt
 *      (z. B. `cms.text(sectionKey, "icon", …)`) statt über
 *      `resolveCardVisibility` / `resolveCardRuntime`.
 *      → Risiko: Toggles (`icon_enabled`, `link_N_enabled` …) werden
 *      ignoriert; Karte verhält sich anders als im Admin angezeigt.
 *
 *  V2) Renderer rendert `<Icon …>` ohne `vis.iconVisible`-Check.
 *      → Risiko: `icon_enabled=0` wirkt im Public-Renderer nicht.
 *
 *  V3) Zentraler Container-Renderer (CardsSectionV1, ProductScrollerV1,
 *      FeatureGridV1) rendert ein Modul nicht, obwohl die Matrix es
 *      unterstützt.
 *
 * Exit:
 *   0 = sauber
 *   1 = mindestens ein Verstoß (Gate rot)
 */

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(ROOT, "src");
const OUT_DIR = path.join(ROOT, "scripts/cms/output");
const OUT_FILE = path.join(OUT_DIR, "card-renderer-paritaet-latest.json");

const MATRIX = JSON.parse(
  readFileSync(
    path.join(ROOT, "src/features/cms/contract/runtime/card_v1.matrix.json"),
    "utf-8",
  ),
);

// Zentrale Renderer — dürfen direkt lesen, müssen aber alle Module
// abdecken, die die Matrix unterstützt.
const CENTRAL_RENDERERS = new Set([
  "src/features/cms/components/sections/CardsSectionV1.tsx",
  "src/features/cms/components/sections/ProductScrollerV1.tsx",
  "src/features/cms/components/sections/FeatureGridV1.tsx",
]);

// Erlaubte Direkt-Reader (Resolver/Tests/Admin/Helpers).
const ALLOW_DIRECT = [
  /\/cms\/lib\//,
  /\/cms\/contract\//,
  /\/cms\/hooks\//,
  /\/cms\/utils\//,
  /\/admin\//,
  /\/__tests__\//,
  /\/cms\/components\/sections\//,
  /\/cms\/components\/CmsBodyRenderer\.tsx$/,
  /\/cms\/components\/CmsProductSolutionShell\.tsx$/,
  /\/cms\/components\/iconResolver\.tsx$/, // Definitionsstelle
];

// Karten-Standardfelder. Wer eines davon direkt aus einer Section liest
// und nicht durch den Resolver geht, gilt als Verstoß.
// Toggle-/Sichtbarkeits-Felder. Wer die direkt liest, umgeht den
// Resolver und bricht die Karten-Wahrheit. Inhaltliche Standardfelder
// (title/description/eyebrow/…) sind absichtlich NICHT hier — sie
// dürfen direkt gelesen werden, solange das Icon-/Link-Toggle über den
// Resolver geht. Architektur-Migration auf zentrale Renderer ist eine
// separate, dokumentierte Folge-Etappe.
const CARD_FIELDS = [
  "icon_enabled",
  "link_1_enabled",
  "link_2_enabled",
  "link_3_enabled",
];

const LOCAL_CARD_MAP_HINTS = [
  /parent_section_key\s*===\s*["'`][^"'`]+["'`].*section_type\s*===\s*["'`]card_v1["'`]/,
  /section_type\s*===\s*["'`]card_v1["'`].*parent_section_key\s*===\s*["'`][^"'`]+["'`]/,
  /children\.filter\([^\n]*section_type\s*===\s*["'`]card_v1["'`]/,
  /listChildItems\([^\n]*["'`]card_v1["'`]/,
];

const SINGLE_CTA_HINTS = [
  /canonicalLink\s*\(/,
  /canonicalLink1\s*\(/,
  /shared\.products\.learnMore/,
  /ArrowRight/,
  /<Link\b/,
  /link_1_label/,
  /link_1_href/,
];

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(entry)) acc.push(p);
  }
  return acc;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function isAllowedDirect(file) {
  return ALLOW_DIRECT.some((rx) => rx.test(file));
}

// Batch 57.2 — Markiert ECHTE `card_v1`-Iterationskontexte (Code, keine
// Doc-Mentions). Wird vom V2/R5-Gate genutzt, um Heuristik-Fehlalarme
// auf reinen Layout-Modulen (z. B. Snipdoo `audiences` mit hartcodiertem
// Lucide-Icon-Array) oder auf `cta_v1`-Helfern wie `BroschureLink` zu
// vermeiden. Erwartete Marker (Auszug):
//   - `section_type === "card_v1"`                 (Filter auf DB-Kinder)
//   - `listChildItems(... , "card_v1")`            (Resolver-Aufruf)
//   - `parent_section_type === "card_v1"`/`cards_v1`
//   - `parentSectionType: "cards_v1"`              (Render-Override)
//   - `parent_section_key === ... card_v1`-Kombi
// Kommentar-/JSDoc-Zeilen (`*`, `//`) werden VOR dem Match entfernt —
// damit zählen Header-Kommentare ("(cards_v1 + card_v1-Kinder)") nicht
// als Kontextbeweis.
const CARD_V1_ITERATION_RX = [
  /section_type\s*===\s*["'`]card_v1["'`]/,
  /listChildItems\s*\([^\n)]*["'`]card_v1["'`]/,
  /parent_section_type\s*===\s*["'`](?:card_v1|cards_v1)["'`]/,
  /parentSectionType\s*[:=]\s*["'`](?:card_v1|cards_v1)["'`]/,
  /section_key\s*===\s*["'`]card_v1["'`]/,
];

function stripCommentLine(line) {
  const t = line.trim();
  if (t.startsWith("*") || t.startsWith("/*") || t.startsWith("//")) return "";
  return line;
}

function hasCardV1IterationContext(lines, idx, radius = 40) {
  const from = Math.max(0, idx - radius);
  const to = Math.min(lines.length, idx + radius + 1);
  const window = lines.slice(from, to).map(stripCommentLine).join("\n");
  return CARD_V1_ITERATION_RX.some((rx) => rx.test(window));
}

const violations = [];

// ── V1+V2: Lokale Page-Renderer scannen ────────────────────────────
// Wichtig: Pfade ZUERST normalisieren (Windows liefert "\features\",
// Linux/CI "/features/"). Sonst läuft das Gate auf Windows falsch grün.
const files = walk(SRC)
  .map((f) => ({ abs: f, rel: rel(f) }))
  .filter((e) => /\/features\//.test(e.rel));

for (const entry of files) {
  const file = entry.abs;
  const r = entry.rel;
  if (isAllowedDirect(r)) continue;
  const src = readFileSync(file, "utf-8");

  // Nur Dateien, die überhaupt mit card_v1 zu tun haben.
  if (!/card_v1/.test(src) && !/resolveIcon\s*\(/.test(src)) continue;

  const lines = src.split("\n");
  // V2a: Per-call-Prüfung — JEDER `resolveIcon(...)`-Aufruf muss durch
  // Toggle-Logik geschützt sein. Datei-weite Heuristiken reichen nicht
  // (Gate-Lücke aus Sprint „card_v1 Abschluss"): Import alleine schützt
  // den konkreten Aufruf nicht. Sichere Wrapper auf derselben Zeile:
  //   - `resolveCardIcon(... resolveIcon ...)`   (null bei icon_enabled=0)
  //   - `... ? resolveIcon(...)` mit einer der Toggle-Variablen davor
  //     (`iconVisible`, `__iv`, `.visible`, `isCardIconVisible`)
  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    if (!/\bresolveIcon\s*\(/.test(line)) return;
    if (/\bresolveCardIcon\s*\(/.test(line)) return; // wrapper auf gleicher Zeile
    const guarded =
      /\?\s*resolveIcon\s*\(/.test(line) &&
      /(iconVisible|__iv|isCardIconVisible|\.visible|iconEnabled)/.test(line);
    if (!guarded) {
      violations.push({
        kind: "V2_UNGUARDED_RESOLVE_ICON",
        file: r,
        line: lineNo,
        snippet: line.trim().slice(0, 200),
        message: `resolveIcon(...) ohne Toggle-Schutz auf derselben Zeile. icon_enabled=0 wirkt hier nicht. Erlaubt: resolveCardIcon(...) oder \`isCardIconVisible(...).visible ? resolveIcon(...) : null\`.`,
      });
    }
  });

  // V2b: Per-Render-Prüfung — Jeder JSX-Render einer Icon-Komponente
  // (`<Icon …`, `<CardIcon …`, `<ItemIcon …`, `<IconCmp …`, `<ShowIcon …`)
  // muss in der Zeile selbst oder bis zu 2 Zeilen davor durch
  // `{Name &&` / `Name ?` / `: Name ?` gegated sein. Sonst rendert ein
  // `null`-Icon (bei icon_enabled=0) entweder fälschlich oder crasht.
  //
  // Batch 57.2: Heuristik fachlich auf echte `card_v1`-Iterations­kontexte
  // begrenzt. Reine Layout-/Sondermodule (z. B. SnipdooIp `audiences` /
  // `systemaufbau.moduleKeys`), die hartcodierte Lucide-Icons in einem
  // statischen Array rendern und keinen `card_v1`-Kindervertrag halten,
  // werden nicht mehr fälschlich geflaggt. Keine pauschale Dateiausnahme.
  const RENDER_RX = /<(Icon|CardIcon|ItemIcon|IconCmp|ShowIcon)\b/;
  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    // Kommentarzeilen überspringen (Doc-Beispiele wie `<Icon>` in JSDoc).
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith("*") || trimmedLine.startsWith("//")) return;
    const m = line.match(RENDER_RX);
    if (!m) return;
    // Type-Annotation oder Definition ignorieren
    if (/type\s+\w*Icon\b/.test(line) || /:\s*Icon\b/.test(line)) return;
    const name = m[1];
    const before = line.slice(0, line.indexOf(`<${name}`));
    const window = lines.slice(Math.max(0, idx - 2), idx + 1).join("\n");
    const guardRx = new RegExp(
      `\\{${name}\\s*&&|\\b${name}\\s*\\?|:\\s*${name}\\s*\\?|&&\\s*<${name}\\b`,
    );
    if (guardRx.test(before) || guardRx.test(window)) return;
    if (!hasCardV1IterationContext(lines, idx)) return;
    violations.push({
      kind: "V2_UNGUARDED_ICON_RENDER",
      file: r,
      line: lineNo,
      snippet: line.trim().slice(0, 200),
      message: `<${name} …/> ohne Toggle-Guard ({${name} && …} oder ${name} ? … : null). icon_enabled=0 wirkt hier nicht.`,
    });
  });


  const hasLocalCardMap = LOCAL_CARD_MAP_HINTS.some((rx) => rx.test(src));
  const usesSingleCtaPattern = SINGLE_CTA_HINTS.filter((rx) => rx.test(src));
  const usesCentralStandard = /renderPageSectionByType\s*\(|<CardsSectionV1\b|CardsSectionV1\s*\(/.test(src);
  if (hasLocalCardMap && usesSingleCtaPattern.length >= 2 && !usesCentralStandard) {
    violations.push({
      kind: "V4_LOCAL_CARD_V1_SPECIAL_RENDERER",
      file: r,
      message: "Datei mappt card_v1-Kinder lokal und zeigt Karten mit Ein-Link-/ArrowRight-Muster statt zentralem Standardrenderer. Pflicht: renderPageSectionByType / CardsSectionV1.",
      hints: usesSingleCtaPattern.map((rx) => rx.toString()),
    });
  }
}

// ── V3: Zentrale Renderer gegen Matrix prüfen ──────────────────────
const CONTAINER_BY_FILE = {
  "src/features/cms/components/sections/CardsSectionV1.tsx": "cards_v1.grid",
  "src/features/cms/components/sections/ProductScrollerV1.tsx": "product_scroller_v1",
  "src/features/cms/components/sections/FeatureGridV1.tsx": "feature_grid_v1",
};

// Marker, wie ein Modul im Renderer auftaucht (data-cms-field oder
// charakteristisches Symbol). Konservativ — was nicht klar erkennbar
// ist, schlägt als Verstoß auf.
const MODULE_MARKERS = {
  eyebrow: [/eyebrow/i, /cardSubtitle/, /itSub\b/],
  title: [/cardTitle/, /itTitle\b/, /\btitle\b.*<h\d/],
  description: [/cardDesc/, /itDesc\b/, /\bdescription\b/],
  image: [/data-cms-field=["']image["']/, /cardImg\b/, /itImg\b/],
  thumbnail: [/data-cms-field=["']thumbnail["']/, /thumbnail/i],
  icon: [/data-cms-field=["']icon["']/, /iconVisible/, /CardLucide/, /\bIcon\s/],
  icon_image: [/data-cms-field=["']icon_image["']/, /iconImage|cardIconImage/],
  bullets: [/data-cms-field=["']bullets["']/, /\bbullets\b/],
  chips: [/data-cms-field=["']chips["']/, /\bchips\b/],
  links: [/data-cms-field=["']links["']/, /link_\d_label|link_\d_href/, /cardCtaLabel/, /cardCtaHref/],
};

for (const [file, container] of Object.entries(CONTAINER_BY_FILE)) {
  const abs = path.join(ROOT, file);
  const src = readFileSync(abs, "utf-8");
  const supports = MATRIX.containers[container]?.supports ?? {};
  for (const [mod, supported] of Object.entries(supports)) {
    if (!supported) continue;
    const markers = MODULE_MARKERS[mod] ?? [];
    const present = markers.some((rx) => rx.test(src));
    if (!present) {
      violations.push({
        kind: "V3_CENTRAL_MISSING_MODULE",
        file,
        container,
        module: mod,
        message: `Zentraler Renderer für Container "${container}" rendert das laut Matrix unterstützte Modul "${mod}" nicht.`,
      });
    }
  }
}

// ── R5/R6: Legacy-Karten-Felder in lokalen Page-Renderern ──────────
// Sprint „card_v1 Abschluss — Legacy-Felder endgültig in Standardkarte
// überführen". Lokale Renderer dürfen `tags` / `cta_label` / `cta_href`
// / `href` / `features.N` nicht mehr direkt als öffentlichen Hauptpfad
// rendern. Die Legacy-Felder dürfen ausschließlich im zentralen
// Resolver (`cardCanonical.ts`, `cardVisibility.ts`, …) als Fallback
// existieren.
//
// Heuristik: wir flaggen `cms.text(<IDENT>, "X", …)` mit
//   X ∈ {tags, cta_label, cta_href, href, features.N}
// wobei das erste Argument ein Bezeichner ist (typisch für
// Karten-Schleifen über `s.section_key` / `sectionKey` / `sk` / `card.sectionKey`).
// Literale Section-Namen wie `cms.text("broschure", "href", …)` zeigen
// auf Nicht-Karten-Blöcke und werden nicht geflaggt.
const LEGACY_CARD_FIELD_RX =
  /cms\.text\(\s*([A-Za-z_$][\w.$]*)\s*,\s*"(tags|cta_label|cta_href|href|features\.\d+)"/g;

const R5_ALLOW = [
  /\/cms\/lib\//,
  /\/cms\/contract\//,
  /\/cms\/hooks\//,
  /\/cms\/utils\//,
  /\/admin\//,
  /\/__tests__\//,
  /\/cms\/components\/sections\//,
  /\/cms\/components\/CmsBodyRenderer\.tsx$/,
  /\/cms\/components\/CmsProductSolutionShell\.tsx$/,
];

for (const entry of files) {
  const r = entry.rel;
  if (R5_ALLOW.some((rx) => rx.test(r))) continue;
  const src = readFileSync(entry.abs, "utf-8");
  if (!/cms\.text\(/.test(src)) continue;
  const lines = src.split("\n");
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
    const matches = [...line.matchAll(LEGACY_CARD_FIELD_RX)];
    if (matches.length === 0) return;
    // Batch 57.2 — Heuristik fachlich präzisiert: nur flaggen, wenn der
    // umliegende Code tatsächlich `card_v1`-Kinder iteriert. Hilfs-
    // funktionen wie `BroschureLink(...)`, die `cta_label`/`cta_href`
    // aus einer `cta_v1`-Section lesen (Bildungseinrichtungen,
    // InterneKommunikation), sind kein Karten-Kontext und kein Verstoß
    // gegen den card_v1-Vertrag. Keine pauschale Dateiausnahme.
    if (!hasCardV1IterationContext(lines, idx)) return;
    for (const m of matches) {
      violations.push({
        kind: "R5_LEGACY_CARD_FIELD_DIRECT",
        file: r,
        line: idx + 1,
        field: m[2],
        snippet: trimmed.slice(0, 200),
        message: `Lokaler Renderer liest Legacy-Karten-Feld "${m[2]}" direkt. Pflicht: canonicalLink/canonicalChips/canonicalBullets aus @/features/cms/lib/cardCanonical.`,
      });
    }
  });
}

// R6: `t("...details")` / `detailsLabel` als Karten-Link-Beschriftung.
// Wird typischerweise in Karten-Schleifen verwendet ("Details →") und
// überschreibt damit das echte `link_1_label` aus dem CMS.
for (const entry of files) {
  const r = entry.rel;
  if (R5_ALLOW.some((rx) => rx.test(r))) continue;
  const src = readFileSync(entry.abs, "utf-8");
  if (!/card_v1/.test(src)) continue;
  const lines = src.split("\n");
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
    // `t("…details")` als Label-Wert (nicht in canonicalLink-Fallback-Position).
    // Tolerieren in `canonicalLink(... , fallbackLabel: ...)` und in reinen
    // Variablendeklarationen (`const X = t("…details")`) — diese werden
    // typischerweise als `fallbackLabel` weitergereicht.
    if (/fallbackLabel\s*:/.test(line)) return;
    if (/^\s*(const|let|var)\s+\w+\s*=\s*t\(/.test(line)) return;
    if (/\bt\(\s*["'][^"']*details["']/.test(line)) {
      violations.push({
        kind: "R6_DETAILS_LABEL_HARDCODED",
        file: r,
        line: idx + 1,
        snippet: trimmed.slice(0, 200),
        message: `\`t("…details")\` als Karten-Link-Label überschreibt link_1_label aus dem CMS. Über canonicalLink(...) lesen.`,
      });
    }
  });
}



// ── Ergebnis ───────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });

const report = {
  generated_at: new Date().toISOString(),
  total: violations.length,
  by_kind: violations.reduce((acc, v) => {
    acc[v.kind] = (acc[v.kind] ?? 0) + 1;
    return acc;
  }, {}),
  violations,
};
writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

if (violations.length === 0) {
  console.log("✓ card-renderer-paritaet: GRÜN — keine Verstöße");
  process.exit(0);
}

console.error(`✗ card-renderer-paritaet: ROT — ${violations.length} Verstöße`);
console.error("");
const byKind = report.by_kind;
for (const k of Object.keys(byKind)) {
  console.error(`  ${k}: ${byKind[k]}`);
}
console.error("");
const sample = violations.slice(0, 25);
for (const v of sample) {
  const loc = v.line ? `${v.file}:${v.line}` : v.file;
  console.error(`  • [${v.kind}] ${loc}`);
  if (v.module) console.error(`      Modul "${v.module}" fehlt in Container "${v.container}"`);
  if (v.field) console.error(`      Feld "${v.field}"`);
  if (v.snippet) console.error(`      ${v.snippet}`);
}
if (violations.length > sample.length) {
  console.error(`  … +${violations.length - sample.length} weitere — siehe ${rel(OUT_FILE)}`);
}
process.exit(1);
