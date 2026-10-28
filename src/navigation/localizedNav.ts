/**
 * Sprachauswahl für Navigations- und Seitentexte.
 *
 * Reihenfolge der Quellen:
 * 1. vertikale Übersetzungstabellen (Sprachkarte `labels` / `descriptions` /
 *    `titles` aus den Public-RPCs bzw. verschachtelten Abfragen),
 * 2. Übergangs-Rückfall auf die alten Sprachspalten (`label_de`, `label_en`,
 *    `label_pl` …),
 * 3. Rückfallkette aus `cms_locales.fallback_locale`, zuletzt Deutsch.
 *
 * Die Sprachliste selbst steht nie im Code — sie kommt aus `cms_locales`.
 */

import { pickLocalizedValue, type AppLocale } from "@/i18n/locale";
import { cachedLocaleRegistry, localeChainFromRegistry } from "@/i18n/localeRegistry";

export type LocaleMap = Record<string, string | null | undefined> | null | undefined;

export function pickNavText(
  locale: AppLocale | string | null | undefined,
  args: { map?: LocaleMap; legacy?: LocaleMap; fallback?: string },
): string {
  const values: Record<string, string | null | undefined> = { ...(args.legacy ?? {}) };
  for (const [key, value] of Object.entries(args.map ?? {})) {
    if (value && String(value).trim().length > 0) values[key] = value;
  }
  const chain = localeChainFromRegistry(String(locale ?? "de"), cachedLocaleRegistry());
  return pickLocalizedValue(locale ?? undefined, values, args.fallback ?? "", chain);
}

/** Sprachkarte aus einer verschachtelten Abfrage (Zeilenliste) bauen. */
export function localeMapFromRows(
  rows: Array<{ locale: string | null; [key: string]: unknown }> | null | undefined,
  field: string,
): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  for (const row of rows ?? []) {
    if (!row?.locale) continue;
    const value = row[field];
    if (typeof value === "string" && value.trim().length > 0) map[row.locale] = value;
  }
  return map;
}
