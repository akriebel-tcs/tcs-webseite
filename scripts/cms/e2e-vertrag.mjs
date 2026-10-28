#!/usr/bin/env node
/**
 * E2E-Vertragscheck `card_v1` — scharf (Phase 1b).
 *
 * Liest die Container-Matrix direkt aus dem Runtime-Vertrag
 * (`src/features/cms/contract/runtime/card_v1.matrix.json`) — KEINE
 * Doppelpflege mehr.
 *
 * Lädt jede Pflichtkarte-Route mit einem echten headless Chromium
 * (Playwright), wartet auf Hydration, sammelt den sichtbaren DOM-Text,
 * und prüft Feld für Feld:
 *
 *   - status=active      → Text/Marker MUSS im DOM auftauchen
 *   - status=incomplete  → Text DARF NICHT als wirksame Anzeige erscheinen
 *                          (z. B. Link-Label ohne href: kein <a>-Element)
 *   - status=unsupported → Text DARF NICHT im DOM erscheinen
 *   - status=disabled    → Text DARF NICHT im DOM erscheinen
 *   - status=empty       → keine Prüfung
 *
 * Read-only zur DB. Schreibt NICHTS. Service-Role-Key nicht nötig.
 *
 * Aufruf:
 *   node scripts/cms/e2e-vertrag.mjs
 *   PREVIEW_BASE_URL=https://… node scripts/cms/e2e-vertrag.mjs
 *
 * Exit:
 *   0 = alle Pflichtkarten konform
 *   1 = mindestens ein Verstoß
 */

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUTPUT_DIR = path.join(ROOT, "scripts/cms/output");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "e2e-vertrag-latest.json");
const MATRIX_FILE = path.join(
  ROOT,
  "src/features/cms/contract/runtime/card_v1.matrix.json",
);

// ── Vertrag laden (Single Source of Truth) ─────────────────────────
const MATRIX = JSON.parse(readFileSync(MATRIX_FILE, "utf-8"));
const CONTAINER_SUPPORT = Object.fromEntries(
  Object.entries(MATRIX.containers).map(([k, v]) => [k, v.supports]),
);

function effectiveKind(parentType, parentKey) {
  const t = (parentType || "").trim();
  const k = (parentKey || "").trim();
  if (t === "cards_v1") return k === "products" ? "cards_v1.scroller" : "cards_v1.grid";
  if (CONTAINER_SUPPORT[t]) return t;
  return "unknown";
}

// ── Pflichtkarten (Phase 1b) ───────────────────────────────────────
const PFLICHTKARTEN = [
  {
    shortId: "B-538",
    pageKey: "gebaeudekommunikation.tuersprechanlagen",
    sectionKey: "card_pak",
    routePath: "/gebaeudekommunikation/tuersprechanlagen",
    note: "Karte mit Bullets/Chips und incomplete-Link (Pilot)",
  },
  {
    shortId: "B-583",
    pageKey: "zutrittskontrolle.tueren-tore",
    sectionKey: "card_drueckergarnitur",
    routePath: "/zutrittskontrolle/tueren-tore",
    note: "cards_v1.grid Bildkarte (Standard-Raster)",
  },
  {
    shortId: "B-1177",
    pageKey: "produkte.hub",
    sectionKey: "cards.tuerkommunikation",
    routePath: "/produkte",
    note: "card_grid_v1 Thumbnailkarte mit Links",
  },
  {
    shortId: "B-2002",
    pageKey: "gebaeudekommunikation.tuersprechanlagen",
    sectionKey: "vorteile__barrierefrei",
    routePath: "/gebaeudekommunikation/tuersprechanlagen",
    note: "feature_grid_v1 Iconkarte",
  },
];

// ── Supabase-Client ────────────────────────────────────────────────
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://uvkubrrljyzfvbvejepl.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const PREVIEW_BASE =
  process.env.PREVIEW_BASE_URL ||
  process.env.VITE_PREVIEW_URL ||
  "https://tcs-webseite-db-cms.lovable.app";

if (!SUPABASE_KEY) {
  console.error(
    "[e2e-vertrag] FEHLER: kein Supabase-Key (VITE_SUPABASE_PUBLISHABLE_KEY).",
  );
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// ── DB-Helfer ──────────────────────────────────────────────────────
function pickLocale(rows, fieldKey) {
  const de = rows.find((r) => r.field_key === fieldKey && r.locale === "de");
  if (de && (de.value || "").trim()) return (de.value || "").trim();
  const en = rows.find((r) => r.field_key === fieldKey && r.locale === "en");
  return ((en && en.value) || "").trim();
}

function readBool(rows, key, defaultIfBlank) {
  const raw = pickLocale(rows, key);
  if (raw === "") return defaultIfBlank;
  return raw === "1";
}

// ── Vertragsstatus pro Karte berechnen ─────────────────────────────
function resolveCard(card, fields, assets, parent) {
  const kind = effectiveKind(parent?.section_type, parent?.section_key);
  const support = CONTAINER_SUPPORT[kind] || CONTAINER_SUPPORT.unknown;
  const f = {};

  // Eyebrow
  {
    const text = pickLocale(fields, "eyebrow");
    const enabled = readBool(fields, "eyebrow_enabled", true);
    if (!support.eyebrow) f.eyebrow = { status: text ? "unsupported" : "empty", value: text };
    else if (!text) f.eyebrow = { status: "empty", value: "" };
    else if (!enabled) f.eyebrow = { status: "disabled", value: text };
    else f.eyebrow = { status: "active", value: text };
  }

  // Title (headline canonical, title fallback)
  {
    const text = pickLocale(fields, "headline") || pickLocale(fields, "title");
    if (!support.title) f.title = { status: text ? "unsupported" : "empty", value: text };
    else if (!text) f.title = { status: "empty", value: "" };
    else f.title = { status: "active", value: text };
  }

  // Description
  {
    const text = pickLocale(fields, "description") || pickLocale(fields, "beschreibung");
    if (!support.description) f.description = { status: text ? "unsupported" : "empty", value: text };
    else if (!text) f.description = { status: "empty", value: "" };
    else f.description = { status: "active", value: text };
  }

  // Bullets
  for (let i = 0; i < 5; i++) {
    const text = pickLocale(fields, `bullets.${i}`) || pickLocale(fields, `features.${i}`);
    const rawC = pickLocale(fields, `bullets_${i}_enabled`);
    const enabled = rawC === "" ? readBool(fields, `features_${i}_enabled`, true) : rawC === "1";
    let status;
    if (!support.bullets) status = text ? "unsupported" : "empty";
    else if (!text) status = "empty";
    else if (!enabled) status = "disabled";
    else status = "active";
    f[`bullets.${i}`] = { status, value: text };
  }

  // Chips
  for (let i = 0; i < 5; i++) {
    const text = pickLocale(fields, `chips.${i}`);
    const enabled = readBool(fields, `chips_${i}_enabled`, true);
    let status;
    if (!support.chips) status = text ? "unsupported" : "empty";
    else if (!text) status = "empty";
    else if (!enabled) status = "disabled";
    else status = "active";
    f[`chips.${i}`] = { status, value: text };
  }

  // Links 1..3
  for (let n = 1; n <= 3; n++) {
    const label = pickLocale(fields, `link_${n}_label`);
    const href = pickLocale(fields, `link_${n}_href`);
    const rawE = pickLocale(fields, `link_${n}_enabled`);
    const enabled = rawE === "" ? true : rawE === "1";
    let status;
    if (!support.links) status = label || href ? "unsupported" : "empty";
    else if (!label && !href) status = "empty";
    else if (!enabled) status = "disabled";
    else if (label && !href) status = "incomplete";
    else if (!label && href) status = "incomplete";
    else status = "active";
    f[`link_${n}`] = { status, label, href };
  }

  // Image
  {
    const hasImage = assets.some((a) => a.asset_role === "image" && a.is_active);
    const imageEnabled = readBool(fields, "image_enabled", true);
    let status;
    if (!support.image) status = hasImage ? "unsupported" : "empty";
    else if (!hasImage) status = "empty";
    else if (!imageEnabled) status = "disabled";
    else status = "active";
    f.image = { status, hasImage };
  }

  return { container: kind, support, fields: f };
}

async function fetchCardData(card) {
  const [fieldsR, sectionR, assetsR] = await Promise.all([
    sb.from("cms_section_fields").select("field_key, locale, value")
      .eq("page_key", card.pageKey).eq("section_key", card.sectionKey),
    sb.from("cms_sections").select("id, section_key, section_type, parent_section_id")
      .eq("page_key", card.pageKey).eq("section_key", card.sectionKey).single(),
    sb.from("cms_assets").select("asset_role, is_active")
      .eq("page_key", card.pageKey).eq("section_key", card.sectionKey),
  ]);
  if (fieldsR.error) throw fieldsR.error;
  if (sectionR.error) throw sectionR.error;

  let parent = null;
  if (sectionR.data?.parent_section_id) {
    const p = await sb.from("cms_sections")
      .select("section_key, section_type")
      .eq("id", sectionR.data.parent_section_id).single();
    if (!p.error) parent = p.data;
  }
  return { fields: fieldsR.data || [], assets: assetsR.data || [], parent };
}

// ── Browser-Lauf ───────────────────────────────────────────────────
async function loadPage(browser, routePath) {
  const url = PREVIEW_BASE.replace(/\/$/, "") + routePath;
  const ctx = await browser.newContext({
    locale: "de-DE",
    viewport: { width: 1366, height: 900 },
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
  // Hydration-Wartezeit: viele Lovable-Seiten brauchen 4–8 s, bis lazy
  // geladene Sections im DOM sind. Polling statt fixem Sleep.
  for (let i = 0; i < 25; i++) {
    const len = await page.evaluate(() => document.body.innerText.length);
    if (len > 2000) break;
    await page.waitForTimeout(400);
  }
  // Scrollen, damit lazy/IntersectionObserver-Sections rendern
  await page.evaluate(async () => {
    await new Promise((res) => {
      let y = 0;
      const step = () => {
        window.scrollBy(0, 600);
        y += 600;
        if (y < document.body.scrollHeight) setTimeout(step, 150);
        else res();
      };
      step();
    });
  });
  await page.waitForTimeout(1500);
  const text = await page.evaluate(() => document.body.innerText);
  const anchors = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a")).map((a) => ({
      text: (a.textContent || "").trim(),
      href: a.getAttribute("href") || "",
    })),
  );
  await ctx.close();
  return { url, text, anchors };
}

function checkCardOnPage(resolved, pageData, cardId) {
  const issues = [];
  const checks = [];
  const text = pageData.text;
  const anchorTexts = new Set(pageData.anchors.map((a) => a.text));

  for (const [field, info] of Object.entries(resolved.fields)) {
    const isLink = field.startsWith("link_");
    const isImage = field === "image";
    const needle = isLink ? info.label : info.value;

    if (info.status === "active") {
      if (isImage) continue; // Bild prüfen wir nicht über Text
      if (!needle) continue;
      const present = text.includes(needle);
      checks.push({ field, status: "active", needle, present });
      if (!present) {
        issues.push({
          card: cardId, field,
          message: `active-Feld nicht im Public-DOM gefunden: "${needle}"`,
        });
      } else if (isLink) {
        // active link → muss als Anchor auftauchen
        const ok = pageData.anchors.some(
          (a) => a.text.includes(needle) && a.href && a.href !== "#",
        );
        if (!ok) {
          issues.push({
            card: cardId, field,
            message: `active-Link "${needle}" ist im Text, aber nicht als <a href>`,
          });
        }
      }
    } else if (info.status === "incomplete" && isLink) {
      // Label vorhanden, aber href fehlt → darf NICHT als klickbarer Link erscheinen.
      if (info.label) {
        const clickable = pageData.anchors.some(
          (a) => a.text.includes(info.label) && a.href && a.href !== "#" && !a.href.startsWith("javascript:"),
        );
        checks.push({ field, status: "incomplete", needle: info.label, clickable });
        if (clickable) {
          issues.push({
            card: cardId, field,
            message: `incomplete-Link "${info.label}" ist trotzdem als <a href> klickbar`,
          });
        }
      }
    } else if (info.status === "unsupported" || info.status === "disabled") {
      // Wert sollte nicht öffentlich auftauchen. Schwacher Negativbeweis:
      // Text wäre auf der Seite vorhanden, wenn andere Karte ihn nicht teilt.
      // Bei eindeutig kartenspezifischen Werten (>= 12 Zeichen, kein Allerweltsbegriff)
      // melden wir Auffälligkeit, sonst überspringen.
      const v = isLink ? info.label : info.value;
      if (v && v.length >= 16 && !isImage) {
        const present = text.includes(v);
        checks.push({ field, status: info.status, needle: v, present });
        if (present) {
          issues.push({
            card: cardId, field,
            message: `${info.status}-Feld erscheint im Public-DOM: "${v}"`,
          });
        }
      }
    }
  }
  return { checks, issues };
}

// ── Hauptlauf ──────────────────────────────────────────────────────
async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    base: PREVIEW_BASE,
    contractVersion: MATRIX.version,
    cards: [],
    summary: { total: 0, ok: 0, failed: 0 },
  };

  // Karten nach Route gruppieren, um nur einmal pro Route zu laden
  const routes = new Map();
  for (const card of PFLICHTKARTEN) {
    if (!routes.has(card.routePath)) routes.set(card.routePath, []);
    routes.get(card.routePath).push(card);
  }

  const launchOpts = { headless: true, args: ["--no-sandbox"] };
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) launchOpts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  else if (await import("node:fs").then((m) => m.existsSync("/bin/chromium"))) {
    launchOpts.executablePath = "/bin/chromium";
  }
  const browser = await chromium.launch(launchOpts);
  try {
    for (const [routePath, cards] of routes) {
      console.log(`\n[e2e] Lade ${routePath} …`);
      let pageData;
      try {
        pageData = await loadPage(browser, routePath);
        console.log(`[e2e]   DOM ${pageData.text.length} Zeichen, ${pageData.anchors.length} Anchors`);
      } catch (e) {
        for (const card of cards) {
          report.cards.push({
            ...card, status: "failed",
            reasons: [`Route konnte nicht geladen werden: ${e.message}`],
          });
          report.summary.total++; report.summary.failed++;
        }
        continue;
      }

      for (const card of cards) {
        const entry = { ...card, status: "ok", reasons: [] };
        try {
          const data = await fetchCardData(card);
          const resolved = resolveCard(card, data.fields, data.assets, data.parent);
          entry.container = resolved.container;
          entry.activeFields = Object.entries(resolved.fields)
            .filter(([, v]) => v.status === "active").map(([k]) => k);
          entry.incompleteFields = Object.entries(resolved.fields)
            .filter(([, v]) => v.status === "incomplete").map(([k]) => k);

          const { checks, issues } = checkCardOnPage(resolved, pageData, card.shortId);
          entry.checks = checks;
          if (issues.length > 0) {
            entry.status = "failed";
            entry.reasons = issues.map((i) => i.message);
          }
        } catch (e) {
          entry.status = "failed";
          entry.reasons.push(`Vertragsberechnung fehlgeschlagen: ${e.message}`);
        }
        report.cards.push(entry);
        report.summary.total++;
        report.summary[entry.status]++;
      }
    }
  } finally {
    await browser.close();
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));

  // Konsolenausgabe
  console.log(`\n[e2e-vertrag] Bericht: ${path.relative(ROOT, OUTPUT_FILE)}`);
  for (const c of report.cards) {
    const tag = c.status === "ok" ? "✓ OK" : "✗ FEHLER";
    console.log(`  ${tag}  ${c.shortId}  ${c.pageKey}/${c.sectionKey}  (${c.container || "?"})`);
    if (c.note) console.log(`     ${c.note}`);
    if (c.activeFields?.length) console.log(`     active:     ${c.activeFields.join(", ")}`);
    if (c.incompleteFields?.length) console.log(`     incomplete: ${c.incompleteFields.join(", ")}`);
    for (const r of c.reasons) console.log(`     • ${r}`);
  }
  console.log(
    `\n[e2e-vertrag] Summary: total=${report.summary.total} ok=${report.summary.ok} failed=${report.summary.failed}`,
  );
  process.exit(report.summary.failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("[e2e-vertrag] Unerwarteter Fehler:", e);
  process.exit(1);
});
