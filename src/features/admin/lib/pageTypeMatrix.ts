/**
 * Seitentypen- und Bausteinmatrix (read-only).
 *
 * Etappe: `cms-light-seitentypen-bausteinmatrix-und-admin-sicht-1`.
 *
 * Mappt die in `cms_pages.page_type` verwendeten T-Codes auf die vier
 * fachlichen Seitentypen der PDF-Vorlage (Startseite, Hauptmenüpunkt-,
 * Untermenüpunkt-, Detail-Seite) und beschreibt je Seitentyp die
 * erwarteten Inhaltsbausteine. Wird im PageEditor als ruhiger Hinweis
 * angezeigt — keine Validierung, kein Schreibzugriff.
 *
 * Quelle: `docs/04-betrieb/seitentypen-bausteinmatrix-latest.md`.
 */

export type SeitentypId =
  | "startseite"
  | "sonder_hub"
  | "hauptmenuepunkt"
  | "untermenuepunkt"
  | "detail"
  | "sonder";


export interface SeitentypDefinition {
  id: SeitentypId;
  label: string;
  /** Kurze redaktionelle Beschreibung. */
  description: string;
  /** Bausteine, die typischerweise auf dieser Seite vorkommen. */
  expectedTypes: string[];
  /** Bausteine, die optional sinnvoll sind. */
  optionalTypes: string[];
}

export const SEITENTYPEN: Record<SeitentypId, SeitentypDefinition> = {
  startseite: {
    id: "startseite",
    label: "Startseite",
    description: "Einstieg der gesamten Website. Hero, Kennzahlen und Wechselteaser zu den Bereichen.",
    expectedTypes: ["hero_v1", "teaser_2col_v1"],
    optionalTypes: ["stats_v1", "content_v1", "cards_v1", "cta_v1", "rich_v1"],
  },
  sonder_hub: {
    id: "sonder_hub",
    label: "Hauptmenüpunkt-Sonderseite",
    description: "Hauptmenüpunkt-Seite mit eigener Logik (z. B. Produkte-Hub, Service-Hub). Hero, Karten-Hub zu den Unterthemen und CTA.",
    expectedTypes: ["hero_v1", "cards_v1"],
    optionalTypes: ["content_v1", "teaser_2col_v1", "product_scroller_v1", "feature_grid_v1", "faq_v1", "cta_v1"],
  },

  hauptmenuepunkt: {
    id: "hauptmenuepunkt",
    label: "Hauptmenüpunkt-Standardseite",
    description: "Standard-Bereichs-Hub. Hero, kurzer Intro-Text, Wechselteaser zu den Unterbereichen. FAQ und Projekt-CTA stehen als Standard-Bausteine zur Verfügung (ein-/ausblendbar).",
    expectedTypes: ["hero_v1", "content_v1", "teaser_2col_v1"],
    optionalTypes: ["cards_v1", "faq_v1", "cta_v1"],
  },
  untermenuepunkt: {
    id: "untermenuepunkt",
    label: "Untermenüpunkt-Seite",
    description: "Themen-Unterseite. Hero, Intro und fachliche Content-Blöcke; FAQ und Projekt-CTA als Standard-Bausteine ein-/ausblendbar.",
    expectedTypes: ["hero_v1", "content_v1"],
    optionalTypes: ["teaser_2col_v1", "cards_v1", "product_scroller_v1", "feature_grid_v1", "faq_v1", "cta_v1"],
  },
  detail: {
    id: "detail",
    label: "Detail-Seite",
    description: "Produkt- oder Themen-Detail. Hero, Detailinhalt und FAQ-Block (Standard); optional Downloads, Kontakt und Projekt-CTA.",
    expectedTypes: ["hero_v1", "content_v1", "faq_v1"],
    optionalTypes: ["product_scroller_v1", "feature_grid_v1", "cards_v1", "download_list_v1", "contact_block_v1", "cta_v1"],
  },
  sonder: {
    id: "sonder",
    label: "Sonderseite",
    description: "Spezialseite mit eigenem Aufbau (z. B. Kontakt, Karriere, Legal, Serviceportal). Erwartete Bausteine richten sich nach Zweck.",
    expectedTypes: [],
    optionalTypes: ["hero_v1", "content_v1", "contact_block_v1", "faq_v1", "cta_v1"],
  },
};

/** Mapping der DB-Codes (`cms_pages.page_type`) auf den fachlichen Seitentyp. */
export const PAGE_TYPE_CODE_MAP: Record<string, SeitentypId> = {
  T01: "startseite",
  T02: "sonder_hub",
  T03: "hauptmenuepunkt",
  T04: "untermenuepunkt",
  T05: "detail",
  T11: "sonder",
  T17: "sonder",
  T19: "sonder",
  standard: "sonder",
};


export function resolveSeitentyp(pageTypeCode: string | null | undefined): SeitentypDefinition | null {
  if (!pageTypeCode) return null;
  const id = PAGE_TYPE_CODE_MAP[pageTypeCode];
  if (!id) return null;
  return SEITENTYPEN[id];
}

export interface BausteinAbgleich {
  /** Tatsächlich vorhandene Top-Level-Bausteine (deduppt, in Reihenfolge). */
  present: string[];
  /** Erwartete Bausteine, die fehlen. */
  missingExpected: string[];
  /** Vorhandene Bausteine, die weder erwartet noch optional sind. */
  unexpected: string[];
}

/**
 * Vergleicht die Liste tatsächlich vorhandener Top-Level-Section-Types mit
 * dem Sollbild des Seitentyps. Reine Lese-/Anzeigelogik.
 */
export function abgleichBausteine(
  seitentyp: SeitentypDefinition,
  topLevelTypes: Array<string | null | undefined>,
): BausteinAbgleich {
  const present: string[] = [];
  for (const t of topLevelTypes) {
    if (!t) continue;
    if (!present.includes(t)) present.push(t);
  }
  const expected = new Set(seitentyp.expectedTypes);
  const optional = new Set(seitentyp.optionalTypes);
  const presentSet = new Set(present);
  const missingExpected = seitentyp.expectedTypes.filter((t) => !presentSet.has(t));
  const unexpected = present.filter((t) => !expected.has(t) && !optional.has(t));
  return { present, missingExpected, unexpected };
}

/** Hübschere Labels für die häufigsten Bausteine. */
export const BAUSTEIN_LABELS: Record<string, string> = {
  hero_v1: "Hero",
  content_v1: "Intro/Textblock",
  teaser_2col_v1: "Wechselteaser",
  cards_v1: "Kartenraster",
  card_v1: "Karte",
  product_scroller_v1: "Kartenscroller",
  feature_grid_v1: "Feature-Raster",
  stats_v1: "Kennzahlen",
  faq_v1: "FAQ",
  cta_v1: "CTA",
  rich_v1: "Rich-Text",
  download_list_v1: "Downloads",
  contact_block_v1: "Kontakt",
  tabs_v1: "Tabs",
};

export function bausteinLabel(type: string): string {
  return BAUSTEIN_LABELS[type] ?? type;
}
