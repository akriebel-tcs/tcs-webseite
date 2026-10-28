/**
 * Sprache in der Adresse (`?lang=`) — eine einzige Wahrheit für Bedienoberfläche
 * und Produktdaten.
 *
 * Regeln:
 * - Beim ersten Laden ist ein gültiger `lang`-Parameter autoritativ. Ein alter
 *   gemerkter Wert (localStorage) darf ihn nicht überschreiben.
 * - Jeder Klick im Sprachmenü schreibt den Parameter in die aktuelle Adresse.
 * - Zurück/Vorwärts und Neuladen stellen genau die Sprache aus der Adresse her.
 */

import { normalizeAppLocale, type AppLocale } from "./locale";

export const LANG_PARAM = "lang";
export const LOCALE_STORAGE_KEY = "i18nextLng";

/** Prüft, ob ein Wert überhaupt ein Sprachcode sein kann („nl", „nl-NL"). */
export function isPlausibleLocale(raw: string | null | undefined): boolean {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "") return false;
  return /^[a-z]{2,3}([-_][a-z0-9]{2,8})*$/.test(value);
}

/** Sprachcode aus einer Adresse (Grundform) oder `null`. */
export function readLocaleFromSearch(search: string): AppLocale | null {
  try {
    const raw = new URLSearchParams(search).get(LANG_PARAM);
    if (!isPlausibleLocale(raw)) return null;
    return normalizeAppLocale(raw);
  } catch {
    return null;
  }
}

/** Sprachcode aus der aktuellen Adresse oder `null`. */
export function readUrlLocale(): AppLocale | null {
  if (typeof window === "undefined") return null;
  return readLocaleFromSearch(window.location.search);
}

/** Gemerkte Sprache (localStorage) — nur nachrangig zur Adresse. */
export function readStoredLocale(): AppLocale | null {
  try {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isPlausibleLocale(stored) ? normalizeAppLocale(stored) : null;
  } catch {
    return null;
  }
}

export function storeLocale(locale: AppLocale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // localStorage kann fehlen (privater Modus) — kein Fehlerfall.
  }
}

/**
 * Baut den Suchteil einer Adresse mit gesetztem `lang`-Parameter. Alle anderen
 * Parameter bleiben unverändert. Wird für den Router-Weg (`navigate`) benutzt.
 */
export function searchWithLocale(search: string, locale: AppLocale): string {
  const params = new URLSearchParams(search);
  params.set(LANG_PARAM, locale);
  const next = params.toString();
  return next === "" ? "" : `?${next}`;
}

/**
 * Schreibt `?lang=` in die aktuelle Adresse. `mode: "push"` erzeugt einen
 * Verlaufseintrag (Zurück führt zur vorherigen Sprache), `mode: "replace"`
 * korrigiert nur den aktuellen Eintrag.
 */
export function writeUrlLocale(
  locale: AppLocale,
  mode: "push" | "replace" = "push",
): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.get(LANG_PARAM) === locale) return;
  url.searchParams.set(LANG_PARAM, locale);
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (mode === "push") window.history.pushState(window.history.state, "", next);
  else window.history.replaceState(window.history.state, "", next);
}

/**
 * Startsprache: Adresse zuerst, dann gemerkter Wert. Ein gültiger
 * Adressparameter wird gleich gemerkt, damit beide Quellen übereinstimmen.
 */
export function resolveInitialLocale(fallback: AppLocale): AppLocale {
  const fromUrl = readUrlLocale();
  if (fromUrl) {
    storeLocale(fromUrl);
    return fromUrl;
  }
  return readStoredLocale() ?? fallback;
}
