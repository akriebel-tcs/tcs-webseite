#!/usr/bin/env node
/**
 * Lädt die Porträtfotos der Vertriebs-Ansprechpartner (Register „Vertrieb
 * Deutschland“ auf /kontakt, Section `vertrieb_register__vertriebsleitung`) in den
 * Storage-Bucket `cms-assets` und legt pro Eintrag ein aktives Asset im Slot
 * `vorteile.<n>.image` an (RPC `rpc_admin_upsert_asset`).
 *
 * Idempotent: bei erneutem Lauf wird die Vorgänger-Zeile desselben Slots
 * deaktiviert (nicht gelöscht).
 *
 * Aufruf: `node scripts/sync/upload-vertrieb-de-portraits.mjs`
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
const SECTION = "vertrieb_register__vertriebsleitung";
const DIR = process.env.PORTRAIT_DIR ?? "/tmp/vl-img";

// [Eintrags-Nummer, Dateiname, Name der Person]
const entries = [
  [1, "csm_LDR_2020_Web_c4f48051a5.png", "Lutz Diedrich"],
  [2, "csm_JKL_web_04.2020_ab884dff81.png", "Jens Knittel"],
  [3, "csm_SHG_2020_web_8c62246a11.png", "Sylvia Herzog"],
];

let ok = 0, fail = 0, skipped = 0;
for (const [idx, fileName, person] of entries) {
  const abs = resolve(DIR, fileName);
  if (!existsSync(abs)) {
    console.warn(`⊘ übersprungen (Datei fehlt): ${abs}`);
    skipped++; continue;
  }
  const fieldKey = `vorteile.${idx}.image`;
  const buf = readFileSync(abs);
  const storagePath = `${PAGE}/${SECTION}/${fieldKey}/desktop/${Date.now()}-${fileName}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buf, { cacheControl: "3600", upsert: false, contentType: "image/png" });
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
    p_mime_type: "image/png",
    p_asset_role: "image",
    p_viewport: "desktop",
  });
  if (rpcErr || !data?.success) {
    console.error(`✗ RPC ${fieldKey}:`, rpcErr?.message ?? data?.error);
    fail++; continue;
  }

  for (const locale of ["de", "en"]) {
    const alt = locale === "de" ? `Ansprechpartner ${person}` : `Contact person ${person}`;
    await supabase.rpc("rpc_admin_update_asset_alt", {
      p_asset_id: data.asset_id,
      p_locale: locale,
      p_value: alt,
    });
  }

  console.log(`✓ ${fieldKey} → ${person}`);
  ok++;
}
console.log(`\nFertig: ${ok} OK, ${fail} Fehler, ${skipped} übersprungen.`);
process.exit(fail ? 1 : 0);
