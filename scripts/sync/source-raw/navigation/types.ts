/**
 * Zentrale Navigations-Typen (Etappe 4b).
 *
 * Diese Typen sind die spätere Grundlage für eine datengetriebene
 * Navigation in `src/navigation/`. Sie sind in dieser Etappe NICHT
 * an Renderer (MainNavigation, MetaNavigation, Footer) angeschlossen.
 *
 * Siehe docs/navigation-inventory.md §6.
 */

export type LinkType =
  | "internal"
  | "external"
  | "iframe"
  | "subdomain"
  | "placeholder";

export type Badge = "new" | "external" | "beta" | "pending";

export type AuthRequirement = "no" | "yes" | "planned";

export type NavStatus = "active" | "pending" | "placeholder" | "disabled";

export type NavItem = {
  /** Stabiler technischer Schlüssel, z.B. "zutrittskontrolle.fahrstuhl". */
  key: string;
  /** i18n-Key für das Label. */
  labelKey: string;
  /** Optional: Kurzform für kompakte Darstellungen (z.B. Mobile). */
  labelShortKey?: string;
  /** Optional: i18n-Key für Teaser-/Beschreibungstext. */
  descriptionKey?: string;
  /** Interner Pfad (nur bei linkType "internal"). */
  path?: string;
  /** Externe URL (bei "external", "iframe", "subdomain"). */
  externalUrl?: string;
  /** Klassifiziert das Linkziel. */
  linkType: LinkType;
  /** Spätere Feature-Domain, zu der dieser Eintrag gehört. */
  targetDomain?: string;
  /** Verschachtelte Unterpunkte (Dropdowns, Footer-Spalten etc.). */
  children?: NavItem[];
  /** Optionales Badge (NEU, extern, beta, pending). */
  badge?: Badge;
  /** Auth-Anforderung des Ziels. */
  requiresAuth?: AuthRequirement;
  /** Lifecycle-Status des Eintrags. */
  status?: NavStatus;
  /** Freitext-Hinweis (z.B. „Platzhalter, wartet auf Content-Freigabe"). */
  note?: string;
};

export type PersonaId =
  | "bauherren"
  | "architekten"
  | "wohnungswirtschaft"
  | "fachplaner"
  | "handwerk"
  | "fachhandel";

export type PersonaItem = {
  id: PersonaId;
  labelKey: string;
  labelShortKey: string;
  targetDomain: string;
};

export type FooterColumn = {
  key: string;
  titleKey: string;
  items: NavItem[];
};
