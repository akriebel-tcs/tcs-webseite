/**
 * Zentrale Sprachwahrheit für die gesamte Website.
 *
 * WICHTIG: Die Liste der Sprachen ist **nicht mehr im Code festgeschrieben**.
 * Führend ist die Tabelle `cms_locales` in CMS-Light (aktiv / öffentlich /
 * Reihenfolge / Rückfallsprache). Im Code stehen nur noch:
 *
 * - `BUNDLED_LOCALES`: Sprachen, für die statische Oberflächentexte
 *   (i18n-Ressourcen für Buttons, Formularhinweise) mitgeliefert werden.
 * - `DEFAULT_APP_LOCALE`: Deutsch als letzte Rückfallstufe.
 *
 * `AppLocale` ist deshalb ein Sprachcode (BCP-47-Grundform) und nicht mehr auf
 * „de | en | pl" begrenzt.
 */

/** Sprachcode, z. B. "de", "en", "pl", "hr". */
export type AppLocale = string;

/** Sprachen mit mitgelieferten statischen Oberflächentexten. */
export const BUNDLED_LOCALES = ["de", "en", "pl"] as const;

/** Historischer Name — bleibt als Alias für bestehende Aufrufer. */
export const APP_LOCALES = BUNDLED_LOCALES;

export const DEFAULT_APP_LOCALE: AppLocale = "de";

/** Kurz-/Langname für die mitgelieferten Sprachen (nur Anzeige-Hilfe). */
export const APP_LOCALE_LABELS: Record<string, { short: string; long: string }> = {
  de: { short: "DE", long: "Deutsch" },
  en: { short: "EN", long: "English" },
  pl: { short: "PL", long: "Polski" },
};

/**
 * Rückfallketten der mitgelieferten Sprachen. Für Sprachen aus der Datenbank
 * kommt die Kette aus `cms_locales.fallback_locale`
 * (siehe `src/i18n/localeRegistry.ts`).
 */
export const APP_LOCALE_FALLBACK: Record<string, readonly AppLocale[]> = {
  de: ["de"],
  en: ["en", "de"],
  pl: ["pl", "de"],
};

/**
 * Reduziert einen beliebigen i18next-/Browser-Sprachwert auf einen
 * Sprachcode in Grundform („en-US" → „en"). Leere Werte werden Deutsch.
 */
export function normalizeAppLocale(raw: string | undefined | null): AppLocale {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "") return DEFAULT_APP_LOCALE;
  const base = value.split(/[-_]/)[0];
  if (!/^[a-z]{2,3}$/.test(base)) return DEFAULT_APP_LOCALE;
  return base;
}

/** Rückfallkette zu einer Sprache (Code-Wissen; DB-Kette hat Vorrang). */
export function appLocaleChain(locale: AppLocale): readonly AppLocale[] {
  const known = APP_LOCALE_FALLBACK[locale];
  if (known) return known;
  return locale === DEFAULT_APP_LOCALE ? [DEFAULT_APP_LOCALE] : [locale, DEFAULT_APP_LOCALE];
}

/**
 * Wählt aus sprachspezifischen Werten (z. B. `label_de`, `label_en`,
 * `label_pl` oder einer Sprachkarte aus der Datenbank) den passenden aus:
 * gewünschte Sprache, dann Rückfallkette, dann irgendein gepflegter Wert,
 * sonst der Ersatztext.
 */
export function pickLocalizedValue(
  locale: AppLocale | null | undefined,
  values: Record<string, string | null | undefined>,
  fallback = "",
  chain?: readonly AppLocale[],
): string {
  const target = normalizeAppLocale(locale ?? undefined);
  for (const candidate of chain ?? appLocaleChain(target)) {
    const value = values[candidate];
    if (value && value.trim().length > 0) return value;
  }
  const de = values[DEFAULT_APP_LOCALE];
  if (de && de.trim().length > 0) return de;
  for (const value of Object.values(values)) {
    if (value && value.trim().length > 0) return value;
  }
  return fallback;
}
