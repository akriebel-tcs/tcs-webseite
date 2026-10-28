#!/usr/bin/env node
/**
 * Lädt Andrés Remix-Bilder in den Storage-Bucket `cms-assets` hoch und legt
 * pro Slot **eine aktive Zeile je Bildschirmgröße** (Mobile/Tablet/Desktop)
 * in `cms_assets` an (per RPC `rpc_admin_upsert_asset` mit p_viewport).
 *
 * Idempotent: bei erneutem Lauf wird die jeweilige Vorgänger-Zeile derselben
 * Bildschirmgröße deaktiviert (nicht gelöscht — Historie bleibt erhalten).
 *
 * Aufruf: `node scripts/sync/upload-remix-assets.mjs`
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!URL || !KEY) {
  console.error("VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing");
  process.exit(1);
}
const supabase = createClient(URL, KEY);
const BUCKET = "cms-assets";

// [pageKey, sectionKey, fieldKey, viewport, filePath]
const slots = [
  // Hero Startseite
  ["home.start", "hero", "image", "desktop", "scripts/sync/source-assets/remix/hero-entrance.png"],
  ["home.start", "hero", "image", "mobile",  "scripts/sync/source-assets/remix/hero-entrance-mobile.png"],

  // Startseite-Contentblöcke (André hat 3 Varianten geliefert)
  ["home.start", "block_communication", "image", "desktop", "scripts/sync/source-assets/remix/block-kommunikation-desktop.png"],
  ["home.start", "block_communication", "image", "tablet",  "scripts/sync/source-assets/remix/block-kommunikation-tablet.png"],
  ["home.start", "block_communication", "image", "mobile",  "scripts/sync/source-assets/remix/block-kommunikation-mobile.png"],

  ["home.start", "block_access", "image", "desktop", "scripts/sync/source-assets/remix/block-zutritt-desktop.png"],
  ["home.start", "block_access", "image", "tablet",  "scripts/sync/source-assets/remix/block-zutritt-tablet.png"],
  ["home.start", "block_access", "image", "mobile",  "scripts/sync/source-assets/remix/block-zutritt-mobile.png"],

  ["home.start", "block_entry", "image", "desktop", "scripts/sync/source-assets/remix/block-entry-desktop.png"],
  ["home.start", "block_entry", "image", "tablet",  "scripts/sync/source-assets/remix/block-entry-tablet.png"],
  ["home.start", "block_entry", "image", "mobile",  "scripts/sync/source-assets/remix/block-entry-mobile.png"],

  ["home.start", "block_signage", "image", "desktop", "scripts/sync/source-assets/remix/block-signage-desktop.png"],
  ["home.start", "block_signage", "image", "tablet",  "scripts/sync/source-assets/remix/block-signage-tablet.png"],
  ["home.start", "block_signage", "image", "mobile",  "scripts/sync/source-assets/remix/block-signage-mobile.png"],

  ["home.start", "block_solutions", "image", "desktop", "scripts/sync/source-assets/remix/block-objekt-desktop.png"],
  ["home.start", "block_solutions", "image", "tablet",  "scripts/sync/source-assets/remix/block-objekt-tablet.png"],
  ["home.start", "block_solutions", "image", "mobile",  "scripts/sync/source-assets/remix/block-objekt-mobile.png"],

  // block_consulting: André hat nur Mobile + Tablet geliefert, kein Desktop.
  ["home.start", "block_consulting", "image", "tablet", "scripts/sync/source-assets/remix/block-beratung-tablet.png"],
  ["home.start", "block_consulting", "image", "mobile", "scripts/sync/source-assets/remix/block-beratung-mobile.png"],

  // Bereichs-Heros (Desktop + Mobile aus Andrés Remix)
  ["anwendungen.root", "hero", "image", "desktop", "src/features/anwendungen/assets/hero-anwendungen-desktop.png"],
  ["anwendungen.root", "hero", "image", "mobile",  "src/features/anwendungen/assets/hero-anwendungen-mobile.png"],

  ["eingangssysteme.root", "hero", "image", "desktop", "src/features/eingangssysteme/assets/hero-entry-desktop.png"],
  ["eingangssysteme.root", "hero", "image", "mobile",  "src/features/eingangssysteme/assets/hero-entry-mobile.png"],

  ["gebaeudekommunikation.root", "hero", "image", "desktop", "src/features/gebaeudekommunikation/assets/hero-gebaeudekommunikation-desktop.png"],
  ["gebaeudekommunikation.root", "hero", "image", "mobile",  "src/features/gebaeudekommunikation/assets/hero-gebaeudekommunikation-mobile.png"],

  ["gebaeudemanagement.root", "hero", "image", "desktop", "src/features/gebaeudemanagement/assets/hero-gebaeudemanagement.png"],
  ["gebaeudemanagement.root", "hero", "image", "mobile",  "src/features/gebaeudemanagement/assets/hero-gebaeudemanagement-mobile.png"],

  ["service.hub", "hero", "image", "desktop", "src/features/service/assets/hero-service-desktop.png"],
  ["service.hub", "hero", "image", "mobile",  "src/features/service/assets/hero-service-mobile.png"],

  ["zutrittskontrolle.root", "hero", "image", "desktop", "src/features/zutrittskontrolle/assets/hero-zutrittskontrolle.png"],
  ["zutrittskontrolle.root", "hero", "image", "mobile",  "src/features/zutrittskontrolle/assets/hero-zutrittskontrolle-mobile.png"],

  // Türsprechanlagen — PES Pro Card (3 Varianten)
  ["gebaeudekommunikation.tuersprechanlagen", "card_pes_pro", "image", "desktop", "src/features/gebaeudekommunikation/assets/tuersprechanlagen/tk-aussenstation-pes-pro-desktop.png"],
  ["gebaeudekommunikation.tuersprechanlagen", "card_pes_pro", "image", "tablet",  "src/features/gebaeudekommunikation/assets/tuersprechanlagen/tk-aussenstation-pes-pro-tablet.png"],
  ["gebaeudekommunikation.tuersprechanlagen", "card_pes_pro", "image", "mobile",  "src/features/gebaeudekommunikation/assets/tuersprechanlagen/tk-aussenstation-pes-pro-mobile.png"],
];

let ok = 0, fail = 0, skipped = 0;
for (const [pageKey, sectionKey, fieldKey, viewport, filePath] of slots) {
  const abs = resolve(filePath);
  if (!existsSync(abs)) {
    console.warn(`⊘ skip (file missing): ${filePath}`);
    skipped++; continue;
  }
  const buf = readFileSync(abs);
  const fileName = filePath.split("/").pop();
  const storagePath = `${pageKey}/${sectionKey}/${fieldKey}/${viewport}/${Date.now()}-${fileName}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buf, { cacheControl: "3600", upsert: false, contentType: "image/png" });
  if (upErr) {
    console.error(`✗ upload ${pageKey}/${sectionKey}/${fieldKey}[${viewport}]: ${upErr.message}`);
    fail++; continue;
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const { data, error: rpcErr } = await supabase.rpc("rpc_admin_upsert_asset", {
    p_page_key: pageKey,
    p_section_key: sectionKey,
    p_field_key: fieldKey,
    p_storage_path: storagePath,
    p_public_url: pub.publicUrl,
    p_file_name: fileName,
    p_mime_type: "image/png",
    p_asset_role: "image",
    p_viewport: viewport,
  });
  if (rpcErr || !data?.success) {
    console.error(`✗ rpc ${pageKey}/${sectionKey}/${fieldKey}[${viewport}]:`, rpcErr?.message ?? data?.error);
    fail++; continue;
  }
  console.log(`✓ ${pageKey} · ${sectionKey} · ${fieldKey} · ${viewport}  →  deactivated_previous=${data.deactivated_previous}`);
  ok++;
}
console.log(`\nFertig: ${ok} OK, ${fail} Fehler, ${skipped} übersprungen.`);
process.exit(fail ? 1 : 0);
