/**
 * Meta-Navigation als reine Datenstruktur (Etappe 4e).
 *
 * Bildet 1:1 die aktuellen Meta-Links (rechts in der Top-Leiste) aus
 * `src/components/MetaNavigation.tsx` ab.
 *
 * Wichtig:
 * - Noch NICHT an MetaNavigation.tsx angeschlossen.
 * - i18n-Keys sind vorbereitet, aber noch nicht aktiv übersetzt.
 *
 * Siehe docs/navigation-inventory.md §4.
 */

import type { NavItem } from "./types";
import { ROUTES } from "./routes";

export const metaNavigation: NavItem[] = [
  {
    key: "meta.serviceportal",
    labelKey: "meta.serviceportal.label",
    path: ROUTES.serviceportal.root,
    linkType: "internal",
    targetDomain: "serviceportal",
    status: "active",
    note: "Laut Architektur nur Einstieg/Kachelbereich, keine Auth- oder Tool-Logik.",
  },
  {
    key: "meta.kontakt",
    labelKey: "meta.kontakt.label",
    path: ROUTES.meta.kontakt,
    linkType: "internal",
    targetDomain: "kontakt",
    status: "active",
  },
  {
    key: "meta.karriere",
    labelKey: "meta.karriere.label",
    path: ROUTES.meta.karriere,
    linkType: "internal",
    targetDomain: "karriere",
    status: "active",
  },
  {
    key: "meta.presse",
    labelKey: "meta.presse.label",
    path: ROUTES.meta.presse,
    linkType: "internal",
    targetDomain: "presse",
    status: "active",
  },
];
