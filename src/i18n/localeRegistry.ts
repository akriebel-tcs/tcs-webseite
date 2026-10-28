/**
 * Sprachregister aus der Datenbank (`cms_locales`).
 *
 * Einzige Wahrheit für: aktiv, öffentlich sichtbar, Reihenfolge und
 * Rückfallsprache. Es gibt keine zweite Sprachliste im Code — der Code kennt
 * nur Deutsch als letzte Rückfallstufe.
 *
 * Wird einmal je Seitenaufruf geladen und im Modul zwischengespeichert.
 */

import { DEFAULT_APP_LOCALE, normalizeAppLocale, type AppLocale } from "@/i18n/locale";

export interface LocaleRegistryRow {
  locale: AppLocale;
  label_de: string;
  label_native: string;
  is_source: boolean;
  is_active: boolean;
  is_public: boolean;
  fallback_locale: string | null;
  sort_order: number;
}

let cache: LocaleRegistryRow[] | null = null;
let inflight: Promise<LocaleRegistryRow[]> | null = null;

export function cachedLocaleRegistry(): LocaleRegistryRow[] | null {
  return cache;
}

/** Alle Sprachen aus der Datenbank (inkl. interner, nicht öffentlicher). */
export async function readLocaleRegistry(): Promise<LocaleRegistryRow[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { getCmsSupabaseClient } = await import("@/lib/cmsSupabase/client");
    const supabase = getCmsSupabaseClient();
    const { data, error } = await supabase
      .from("cms_locales")
      .select("locale,label_de,label_native,is_source,is_active,is_public,fallback_locale,sort_order")
      .order("sort_order");
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    cache = rows
      .map((r) => ({
        locale: String(r.locale ?? ""),
        label_de: String(r.label_de ?? r.locale ?? ""),
        label_native: String(r.label_native ?? r.locale ?? ""),
        is_source: Boolean(r.is_source),
        is_active: Boolean(r.is_active),
        is_public: Boolean(r.is_public),
        fallback_locale: (r.fallback_locale as string | null) ?? null,
        sort_order: Number(r.sort_order ?? 100),
      }))
      .filter((r) => r.locale !== "" && normalizeAppLocale(r.locale) === r.locale);
    return cache;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** Cache verwerfen (nach Sprachanlage oder Sichtbarkeitsänderung). */
export function resetLocaleRegistryCache(): void {
  cache = null;
}

/**
 * Rückfallkette einer Sprache aus dem Register: Sprache → konfigurierte
 * Rückfallsprache(n) → Deutsch. Schleifen werden abgebrochen.
 */
export function localeChainFromRegistry(
  locale: AppLocale,
  rows: LocaleRegistryRow[] | null,
): AppLocale[] {
  const chain: AppLocale[] = [];
  let current: string | null = locale;
  const seen = new Set<string>();
  while (current && !seen.has(current) && chain.length < 6) {
    seen.add(current);
    chain.push(current);
    current = rows?.find((r) => r.locale === current)?.fallback_locale ?? null;
  }
  if (!chain.includes(DEFAULT_APP_LOCALE)) chain.push(DEFAULT_APP_LOCALE);
  return chain;
}
