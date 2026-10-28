#!/usr/bin/env node
/**
 * Lädt die drei Gebietskarten der Vertriebsregionen (Register „Vertrieb
 * Deutschland“ auf /kontakt, Section `vertrieb_register__vertrieb_de`) in den
 * Storage-Bucket `cms-assets` und legt je Regionsgruppe ein aktives Asset im
 * Slot `vorteile.<n>.group_image` an (RPC `rpc_admin_upsert_asset`).
 *
 * Gruppenanker: 1 = Nord Ost, 8 = Nord West, 13 = Süd.
 *
 * Idempotent: bei erneutem Lauf wird die Vorgänger-Zeile desselben Slots
 * deaktiviert (nicht gelöscht).
 *
 * Aufruf: `node scripts/sync/upload-vertrieb-de-gebietskarten.mjs`
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
const PAGE = "kontakt.root";
const SECTION = "vertrieb_register__vertrieb_de";
const DIR = process.env.MAP_DIR ?? "/mnt/user-uploads";

// [Gruppen-Anker-Nummer, Dateiname, Regionsname DE, Regionsname EN]
const entries = [
  [1, "Gebietskarte_AD_NordOst.png", "Nord Ost", "North East"],
  [8, "VTG_NordWest.jpg", "Nord West", "North West"],
  [13, "VTG_Sued.jpg", "Süd", "South"],
];

let ok = 0, fail = 0, skipped = 0;
for (const [idx, fileName, regionDe, regionEn] of entries) {
  const abs = resolve(DIR, fileName);
  if (!existsSync(abs)) {
    console.warn(`⊘ übersprungen (Datei fehlt): ${abs}`);
    skipped++; continue;
  }
  const fieldKey = `vorteile.${idx}.group_image`;
  const buf = readFileSync(abs);
  const mime = fileName.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  const storagePath = `${PAGE}/${SECTION}/${fieldKey}/desktop/${Date.now()}-${fileName}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buf, { cacheControl: "3600", upsert: false, contentType: mime });
  if (upErr) {
    console.error(`✗ Upload ${fieldKey}: ${upErr.message}`);
    fail++; continue;
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const { data, error: rpcErr } = await supabase.rpc("rpc_admin_upsert_asset", {
    p_page_key: PAGE,
    p_section_key: SECTION,
    p_field_key: fieldKey,
    p_storage_path: storagePath,
    p_public_url: pub.publicUrl,
    p_file_name: fileName,
    p_mime_type: mime,
    p_asset_role: "image",
    p_viewport: "desktop",
  });
  if (rpcErr || !data?.success) {
    console.error(`✗ RPC ${fieldKey}:`, rpcErr?.message ?? data?.error);
    fail++; continue;
  }

  for (const locale of ["de", "en"]) {
    const alt = locale === "de"
      ? `Gebietskarte Vertriebsregion ${regionDe}`
      : `Territory map sales region ${regionEn}`;
    await supabase.rpc("rpc_admin_update_asset_alt", {
      p_asset_id: data.asset_id,
      p_locale: locale,
      p_value: alt,
    });
  }
  console.log(`✓ ${fieldKey} → ${fileName}`);
  ok++;
}
console.log(`Fertig: ${ok} ok, ${fail} Fehler, ${skipped} übersprungen`);
