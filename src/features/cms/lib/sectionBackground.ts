/**
 * Einheitlicher Grauwert für den Hintergrund-Schalter `section_bg`.
 *
 * Eine Wahrheit für alle Bausteine/Container: Wer „muted" (oder den
 * Altbestand-Wert „secondary") gesetzt hat, bekommt genau die Klasse
 * `.bg-section-muted` (siehe `src/index.css`) — nie `bg-warm`,
 * `bg-secondary/30` oder `bg-muted/30`. Damit sehen z. B. B-660
 * (`personas`) und B-3271 (`directlinks`) identisch aus.
 *
 * Sprachneutral gelesen: aktive Sprache → DE → EN.
 */

/** Klasse für den einheitlichen grauen Abschnitts-Hintergrund. */
export const SECTION_BG_MUTED_CLASS = "bg-section-muted";
/** Klasse für den Standard-Hintergrund. */
export const SECTION_BG_DEFAULT_CLASS = "bg-background";

/** Prüft, ob ein roher `section_bg`-Wert „grau" bedeutet. */
export function isMutedSectionBg(raw: string | null | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "muted" || v === "secondary";
}

/** Liefert die passende Hintergrund-Klasse für einen rohen `section_bg`-Wert. */
export function sectionBgClass(raw: string | null | undefined): string {
  return isMutedSectionBg(raw) ? SECTION_BG_MUTED_CLASS : SECTION_BG_DEFAULT_CLASS;
}

/**
 * Bausteintypen, die ihren Hintergrund selbst malen. Für sie darf der
 * Render-Loop keinen zusätzlichen grauen Wrapper legen (sonst doppeltes
 * Grau = dunkler als bei anderen Blöcken).
 */
export const SELF_PAINTED_SECTION_TYPES = new Set<string>([
  "teaser_2col_v1",
  "cards_v1",
  "product_scroller_v1",
  "feature_grid_v1",
  "contact_block_v1",
]);

/** Liest `section_bg` sprachneutral aus einem CMS-Leser. */
export function readSectionBg(
  cms: { text: (sectionKey: string, fieldKey: string, locale: string, fallback: string) => string },
  sectionKey: string,
  locale: string,
): string {
  return (
    cms.text(sectionKey, "section_bg", locale, "") ||
    cms.text(sectionKey, "section_bg", "de", "") ||
    cms.text(sectionKey, "section_bg", "en", "") ||
    ""
  );
}
