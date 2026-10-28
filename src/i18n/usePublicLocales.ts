/**
 * Öffentliche Sprachliste — ausschließlich aus der Datenbank.
 *
 * Der Sprachumschalter der Website zeigt genau die Sprachen aus
 * `cms_locales` mit `is_public = true`, sortiert nach `sort_order`. Es gibt
 * keine im Code hinterlegte Liste: eine Sprache, die im CMS bearbeitbar
 * (`is_active`), aber noch nicht öffentlich (`is_public = false`) ist,
 * erscheint hier nicht.
 *
 * Solange die Liste nicht geladen ist oder nicht gelesen werden kann, wird
 * nichts angezeigt (kein Umschalter mit falschen Sprachen).
 */

import { useEffect, useState } from "react";

import type { AppLocale } from "@/i18n/locale";
import { cachedLocaleRegistry, readLocaleRegistry } from "@/i18n/localeRegistry";

export interface PublicLocale {
  locale: AppLocale;
  label_native: string;
  label_de: string;
  sort_order: number;
}

const toPublic = (rows: ReturnType<typeof cachedLocaleRegistry>): PublicLocale[] =>
  (rows ?? [])
    .filter((r) => r.is_public)
    .map((r) => ({
      locale: r.locale,
      label_native: r.label_native || r.locale.toUpperCase(),
      label_de: r.label_de || r.locale.toUpperCase(),
      sort_order: r.sort_order,
    }));

export async function readPublicLocales(): Promise<PublicLocale[]> {
  return toPublic(await readLocaleRegistry());
}

export function usePublicLocales(): { locales: PublicLocale[]; loading: boolean } {
  const initial = cachedLocaleRegistry();
  const [locales, setLocales] = useState<PublicLocale[]>(initial ? toPublic(initial) : []);
  const [loading, setLoading] = useState(initial === null);

  useEffect(() => {
    if (cachedLocaleRegistry()) return;
    let cancelled = false;
    readPublicLocales()
      .then((rows) => {
        if (!cancelled) setLocales(rows);
      })
      .catch(() => {
        if (!cancelled) setLocales([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { locales, loading };
}
