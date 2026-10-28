/**
 * Hilfsfunktionen für CMS-Light-Overrides der Serien-Kacheln im
 * Produktkatalog (Etappe `catalog-series-thumbnails-cms-override-1`).
 *
 * Marketing kann pro Serie im Admin ein eigenes Thumbnail und optional
 * eine Sortier-Nummer hinterlegen. Diese werden über CMS-Sections mit
 * dem Schlüssel `series-override.<normalized_slug>` auf der Seite
 * `produkte.tuerkommunikation` gepflegt.
 *
 * Wenn ein Override fehlt, gilt die Produkt-Datenbank.
 */

/**
 * Normalisiert einen Serien-Slug aus der Produkt-DB ("PES PRO",
 * "Carus ARGOS", "SKYLINE:TEN PRO", "AVU V6D") auf einen stabilen
 * Section-Key-Bestandteil (lowercase, " "/":" → "-", aufeinanderfolgende
 * Trenner verdichten).
 */
export function normalizeSerieSlugForCms(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** Voller CMS-Section-Key zu einem Produkt-DB-Serien-Slug. */
export function serieSectionKey(slug: string): string {
  return `series-override.${normalizeSerieSlugForCms(slug)}`;
}
