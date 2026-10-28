import type { AppLocale } from "@/i18n/locale";
import { isStoryblokSource } from "@/lib/content/source";
/**
 * CMS-Light read-only API.
 *
 * Liest ausschließlich aus der internen CMS-Light/Lovable-Cloud-Datenbank.
 * Der Client wird absichtlich lazy innerhalb der Funktion importiert, damit
 * fehlende Publish-Env-Variablen die veröffentlichte Website nicht bereits
 * beim Modul-Import mit `supabaseUrl is required` abstürzen lassen.
 *
 * Read-only: keine Inserts/Updates/Deletes. RLS sorgt dafür, dass nur
 * veröffentlichte/aktive Inhalte sichtbar sind.
 */

export type CmsLocale = AppLocale;

/** Map field_key -> value (string). Leere Map bei Fehler/leerem Ergebnis. */
export type CmsFieldMap = Record<string, string>;

/**
 * Liest alle veröffentlichten/aktiven CMS-Felder einer Seite in einer Locale.
 * Fällt bei jedem Fehler auf eine leere Map zurück und wirft nicht.
 */
export async function fetchCmsPageFields(
  pageKey: string,
  locale: CmsLocale,
): Promise<CmsFieldMap> {
  try {
    if (isStoryblokSource()) {
      const { loadPageRows } = await import("@/features/cms/hooks/useCmsPageContent");
      const rows = await loadPageRows(pageKey);
      const map: CmsFieldMap = {};
      const ordered = [
        ...rows.fields.filter((r) => r.locale === "de"),
        ...rows.fields.filter((r) => r.locale === locale && locale !== "de"),
      ];
      for (const row of ordered) {
        if (typeof row.value === "string" && row.value.length > 0) map[`${row.section_key}.${row.field_key}`] = row.value;
      }
      return map;
    }
    const { getCmsSupabaseClient } = await import("@/lib/cmsSupabase/client");
    const supabase = getCmsSupabaseClient();
    // Zielsprache + Deutsch laden: Deutsch dient als Rückfallebene, damit
    // eine noch nicht übersetzte Stelle nie leer bleibt.
    const { data, error } = await supabase
      .from("cms_section_fields")
      .select("section_key, field_key, value, locale, review_status")
      .eq("page_key", pageKey)
      .in("locale", Array.from(new Set([locale, "de"])));

    if (error || !data) return {};

    const map: CmsFieldMap = {};
    // Erst Deutsch (Rückfall), dann Zielsprache — Zielsprache gewinnt.
    const ordered = [
      ...data.filter((r) => r.locale === "de"),
      ...data.filter((r) => r.locale !== "de"),
    ];
    for (const row of ordered) {
      // Maschinelle Übersetzungen dürfen im aktuellen Arbeitsstand sichtbar
      // sein. Nur veraltete Maschinenwerte (deutsche Quelle wurde danach
      // geändert) werden übersprungen — dort greift der Deutsch-Rückfall.
      if (row.review_status === "maschinell_veraltet") continue;
      const key = `${row.section_key}.${row.field_key}`;
      if (typeof row.value === "string" && row.value.length > 0) {
        map[key] = row.value;
      }
    }
    return map;
  } catch {
    return {};
  }
}
