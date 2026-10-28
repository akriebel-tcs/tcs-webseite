#!/usr/bin/env node
/**
 * Schreibt die Links zur „Online-Visitenkarte“ der Vertriebs-Ansprechpartner
 * (Register „Vertrieb Deutschland“ auf /kontakt, Section
 * `vertrieb_register__vertrieb_de`) in das Textfeld
 * `vorteile.<n>.online_href` (DE + EN, gleicher Wert) sowie die Beschriftung
 * `online_label`.
 *
 * Quelle: https://www.tcsag.de/kontakt/vertrieb-in-deutschland/
 * Einträge 12 und 16 haben in der Quelle keine Online-Visitenkarte.
 *
 * Idempotent: erneuter Lauf überschreibt nur die Werte (kein Löschen).
 * Aufruf: `node scripts/sync/set-vertrieb-de-online-links.mjs`
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!URL || !KEY) {
  console.error("VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing");
  process.exit(1);
}
const supabase = createClient(URL, KEY);
const PAGE = "kontakt.root";
const SECTION = "vertrieb_register__vertrieb_de";

// [Eintrags-Nummer, Link] — Reihenfolge wie auf der Quellseite
const entries = [
  [1, "https://l.ead.me/tcs-gerald-gummert"],
  [2, "https://l.ead.me/tcsag_gkr"],
  [3, "https://l.ead.me/tcsag_tth"],
  [4, "https://l.ead.me/tcs_jkl"],
  [5, "https://l.ead.me/tcsag_burkhard_anders"],
  [6, "https://l.ead.me/tcs-frank-herzberg"],
  [7, "https://l.ead.me/tcs_emr"],
  [8, "https://l.ead.me/tcs_pkl"],
  [9, "https://l.ead.me/tcs_fvm"],
  [10, "https://l.ead.me/tcs-ag-karriere"],
  [11, "https://l.ead.me/TCS_WSI"],
  [13, "https://l.ead.me/tcs-baba-diallo"],
  [14, "https://l.ead.me/tcs-anna-rosenberger"],
  [15, "https://l.ead.me/tcs-anna-rosenberger"],
];

const labels = { de: "Online-Visitenkarte", en: "Online business card" };

let ok = 0;
let fail = 0;

async function setField(fieldKey, locale, value) {
  const { data, error } = await supabase.rpc("rpc_admin_update_section_field", {
    p_page_key: PAGE,
    p_section_key: SECTION,
    p_field_key: fieldKey,
    p_locale: locale,
    p_value: value,
  });
  if (error || (data && data.success === false)) {
    console.error(`✗ ${fieldKey} (${locale}):`, error?.message ?? data?.error);
    return false;
  }
  return true;
}

for (const [idx, href] of entries) {
  const fieldKey = `vorteile.${idx}.online_href`;
  let entryOk = true;
  for (const locale of ["de", "en"]) {
    if (!(await setField(fieldKey, locale, href))) entryOk = false;
  }
  if (entryOk) {
    ok++;
    console.log(`✓ ${fieldKey}`);
  } else fail++;
}

for (const locale of ["de", "en"]) {
  if (await setField("online_label", locale, labels[locale])) {
    console.log(`✓ online_label (${locale})`);
  } else fail++;
}

console.log(`\nFertig: ${ok} Einträge ok, ${fail} Fehler`);
if (fail > 0) process.exit(1);
