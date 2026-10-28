/**
 * Zentrale Zuordnung der Zielgruppen (Personas): ID ↔ eigene Seitenadresse ↔
 * CMS-Seitenschlüssel.
 *
 * Diese Datei ist die einzige Quelle für Persona-Seitenadressen. Sie wird
 * benutzt von:
 *   - `src/features/personas/routes.tsx` (echte Routen + Umleitungen)
 *   - `src/components/MetaNavigation.tsx` (Persona-Leiste als echte Links)
 *
 * Die Adresse entspricht der Bezeichnung in der Persona-Leiste
 * (z. B. „Wohnungswirtschaft" → `/wohnungswirtschaft`) und enthält
 * absichtlich nicht mehr das Wort „personas".
 */

export interface PersonaRoute {
  /** Persona-ID wie in `personaNavigation` / `persona.<id>` (plural). */
  id: string;
  /** Neue öffentliche Adresse ohne führenden Slash. */
  slug: string;
  /** CMS-Seitenschlüssel (`cms_pages.page_key`). */
  pageKey: string;
  /** Alter Slug unter `/personas/<legacySlug>` (Umleitungsquelle). */
  legacySlug: string;
}

export const personaRoutes: readonly PersonaRoute[] = [
  { id: "bauherren", slug: "bauherren", pageKey: "personas.bauherr", legacySlug: "bauherr" },
  { id: "architekten", slug: "architekten", pageKey: "personas.architekt", legacySlug: "architekt" },
  {
    id: "wohnungswirtschaft",
    slug: "wohnungswirtschaft",
    pageKey: "personas.wohnungswirtschaft",
    legacySlug: "wohnungswirtschaft",
  },
  { id: "fachplaner", slug: "fachplaner", pageKey: "personas.fachplaner", legacySlug: "fachplaner" },
  { id: "handwerk", slug: "handwerk", pageKey: "personas.handwerk", legacySlug: "handwerk" },
  { id: "fachhandel", slug: "fachhandel", pageKey: "personas.fachhandel", legacySlug: "fachhandel" },
];

/** Adresse einer Zielgruppe, z. B. `/handwerk`. */
export function personaPath(id: string): string | null {
  const entry = personaRoutes.find((p) => p.id === id);
  return entry ? `/${entry.slug}` : null;
}

/**
 * Persona-ID aus einem Pfad — sowohl aus der neuen Adresse (`/handwerk`) als
 * auch aus der alten (`/personas/handwerk`).
 */
export function personaIdFromPath(pathname: string): string | null {
  if (!pathname) return null;
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const legacy = normalized.match(/^\/personas\/([^/]+)$/);
  if (legacy) {
    return personaRoutes.find((p) => p.legacySlug === legacy[1])?.id ?? null;
  }
  const direct = normalized.match(/^\/([^/]+)$/);
  if (!direct) return null;
  return personaRoutes.find((p) => p.slug === direct[1])?.id ?? null;
}
