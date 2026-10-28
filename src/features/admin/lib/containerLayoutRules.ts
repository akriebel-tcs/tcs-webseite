/**
 * containerLayoutRules.ts — read-only Vertrag/Metadaten
 *
 * Etappe `cms-light-card-container-preset-review-und-layoutregeln-1`.
 *
 * Beschreibt für jeden Container-Section-Type, der heute `card_v1`-Kinder
 * rendert, die wichtigsten Layout-/Bild-Regeln, wie sie aus den Renderern
 * (`CardsSectionV1`, `ProductScrollerV1`, `FeatureGridV1`, `DownloadListV1`,
 * Hub-/Filter-Grid-Spezialrenderer) abgelesen werden können.
 *
 * Schreibt NICHTS. Verändert NICHTS. Wird vom Admin nur zur Anzeige
 * genutzt (CardPresetBadge → „Container / Layout / erwarteter Bildslot").
 *
 * Quellen (Code, read-only):
 *  - src/features/cms/components/sections/CardsSectionV1.tsx
 *  - src/features/cms/components/sections/ProductScrollerV1.tsx
 *  - src/features/cms/components/sections/FeatureGridV1.tsx
 *  - src/features/cms/components/sections/DownloadListV1.tsx
 *  - src/features/admin/lib/rendererSlotMap.ts (Erwartungskarte)
 *  - Hub-/Filter-Grid-Renderer (CategoryListPage / TuerkommunikationHubPage),
 *    lesen `card_v1.thumbnail`.
 */

import type { CardVariantKey } from "@/features/cms/contract/sectionTypes";
import type { CardModuleKey } from "@/features/cms/contract/cardModules";

export type ContainerLayoutKind =
  | "grid"
  | "scroller"
  | "hub-grid"
  | "filter-grid"
  | "feature-grid"
  | "download-list";

export interface ContainerLayoutRule {
  container_type: string;
  label: string;
  layout: ContainerLayoutKind;
  layout_description: string;
  expected_image_slot: "image" | "thumbnail" | "icon_image" | "none";
  expected_aspect_ratio: string | null;
  typical_columns: string;
  matching_presets: CardVariantKey[];
  /** Module der Standardkarte, die der Container heute tatsächlich rendert. */
  effective_modules: CardModuleKey[];
  /** Module, deren Felder/Assets der Container heute ignoriert. */
  ignored_modules: CardModuleKey[];
  /** Empfohlene Module für eine vollständige Karte in diesem Container. */
  recommended_modules: CardModuleKey[];
  notes?: string[];
}

export const CONTAINER_LAYOUT_RULES: Record<string, ContainerLayoutRule> = {
  cards_v1: {
    container_type: "cards_v1",
    label: "Kartenraster",
    layout: "grid",
    layout_description:
      "Responsives Kartenraster (1 Spalte mobil → 2 Tablet → 3 Desktop, via cardGridClass). Container darüber, Standardkarten darunter.",
    expected_image_slot: "image",
    expected_aspect_ratio: "4 / 3 (object-cover, hart im Renderer)",
    typical_columns: "1 / 2 / 3",
    matching_presets: ["image_card", "text_card", "multi_link_card"],
    // Renderer-Realität (CardsSectionV1.tsx, geprüft 2026-06-01): liest
    // title, description, subtitle (eyebrow), image, icon_image (Fallback),
    // icon (Lucide-Fallback), features.*, cta_label/cta_href.
    effective_modules: ["title", "description", "eyebrow", "image", "icon_image", "icon_lucide", "features", "cta"],
    ignored_modules: ["thumbnail", "links", "download"],
    recommended_modules: ["title", "description"],
    notes: [
      "Bild ist empfohlen, aber nicht Pflicht — Textkarten sind im Raster legitim.",
      "Wenn Karte kein `image` hat, rendert die Karte stattdessen `icon_image` oder Lucide-`icon` als Vorschau.",
      "Container-Header (label/title/intro) wird in einigen Pilot-Seiten heute noch aus i18n gespeist.",
    ],
  },
  product_scroller_v1: {
    container_type: "product_scroller_v1",
    label: "Kartenscroller",
    layout: "scroller",
    layout_description:
      "Horizontaler snap-Scroller (`overflow-x-auto snap-x snap-mandatory`), Kartenbreite 18rem (md: 20rem).",
    expected_image_slot: "image",
    expected_aspect_ratio: "4 / 3 (object-cover, hart im Renderer)",
    typical_columns: "horizontal, je nach Viewport ~1.5 – 4 sichtbar",
    matching_presets: ["image_card"],
    effective_modules: ["eyebrow", "title", "description", "image", "cta"],
    ignored_modules: ["thumbnail", "icon_lucide", "icon_image", "features", "links", "download"],
    recommended_modules: ["title", "description", "image"],
    notes: [
      "Spezialrenderer Türsprechanlagen liest zusätzlich `eyebrow`/`headline`/`beschreibung` + *_enabled-Toggles.",
    ],
  },
  card_grid_v1: {
    container_type: "card_grid_v1",
    label: "Hub-Karten-Grid (Alias-Container)",
    layout: "hub-grid",
    layout_description:
      "Wird in Hub-Seiten direkt gerendert (kein dedizierter <CardGridV1>-Komponente). Kinder lesen `thumbnail`.",
    expected_image_slot: "thumbnail",
    expected_aspect_ratio: "Hub-Page-spezifisch (kein globaler Hard-Wert)",
    typical_columns: "Hub-spezifisch (typisch 2 / 3 / 4)",
    matching_presets: ["thumbnail_card"],
    effective_modules: ["title", "description", "thumbnail", "cta"],
    ignored_modules: ["eyebrow", "image", "icon_lucide", "icon_image", "features", "links", "download"],
    recommended_modules: ["title", "thumbnail"],
    notes: [
      "Slot `image` an Karten dieses Containers ist Drift — der Hub-Renderer ignoriert ihn.",
    ],
  },
  catalog_filter_grid_v1: {
    container_type: "catalog_filter_grid_v1",
    label: "Katalog-Filter-Grid (Alias-Container)",
    layout: "filter-grid",
    layout_description:
      "Wird in CategoryListPage / TuerkommunikationHubPage direkt gerendert. Kinder liefern Thumbnail + Filter-Metadaten.",
    expected_image_slot: "thumbnail",
    expected_aspect_ratio: "Filter-Grid-spezifisch",
    typical_columns: "2 / 3 / 4 (filterabhängig)",
    matching_presets: ["thumbnail_card"],
    effective_modules: ["title", "description", "thumbnail", "cta"],
    ignored_modules: ["eyebrow", "image", "icon_lucide", "icon_image", "features", "links", "download"],
    recommended_modules: ["title", "thumbnail"],
    notes: [
      "Produktbereich — keine Produktdatenbank-Felder am Card schreiben.",
    ],
  },
  feature_grid_v1: {
    container_type: "feature_grid_v1",
    label: "Iconkarten-Grid",
    layout: "feature-grid",
    layout_description:
      "Raster 1 / 2 / 3 Spalten, kein Karten-Bild. Icon kommt aus `icon_image` (Bildicon, 12×12) oder Textfeld `icon` (Lucide, 8×8).",
    expected_image_slot: "icon_image",
    expected_aspect_ratio: "Icon quadratisch (12×12 Bildicon / 8×8 Lucide)",
    typical_columns: "1 / 2 / 3",
    matching_presets: ["icon_card_image", "icon_card_lucide"],
    effective_modules: ["title", "description", "icon_lucide", "icon_image", "features"],
    ignored_modules: ["eyebrow", "image", "thumbnail", "links", "cta", "download"],
    recommended_modules: ["title", "description", "icon_image"],
    notes: [
      "Slot `image`/`thumbnail` an Kindern wird vom Renderer ignoriert (Drift).",
    ],
  },
  download_list_v1: {
    container_type: "download_list_v1",
    label: "Download-Liste",
    layout: "download-list",
    layout_description:
      "Vertikale Liste mit Trennlinien. Renderer erwartet aktuell Kinder vom Typ `download_item_v1`, nicht `card_v1`.",
    expected_image_slot: "none",
    expected_aspect_ratio: null,
    typical_columns: "1 (Liste)",
    matching_presets: ["download_card"],
    effective_modules: ["title", "description", "download"],
    ignored_modules: ["eyebrow", "image", "thumbnail", "icon_lucide", "icon_image", "features", "links", "cta"],
    recommended_modules: ["title", "download"],
    notes: [
      "Renderer filtert heute auf `download_item_v1`. `card_v1` als Download-Kind wäre Migrationsaufgabe (siehe zielbausteine-Fahrplan).",
    ],
  },
};

/** Liefert die Layout-Regel für einen Parent-Container, falls bekannt. */
export function getContainerLayoutRule(
  parentSectionType: string | null | undefined,
): ContainerLayoutRule | null {
  if (!parentSectionType) return null;
  return CONTAINER_LAYOUT_RULES[parentSectionType] ?? null;
}

/**
 * Prüft, ob ein erkanntes Preset zur Container-Regel passt.
 * - true  → Zielstandard
 * - false → Drift / Spezialfall (Admin zeigt Hinweis)
 * - null  → Container unbekannt, keine Aussage
 */
export function presetMatchesContainer(
  parentSectionType: string | null | undefined,
  presetKey: CardVariantKey,
): boolean | null {
  const rule = getContainerLayoutRule(parentSectionType);
  if (!rule) return null;
  return rule.matching_presets.includes(presetKey);
}

/**
 * Liefert die im Container wirksamen Module für `card_v1`. Ohne bekannten
 * Container fällt der Helper auf `null` zurück (keine Aussage möglich).
 */
export function getEffectiveCardModulesForContainer(
  parentSectionType: string | null | undefined,
): { effective: CardModuleKey[]; ignored: CardModuleKey[]; recommended: CardModuleKey[] } | null {
  const rule = getContainerLayoutRule(parentSectionType);
  if (!rule) return null;
  return {
    effective: rule.effective_modules,
    ignored: rule.ignored_modules,
    recommended: rule.recommended_modules,
  };
}
