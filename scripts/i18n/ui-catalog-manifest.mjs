#!/usr/bin/env node
/**
 * Manifest der Bedienungstexte (UI-Katalog).
 *
 * Liest die gebündelten deutschen i18n-Dateien und erzeugt daraus die Liste der
 * übersetzbaren Bedienungstexte, die in CMS-Light als `ui_string`-Einheiten
 * geführt werden. Vorhandene Werte der in der Konfiguration genannten
 * Startsprachen (`seedLocales`, aktuell EN/PL/NL) werden als **Startwerte**
 * mitgegeben — sie dürfen in der Datenbank nie einen bereits vorhandenen
 * Zieltext ersetzen (das entscheidet die Datenbank, nicht dieses Skript).
 *
 * Aufrufe:
 *   node scripts/i18n/ui-catalog-manifest.mjs           # Manifest schreiben
 *   node scripts/i18n/ui-catalog-manifest.mjs --check    # nur prüfen (CI)
 *   node scripts/i18n/ui-catalog-manifest.mjs --sql out.sql  # Abgleich-SQL
 *
 * Bewusst NICHT im Katalog: Seiteninhalte (DB-first in CMS-Light),
 * Navigationsbeschriftungen, technische Werte (URLs, Slugs, IDs, Formatcodes,
 * Marken) und Entwicklerdiagnostik. Begründung je Namespace: Konfigurationsdatei.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const configPath = resolve(here, "ui-catalog.config.json");
const manifestPath = resolve(here, "ui-catalog.manifest.json");

const config = JSON.parse(readFileSync(configPath, "utf8"));
const technicalValueRe = config.technicalValuePatterns.map((p) => new RegExp(p, "u"));

function loadBundle(locale, ns) {
  const file = resolve(root, `src/i18n/locales/${locale}/${ns}.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

function flatten(value, prefix, out) {
  if (typeof value === "string") {
    out.set(prefix, value);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${prefix}.${index}`, out));
    return out;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
  }
  return out;
}

function matchesPrefix(key, prefixes) {
  return prefixes.some((p) => p === "*" || key === p || key.startsWith(`${p}.`));
}

function excludedReason(key, value) {
  const segments = key.split(".");
  const last = segments[segments.length - 1];
  if (segments.some((s) => config.excludedKeySegments.includes(s))) return "technischer_bereich";
  if (config.excludedKeySuffixes.includes(last)) return "technischer_schluessel";
  const text = String(value ?? "").trim();
  if (text === "") return "leer";
  if (config.technicalValueExact.includes(text)) return "marke_oder_code";
  if (technicalValueRe.some((re) => re.test(text))) return "technischer_wert";
  if (!/[A-Za-zÄÖÜäöüß]/.test(text)) return "kein_text";
  return null;
}

export function buildManifest() {
  const entries = [];
  const excluded = [];
  const seedCounts = {};
  for (const seed of config.seedLocales) seedCounts[seed] = 0;

  for (const [ns, rules] of Object.entries(config.namespaces)) {
    const de = loadBundle(config.sourceLocale, ns);
    if (!de) throw new Error(`Deutsche Sprachdatei fehlt: ${ns}`);
    const flatDe = flatten(de, "", new Map());
    const seeds = {};
    for (const seed of config.seedLocales) {
      const bundle = loadBundle(seed, ns);
      seeds[seed] = bundle ? flatten(bundle, "", new Map()) : new Map();
    }

    for (const [key, value] of flatDe) {
      if (!matchesPrefix(key, rules.include)) continue;
      if (matchesPrefix(key, rules.exclude ?? [])) {
        excluded.push({ namespace: ns, key, reason: "konfiguration_ausgeschlossen" });
        continue;
      }
      const reason = excludedReason(key, value);
      if (reason) {
        excluded.push({ namespace: ns, key, reason });
        continue;
      }
      const seedValues = {};
      for (const seed of config.seedLocales) {
        const candidate = seeds[seed].get(key);
        if (typeof candidate === "string" && candidate.trim() !== "" && candidate !== value) {
          seedValues[seed] = candidate;
          seedCounts[seed] += 1;
        }
      }
      entries.push({ namespace: ns, key, de: value, seed: seedValues });
    }
  }

  entries.sort((a, b) => a.namespace.localeCompare(b.namespace) || a.key.localeCompare(b.key));
  excluded.sort((a, b) => a.namespace.localeCompare(b.namespace) || a.key.localeCompare(b.key));

  return {
    version: hashOf(entries),
    source_locale: config.sourceLocale,
    counts: { entries: entries.length, excluded: excluded.length, seeds: seedCounts },
    namespaces: Object.keys(config.namespaces),
    entries,
    excluded,
  };
}

function hashOf(entries) {
  // Kurzer, stabiler Fingerabdruck über Schlüssel und deutsche Quelltexte.
  let h1 = 0x811c9dc5;
  for (const e of entries) {
    for (const ch of `${e.namespace}|${e.key}|${e.de}`) {
      h1 ^= ch.codePointAt(0);
      h1 = Math.imul(h1, 0x01000193) >>> 0;
    }
  }
  return `m${h1.toString(16)}-${entries.length}`;
}

function toSql(manifest) {
  const payload = JSON.stringify({
    version: manifest.version,
    entries: manifest.entries,
  }).replace(/'/g, "''");
  return `select public.rpc_admin_sync_ui_strings('${payload}'::jsonb);\n`;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const manifest = buildManifest();
  const args = process.argv.slice(2);
  const sqlIndex = args.indexOf("--sql");

  if (args.includes("--check")) {
    // Nur Zeilenenden werden vereinheitlicht (Windows CRLF = LF); Inhalt und
    // Form (Einrückung, Reihenfolge, Abschluss-Zeilenumbruch) bleiben streng.
    const normalizeLineEndings = (text) => text.replace(/\r\n/g, "\n");
    const current = existsSync(manifestPath)
      ? normalizeLineEndings(readFileSync(manifestPath, "utf8"))
      : "";
    const next = `${JSON.stringify(manifest, null, 2)}\n`;
    if (current !== next) {
      console.error(
        "UI-Katalog-Manifest ist nicht aktuell. Bitte `npm run i18n:ui-catalog` ausführen und die Änderung mitliefern.",
      );
      process.exit(1);
    }
    console.log(
      `UI-Katalog-Manifest aktuell: ${manifest.counts.entries} Bedienungstexte, ${manifest.counts.excluded} bewusst ausgeschlossen.`,
    );
    process.exit(0);
  }

  if (sqlIndex >= 0) {
    const out = args[sqlIndex + 1] ?? "/tmp/ui-catalog-sync.sql";
    writeFileSync(out, toSql(manifest));
    console.log(`Abgleich-SQL geschrieben: ${out}`);
    process.exit(0);
  }

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `Manifest geschrieben (${manifest.version}): ${manifest.counts.entries} Bedienungstexte, ` +
      `${manifest.counts.excluded} ausgeschlossen, Startwerte ` +
      Object.entries(manifest.counts.seeds)
        .map(([l, n]) => `${l}=${n}`)
        .join(", "),
  );
}
