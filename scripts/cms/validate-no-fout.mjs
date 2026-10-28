#!/usr/bin/env node
/**
 * Static-Contract-Check: stellt sicher, dass `src/main.tsx` die Reihenfolge
 * einhält, die FOUT (Flash Of Untranslated Text) verhindert.
 *
 * Geprüfte Eigenschaften:
 *   1. `applyCmsOverlay` wird vor `createRoot(...).render(...)` aufgerufen.
 *   2. Es gibt eine harte Notfall-Schranke (Promise.race mit setTimeout),
 *      damit der Boot bei Backend-Ausfall nicht blockiert.
 *   3. `createRoot(...).render(...)` steht innerhalb des Overlay-Boot-`then(...)`,
 *      d.h. nicht synchron auf Modul-Top-Level neben dem Overlay.
 *   4. Der DEV-FOUT-Selbstcheck (`scheduleFoutScan`) ist verdrahtet.
 *
 * Exit-Code 0 = OK, 1 = Vertragsverletzung (mit klarer Meldung).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FILE = resolve(process.cwd(), "src/main.tsx");
const src = readFileSync(FILE, "utf8");

const failures = [];

function require(condition, message) {
  if (!condition) failures.push(message);
}

// 1) Overlay wird aufgerufen.
require(/applyCmsOverlay\s*\(/.test(src), "applyCmsOverlay() wird in src/main.tsx nicht aufgerufen.");

// 2) Notfall-Schranke vorhanden.
require(
  /Promise\.race\s*\(\s*\[[\s\S]*applyCmsOverlay[\s\S]*setTimeout/.test(src),
  "Notfall-Timeout fehlt: Promise.race([applyCmsOverlay(...), setTimeout(..., N)]) muss in main.tsx vorhanden sein.",
);

// 3) createRoot().render() steht hinter Overlay-Boot-then.
//    Heuristik: das erste createRoot(...).render(...) muss NACH einem `overlayBoot.then(` stehen.
const renderIdx = src.search(/createRoot\s*\([\s\S]*?\)\s*\.render\s*\(/);
const thenIdx = src.indexOf("overlayBoot.then(");
require(renderIdx > -1, "createRoot(...).render(...) wurde in main.tsx nicht gefunden.");
require(thenIdx > -1, "overlayBoot.then(...) wurde in main.tsx nicht gefunden.");
require(
  thenIdx > -1 && renderIdx > -1 && renderIdx > thenIdx,
  "createRoot(...).render(...) muss INNERHALB von overlayBoot.then(...) stehen, nicht synchron auf Top-Level.",
);

// 4) FOUT-Selbstcheck verdrahtet.
require(
  /scheduleFoutScan\s*\(/.test(src) && /snapshotBaseline\s*\(/.test(src),
  "DEV-FOUT-Selbstcheck (snapshotBaseline + scheduleFoutScan) ist nicht in main.tsx verdrahtet.",
);

if (failures.length > 0) {
  console.error("❌ FOUT-Contract-Check FEHLGESCHLAGEN:");
  for (const f of failures) console.error("   - " + f);
  process.exit(1);
}

console.log("✅ FOUT-Contract-Check OK – Boot-Reihenfolge in src/main.tsx ist intakt.");
