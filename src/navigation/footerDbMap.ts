/**
 * Etappe C.2 — Mapping Code-Schlüssel → DB-`node_key` (nav_area = "footer"
 * bzw. "footer_bottom").
 *
 * Die Code-Datei `footerNavigation.ts` ist Source of Truth für Routen und
 * Hierarchie. Die DB liefert via Overlay nur Sichtbarkeit, Reihenfolge und
 * Label. Damit beide Welten sich finden, brauchen wir hier die feste
 * Zuordnung. Neue Footer-Einträge müssen sowohl in `footerNavigation.ts`
 * als auch hier eingetragen werden.
 */

/** Spalten-Titel: code-key (footerNavigation[i].key) → DB node_key. */
export const FOOTER_COLUMN_DB_KEYS: Record<string, string> = {
  produkte: "col.produkte",
  anwendungen: "col.anwendungen",
  services: "col.services",
  unternehmen: "col.unternehmen",
};

/** Spalten-Items: code-key → DB node_key. */
export const FOOTER_ITEM_DB_KEYS: Record<string, string> = {
  // Produkte
  "produkte.tuerkommunikation": "f.produkte.tuerkomm",
  "produkte.zutrittskontrolle": "f.produkte.zk",
  "produkte.eingangssysteme": "f.produkte.es",
  "produkte.tcsPacks": "f.produkte.tcsPacks",
  "produkte.snipdoo": "f.produkte.snipdoo",
  "produkte.beschilderung": "f.produkte.beschilderung",
  // Anwendungen
  "anwendungen.efh": "f.anw.efh",
  "anwendungen.mfh": "f.anw.mfh",
  "anwendungen.grossanlagen": "f.anw.gross",
  "anwendungen.gewerbe": "f.anw.gewerbe",
  "anwendungen.referenzen": "f.anw.referenzen",
  // Services
  "services.konfigurator": "f.sv.konfigurator",
  "services.downloads": "f.sv.downloads",
  "services.akademie": "f.sv.akademie",
  "services.ersatzteile": "f.sv.ersatzteile",
  "services.support": "f.sv.support",
  // Unternehmen
  "unternehmen.ueberTcs": "f.un.ueberTcs",
  "unternehmen.karriere": "f.un.karriere",
  "unternehmen.presse": "f.un.presse",
  "unternehmen.kontakt": "f.un.kontakt",
  "unternehmen.datenschutz": "f.un.datenschutz",
};

/** Bottom-Bar (nav_area = "footer_bottom"): code-key → DB node_key. */
export const FOOTER_BOTTOM_DB_KEYS: Record<string, string> = {
  "legal.impressum": "legal.impressum",
  "legal.datenschutz": "legal.datenschutz",
  "legal.datenschutzSnipdoo": "legal.datenschutzSnipdoo",
  "legal.garantiebedingungen": "legal.garantiebedingungen",
  "legal.einwilligung": "legal.einwilligung",
  "legal.agbEinkauf": "legal.agbEinkauf",
  "legal.agb": "legal.agb",
  "legal.sitemap": "legal.sitemap",
};
