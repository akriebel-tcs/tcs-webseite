#!/usr/bin/env node
/**
 * Setzt für die fünf Karten des Kartenscrollers `systembausteine` auf
 * `/anwendungen/einfamilienhaus` ein neutrales graues Platzhalterbild
 * (4:3, einfarbig, ohne Motiv) in den Slot `image`.
 *
 * Alt-Text DE und EN: „BILDAUFTRAG offen“ — damit der offene Bildbedarf
 * per Volltextsuche gefunden wird.
 *
 * Idempotent: bei erneutem Lauf wird die Vorgänger-Zeile desselben Slots
 * deaktiviert (nicht gelöscht).
 *
 * Aufruf: `node scripts/sync/upload-efh-platzhalter.mjs`
 * Datei:  /tmp/platzhalter-grau-4-3.png (oder PLACEHOLDER_FILE)
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!URL || !KEY) {
  console.error("VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing");
  process.exit(1);
}
const supabase = createClient(URL, KEY);

const BUCKET = "cms-assets";
const PAGE = "anwendungen.einfamilienhaus";
const FILE = process.env.PLACEHOLDER_FILE ?? "/tmp/platzhalter-grau-4-3.png";
const FILE_NAME = "platzhalter-grau-4-3.png";
const ALT = "BILDAUFTRAG offen";

// Standard: die fünf Karten des Kartenscrollers `systembausteine`.
// Über `SECTIONS` (Komma-Liste) lassen sich andere Blöcke derselben Seite
// mit demselben Platzhalter versorgen (z. B. `uebersicht__karte_1,...`).
const SECTIONS = (process.env.SECTIONS ?? [
  "systembausteine_item_aussenstation",
  "systembausteine_item_innenstation",
  "systembausteine_item_mobil",
  "systembausteine_item_zutritt",
  "systembausteine_item_briefkasten",
].join(","))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);


if (!existsSync(FILE)) {
  console.error(`Platzhalterdatei fehlt: ${FILE}`);
  process.exit(1);
}
const buf = readFileSync(FILE);

let ok = 0, fail = 0;
for (const section of SECTIONS) {
  const storagePath = `${PAGE}/${section}/image/desktop/${Date.now()}-${FILE_NAME}`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buf, { cacheControl: "3600", upsert: false, contentType: "image/png" });
  if (upErr) {
    console.error(`✗ Upload ${section}: ${upErr.message}`);
    fail++; continue;
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const { data, error: rpcErr } = await supabase.rpc("rpc_admin_upsert_asset", {
    p_page_key: PAGE,
    p_section_key: section,
    p_field_key: "image",
    p_storage_path: storagePath,
    p_public_url: pub.publicUrl,
    p_file_name: FILE_NAME,
    p_mime_type: "image/png",
    p_asset_role: "image",
    p_viewport: "desktop",
  });
  if (rpcErr || !data?.success) {
    console.error(`✗ RPC ${section}:`, rpcErr?.message ?? data?.error);
    fail++; continue;
  }
  for (const locale of ["de", "en"]) {
    await supabase.rpc("rpc_admin_update_asset_alt", {
      p_asset_id: data.asset_id,
      p_locale: locale,
      p_value: ALT,
    });
  }
  console.log(`✓ ${section} → Platzhalter gesetzt`);
  ok++;
}
console.log(`\nFertig: ${ok} OK, ${fail} Fehler.`);
process.exit(fail ? 1 : 0);
