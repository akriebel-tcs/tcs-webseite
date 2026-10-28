#!/usr/bin/env node
/**
 * Lädt die VCF-Visitenkarten (vCard-Dateien) der Vertriebs-Ansprechpartner
 * (Register „Vertrieb Deutschland“ auf /kontakt, Section
 * `vertrieb_register__vertrieb_de`) in den Storage-Bucket `cms-assets` und
 * schreibt die öffentliche Datei-Adresse pro Eintrag in das Textfeld
 * `vorteile.<n>.vcf_href` (DE + EN, gleicher Wert).
 *
 * Idempotent: bei erneutem Lauf wird die Datei neu hochgeladen und das Feld
 * überschrieben (kein Löschen von Zeilen).
 *
 * Vorher: VCF-Dateien nach $VCF_DIR (Standard /tmp/vcf) laden.
 * Aufruf: `node scripts/sync/upload-vertrieb-de-vcf.mjs`
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
const DIR = process.env.VCF_DIR ?? "/tmp/vcf";

// [Eintrags-Nummer, Dateiname]
const entries = [
  [1, "TCSAG_Gerald_Gummert.vcf"],
  [2, "TCSAG_George_Krueger.vcf"],
  [3, "TCSAG_Thomas_Tschiersch.vcf"],
  [4, "TCSAG_Jens_Knittel.vcf"],
  [5, "TCSAG_Burkhard_Anders.vcf"],
  [6, "TCSAG_Frank_Herzberg.vcf"],
  [7, "TCSAG_Eric_Mueller.vcf"],
  [8, "TCSAG_Peter_Kuschel.vcf"],
  [9, "TCSAG_Alexander_Neuhold.vcf"],
  [10, "TCSAG_Soeren_Blunk.vcf"],
  [11, "TCSAG_Wilhelm_Salewski.vcf"],
  [13, "TCSAG_Baba_Diallo.vcf"],
  [14, "TCSAG_Anna_Rosenberger.vcf"],
  [15, "TCSAG_Anna_Rosenberger.vcf"],
];

let ok = 0, fail = 0, skipped = 0;
for (const [idx, fileName] of entries) {
  const abs = resolve(DIR, fileName);
  if (!existsSync(abs)) {
    console.warn(`⊘ übersprungen (Datei fehlt): ${abs}`);
    skipped++; continue;
  }
  const fieldKey = `vorteile.${idx}.vcf_href`;
  const buf = readFileSync(abs);
  const storagePath = `${PAGE}/${SECTION}/vcf/${idx}-${fileName}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buf, {
      cacheControl: "3600",
      upsert: true,
      contentType: "text/vcard",
    });
  if (upErr) {
    console.error(`✗ Upload ${fieldKey}: ${upErr.message}`);
    fail++; continue;
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  let entryOk = true;
  for (const locale of ["de", "en"]) {
    const { data, error } = await supabase.rpc("rpc_admin_update_section_field", {
      p_page_key: PAGE,
      p_section_key: SECTION,
      p_field_key: fieldKey,
      p_locale: locale,
      p_value: pub.publicUrl,
    });
    if (error || (data && data.success === false)) {
      console.error(`✗ Feld ${fieldKey} (${locale}):`, error?.message ?? data?.error);
      entryOk = false;
    }
  }
  if (entryOk) { ok++; console.log(`✓ ${fieldKey}`); } else fail++;
}

console.log(`\nFertig: ${ok} ok, ${fail} Fehler, ${skipped} übersprungen`);
if (fail > 0) process.exit(1);
