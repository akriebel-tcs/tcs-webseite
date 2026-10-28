/**
 * Pilot-Helper: gruppiert die Feldschlüssel einer `card_v1`-Bildkarte für
 * den neuen Arbeitsbereich (B-026 „Außenstationen" / B-027 „Innenstationen").
 *
 * Reine Klassifikation existierender `cms_section_fields.field_key`-Werte.
 * Erzeugt keine Felder, schreibt nichts, fasst nur an, was redaktionell
 * schon da ist. Felder, die in keine Gruppe passen, landen in `tech` und
 * werden im Admin nur eingeklappt angezeigt.
 *
 * Hinweis zur Reihenfolge:
 *  - Inhalte: redaktionelle Reihenfolge Eyebrow → Titel → Beschreibung →
 *    sonstige Texte (Reihenfolge der Aufzählung).
 *  - Features: numerisch nach Index (features.0, features.1, …).
 *  - Links: zuerst die heute genutzten Top-Level-Felder, dann nested
 *    `items.N.href` numerisch.
 */

export interface BildkartenFieldGroups {
  /** Sichtbare Inhaltstexte (Eyebrow/Titel/Beschreibung etc.). */
  inhalte: string[];
  /** Lucide-Icon-Feld (`icon`), falls vorhanden. */
  icon: string[];
  /** `features.0..n`, in numerischer Reihenfolge. */
  features: string[];
  /** Bestehende Linkfelder dieser Karte (cta_label, cta_href, href, items.N.href). */
  links: string[];
  /** Alles, was technisch ist oder in keine andere Gruppe passt. */
  tech: string[];
}

/** Reihenfolge der Inhalts-Felder im Bildkarten-Arbeitsbereich. */
const CONTENT_FIELD_ORDER = [
  "eyebrow",
  "subtitle",
  "headline",
  "title",
  "label",
  "intro",
  "description",
  "body",
] as const;

const CONTENT_FIELDS: ReadonlySet<string> = new Set(CONTENT_FIELD_ORDER);

const ICON_FIELDS: ReadonlySet<string> = new Set(["icon"]);

const TOP_LEVEL_LINK_FIELDS: ReadonlySet<string> = new Set([
  "cta_label",
  "cta_href",
  "cta_link",
  "href",
]);

const isFeatureKey = (fk: string): boolean => /^features\.\d+/.test(fk);
const isNestedHrefKey = (fk: string): boolean => /^items\.\d+\.href$/.test(fk);
const isLinkKey = (fk: string): boolean =>
  TOP_LEVEL_LINK_FIELDS.has(fk) || isNestedHrefKey(fk);

/**
 * Konzept-Linkfelder aus dem Zielmodell. Werden im Arbeitsbereich nur
 * read-only/eingeklappt angezeigt, falls sie heute schon in der Whitelist
 * stehen. Werte werden nie automatisch geschrieben.
 */
export const KONZEPT_LINK_FIELDS = [
  "link_1_label", "link_1_href", "link_1_kind",
  "link_2_label", "link_2_href", "link_2_kind",
  "link_3_label", "link_3_href", "link_3_kind",
] as const;

/**
 * Gruppiert die vorhandenen Field-Keys einer Karte. Unbekannte Felder
 * landen in `tech` und werden nicht entfernt — Inhalt bleibt vollständig
 * editierbar.
 */
export function groupBildkartenFields(fieldKeys: readonly string[]): BildkartenFieldGroups {
  const seen = new Set<string>();
  const inhalte: string[] = [];
  const icon: string[] = [];
  const features: string[] = [];
  const links: string[] = [];
  const tech: string[] = [];

  // Inhalte in fester Reihenfolge.
  for (const fk of CONTENT_FIELD_ORDER) {
    if (fieldKeys.includes(fk) && !seen.has(fk)) {
      inhalte.push(fk);
      seen.add(fk);
    }
  }

  // Features numerisch sortieren.
  const featureKeys = fieldKeys
    .filter(isFeatureKey)
    .sort((a, b) => {
      const na = Number(a.split(".")[1] ?? 0);
      const nb = Number(b.split(".")[1] ?? 0);
      return na - nb || a.localeCompare(b);
    });
  for (const fk of featureKeys) {
    if (!seen.has(fk)) {
      features.push(fk);
      seen.add(fk);
    }
  }

  // Linkfelder: erst Top-Level (stabile Reihenfolge), dann nested.
  const topLinks = fieldKeys.filter((fk) => TOP_LEVEL_LINK_FIELDS.has(fk));
  for (const fk of ["cta_label", "cta_href", "cta_link", "href"]) {
    if (topLinks.includes(fk) && !seen.has(fk)) {
      links.push(fk);
      seen.add(fk);
    }
  }
  const nestedLinks = fieldKeys
    .filter(isNestedHrefKey)
    .sort((a, b) => {
      const na = Number(a.split(".")[1] ?? 0);
      const nb = Number(b.split(".")[1] ?? 0);
      return na - nb;
    });
  for (const fk of nestedLinks) {
    if (!seen.has(fk)) {
      links.push(fk);
      seen.add(fk);
    }
  }

  // Icon.
  for (const fk of fieldKeys) {
    if (ICON_FIELDS.has(fk) && !seen.has(fk)) {
      icon.push(fk);
      seen.add(fk);
    }
  }

  // Rest → tech.
  for (const fk of fieldKeys) {
    if (seen.has(fk)) continue;
    // Falls ein Inhaltsfeld oder Linkfeld vorhanden wäre, hätten wir es
    // oben gefangen — alles Übrige ist technisch oder nicht klassifiziert.
    if (CONTENT_FIELDS.has(fk) || ICON_FIELDS.has(fk) || isFeatureKey(fk) || isLinkKey(fk)) {
      // Defensive: doppelte Klassifikation vermeiden.
      continue;
    }
    tech.push(fk);
    seen.add(fk);
  }

  return { inhalte, icon, features, links, tech };
}
