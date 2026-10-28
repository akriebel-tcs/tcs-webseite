/**
 * Einheitliche Icon-Größe für Standardkarten (card_v1) in Kartenrastern.
 *
 * Grund: Vorteile-/Benefits-Raster wurden je Renderer mit unterschiedlichen
 * Größen (w-5, w-6, w-8) gerendert. Damit das gleiche CMS-Icon überall gleich
 * groß aussieht, benutzen alle Karten-Renderer diese Konstanten.
 */
// 24 px (h-6/w-6) bei Strichstärke 1.75 — bewusst gesetzt (Redaktionsvorgabe),
// damit die Linien in allen Vorteile-/Benefits-Rastern gleich fein wirken.
export const CARD_ICON_CLASS = "h-6 w-6 text-primary mb-3 shrink-0";
export const CARD_ICON_STROKE = 1.75;
