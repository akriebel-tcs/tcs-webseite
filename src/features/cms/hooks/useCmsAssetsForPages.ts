import { useEffect, useState } from "react";

import { localeMapFromRows } from "@/navigation/localizedNav";

/**
 * Read-only Sammel-Hook für aktive Bild-Assets über mehrere Page-Keys.
 *
 * Holt für eine Liste von `pageKeys` jeweils das aktive Asset für genau einen
 * `section_key` + `field_key` (z. B. "hero" + "image") aus `cms_assets`.
 * Bevorzugt Desktop-Viewport, fällt auf Tablet/Mobile zurück, falls kein
 * Desktop-Eintrag existiert.
 *
 * Kein Schreibzugriff, keine RPC. Liest über den CMS-Supabase-Client.
 */
export interface CmsAssetForPage {
  url: string;
  alt_de: string | null;
  alt_en: string | null;
  /** Sprachkarte aus `cms_asset_translations` (führend, beliebig viele Sprachen). */
  alts: Record<string, string | null>;
}

export function useCmsAssetsForPages(
  pageKeys: string[],
  sectionKey: string,
  fieldKey: string,
): { assets: Map<string, CmsAssetForPage>; loading: boolean } {
  const [assets, setAssets] = useState<Map<string, CmsAssetForPage>>(new Map());
  const [loading, setLoading] = useState(false);

  // Stabilen Key bilden, damit das Effekt-Array nicht bei jedem Render neu triggert.
  const key = pageKeys.join("|");

  useEffect(() => {
    if (pageKeys.length === 0) {
      setAssets(new Map());
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const mod = await import("@/lib/cmsSupabase/client");
        if (!mod.isCmsSupabaseConfigured()) return;
        const sb = mod.getCmsSupabaseClient();

        const { data, error } = await sb
          .from("cms_assets")
          .select("page_key, public_url, alt_de, alt_en, viewport, cms_asset_translations(locale, alt_text)")
          .in("page_key", pageKeys)
          .eq("section_key", sectionKey)
          .eq("field_key", fieldKey)
          .eq("is_active", true);

        if (cancelled || error || !data) return;

        // Pro page_key: Desktop bevorzugen, sonst Tablet, sonst Mobile.
        const byPage = new Map<string, CmsAssetForPage>();
        const rank: Record<string, number> = { desktop: 0, tablet: 1, mobile: 2 };
        const current = new Map<string, number>();
        for (const row of data as Array<{
          page_key: string;
          public_url: string | null;
          alt_de: string | null;
          alt_en: string | null;
          viewport: string | null;
          cms_asset_translations?: Array<{ locale: string | null; alt_text: string | null }> | null;
        }>) {
          if (!row.public_url) continue;
          const r = rank[row.viewport ?? "desktop"] ?? 99;
          const prev = current.get(row.page_key);
          if (prev === undefined || r < prev) {
            current.set(row.page_key, r);
            byPage.set(row.page_key, {
              url: row.public_url,
              alt_de: row.alt_de,
              alt_en: row.alt_en,
              alts: localeMapFromRows(row.cms_asset_translations ?? [], "alt_text"),
            });
          }
        }
        setAssets(byPage);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, sectionKey, fieldKey]);

  return { assets, loading };
}
