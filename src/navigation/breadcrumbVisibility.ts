/**
 * Zentrale Ausschlusslogik für die globale Breadcrumb-Anzeige.
 *
 * Hintergrund: Manche Seiten haben in der Meta-/Persona-Navigation oben
 * bereits einen eindeutigen aktiven Kontext (z. B. „Architekten"). Ein
 * zusätzlicher Breadcrumb „Startseite › Architekten" wäre redundant und
 * fachlich auch nicht korrekt, weil diese Seiten nicht unter der
 * Startseite hängen, sondern eigene Persona-Einstiege sind.
 *
 * Verwendung: `AutoBreadcrumb` ruft `shouldHideBreadcrumb(pathname)` auf
 * und rendert nichts, wenn `true` zurückkommt. Andere Layout-Bestandteile
 * (Header, Meta-Nav, MainNav, Hero, Footer) bleiben unverändert.
 */

/** Routen-Präfixe, deren Seiten generell keinen Breadcrumb anzeigen. */
const HIDDEN_PREFIXES: readonly string[] = ["/personas/"];

/** Exakte Pfade ohne Breadcrumb (z. B. Persona-Übersicht, falls vorhanden). */
const HIDDEN_EXACT: ReadonlySet<string> = new Set(["/personas"]);

export function shouldHideBreadcrumb(pathname: string): boolean {
  if (!pathname) return false;
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (HIDDEN_EXACT.has(normalized)) return true;
  return HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
