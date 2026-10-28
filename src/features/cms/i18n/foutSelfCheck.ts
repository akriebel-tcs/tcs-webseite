/**
 * FOUT-Selbstcheck (Flash Of Untranslated Text) — nur DEV.
 *
 * Idee:
 * 1. VOR dem CMS-Overlay snapshotten wir alle i18n-JSON-Bundles als Baseline.
 * 2. NACH dem Overlay vergleichen wir Bundle für Bundle und sammeln genau die
 *    String-Werte, die das CMS überschrieben hat (JSON-Wert ≠ DB-Wert).
 *    Diese Strings dürfen auf der Website niemals sichtbar sein – würden sie
 *    auftauchen, wäre der Boot zu früh gelaufen (= FOUT).
 * 3. Direkt nach dem ersten Paint (zwei rAFs) und ein zweites Mal nach
 *    Network-Idle (~1500 ms) scannen wir `document.body.innerText` auf jeden
 *    dieser Strings und melden Treffer als `console.error` mit klarer
 *    Diagnose: welcher Namespace / Pfad, alter JSON-Wert, neuer DB-Wert.
 *
 * Im Produktiv-Build wird die Funktion nicht aufgerufen.
 */

import type { i18n as I18nType } from "i18next";
import { I18N_NAMESPACES } from "@/i18n";
import type { AppLocale } from "@/i18n/locale";

type Locale = AppLocale;

interface FoutCandidate {
  namespace: string;
  path: string;        // dotted key path innerhalb des Bundles
  jsonValue: string;   // alter JSON-Wert (darf nicht erscheinen)
  dbValue: string;     // erwarteter DB-Wert
}

/**
 * Snapshot eines i18n-Bundles als (path → string)-Map.
 */
function flatten(node: unknown, prefix = "", out: Map<string, string> = new Map()): Map<string, string> {
  if (node == null) return out;
  if (typeof node === "string") {
    out.set(prefix, node);
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => flatten(v, prefix ? `${prefix}.${i}` : String(i), out));
    return out;
  }
  if (typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
  }
  return out;
}

/**
 * Erstellt einen Snapshot aller relevanten Namespaces. Aufruf VOR
 * `applyCmsOverlay`, damit wir den reinen JSON-Stand haben.
 */
export function snapshotBaseline(i18n: I18nType, locale: Locale): Map<string, Map<string, string>> {
  const result = new Map<string, Map<string, string>>();
  for (const ns of I18N_NAMESPACES) {
    const bundle = i18n.getResourceBundle(locale, ns) as unknown;
    if (!bundle) continue;
    // Tief klonen, damit Overlay-Mutationen die Baseline nicht verändern.
    const cloned = JSON.parse(JSON.stringify(bundle));
    result.set(ns, flatten(cloned));
  }
  return result;
}

/**
 * Bestimmt nach dem Overlay alle Strings, die wirklich vom CMS ersetzt wurden.
 */
export function diffOverlayed(
  i18n: I18nType,
  locale: Locale,
  baseline: Map<string, Map<string, string>>,
): FoutCandidate[] {
  const candidates: FoutCandidate[] = [];
  for (const [ns, baseFlat] of baseline) {
    const after = i18n.getResourceBundle(locale, ns) as unknown;
    if (!after) continue;
    const afterFlat = flatten(after);
    for (const [path, jsonValue] of baseFlat) {
      const dbValue = afterFlat.get(path);
      if (dbValue != null && dbValue !== jsonValue && jsonValue.trim().length >= 4) {
        candidates.push({ namespace: ns, path, jsonValue, dbValue });
      }
    }
  }
  return candidates;
}

const SCAN_DELAYS_MS = [0, 1500];

/**
 * Plant zwei Scans des sichtbaren DOM-Textes und meldet FOUT-Treffer.
 */
export function scheduleFoutScan(candidates: FoutCandidate[]): void {
  if (candidates.length === 0) return;

  const seen = new Set<string>();

  const scan = (label: string) => {
    const text = document.body?.innerText ?? "";
    if (!text) return;
    const hits: FoutCandidate[] = [];
    for (const c of candidates) {
      const key = `${c.namespace}|${c.path}`;
      if (seen.has(key)) continue;
      // Nur als Treffer werten, wenn der JSON-Wert auftaucht UND der DB-Wert
      // (noch) nicht – sonst zeigt die Seite bereits den korrekten Wert.
      if (text.includes(c.jsonValue) && !text.includes(c.dbValue)) {
        seen.add(key);
        hits.push(c);
      }
    }
    if (hits.length > 0) {
      // eslint-disable-next-line no-console
      console.error(
        `[FOUT-Check][${label}] ${hits.length} i18n-JSON-Wert(e) sichtbar, obwohl DB-Wert vorliegt:`,
        hits.map((h) => ({
          ns: h.namespace,
          path: h.path,
          json: h.jsonValue.slice(0, 80),
          db: h.dbValue.slice(0, 80),
        })),
      );
    } else {
      // eslint-disable-next-line no-console
      console.info(`[FOUT-Check][${label}] OK – keine i18n-JSON-Werte mehr sichtbar (geprüft: ${candidates.length}).`);
    }
  };

  // Erster Scan: direkt nach dem ersten Paint (zwei rAFs absichern den Layout-Pass).
  requestAnimationFrame(() => requestAnimationFrame(() => scan("first-paint")));
  // Zweiter Scan: nach typischem Datenladen, um lazy gerenderte Inhalte zu erfassen.
  setTimeout(() => scan(`+${SCAN_DELAYS_MS[1]}ms`), SCAN_DELAYS_MS[1]);
}
