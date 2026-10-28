#!/usr/bin/env node
/**
 * Icon-Sync-Audit (Tranche 23)
 *
 * Prüft alle Icon-Felder in CMS-Light:
 *   - field_key = 'icon'            (z. B. card_v1.icon, feature_grid_v1-Kinder)
 *   - field_key endet auf '.icon'   (z. B. items.system.icon)
 *
 * Pro Fall werden DE/EN-Werte, Renderer-Lesepfad, optionales `icon_image`
 * und der Lucide-Gültigkeitscheck geprüft und klassifiziert:
 *
 *   I0  OK                   — Lucide gültig, DE/EN identisch, Renderer liest icon
 *   I1  OK Bildicon aktiv    — icon_image aktiv und gewinnt vor Lucide
 *   I2  Warnung DE/EN diff   — Icon-Werte unterscheiden sich pro Sprache
 *   I3  Fehler Lucide        — Wert nicht in Lucide vorhanden (silent fallback im Renderer)
 *   I4  Fehler Renderer-ign. — Iconfeld vorhanden, Renderer-Typ liest 'icon' nicht
 *   I5  Bildicon-Slot fehlt  — Iconkarte hat `icon`, aber Whitelist hat kein `icon_image`
 *   I6  Needs decision       — unklare Sonderstruktur (z. B. items.*.icon ohne Renderer-Map)
 *
 * Aufruf:
 *   node scripts/cms/icon-sync-audit.mjs
 *   node scripts/cms/icon-sync-audit.mjs --focus=gebaeudekommunikation.grossanlagen
 *   node scripts/cms/icon-sync-audit.mjs --json
 */
import { createClient } from "@supabase/supabase-js";
import * as Lucide from "lucide-react";

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL ||
  "https://uvkubrrljyzfvbvejepl.supabase.co";
const KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2a3VicnJsanl6ZnZidmVqZXBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMDgyMjcsImV4cCI6MjA5Mzg4NDIyN30.UL-toX5FHrIArab9wHCixmjlufkm7X6507Hf0ZYvb3s";

const sb = createClient(URL, KEY);
const focus = (process.argv.find((a) => a.startsWith("--focus=")) || "").slice(8);
const asJson = process.argv.includes("--json");

/**
 * Renderer-Typen, die ein Lucide-`icon`-Feld auf ihren card_v1-Kindern lesen.
 * Quelle: src/features/cms/components/sections/*.tsx (manuell synchron).
 * Tranche 23: `cards_v1` rendert `icon` als 3. Fallback (image → icon_image → icon).
 */
const READS_ICON_ON_CHILDREN = new Set(["feature_grid_v1", "cards_v1"]);


/** Renderer-Typen, die ein `icon_image`-Asset auf card_v1-Kindern lesen. */
const READS_ICON_IMAGE_ON_CHILDREN = new Set(["feature_grid_v1", "cards_v1"]);

/** PascalCase → kebab-case. */
function pascalToKebab(name) {
  return name.replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2").toLowerCase();
}
function kebabToPascal(name) {
  return name.split("-").filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
}

const LUCIDE_PASCAL = new Set(Object.keys(Lucide.icons || {}));
const LUCIDE_KEBAB = new Set([...LUCIDE_PASCAL].map(pascalToKebab));
// Lucide re-exportiert Legacy-Namen (CheckCircle2, Home, …) als Aliase
// außerhalb des `icons`-Objekts. Der Renderer (resolveIcon) erkennt diese
// ebenfalls — also auch hier als gültig werten.
const LUCIDE_NAMED = new Set(
  Object.keys(Lucide).filter((k) => /^[A-Z]/.test(k) && typeof Lucide[k] === "object"),
);

function isValidLucide(name) {
  if (!name) return false;
  const t = name.trim();
  if (!t) return false;
  if (LUCIDE_KEBAB.has(t)) return true;
  if (LUCIDE_PASCAL.has(t)) return true;
  if (LUCIDE_NAMED.has(t)) return true;
  const pascal = kebabToPascal(t);
  return LUCIDE_PASCAL.has(pascal) || LUCIDE_NAMED.has(pascal);
}


async function main() {
  let pagesQ = sb.from("cms_pages")
    .select("page_key, route_path, status, is_active, title_de")
    .eq("status", "published").eq("is_active", true);
  if (focus) pagesQ = pagesQ.eq("page_key", focus);
  const { data: pages } = await pagesQ;
  const pageMap = new Map((pages || []).map((p) => [p.page_key, p]));
  const pageKeys = [...pageMap.keys()];
  if (pageKeys.length === 0) {
    console.log("Keine veröffentlichten Seiten gefunden.");
    return;
  }

  // Paginated lesen (Supabase Default-Limit 1000) — sonst fehlen Parent-
  // Sections im Map und card_v1-Kinder erscheinen fälschlich als "unter —".
  async function fetchSections() {
    const all = [];
    let from = 0;
    const STEP = 1000;
    while (true) {
      const { data, error } = await sb.from("cms_sections")
        .select("page_key, section_key, section_type, is_active, parent_section_id, id")
        .in("page_key", pageKeys).eq("is_active", true)
        .range(from, from + STEP - 1);
      if (error) throw error;
      const rows = data || [];
      all.push(...rows);
      if (rows.length < STEP) break;
      from += STEP;
    }
    return all;
  }
  const sections = await fetchSections();
  const secById = new Map((sections || []).map((s) => [s.id, s]));
  const secByKey = new Map((sections || []).map((s) => [`${s.page_key}::${s.section_key}`, s]));
  const parentTypeFor = (s) => s.parent_section_id ? (secById.get(s.parent_section_id)?.section_type ?? null) : null;

  // Alle Icon-Felder einsammeln (paginated, Supabase limit 1000).
  async function fetchIconFields() {
    const all = [];
    let from = 0;
    const STEP = 1000;
    while (true) {
      const { data, error } = await sb.from("cms_section_fields")
        .select("page_key, section_key, field_key, locale, value")
        .in("page_key", pageKeys)
        .or("field_key.eq.icon,field_key.like.*.icon")
        .in("locale", ["de", "en"])
        .range(from, from + STEP - 1);
      if (error) throw error;
      const rows = data || [];
      all.push(...rows);
      if (rows.length < STEP) break;
      from += STEP;
    }
    return all;
  }
  const fieldsRaw = await fetchIconFields();

  // (page, sec, field) → {de,en}
  const byTriple = new Map();
  for (const r of fieldsRaw) {
    const k = `${r.page_key}::${r.section_key}::${r.field_key}`;
    const cur = byTriple.get(k) || { de: null, en: null };
    cur[r.locale] = r.value;
    byTriple.set(k, cur);
  }

  // Whitelist für icon_image-Slots prüfen.
  const { data: whitelist } = await sb.from("cms_admin_editable_fields")
    .select("page_key, section_key, field_key, is_enabled")
    .in("page_key", pageKeys).eq("field_key", "icon_image").eq("is_enabled", true);
  const iconImageSlot = new Set((whitelist || []).map((w) => `${w.page_key}::${w.section_key}`));

  // Aktive icon_image-Assets.
  const { data: assets } = await sb.from("cms_assets")
    .select("page_key, section_key, field_key, is_active")
    .in("page_key", pageKeys).eq("field_key", "icon_image").eq("is_active", true);
  const hasIconImageAsset = new Set((assets || []).map((a) => `${a.page_key}::${a.section_key}`));

  const findings = { I0: [], I1: [], I2: [], I3: [], I4: [], I5: [], I6: [] };

  for (const [triple, vals] of byTriple) {
    const [pageKey, sectionKey, fieldKey] = triple.split("::");
    const sec = secByKey.get(`${pageKey}::${sectionKey}`);
    if (!sec) continue; // inaktiv / nicht öffentlich → ignoriert
    const parentType = parentTypeFor(sec);
    const route = pageMap.get(pageKey)?.route_path || "";

    const de = (vals.de || "").trim();
    const en = (vals.en || "").trim();
    const sameValue = de === en;
    const referenceVal = de || en;
    const lucideValid = isValidLucide(referenceVal);

    // Renderer liest 'icon' nur, wenn parent-type es vorsieht und field_key === 'icon'.
    const flatIcon = fieldKey === "icon";
    const rendererReadsIcon = flatIcon && (
      READS_ICON_ON_CHILDREN.has(parentType ?? "") ||
      READS_ICON_ON_CHILDREN.has(sec.section_type ?? "")
    );

    const hasImgSlot = iconImageSlot.has(`${pageKey}::${sectionKey}`);
    const hasImgAsset = hasIconImageAsset.has(`${pageKey}::${sectionKey}`);
    const rendererSupportsIconImage =
      READS_ICON_IMAGE_ON_CHILDREN.has(parentType ?? "") ||
      READS_ICON_IMAGE_ON_CHILDREN.has(sec.section_type ?? "");

    const base = {
      page_key: pageKey, route_path: route,
      section_key: sectionKey, section_type: sec.section_type,
      parent_type: parentType, field_key: fieldKey,
      value_de: de || null, value_en: en || null,
      has_icon_image_slot: hasImgSlot,
      has_icon_image_asset: hasImgAsset,
      renderer_reads_icon: rendererReadsIcon,
      renderer_supports_icon_image: rendererSupportsIconImage,
      lucide_valid: lucideValid,
    };

    // I1: Bildicon aktiv (gewinnt vor Lucide)
    if (rendererSupportsIconImage && hasImgAsset) {
      findings.I1.push(base);
      continue;
    }
    // I4: Feld vorhanden, Renderer liest es nicht (und ist auch kein items.*.icon)
    if (flatIcon && !rendererReadsIcon) {
      findings.I4.push(base);
      continue;
    }
    // Für items.*.icon: meist Fallback in Legacy-Section. Renderer-Lese-Pfad unklar.
    if (!flatIcon) {
      findings.I6.push(base);
      continue;
    }
    // I2: DE/EN unterscheiden sich (sollte für Icon-Namen identisch sein)
    if (de && en && !sameValue) {
      findings.I2.push(base);
      continue;
    }
    // I3: Lucide-Name ungültig → Renderer fällt heimlich auf null/Fallback
    if (referenceVal && !lucideValid) {
      findings.I3.push(base);
      continue;
    }
    // I5: gültiges Lucide-Icon, aber kein pflegbarer icon_image-Slot, obwohl
    // der Renderer Bildicons unterstützt
    if (rendererSupportsIconImage && !hasImgSlot) {
      findings.I5.push(base);
      continue;
    }
    findings.I0.push(base);
  }

  if (asJson) {
    console.log(JSON.stringify({
      summary: Object.fromEntries(Object.entries(findings).map(([k, v]) => [k, v.length])),
      findings,
    }, null, 2));
    return;
  }

  const total = Object.values(findings).reduce((a, b) => a + b.length, 0);
  console.log(`=== Icon-Sync-Audit (Tranche 23) ===`);
  console.log(`Seiten: ${pageKeys.length} · Iconfelder: ${total}`);
  console.log(
    `I0 OK: ${findings.I0.length} · ` +
    `I1 Bildicon aktiv: ${findings.I1.length} · ` +
    `I2 DE/EN diff: ${findings.I2.length} · ` +
    `I3 Lucide ungültig: ${findings.I3.length} · ` +
    `I4 Renderer ignoriert: ${findings.I4.length} · ` +
    `I5 Bildicon-Slot fehlt: ${findings.I5.length} · ` +
    `I6 Needs decision: ${findings.I6.length}`,
  );

  for (const cls of ["I3", "I2", "I4", "I5"]) {
    if (findings[cls].length === 0) continue;
    console.log(`\n--- ${cls} (${findings[cls].length}) ---`);
    for (const f of findings[cls].slice(0, 50)) {
      console.log(`  ${f.page_key}/${f.section_key} (${f.section_type} unter ${f.parent_type || "—"}) · ${f.field_key} = "${f.value_de ?? f.value_en ?? ""}"`);
    }
    if (findings[cls].length > 50) console.log(`  … +${findings[cls].length - 50} weitere`);
  }

  console.log(`\nFertig. Diagnose-Tool, blockt nicht. JSON-Variante: --json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
