import { personaRoutes } from "@/navigation/personaRoutes";

/**
 * Alte Zielgruppen-Adressen (`/personas/<slug>`) auf die neuen, sprechenden
 * Adressen (`/handwerk`, `/wohnungswirtschaft`, …) umschreiben.
 *
 * Wird VOR dem ersten Router-Rendern aufgerufen (siehe `src/main.tsx`).
 * Grund: Der Sprachabgleich (`useLocaleUrlSync`) ergänzt beim ersten Laden
 * `?lang=` über den Router und würde eine gleichzeitig laufende
 * Router-Umleitung wieder überschreiben. Ein einmaliges Umschreiben der
 * Adresse vor dem Start ist eindeutig und ohne Wettlauf.
 *
 * Die Route `/personas/<slug>` bleibt zusätzlich im Router bestehen (für
 * Klicks auf alte Verweise innerhalb der laufenden Anwendung).
 */
export function applyLegacyPersonaRedirect(): void {
  if (typeof window === "undefined") return;
  const match = window.location.pathname.replace(/\/+$/, "").match(/^\/personas\/([^/]+)$/);
  if (!match) return;
  const target = personaRoutes.find((p) => p.legacySlug === match[1]);
  if (!target) return;
  const next = `/${target.slug}${window.location.search}${window.location.hash}`;
  window.history.replaceState(window.history.state, "", next);
}
