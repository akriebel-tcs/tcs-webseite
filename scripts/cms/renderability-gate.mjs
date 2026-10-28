#!/usr/bin/env node
/**
 * renderability-gate.mjs — Striktes CI-Gate ausschließlich für die
 * zentrale Renderfähigkeitslogik (`public.cms_section_renderability`,
 * Spiegel zu `src/features/cms/contract/renderability.ts`).
 *
 * Zweck: ein dauerhaft grünes Gate, das ausschließlich neue
 * Renderfähigkeitsfehler bewertet. Whitelist-Hygiene, Navigations-
 * Spiegel, Persona-Reachability etc. bleiben Sache des umfassenden
 * `globaler-spiegel-audit.mjs` und dürfen separat rot sein.
 *
 * Ausgabe: scripts/cms/output/renderability-gate.{md,json}.
 *
 * Exit-Codes:
 *   0  keine renderfähigkeits-relevanten Befunde (Bestand sauber)
 *   1  mindestens ein aktiver Standardbaustein würde null/leer rendern
 *   2  Konfigurationsfehler (DB nicht erreichbar)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = "scripts/cms/output";
const MIRROR_DIR = "docs/04-betrieb/audit-snapshot";

function writeBoth(name, content) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(MIRROR_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, name), content);
  fs.writeFileSync(path.join(MIRROR_DIR, name), content);
}

if (!process.env.PGHOST) {
  console.error("renderability-gate: PGHOST nicht gesetzt — DB-Zugang fehlt.");
  process.exit(2);
}

function psql(sql) {
  const r = spawnSync("psql", ["-tA", "-F", "\t", "-c", sql], { encoding: "utf-8" });
  if (r.status !== 0) {
    console.error("psql failed:", r.stderr);
    process.exit(2);
  }
  return r.stdout.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => l.split("\t"));
}

// Alle Standardtypen, für die die zentrale Logik einen Pflicht-Stopper kennt.
// Wer hier etwas ergänzt, muss zwingend renderability.ts + Migration anpassen.
const CONTRACT_TYPES = [
  "cta_v1", "cta",
  "content_v1", "content", "intro", "content_block_v1", "content_blocks_intro_v1",
  "rich_v1", "rich",
  "teaser_2col_v1",
  "contact_block_v1",
  "faq_v1",
  "cards_v1", "feature_grid_v1", "feature-grid",
  "product_scroller_v1", "product-scroller", "products",
  "product_showcase_list_v1",
  "download_list_v1",
  "stats_v1",
  "tabs_v1",
  "card_v1",
];

// Bestandsbereinigung Batch 56.1 — Carve-out für Sections, die NICHT über
// den kanonischen `CmsBodyRenderer` rendern, sondern über die spezifischen
// React-Page-Komponenten unter `src/features/anwendungen/pages/`
// (Wrapper `AnwendungDetailPage`). Diese Sections lesen `label` /
// `cta_label` etc. direkt aus der DB und sind daher kein Spiegel zum
// `ContentSectionV1`-Renderer. Sie werden im Gate als „out-of-scope"
// gemeldet, NICHT als Vertragsbruch. Das ist eine bewusste, dokumentierte
// Grenze — alle anderen Sections werden weiterhin strikt geprüft.
const OUT_OF_SCOPE_SECTION_KEYS = [
  "broschure", "content", "leistungen", "systembausteine", "anforderungen",
];
const OUT_OF_SCOPE_PAGE_PREFIX = "anwendungen.";

const sql = `
  with active as (
    select s.page_key, s.section_key, s.section_type,
           public.cms_section_renderability(s.page_key, s.section_key) as info
    from cms_sections s
    where s.is_active
      and s.section_type = any(array[${CONTRACT_TYPES.map((t) => `'${t}'`).join(",")}])
  )
  select page_key, section_key, section_type,
         info->>'section_type' as canonical,
         info->'missing' as missing
  from active
  where (info->>'contract_known')::bool
    and not (info->>'renderable')::bool
  order by 1,2
`;


const rows = psql(sql);
const allRaw = rows.map(([pk, sk, st, canonical, missingJson]) => ({
  page_key: pk,
  section_key: sk,
  section_type: st,
  canonical_type: canonical,
  missing: JSON.parse(missingJson || "[]"),
}));

const outOfScope = allRaw.filter(
  (f) =>
    f.page_key.startsWith(OUT_OF_SCOPE_PAGE_PREFIX) &&
    OUT_OF_SCOPE_SECTION_KEYS.includes(f.section_key),
);
const findings = allRaw.filter((f) => !outOfScope.includes(f));


// Baseline (Altbestand): Befunde, die VOR Batch 56.1 schon existierten
// und nicht im Scope dieses Batches sind. Ein dauerhaft rotes Gate ist
// kein wirksames Gate (Spec). Wir messen ausschließlich NEUE Befunde
// gegen die Baseline. Reduziert sich die Baseline auf 0, ist der Bestand
// vollständig sauber. Baseline-Pflege passiert ausschließlich über
// `node scripts/cms/renderability-gate.mjs --update-baseline`.
// Kanonische Baseline liegt im versionierten Doku-Ordner (Batch 57).
// `scripts/cms/output/` ist gitignored — ein frischer Checkout würde sonst
// die Baseline nicht finden und alle 102 Altbestands-Befunde als „neu"
// einstufen. Wir spiegeln zusätzlich nach `scripts/cms/output/` für lokale
// Diagnose, aber gelesen wird ausschließlich aus `MIRROR_DIR`.
const BASELINE_PATH = path.join(MIRROR_DIR, "renderability-gate.baseline.json");
const BASELINE_MIRROR_PATH = path.join(OUT_DIR, "renderability-gate.baseline.json");
const UPDATE_BASELINE = process.argv.includes("--update-baseline");

function fingerprint(f) {
  const parts = (f.missing || []).map(
    (m) => `${m.locale}/${m.reason}/${(m.field_keys || []).join(",")}`,
  );
  parts.sort();
  return `${f.page_key}|${f.section_key}|${f.section_type}#${parts.join(";")}`;
}

let baseline = { fingerprints: [] };
if (fs.existsSync(BASELINE_PATH)) {
  baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf-8"));
}
const baselineSet = new Set(baseline.fingerprints || []);
const findingFingerprints = findings.map((f) => ({ f, fp: fingerprint(f) }));
const newFindings = findingFingerprints.filter((x) => !baselineSet.has(x.fp)).map((x) => x.f);
const stillBaseline = findingFingerprints.filter((x) => baselineSet.has(x.fp)).map((x) => x.f);
const resolvedFromBaseline = [...baselineSet].filter(
  (fp) => !findingFingerprints.some((x) => x.fp === fp),
);

const payload = {
  generated_at: new Date().toISOString(),
  contract_source: "src/features/cms/contract/renderability.ts",
  sql_mirror: "public.cms_section_renderability",
  total_active_with_contract: undefined,
  out_of_scope_count: outOfScope.length,
  out_of_scope: outOfScope,
  baseline_known: baselineSet.size,
  baseline_still_present: stillBaseline.length,
  baseline_resolved: resolvedFromBaseline.length,
  new_findings_count: newFindings.length,
  new_findings: newFindings,
  all_findings_count: findings.length,
  all_findings: findings,
};

{
  const [[count]] = [psql(`
    select count(*) from cms_sections s
    where s.is_active
      and (public.cms_section_renderability(s.page_key, s.section_key)->>'contract_known')::bool
  `)];
  payload.total_active_with_contract = Number(count);
}

if (UPDATE_BASELINE) {
  const nextFingerprints = findings.map((f) => fingerprint(f)).sort();
  // Strenger Subset-Check (Batch 57.1):
  // Beim --update-baseline darf KEIN neuer Fingerprint hinzukommen,
  // unabhängig davon, ob die Gesamtanzahl gleich bleibt oder sinkt.
  // Reine Anzahlprüfung würde verbergen, dass ein alter Befund gegen
  // einen neuen ausgetauscht wurde (102 → 101 alte + 1 neuer).
  const added = nextFingerprints.filter((fp) => !baselineSet.has(fp));
  if (added.length > 0) {
    console.error(
      `renderability-gate: --update-baseline würde NEUE Fingerprints aufnehmen ` +
        `(${added.length} neu; vorher ${baselineSet.size}, nachher ${nextFingerprints.length}). ` +
        `Die Baseline darf nur SCHRUMPFEN. Bitte echte Befunde beheben statt sie zu akzeptieren.`,
    );
    for (const fp of added) console.error(`  + ${fp}`);
    process.exit(1);
  }
  const updated = {
    note: "Akzeptierter Altbestand für renderability-gate. Pflege ausschließlich über `node scripts/cms/renderability-gate.mjs --update-baseline`. Diese Baseline darf nur SCHRUMPFEN, neue Fingerprints sind hart verboten.",
    updated_at: new Date().toISOString(),
    fingerprints: nextFingerprints,
  };
  fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(updated, null, 2));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(BASELINE_MIRROR_PATH, JSON.stringify(updated, null, 2));
  console.log(
    `renderability-gate: baseline aktualisiert (${updated.fingerprints.length} Einträge, ` +
      `vorher ${baselineSet.size}, entfernt ${baselineSet.size - updated.fingerprints.length}).`,
  );
  process.exit(0);
}

const md = (() => {
  const lines = [];
  lines.push("# Renderability-Gate (Batch 56.1)");
  lines.push("");
  lines.push(`- Stand: ${payload.generated_at}`);
  lines.push(`- Aktive Sections mit Vertrag geprüft: **${payload.total_active_with_contract}**`);
  lines.push(`- Out-of-scope (custom Page-Renderer, anwendungen.*): **${payload.out_of_scope_count}**`);
  lines.push(`- Baseline-Altbestand: **${payload.baseline_known}** (${payload.baseline_still_present} weiterhin offen, ${payload.baseline_resolved} bereinigt)`);
  lines.push(`- **NEUE** Befunde gegenüber Baseline: **${payload.new_findings_count}**`);
  lines.push("");
  if (payload.new_findings_count === 0) {
    lines.push("✅ Keine neuen Renderfähigkeitsfehler gegenüber Baseline. Gate grün.");
  } else {
    lines.push("## Neue Befunde");
    lines.push("| page_key | section_key | section_type | locale | reason | felder |");
    lines.push("|---|---|---|---|---|---|");
    for (const f of newFindings) {
      for (const m of f.missing) {
        lines.push(`| ${f.page_key} | ${f.section_key} | ${f.section_type} | ${m.locale} | ${m.reason} | ${(m.field_keys || []).join(", ")} |`);
      }
    }
  }
  lines.push("");
  return lines.join("\n");
})();

writeBoth("renderability-gate.json", JSON.stringify(payload, null, 2));
writeBoth("renderability-gate.md", md);

if (newFindings.length > 0) {
  console.error(`renderability-gate: ${newFindings.length} NEUE Befund(e) gegenüber Baseline (Altbestand offen: ${stillBaseline.length}).`);
  process.exit(1);
}
console.log(`renderability-gate: ok — keine neuen Befunde. ${payload.total_active_with_contract} aktive Sections geprüft, Altbestand offen ${stillBaseline.length}, bereinigt ${resolvedFromBaseline.length}.`);
process.exit(0);

