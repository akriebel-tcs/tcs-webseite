/**
 * Hook: lädt veröffentlichte/aktive CMS-Felder für eine Seite + aktuelle Sprache.
 *
 * - Read-only.
 * - Fällt bei Fehler/leerem Ergebnis auf {} zurück.
 * - Nutzt ausschließlich den internen CMS-Light/Lovable-Cloud-Client.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchCmsPageFields, type CmsFieldMap, type CmsLocale } from "@/features/cms/api/cmsContent";
import { normalizeAppLocale } from "@/i18n/locale";

export function useCmsPageFields(pageKey: string): {
  fields: CmsFieldMap;
  loading: boolean;
} {
  const { i18n } = useTranslation();
  const locale: CmsLocale = normalizeAppLocale(i18n.language);
  const [fields, setFields] = useState<CmsFieldMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCmsPageFields(pageKey, locale)
      .then((map) => {
        if (!cancelled) setFields(map);
      })
      .catch(() => {
        if (!cancelled) setFields({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pageKey, locale]);

  return { fields, loading };
}

/** Liefert CMS-Wert, wenn nicht-leer; sonst Fallback. */
export function pickCmsOrFallback(
  fields: CmsFieldMap,
  key: string,
  fallback: string,
): string {
  const v = fields[key];
  return typeof v === "string" && v.length > 0 ? v : fallback;
}
