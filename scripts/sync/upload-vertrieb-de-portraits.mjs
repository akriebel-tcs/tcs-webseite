#!/usr/bin/env node
/**
 * Lädt die Porträtfotos der Vertriebs-Ansprechpartner (Register „Vertrieb
 * Deutschland“ auf /kontakt, Section `vertrieb_register__vertrieb_de`) in den
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
const SECTION = "vertrieb_register__vertrieb_de";
const DIR = process.env.PORTRAIT_DIR ?? "/tmp/vd-img";

// [Eintrags-Nummer, Dateiname, Name der Person]
const entries = [
  [1, "csm_GGT_web_0182c86491.jpg", "Gerald Gummert"],
  [2, "csm_GKR_web_64087d8f16.jpg", "George Krüger"],
  [3, "csm_TTH_web_719a3c687a.jpg", "Thomas Tschiersch"],
  [4, "csm_JKL_web_fee3955968.jpg", "Jens Knittel"],
  [5, "csm_BAS_web_9f3cc8b3f6.jpg", "Burkhard Anders"],
  [6, "csm_FHG_web_c04a3ba0a0.jpg", "Frank Herzberg"],
  [7, "csm_EMR_web_29fc7f2324.jpg", "Eric Müller"],
  [8, "csm_PKL_web_cf2da0a88a.jpg", "Peter Kuschel"],
  [9, "csm_AND_web_9dc042e177.jpg", "Alexander Neuhold"],
  [10, "csm_SBK_web_e071c2d957.jpg", "Sören Blunk"],
  [11, "csm_WSI_web_03df473ffb.jpg", "Wilhelm Salewski"],
  [13, "csm_BDO_web_12f75ddfba.jpg", "Baba Diallo"],
  [14, "csm_ARR_web_489b32f475.jpg", "Anna Rosenberger"],
  [15, "csm_ARR_web_489b32f475.jpg", "Anna Rosenberger"],
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
    .upload(storagePath, buf, { cacheControl: "3600", upsert: false, contentType: "image/jpeg" });
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
    p_mime_type: "image/jpeg",
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
