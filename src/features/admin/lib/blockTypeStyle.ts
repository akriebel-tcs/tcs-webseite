/**
 * Block-Typ-Styles (Etappe „Admin lesbarer machen").
 *
 * Ordnet jedem `cms_sections.section_type` eine Farbe (semantischer Token),
 * ein lesbares deutsches Kurzlabel und eine knappe Erklärung zu. Wird vom
 * Section-Tree und vom Editor-Header genutzt, damit Redaktion auf einen Blick
 * sieht, mit welcher Art Block sie es zu tun hat.
 *
 * Kein Schreibzugriff, keine Logik — nur Anzeige.
 */

export type BlockTypeKey =
  | "hero"
  | "content"
  | "card_v1"
  | "products"
  | "feature"
  | "cta"
  | "answer-first"
  | "intro"
  | "benefits"
  | "overview"
  | string;

export interface BlockTypeStyle {
  /** Tailwind-Klassen für den linken Farbstreifen. */
  borderClass: string;
  /** Tailwind-Klassen für das Typ-Badge (Hintergrund + Textfarbe). */
  badgeClass: string;
  /** Lesbares deutsches Kurzlabel, fällt auf den Schlüssel zurück. */
  label: string;
  /** Eine Zeile Erklärung für den Tooltip. */
  description: string;
  /** Roher CSS-Farbwert (für Inline-Styles, z. B. Highlight-Outline im iFrame). */
  cssColor: string;
}

const FALLBACK: BlockTypeStyle = {
  borderClass: "border-l-muted-foreground/40",
  badgeClass: "bg-muted text-muted-foreground",
  label: "Block",
  description: "Inhaltsblock — Typ ist im Code (noch) nicht klassifiziert.",
  cssColor: "hsl(215 20% 65%)",
};

const STYLES: Record<string, BlockTypeStyle> = {
  hero: {
    borderClass: "border-l-sky-500",
    badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    label: "Hero",
    description: "Oberster Banner mit Eyebrow (Mini-Überschrift), Headline, Intro und großem Hero-Bild.",
    cssColor: "hsl(199 89% 48%)",
  },
  content: {
    borderClass: "border-l-lime-600",
    badgeClass: "bg-lime-600/15 text-lime-700 dark:text-lime-300",
    label: "Inhalt",
    description: "Standard-Textblock (Überblick, Vorteile, Intro, Fließtext).",
    cssColor: "hsl(85 78% 36%)",
  },
  overview: {
    borderClass: "border-l-lime-600",
    badgeClass: "bg-lime-600/15 text-lime-700 dark:text-lime-300",
    label: "Überblick",
    description: "Einleitender Textblock direkt unter dem Hero.",
    cssColor: "hsl(85 78% 36%)",
  },
  intro: {
    borderClass: "border-l-lime-600",
    badgeClass: "bg-lime-600/15 text-lime-700 dark:text-lime-300",
    label: "Intro",
    description: "Kurzer Einleitungstext.",
    cssColor: "hsl(85 78% 36%)",
  },
  "answer-first": {
    borderClass: "border-l-lime-600",
    badgeClass: "bg-lime-600/15 text-lime-700 dark:text-lime-300",
    label: "Antwort zuerst",
    description: "Direkte Antwort auf die Kernfrage der Seite — bewusst weit oben.",
    cssColor: "hsl(85 78% 36%)",
  },
  benefits: {
    borderClass: "border-l-amber-500",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    label: "Vorteile",
    description: "Kachelblock mit Vorteilen oder Argumenten (Symbol + Titel + Text).",
    cssColor: "hsl(38 92% 50%)",
  },
  card_v1: {
    borderClass: "border-l-emerald-500",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    label: "Standardkarte",
    description:
      "Standardkarte (technisch card_v1) — eine einzelne Karte. Welche Module (Bild, Icon, Text, Features, Links, CTA) wirklich gezeigt werden, bestimmt der Container darüber (Kartenraster oder Kartenscroller).",
    cssColor: "hsl(160 84% 39%)",
  },
  products: {
    borderClass: "border-l-orange-500",
    badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
    label: "Kartenraster",
    description:
      "Kartenraster (technisch cards_v1) — Sammelblock mit mehreren Standardkarten in einem responsiven Raster (1–3 Spalten). Der Container bestimmt das Layout, die einzelnen Karten den Inhalt.",
    cssColor: "hsl(25 95% 53%)",
  },
  feature: {
    borderClass: "border-l-violet-500",
    badgeClass: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    label: "Feature",
    description: "Großer Feature-Block mit Bild und Text nebeneinander (FeatureBlock).",
    cssColor: "hsl(258 90% 66%)",
  },
  "feature-grid": {
    borderClass: "border-l-violet-500",
    badgeClass: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    label: "Feature-/Icon-Raster",
    description:
      "Raster aus Iconkarten (technisch feature_grid_v1) — zeigt Icon + Titel + Text. Bild-Slots der Karten werden hier ignoriert.",
    cssColor: "hsl(258 90% 66%)",
  },
  cta: {
    borderClass: "border-l-rose-500",
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    label: "Call to Action",
    description: "Aufforderung zum Handeln (Button mit Link, z. B. Kontaktaufnahme).",
    cssColor: "hsl(347 77% 60%)",
  },
  "product-scroller": {
    borderClass: "border-l-orange-500",
    badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
    label: "Kartenscroller",
    description:
      "Kartenscroller (technisch product_scroller_v1) — Sammelblock mit horizontal scrollbaren Standardkarten. Karten zeigen 4:3-Bild + Titel + Text; ohne Bild wirkt der Scroller leer.",
    cssColor: "hsl(25 95% 53%)",
  },
  content_block_v1: {
    borderClass: "border-l-teal-500",
    badgeClass: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
    label: "Content-Block",
    description: "Einer der großen Themen-Blöcke der Startseite (Bild + Text + Link).",
    cssColor: "hsl(173 80% 40%)",
  },
  content_blocks_intro_v1: {
    borderClass: "border-l-slate-400",
    badgeClass: "bg-slate-400/15 text-slate-700 dark:text-slate-300",
    label: "Block-Intro",
    description: "Überschrift + Einleitung über den Content-Blöcken.",
    cssColor: "hsl(215 16% 65%)",
  },
  rich: {
    borderClass: "border-l-indigo-400",
    badgeClass: "bg-indigo-400/15 text-indigo-700 dark:text-indigo-300",
    label: "Rich-Text",
    description: "Längerer formatierter Textblock (Fließtext mit Auszeichnungen).",
    cssColor: "hsl(234 89% 74%)",
  },
  stats_v1: {
    borderClass: "border-l-cyan-500",
    badgeClass: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
    label: "Kennzahlen",
    description: "Zahlenblock mit Statistiken/Kennzahlen.",
    cssColor: "hsl(189 94% 43%)",
  },
  teaser_2col_v1: {
    borderClass: "border-l-purple-500",
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
    label: "Wechselteaser",
    description:
      "2-Spalten-Teaser (Bild + Text) mit Bild/Text-Wechsel, 16:9-Bildformat, Hover-Zoom und optionalem CTA.",
    cssColor: "hsl(270 91% 65%)",
  },
};

// Aliase: Versionen wie `_v1` auf den jeweiligen Basistyp mappen.
// (DB-Realität: alle Typen tragen den `_v1`-Suffix.)
const ALIASES: Record<string, string> = {
  hero_v1: "hero",
  cta_v1: "cta",
  content_v1: "content",
  cards_v1: "products",
  list_v1: "benefits",
  rich_v1: "rich",
  product_scroller_v1: "product-scroller",
  faq_v1: "content",
  feature_grid_v1: "feature-grid",
  role_tabs_v1: "feature",
  // Etappe „cms-light-admin-realitaetsabgleich-raster-scroller-standardkarte-1":
  // Hub-/Filter-/Download-Container redaktionell sprechend benennen.
  card_grid_v1: "products",
  catalog_filter_grid_v1: "products",
  download_list_v1: "products",
};

// Spezial-Labels für Container, die im ALIASES auf `products` zeigen, aber
// redaktionell anders heißen sollen. Wird vor dem Alias-Lookup geprüft.
const SPECIAL_LABEL_OVERRIDES: Record<string, { label: string; description: string }> = {
  card_grid_v1: {
    label: "Hub-Raster",
    description:
      "Hub-Raster (technisch card_grid_v1) — Übersichtsraster für Hub-Seiten. Karten zeigen ein kleines Vorschaubild (Thumbnail) und führen in Unterbereiche.",
  },
  catalog_filter_grid_v1: {
    label: "Produktfilter-Raster",
    description:
      "Produktfilter-Raster (technisch catalog_filter_grid_v1) — gefiltertes Produktraster. Karten zeigen Thumbnail + Filter-Metadaten.",
  },
  download_list_v1: {
    label: "Download-Liste",
    description:
      "Download-Liste (technisch download_list_v1) — vertikale Liste mit Dateien. Liest aktuell `download_item_v1`-Kinder, keine Karten-Bilder.",
  },
};

export function blockTypeStyle(
  sectionType: string | null | undefined,
  sectionKey?: string | null,
): BlockTypeStyle {
  if (!sectionType) return FALLBACK;
  // Etappe `cms-light-tree-single-open-und-kein-rueckspring-1`:
  // `cards_v1`-Container mit `section_key="products"` werden auf den
  // Produktseiten öffentlich als horizontaler Scroller gerendert
  // (siehe TuerenTorePage/ZufahrtenParkplaetzePage/…). Der Admin labelt
  // sie deshalb redaktionell als „Kartenscroller", nicht als
  // „Kartenraster" — das spiegelt die öffentliche Realität wider.
  if (sectionType === "cards_v1" && sectionKey === "products") {
    const scroller = STYLES["product-scroller"];
    if (scroller) return scroller;
  }
  const aliased = ALIASES[sectionType] ?? sectionType;
  const direct = STYLES[aliased];
  if (direct) {
    const override = SPECIAL_LABEL_OVERRIDES[sectionType];
    if (override) {
      return { ...direct, label: override.label, description: override.description };
    }
    return direct;
  }
  // Heuristik: alles, was mit „card_" beginnt, ist eine Karte.
  if (aliased.startsWith("card_")) return STYLES.card_v1;
  return { ...FALLBACK, label: sectionType };
}

