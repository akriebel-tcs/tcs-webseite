#!/usr/bin/env node
/**
 * Redaktions-Fluss-Audit (Tranche 17)
 *
 * Klassifiziert aktive Sections in 6 Klassen aus Redakteurssicht:
 *   S0 OK            — sichtbare Section ist zugleich Datenquelle
 *   S1 OK-Container  — sichtbarer Container (cards_v1/stats_v1/tabs_v1) mit aktiven Karten
 *   S2 Source-only   — aktive Section liefert nur Daten für einen anderen sichtbaren Block
 *   S3 Legacy        — vorhanden, aber `is_active=false` (nicht im Audit, nur als Info)
 *   S4 Fehler        — aktiv, aber weder sichtbar noch als Datenquelle erkennbar
 *   S5 Spezial       — bekannte Spezialrenderer (Prefix-Konvention)
 *
 * Heuristiken (best effort, kein Kompiler-Check):
 *   - Standard-Body-Typen werden als S0 betrachtet, wenn sie top-level sind
 *     und nicht über bekannte Source-only-Paare gespiegelt werden.
 *   - cards_v1 mit aktiven card_v1-Kindern und ohne sichtbares Geschwister-
 *     Teaser-Muster gilt als S1.
 *   - Bekannte Source-only-Paare (page-spezifisch konfigurierbar) markieren
 *     z. B. personas + personas_item_ITEM auf home.start als S2.
 *   - Spezialprefixe (persona_, bereich_, series_override_, solution_teaser_)
 *     werden als S5 markiert.
 *   - Alles, was sonst aktiv, top-level und keinem Renderer zuordenbar ist,
 *     landet in S4.
 *
 * Aufruf:
 *   node scripts/cms/redaktions-fluss-audit.mjs
 *   node scripts/cms/redaktions-fluss-audit.mjs --focus=home.start
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL ||
  "https://uvkubrrljyzfvbvejepl.supabase.co";
const KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2a3VicnJsanl6ZnZidmVqZXBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMDgyMjcsImV4cCI6MjA5Mzg4NDIyN30.UL-toX5FHrIArab9wHCixmjlufkm7X6507Hf0ZYvb3s";

const sb = createClient(URL, KEY);

const focus = (process.argv.find((a) => a.startsWith("--focus=")) || "").slice(8);

const STANDARD_TYPES = new Set([
  "hero_v1", "teaser_2col_v1", "cta_v1", "stats_v1", "content_v1",
  "faq_v1", "contact_block_v1", "tabs_v1", "download_list_v1",
  "feature_grid_v1", "product_scroller_v1", "rich_v1", "cards_v1",
]);

const SPECIAL_PREFIXES = [
  "persona_", "bereich_", "series_override_", "solution_teaser_",
];

// Bekannte Source-only-Paare (Container/Kind → sichtbarer Block).
// Diese Sektionen erscheinen als „aktiv" im Admin, sind aber per
// Architekturentscheidung nur Datenquelle für andere sichtbare Sektionen.
// Tranche 18: Persona-Grid konsolidiert — `personas` + `personas_item_*`
// sind jetzt die sichtbaren Blöcke und stehen NICHT mehr in dieser Liste.
const KNOWN_SOURCE_ONLY = {};


async function main() {
  let q = sb.from("cms_sections")
    .select("page_key, section_key, section_type, is_active, parent_section_id, sort_order")
    .eq("is_active", true);
  if (focus) q = q.eq("page_key", focus);
  const { data: secs, error } = await q;
  if (error) { console.error(error); process.exit(1); }

  // Pages join: nur published & active.
  const { data: pages } = await sb.from("cms_pages")
    .select("page_key, status, is_active");
  const publicPages = new Set((pages || [])
    .filter((p) => p.status === "published" && p.is_active)
    .map((p) => p.page_key));

  const byPage = new Map();
  for (const s of secs) {
    if (!publicPages.has(s.page_key)) continue;
    if (!byPage.has(s.page_key)) byPage.set(s.page_key, []);
    byPage.get(s.page_key).push(s);
  }

  const buckets = { S0: [], S1: [], S2: [], S4: [], S5: [] };

  for (const [pageKey, list] of byPage.entries()) {
    const byKey = new Map(list.map((s) => [s.section_key, s]));
    const parents = list.filter((s) => !s.parent_section_id);
    const childrenOf = (key) => list.filter((s) => {
      const parent = list.find((p) => p.id === s.parent_section_id);
      return parent?.section_key === key;
    });
    // Kinder via parent_section_id auflösen — vereinfacht: wir nutzen
    // section_key-Prefix-Konvention, weil sect.id nicht im Select ist.
    const childrenByPrefix = (key) =>
      list.filter((s) => s.section_key.startsWith(`${key}_item_`));

    const knownSources = KNOWN_SOURCE_ONLY[pageKey] || new Set();

    for (const s of list) {
      const tag = (cls, note) => buckets[cls].push({
        page: pageKey, key: s.section_key, type: s.section_type, note,
      });

      // S5 Spezial-Renderer per Prefix
      if (SPECIAL_PREFIXES.some((p) => s.section_key.startsWith(p))) {
        tag("S5", "Spezialrenderer / Prefix-Konvention");
        continue;
      }

      // Bekannte Source-only
      if (knownSources.has(s.section_key)) {
        tag("S2", "Bekannte Source-only-Sektion (Daten für anderen sichtbaren Block)");
        continue;
      }

      // Kinder eines bekannten Source-only-Containers
      if (s.section_key.includes("_item_")) {
        const root = s.section_key.split("_item_")[0];
        if (knownSources.has(root)) {
          tag("S2", `Kind eines Source-only-Containers (${root})`);
          continue;
        }
        // sonst: legitime Karte (S0 als Kind)
        tag("S0", "Kind-Karte eines sichtbaren Containers");
        continue;
      }

      // Standardtypen: cards_v1 mit aktiven Kindern → S1
      if (s.section_type === "cards_v1") {
        const kids = childrenByPrefix(s.section_key);
        if (kids.length > 0) {
          tag("S1", `Karten-Container mit ${kids.length} aktiven Karten`);
        } else {
          tag("S4", "Karten-Container ohne aktive Karten");
        }
        continue;
      }

      if (STANDARD_TYPES.has(s.section_type)) {
        tag("S0", "Standardblock (sichtbar = Datenquelle)");
        continue;
      }

      // Unbekannter Typ, top-level → S4
      if (!s.parent_section_id) {
        tag("S4", `Unbekannter Typ "${s.section_type}"`);
      } else {
        tag("S0", "Kind-Section");
      }
    }
  }

  const total = Object.values(buckets).reduce((a, b) => a + b.length, 0);
  console.log(`\nRedaktions-Fluss-Audit — ${focus || "alle public Seiten"} (${total} aktive Sektionen)`);
  for (const k of ["S0", "S1", "S2", "S4", "S5"]) {
    console.log(`  ${k}: ${buckets[k].length}`);
  }
  console.log("");

  for (const k of ["S2", "S4"]) {
    if (!buckets[k].length) continue;
    console.log(`--- ${k} (${buckets[k].length}) ---`);
    for (const r of buckets[k]) {
      console.log(`  ${r.page} / ${r.key}  [${r.type}]  ${r.note}`);
    }
    console.log("");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
