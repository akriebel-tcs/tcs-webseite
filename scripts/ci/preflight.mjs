#!/usr/bin/env node
/**
 * Lokale Abschlussprüfung („cms:preflight").
 *
 * Führt die bereits vorhandenen lokalen Prüfungen streng nacheinander aus und
 * bricht sofort ab, sobald eine Prüfung einen Exitcode ungleich 0 liefert oder
 * gar nicht startet. Der Exitcode der fehlgeschlagenen Prüfung wird
 * unverändert weitergegeben.
 *
 * Bewusste Grenzen (nicht abgedeckt, bleiben separat verpflichtend):
 * - keine datenbankabhängigen Prüfungen (Wahrheits-Check, Spiegel-Audit,
 *   Renderability-Gate, Sprach-/Coverage-Messungen),
 * - keine mutierenden Skripte (`scripts/sync/*`, Export, Migrationen),
 * - keine Browser-/Preview-Abnahme,
 * - keine Veröffentlichung.
 *
 * Ein grüner Lauf ist also KEINE Gesamtabnahme, sondern nur der lokale,
 * offline reproduzierbare Teil.
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

/**
 * Reihenfolge ist Teil des Vertrags: schnell/statisch zuerst, Build zuletzt.
 *
 * Wichtig zur Typprüfung: `tsconfig.json` ist eine reine Verweis-Datei
 * (`files: []` + `references`). Ein `tsc --noEmit` ohne `-p` prüft damit
 * faktisch NICHTS und wäre trotzdem grün. Deshalb werden die beiden echten
 * Konfigurationen ausdrücklich einzeln geprüft — App und Node-/Build-Seite.
 */
export const PREFLIGHT_STEPS = [
  {
    name: "Typprüfung App (tsconfig.app.json)",
    command: "npx",
    args: ["tsc", "-p", "tsconfig.app.json", "--noEmit"],
  },
  {
    name: "Typprüfung Node/Build (tsconfig.node.json)",
    command: "npx",
    args: ["tsc", "-p", "tsconfig.node.json", "--noEmit"],
  },
  {
    name: "Unit-Tests",
    command: "npx",
    args: ["vitest", "run"],
  },

  {
    name: "Sprachvertrag (i18n:contract)",
    command: "npm",
    args: ["run", "i18n:contract"],
  },
  {
    name: "Build",
    command: "npm",
    args: ["run", "build"],
  },
];

/** Standard-Ausführung: erbt stdio, damit die Ausgabe der Prüfung sichtbar bleibt. */
function defaultRun(step) {
  return spawnSync(step.command, step.args, {
    stdio: "inherit",
    shell: process.platform === "win32" && ["npm", "npx"].includes(step.command),
  });
}

/**
 * Führt die Schritte nacheinander aus.
 *
 * @returns {{ok: boolean, exitCode: number, failedStep: string|null, reason: string|null, executed: string[]}}
 */
export function runPreflight(steps = PREFLIGHT_STEPS, options = {}) {
  const run = options.run ?? defaultRun;
  const log = options.log ?? ((message) => console.log(message));
  const executed = [];

  for (const step of steps) {
    log(`▶ ${step.name}  (${step.command} ${step.args.join(" ")})`);
    executed.push(step.name);

    let result;
    try {
      result = run(step);
    } catch (error) {
      log(`✖ ${step.name}: Prüfung konnte nicht gestartet werden — ${error?.message ?? error}`);
      return { ok: false, exitCode: 1, failedStep: step.name, reason: "start_error", executed };
    }

    if (!result || result.error) {
      const message = result?.error?.message ?? "unbekannter Startfehler";
      log(`✖ ${step.name}: Prüfung konnte nicht gestartet werden — ${message}`);
      return { ok: false, exitCode: 1, failedStep: step.name, reason: "start_error", executed };
    }

    if (result.signal) {
      log(`✖ ${step.name}: abgebrochen durch Signal ${result.signal}`);
      return { ok: false, exitCode: 1, failedStep: step.name, reason: "signal", executed };
    }

    if (result.status !== 0) {
      const exitCode = typeof result.status === "number" ? result.status : 1;
      log(`✖ ${step.name}: fehlgeschlagen (Exitcode ${exitCode}) — Abbruch, keine weiteren Prüfungen.`);
      return { ok: false, exitCode, failedStep: step.name, reason: "failed", executed };
    }

    log(`✔ ${step.name}`);
  }

  log("Alle lokalen Prüfungen grün. Struktur-, Datenbank- und Preview-Abnahme bleibt separat verpflichtend.");
  return { ok: true, exitCode: 0, failedStep: null, reason: null, executed };
}

/**
 * Erkennt, ob dieses Modul direkt als Skript gestartet wurde.
 *
 * Wichtig: `new URL("file://" + pfad)` ist FALSCH für Pfade mit `#` (Fragment)
 * oder `%` (Prozentkodierung) — die Erkennung schlüge dort fehl und das Skript
 * würde still mit Exitcode 0 enden, ohne eine einzige Prüfung zu starten.
 * `pathToFileURL(resolve(...))` kodiert solche Zeichen korrekt.
 *
 * @param {string|undefined} argv1 `process.argv[1]`
 * @param {string} moduleUrl `import.meta.url`
 */
export function isDirectInvocation(argv1, moduleUrl) {
  if (!argv1) return false;
  try {
    return pathToFileURL(resolve(argv1)).href === moduleUrl;
  } catch {
    return false;
  }
}

if (isDirectInvocation(process.argv[1], import.meta.url)) {
  const result = runPreflight();
  process.exit(result.exitCode);
}
