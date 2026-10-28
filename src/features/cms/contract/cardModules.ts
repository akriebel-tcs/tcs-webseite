/**
 * cardModules.ts — Modulmodell für die flexible Standardkarte `card_v1`.
 *
 * Etappe `cms-light-standardkarte-modulmodell-statt-kartenvarianten-1`.
 *
 * Idee:
 *  - `card_v1` ist der einzige technische Kartentyp.
 *  - Eine Karte besteht aus optionalen **Modulen** (Bild, Thumbnail, Icon,
 *    Eyebrow, Titel, Text, Features, Links, CTA, Download).
 *  - Welche Module **wirksam** sind (= vom Renderer tatsächlich angezeigt),
 *    entscheidet der Parent-Container — nicht die Karte selbst.
 *  - Presets (image_card, thumbnail_card, …) bleiben als redaktionelle
 *    Startzustände/Ansichten erhalten, sind aber keine eigenen Typen
 *    und keine starre Vorschrift.
 *
 * Schreibt NICHTS. Verändert NICHTS. Reines Read-only-Vertragsmodell.
 * Keine neuen DB-Felder, keine Whitelist-Erweiterung. `tags.0..4` bleiben
 * bewusst Klärpunkt und sind hier NICHT als Modul aufgenommen.
 */

import type { CardVariantKey } from "@/features/cms/contract/sectionTypes";

export type CardModuleKey =
  | "eyebrow"
  | "title"
  | "description"
  | "image"
  | "thumbnail"
  | "icon_lucide"
  | "icon_image"
  | "features"
  | "links"
  | "cta"
  | "download";

export type ModuleRendererSupport =
  | "supported" // Renderer für alle relevanten Container lesen das Modul.
  | "container-specific" // Nur bestimmte Container lesen es (s. containerLayoutRules).
  | "open"; // Spezialfall / noch nicht produktiv (z. B. download).

export interface CardModuleDef {
  key: CardModuleKey;
  label: string;
  /** Kurzbeschreibung in Redaktions-Sprache. */
  description: string;
  /** Textfelder (`cms_section_fields.field_key`), die zum Modul gehören. */
  text_fields: ReadonlyArray<string>;
  /** Asset-Slots (`cms_assets.field_key`), die zum Modul gehören. */
  asset_slots: ReadonlyArray<"image" | "thumbnail" | "icon_image">;
  /** Bekannte Toggle-Felder, die das Modul ein/ausschalten. */
  toggle_fields: ReadonlyArray<string>;
  /** Wie weit der Renderer dieses Modul heute trägt. */
  renderer_support: ModuleRendererSupport;
  /** Container-Typen, in denen das Modul produktiv gerendert wird. */
  effective_in_containers: ReadonlyArray<string>;
  /** Offene Klärpunkte / Drift-Hinweise. */
  notes?: ReadonlyArray<string>;
}

/**
 * Maschinenlesbare Beschreibung aller Standardkarten-Module.
 * Reihenfolge = redaktionelle Lesereihenfolge (Kopf → Medien → Inhalt → Links).
 */
export const CARD_MODULES: ReadonlyArray<CardModuleDef> = [
  {
    key: "eyebrow",
    label: "Eyebrow / Kicker (kleine Zeile über dem Titel)",
    description:
      "Kurze Vorzeile über dem Titel, z. B. eine Kategorie oder ein Hinweis.",
    text_fields: ["eyebrow", "subtitle", "kicker", "label", "subline"],
    asset_slots: [],
    toggle_fields: ["eyebrow_enabled", "subtitle_enabled"],
    renderer_support: "container-specific",
    effective_in_containers: ["product_scroller_v1"],
    notes: [
      "In `cards_v1`/`card_grid_v1` heute meist nicht sichtbar gerendert — Aufnahme erst nach Renderer-Review.",
    ],
  },
  {
    key: "title",
    label: "Titel",
    description: "Sichtbare Karten-Überschrift. Pflichtmodul.",
    text_fields: ["title", "headline"],
    asset_slots: [],
    toggle_fields: ["headline_enabled"],
    renderer_support: "supported",
    effective_in_containers: [
      "cards_v1",
      "product_scroller_v1",
      "card_grid_v1",
      "catalog_filter_grid_v1",
      "feature_grid_v1",
      "download_list_v1",
    ],
  },
  {
    key: "description",
    label: "Beschreibung / Fließtext",
    description: "Beschreibungstext unter dem Titel.",
    text_fields: ["description", "beschreibung", "desc", "text", "body"],
    asset_slots: [],
    toggle_fields: ["beschreibung_enabled", "description_enabled"],
    renderer_support: "supported",
    effective_in_containers: [
      "cards_v1",
      "product_scroller_v1",
      "card_grid_v1",
      "catalog_filter_grid_v1",
      "feature_grid_v1",
      "download_list_v1",
    ],
  },
  {
    key: "image",
    label: "Bild (großes Karten-Bild)",
    description:
      "Großes Karten-Bild, typisch 4:3. Wird im Container `cards_v1` und `product_scroller_v1` gelesen.",
    text_fields: [],
    asset_slots: ["image"],
    toggle_fields: [],
    renderer_support: "container-specific",
    effective_in_containers: ["cards_v1", "product_scroller_v1"],
    notes: [
      "In `card_grid_v1`/`catalog_filter_grid_v1` wird stattdessen `thumbnail` gelesen.",
      "In `feature_grid_v1`/`download_list_v1` wird ein Karten-Bild nicht gerendert.",
    ],
  },
  {
    key: "thumbnail",
    label: "Thumbnail (kleines Vorschaubild für Hub-/Filter-Grid)",
    description:
      "Kleines Vorschaubild für Hub- und Katalog-Filter-Grids. Wird über den Slot `thumbnail` gepflegt.",
    text_fields: [],
    asset_slots: ["thumbnail"],
    toggle_fields: [],
    renderer_support: "container-specific",
    effective_in_containers: ["card_grid_v1", "catalog_filter_grid_v1"],
    notes: [
      "Slot `thumbnail` in `cards_v1`/`product_scroller_v1` wird von den Renderern aktuell nicht angezeigt.",
    ],
  },
  {
    key: "icon_lucide",
    label: "Icon (Lucide, als Iconname)",
    description:
      "Iconname aus dem Lucide-Set (z. B. `Building2`). Wird als Textfeld `icon` gepflegt.",
    text_fields: ["icon"],
    asset_slots: [],
    toggle_fields: [],
    renderer_support: "container-specific",
    effective_in_containers: ["feature_grid_v1"],
    notes: ["In Karten-Containern (`cards_v1` etc.) heute nicht gerendert."],
  },
  {
    key: "icon_image",
    label: "Bildicon (TCS-Custom-Iconset)",
    description:
      "Quadratisches Bildicon aus dem TCS-Set. Wird über den Slot `icon_image` gepflegt.",
    text_fields: [],
    asset_slots: ["icon_image"],
    toggle_fields: [],
    renderer_support: "container-specific",
    effective_in_containers: ["feature_grid_v1"],
  },
  {
    key: "features",
    label: "Features (kleine Aufzählung in der Karte)",
    description:
      "Bis zu 5 kurze Aufzählungspunkte (`bullets.0` – `bullets.4`, Legacy-Fallback `features.0` – `features.4`).",
    text_fields: [
      "bullets.0",
      "bullets.1",
      "bullets.2",
      "bullets.3",
      "bullets.4",
      "features.0",
      "features.1",
      "features.2",
      "features.3",
      "features.4",
    ],
    asset_slots: [],
    toggle_fields: [],
    renderer_support: "container-specific",
    effective_in_containers: ["cards_v1", "product_scroller_v1", "feature_grid_v1"],
    notes: [
      "Kanonisch sind jetzt `bullets.*`; `features.*` bleibt nur Fallback für Altbestand.",
    ],
  },
  {
    key: "links",
    label: "Mehrere Link-Ziele (link_1 – link_3)",
    description:
      "Bis zu drei weiterführende Links pro Karte (Multi-Link-Karte).",
    text_fields: [
      "link_1_label",
      "link_1_href",
      "link_1_kind",
      "link_2_label",
      "link_2_href",
      "link_2_kind",
      "link_3_label",
      "link_3_href",
      "link_3_kind",
    ],
    asset_slots: [],
    toggle_fields: [],
    renderer_support: "open",
    effective_in_containers: [],
    notes: [
      "`link_N_*` ist der kanonische Link-Vertrag der Standardkarte und wird produktiv in zentralen Karten-Renderern genutzt.",
    ],
  },
  {
    key: "cta",
    label: "Call-to-Action (ein Button-Link)",
    description:
      "Ein einzelner Karten-Button oder klickbarer Bereich (`cta_label`, `cta_href`, alternativ `href`).",
    text_fields: ["cta_label", "cta_href", "href"],
    asset_slots: [],
    toggle_fields: [],
    renderer_support: "supported",
    effective_in_containers: [
      "cards_v1",
      "product_scroller_v1",
      "card_grid_v1",
      "catalog_filter_grid_v1",
    ],
    notes: [
      "Legacy-Modul: Standardkarten laufen kanonisch über `link_1..3_*`; `cta_*`/`href` bleiben nur Fallback für Altbestand.",
    ],
  },
  {
    key: "download",
    label: "Download (Datei-Link)",
    description:
      "Spätere Spezialform: Karte verlinkt eine Datei. Renderer noch offen (heute liest `download_list_v1` ausschließlich `download_item_v1`).",
    text_fields: ["cta_label", "cta_href"],
    asset_slots: [],
    toggle_fields: [],
    renderer_support: "open",
    effective_in_containers: [],
    notes: [
      "Klärpunkt: Datei-Asset-Modell + Renderer-Migration nötig, bevor `card_v1` als Download-Eintrag funktioniert.",
    ],
  },
];

/** Schneller Lookup. */
export function getCardModule(key: CardModuleKey): CardModuleDef {
  const m = CARD_MODULES.find((x) => x.key === key);
  if (!m) throw new Error(`Unknown card module: ${key}`);
  return m;
}

/* -------------------------------------------------------------------------- */
/*  Preset → Module                                                           */
/* -------------------------------------------------------------------------- */

export interface PresetModuleProfile {
  preset: CardVariantKey;
  /** Module, die das Preset als „eingeschaltet/erwartet" definiert. */
  required: ReadonlyArray<CardModuleKey>;
  /** Module, die das Preset kennt, aber nicht braucht. */
  optional: ReadonlyArray<CardModuleKey>;
  /** Module, die das Preset bewusst NICHT vorsieht. */
  not_in_preset: ReadonlyArray<CardModuleKey>;
  /** Kurze redaktionelle Bedeutung. */
  hint: string;
}

const ALL_MODULES: ReadonlyArray<CardModuleKey> = CARD_MODULES.map((m) => m.key);

function complement(
  ...used: ReadonlyArray<CardModuleKey>[]
): CardModuleKey[] {
  const u = new Set<CardModuleKey>(used.flat());
  return ALL_MODULES.filter((k) => !u.has(k));
}

export const CARD_PRESET_MODULES: Record<CardVariantKey, PresetModuleProfile> = {
  image_card: {
    preset: "image_card",
    required: ["title", "image"],
    optional: ["eyebrow", "description", "cta"],
    not_in_preset: complement(["title", "image", "eyebrow", "description", "cta"]),
    hint: "Startzustand: Bildkarte mit großem Bild und Titel — typisch in `cards_v1` / `product_scroller_v1`.",
  },
  thumbnail_card: {
    preset: "thumbnail_card",
    required: ["title", "thumbnail"],
    optional: ["description", "cta"],
    not_in_preset: complement(["title", "thumbnail", "description", "cta"]),
    hint: "Startzustand: Hub-/Filter-Karte mit Thumbnail — `image` wird in diesen Containern nicht gelesen.",
  },
  icon_card_lucide: {
    preset: "icon_card_lucide",
    required: ["title", "icon_lucide"],
    optional: ["description", "features"],
    not_in_preset: complement(["title", "icon_lucide", "description", "features"]),
    hint: "Startzustand: Iconkarte mit Lucide-Iconname (Textfeld `icon`) — typisch in `feature_grid_v1`.",
  },
  icon_card_image: {
    preset: "icon_card_image",
    required: ["title", "icon_image"],
    optional: ["description", "features"],
    not_in_preset: complement(["title", "icon_image", "description", "features"]),
    hint: "Startzustand: Iconkarte mit TCS-Bildicon (Slot `icon_image`) — typisch in `feature_grid_v1`.",
  },
  multi_link_card: {
    preset: "multi_link_card",
    required: ["title", "links"],
    optional: ["description", "eyebrow"],
    not_in_preset: complement(["title", "links", "description", "eyebrow"]),
    hint: "Startzustand: Karte mit mehreren Link-Zielen — Renderer-Unterstützung heute offen.",
  },
  text_card: {
    preset: "text_card",
    required: ["title", "description"],
    optional: ["eyebrow", "cta"],
    not_in_preset: complement(["title", "description", "eyebrow", "cta"]),
    hint: "Startzustand: Reine Textkarte — bewusst ohne Bild/Icon. Kein Fehler, sondern legitime Variante.",
  },
  download_card: {
    preset: "download_card",
    required: ["title", "download"],
    optional: ["description"],
    not_in_preset: complement(["title", "download", "description"]),
    hint: "Startzustand: Download-Eintrag — Renderer-Migration auf `card_v1` ist noch offen.",
  },
  unknown: {
    preset: "unknown",
    required: ["title"],
    optional: ["description"],
    not_in_preset: [],
    hint: "Unklarer Startzustand — bitte Container/Preset prüfen.",
  },
};

/* -------------------------------------------------------------------------- */
/*  Aktive Module aus DB-Feldern/Assets ableiten                              */
/* -------------------------------------------------------------------------- */

export interface ModuleActivity {
  module: CardModuleKey;
  /** true, wenn mindestens ein Textfeld oder Asset-Slot des Moduls vorhanden ist. */
  active: boolean;
  /** Welche konkreten Schlüssel/Slots das Modul aktivieren. */
  evidence: string[];
}

export function detectActiveCardModules(input: {
  dbFieldKeys: ReadonlyArray<string>;
  assetFieldKeys: ReadonlyArray<string>;
}): ModuleActivity[] {
  const fields = new Set(input.dbFieldKeys);
  const assets = new Set(input.assetFieldKeys);
  return CARD_MODULES.map((m) => {
    const evidence: string[] = [];
    for (const tf of m.text_fields) if (fields.has(tf)) evidence.push(tf);
    for (const a of m.asset_slots) if (assets.has(a)) evidence.push(`asset:${a}`);
    return { module: m.key, active: evidence.length > 0, evidence };
  });
}
