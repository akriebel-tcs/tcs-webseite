/**
 * Anzeige-Regeln für Section-Felder im Admin-Editor.
 *
 * Ziel: Mitarbeiter sehen pro Block nur die wirklich redaktionellen
 * Texte in einer logischen Reihenfolge (wie auf der Webseite zu lesen).
 * Technische Felder (Slugs, URLs, interne Schalter) sind standardmäßig
 * ausgeblendet, lassen sich aber bei Bedarf einblenden.
 *
 * Das ist eine reine UI-/Layout-Regel — DB-Struktur, Whitelist und
 * Schreibwege bleiben unverändert. Unbekannte Felder werden nicht
 * versteckt und alphabetisch hinten angehängt.
 */

/** Logische Lese-Reihenfolge: kleiner = weiter oben. */
const ORDER: Record<string, number> = {
  // 1) Eyebrow / kleine Zeile über der Überschrift
  label: 10,
  eyebrow: 11,
  kicker: 12,
  // 2) Hauptüberschrift + Unterzeile
  headline: 20,
  title: 21,
  subline: 30,
  subheadline: 31,
  subtitle: 32,
  // 3) Fließtext / Beschreibung
  intro: 40,
  lead: 41,
  text: 50,
  description: 51,
  desc: 52,
  body: 53,
  // 4) Call-to-Action (Button-Text)
  cta: 80,
  cta_primary: 81,
  primary: 82,
  cta_secondary: 83,
  secondary: 84,
};

/**
 * Felder, die im Standard-Modus ausgeblendet werden, weil sie keine
 * sichtbaren Marketing-Texte sind (URL-Ziele, Slugs, interne Flags).
 * Sie bleiben in der DB & Whitelist erhalten und können über
 * „technische Felder einblenden" sichtbar gemacht werden.
 */
const HIDDEN_EXACT = new Set<string>([
  "cta_link",
  "cta_href",
  "cta_url",
  "primary_link",
  "primary_href",
  "secondary_link",
  "secondary_href",
  "href",
  "url",
  "link",
  "slug",
  "route",
  "target",
]);

const HIDDEN_SUFFIX = ["_link", "_href", "_url", "_slug", "_route"];

/** Sichtbare Labels statt roher field_keys. */
const LABELS: Record<string, string> = {
  label: "Eyebrow (kleine Zeile über der Überschrift)",
  eyebrow: "Eyebrow (kleine Zeile über der Überschrift)",
  kicker: "Kicker (kleine Zeile über der Überschrift)",
  headline: "Headline (Hauptüberschrift)",
  title: "Titel",
  subline: "Subline (Unterzeile)",
  subheadline: "Subline (Unterzeile)",
  subtitle: "Untertitel",
  intro: "Intro (kurzer Einleitungstext)",
  lead: "Lead (Einleitung)",
  text: "Text (Fließtext)",
  description: "Beschreibung",
  desc: "Beschreibung",
  body: "Fließtext",
  cta: 'Button-Text (z. B. „Mehr erfahren")',
  cta_primary: "Button-Text – primär",
  primary: "Button-Text – primär",
  cta_secondary: "Button-Text – sekundär",
  secondary: "Button-Text – sekundär",
  // technisch (nur sichtbar im erweiterten Modus)
  cta_link: "Button-Ziel (Link/URL)",
  cta_href: "Button-Ziel (Link/URL)",
  primary_link: "Primärer Button – Ziel (Link/URL)",
  secondary_link: "Sekundärer Button – Ziel (Link/URL)",
  href: "Ziel (Link/URL)",
  url: "URL",
  link: "Link",
  slug: "Slug (URL-Teil)",
};

export function isTechnicalFieldKey(fieldKey: string): boolean {
  if (HIDDEN_EXACT.has(fieldKey)) return true;
  return HIDDEN_SUFFIX.some((suf) => fieldKey.endsWith(suf));
}

export function fieldDisplayLabel(fieldKey: string): string {
  return LABELS[fieldKey] ?? fieldKey;
}

/**
 * Sortiert Feld-Keys in lese-logischer Reihenfolge. Bekannte Keys nach
 * `ORDER`, unbekannte alphabetisch dahinter (Position 999).
 */
export function sortFieldKeys(keys: string[]): string[] {
  const score = (k: string) => ORDER[k] ?? 999;
  return [...keys].sort((a, b) => {
    const sa = score(a);
    const sb = score(b);
    if (sa !== sb) return sa - sb;
    return a.localeCompare(b);
  });
}
