/**
 * Inhalte-Quelle der Webseite.
 *
 * `VITE_CONTENT_SOURCE=storyblok` (Standard) liest redaktionelle Inhalte aus
 * Storyblok, `supabase` aus dem bisherigen CMS-Light (Uebergangsbetrieb, um
 * beide Quellen nebeneinander vergleichen zu koennen). Produktdaten kommen in
 * beiden Faellen weiter aus der Produktdatenbank.
 */
export type ContentSource = "storyblok" | "supabase";

export function contentSource(): ContentSource {
  const raw = (import.meta.env.VITE_CONTENT_SOURCE as string | undefined)?.trim().toLowerCase();
  return raw === "supabase" ? "supabase" : "storyblok";
}

export function isStoryblokSource(): boolean {
  return contentSource() === "storyblok";
}
