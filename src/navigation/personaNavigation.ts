/**
 * Persona-Navigation als reine Datenstruktur (Etappe 4e).
 *
 * Bildet 1:1 den aktuellen Ist-Stand der Persona-Leiste aus
 * `src/components/MetaNavigation.tsx` ab.
 *
 * Wichtig:
 * - Noch NICHT an MetaNavigation.tsx angeschlossen.
 * - PersonaContext und State-Logik bleiben unverändert.
 * - i18n-Keys sind vorbereitet, aber noch nicht aktiv übersetzt.
 * - Persona-Texte werden später nicht in der Navigation gepflegt,
 *   sondern in `features/personas/`.
 *
 * Siehe docs/navigation-inventory.md §4.
 */

import type { PersonaItem } from "./types";

export const personaNavigation: PersonaItem[] = [
  {
    id: "bauherren",
    labelKey: "persona.bauherren.label",
    labelShortKey: "persona.bauherren.short",
    targetDomain: "personas.bauherr",
  },
  {
    id: "architekten",
    labelKey: "persona.architekten.label",
    labelShortKey: "persona.architekten.short",
    targetDomain: "personas.architekt",
  },
  {
    id: "wohnungswirtschaft",
    labelKey: "persona.wohnungswirtschaft.label",
    labelShortKey: "persona.wohnungswirtschaft.short",
    targetDomain: "personas.wohnungswirtschaft",
  },
  {
    id: "fachplaner",
    labelKey: "persona.fachplaner.label",
    labelShortKey: "persona.fachplaner.short",
    targetDomain: "personas.fachplaner",
  },
  {
    id: "handwerk",
    labelKey: "persona.handwerk.label",
    labelShortKey: "persona.handwerk.short",
    targetDomain: "personas.handwerk",
  },
  {
    id: "fachhandel",
    labelKey: "persona.fachhandel.label",
    labelShortKey: "persona.fachhandel.short",
    targetDomain: "personas.fachhandel",
  },
];
