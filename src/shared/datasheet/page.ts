/**
 * Page geometry of the portable datasheet (module 1.4.0).
 *
 * The values are the single source of truth for the paginated print layout:
 * they feed the `@page` rule handed to the pagination engine and the CSS that
 * positions the brand footer inside the reserved bottom band.
 */

/** A4 portrait. */
export const PAGE_WIDTH_MM = 210;
export const PAGE_HEIGHT_MM = 297;

/** Repeated safe margins — applied by the engine to every page. */
export const MARGIN_TOP_MM = 15;
export const MARGIN_SIDE_MM = 14;

/**
 * Reserved bottom band. Content never enters it, so the brand footer of the
 * last page can never overlap content and keeps a safe distance to the paper
 * edge.
 */
export const MARGIN_BOTTOM_MM = 26;
/** Distance between the footer bar and the bottom paper edge. */
export const FOOTER_BOTTOM_MM = 13;

/** Usable content width, also used for the screen preview scale. */
export const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - 2 * MARGIN_SIDE_MM;

/** `@page` rule for the pagination engine. */
export function pageCss(): string {
  return `@page { size: ${PAGE_WIDTH_MM}mm ${PAGE_HEIGHT_MM}mm; margin: ${MARGIN_TOP_MM}mm ${MARGIN_SIDE_MM}mm ${MARGIN_BOTTOM_MM}mm; }`;
}
