/**
 * Abgleich des Bedienungstext-Katalogs mit CMS-Light — Server-/CI-Skript.
 *
 * Sicherheitsmodell:
 * - Der schreibende Datenbankvertrag `rpc_admin_sync_ui_strings` ist
 *   service_role-only (PUBLIC/anon/authenticated haben keine Rechte).
 * - Dieses Skript ruft ihn daher NICHT direkt auf, sondern ausschließlich über
 *   den geschützten Serverdienst `cms-translation-run`
 *   (`action: "sync_ui_catalog"`).
 * - Freigabe über das bestehende serverseitige Geheimnis
 *   `CMS_TRANSLATION_GLOBAL_TOKEN`. Es wird nur aus der Prozessumgebung
 *   gelesen, niemals aus `.env`/`VITE_*` und niemals ausgegeben.
 * - Es wird kein Service-Role-Schlüssel und kein anderes Geheimnis im
 *   Frontend/VITE-Environment benötigt oder verwendet.
 *
 * Der Abgleich ist wiederholbar und ausschließlich additiv:
 * - neue deutsche Schlüssel werden angelegt,
 * - abweichende deutsche Quelltexte werden NICHT überschrieben, sondern nur
 *   als Konflikt berichtet,
 * - entfallene Schlüssel bleiben unverändert (keine Stilllegung),
 * - vorhandene englische/polnische/niederländische Werte werden nur dort als
 *   Startwert eingefügt, wo in der Datenbank noch keine Zeile steht; bereits
 *   vorhandene Zieltexte — auch bewusst leere — bleiben unberührt,
 * - neu eingefügte Startwerte erhalten keine Freigabe.
 *
 * Es wird kein Übersetzungslauf gestartet.
 *
 * Standard ist die reine Vorschau. Schreiben nur mit `--apply`:
 *   CMS_TRANSLATION_GLOBAL_TOKEN=… node scripts/i18n/ui-catalog-sync.mjs
 *   CMS_TRANSLATION_GLOBAL_TOKEN=… node scripts/i18n/ui-catalog-sync.mjs --apply
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "../..");

function readEnvFile() {
  try {
    const raw = readFileSync(path.join(root, ".env"), "utf8");
    const out = {};
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

// Adresse/öffentlicher Schlüssel dürfen aus `.env` kommen (beides ist
// öffentlich). Das Freigabewort kommt ausschließlich aus der Prozessumgebung.
const publicEnv = { ...readEnvFile(), ...process.env };
const url = publicEnv.VITE_SUPABASE_URL;
const anonKey = publicEnv.VITE_SUPABASE_PUBLISHABLE_KEY;
const token = process.env.CMS_TRANSLATION_GLOBAL_TOKEN?.trim();

if (!url || !anonKey) {
  console.error("Adresse der CMS-Datenbank fehlt (VITE_SUPABASE_URL / _PUBLISHABLE_KEY).");
  process.exit(2);
}

if (!token) {
  console.error(
    [
      "Freigabewort fehlt: CMS_TRANSLATION_GLOBAL_TOKEN ist in dieser Umgebung nicht gesetzt.",
      "Der Katalogabgleich läuft nur über den geschützten Serverdienst und verlangt dieses",
      "serverseitige Geheimnis (Projekteinstellungen → Secrets, bzw. CI-Secret).",
      "Aufruf: CMS_TRANSLATION_GLOBAL_TOKEN=… node scripts/i18n/ui-catalog-sync.mjs",
    ].join("\n"),
  );
  process.exit(2);
}

const manifest = JSON.parse(
  readFileSync(path.join(root, "scripts/i18n/ui-catalog.manifest.json"), "utf8"),
);

// Protokollstand, den dieses Skript beherrscht. Stimmt er nicht mit
// Serverdienst UND Datenbank überein, wird nicht abgeglichen.
const PROTOCOL_VERSION = 2;

// Unbekannte Schalter werden abgelehnt — auch zusammen mit --apply.
const args = process.argv.slice(2);
const unknown = args.filter((a) => a !== "--apply");
if (unknown.length > 0) {
  console.error(`Unbekannte Angabe: ${unknown.join(" ")}. Erlaubt ist nur --apply.`);
  process.exit(2);
}

// Standard: reine Vorschau. Geschrieben wird nur mit ausdrücklichem --apply.
const apply = args.includes("--apply");
const dryRun = !apply;

async function call(payload) {
  const res = await fetch(`${url}/functions/v1/cms-translation-run`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ authorization_code: token, ...payload }),
  });
  const body = await res.json().catch(() => null);
  return { res, body };
}

// 1) Protokollnachweis VOR jedem Abgleich (lesend). Ein alter Serverdienst
//    kennt diese Aktion nicht — dann wird nichts geschrieben.
const probe = await call({ action: "ui_catalog_sync_capabilities" });
const caps = probe.body?.capabilities;
if (!probe.res.ok || !caps || typeof caps !== "object") {
  console.error(
    [
      `Protokollstand nicht bestätigt (HTTP ${probe.res.status}): ` +
        JSON.stringify(probe.body?.message ?? probe.body?.error ?? probe.body),
      "Es wurde NICHTS geschrieben. Mögliche Ursache: alter Serverdienst oder alte Datenbank.",
    ].join("\n"),
  );
  process.exit(1);
}
if (
  Number(caps.protocol_version) !== PROTOCOL_VERSION ||
  Number(probe.body?.edge_protocol_version) !== PROTOCOL_VERSION ||
  caps.writes !== "insert_only"
) {
  console.error(
    `Protokollstand passt nicht (Datenbank ${String(caps.protocol_version)}, Dienst ` +
      `${String(probe.body?.edge_protocol_version)}, erwartet ${PROTOCOL_VERSION}). ` +
      "Es wurde NICHTS geschrieben.",
  );
  process.exit(1);
}
if (apply && caps.trigger_suppression_supported !== true) {
  console.error(
    "Der Trigger-Vertrag zur Unterdrückung der Übersetzungsaufträge fehlt in der Datenbank. " +
      "Es wurde NICHTS geschrieben.",
  );
  process.exit(1);
}

// 2) Eigentlicher Abgleich.
const { res, body } = await call({
  action: "sync_ui_catalog",
  dry_run: dryRun,
  manifest: { version: manifest.version, entries: manifest.entries },
});
const sync = body?.sync;

if (!res.ok || sync?.success !== true) {
  const hint =
    body?.error === "global_authorization_invalid" || body?.error === "global_authorization_not_configured"
      ? "\nHinweis: Das Freigabewort stimmt nicht mit dem serverseitigen Secret überein."
      : "";
  console.error(
    `Abgleich fehlgeschlagen (HTTP ${res.status}): ${JSON.stringify(body?.message ?? body?.error ?? body)}${hint}`,
  );
  process.exit(1);
}

// 3) Widersprüchliche Antwort: kein Erfolg behaupten, kein „kein Schreiben".
//    `applied` MUSS ausdrücklich das Gegenteil des angeforderten Modus sein.
//    Fehlt die Angabe oder ist sie `null`, ist der Zustand unklar.
const mismatch =
  body?.dry_run !== dryRun ||
  sync?.dry_run !== dryRun ||
  sync?.applied !== !dryRun ||
  Number(sync?.protocol_version) !== PROTOCOL_VERSION;
if (mismatch) {
  console.error(
    [
      "Die Antwort widerspricht dem angeforderten Modus. Der Zustand der Datenbank ist unklar.",
      `angefordert: dry_run=${dryRun}`,
      `Antwort: ${JSON.stringify({
        dry_run: body?.dry_run,
        sync_dry_run: sync?.dry_run,
        applied: sync?.applied,
        protocol_version: sync?.protocol_version,
      })}`,
      "Bitte den Katalogstand von Hand zurücklesen, bevor erneut abgeglichen wird.",
    ].join("\n"),
  );
  process.exit(1);
}

if (dryRun) {
  console.log(
    "Nur Vorschau (kein Schreiben). Zum Anwenden erneut mit --apply aufrufen:\n" +
      "  CMS_TRANSLATION_GLOBAL_TOKEN=… node scripts/i18n/ui-catalog-sync.mjs --apply",
  );
} else {
  // Erst prüfen, dann berichten: sonst stünde „kein Übersetzungslauf" in der
  // Ausgabe, obwohl die Warnung unmittelbar danach widerspricht.
  const suppressed = body?.run_started !== true && sync?.own_import_autopilot_suppressed === true;
  if (!suppressed) {
    console.error(
      "Bedienungstext-Katalog abgeglichen, ABER der eigene Import wurde nicht als " +
        "unterdrückt bestätigt. Bitte Übersetzungsaufträge prüfen.",
    );
    process.exitCode = 1;
  } else {
    console.log("Bedienungstext-Katalog abgeglichen (nur Einfügen, kein Übersetzungslauf).");
    console.log(
      "Hinweis: Die Aussage gilt nur für diesen Import. Über gleichzeitige Vorgänge " +
        "außerhalb dieser Transaktion wird nichts behauptet.",
    );
  }
}
console.log(JSON.stringify(sync, null, 2));


