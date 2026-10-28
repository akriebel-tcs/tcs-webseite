/**
 * Editorial Section Kind — redaktionelle Klassifikation von Sections.
 *
 * Etappe „Tranche 19 — Admin-Baum-Kartenlabels": redaktionelle Variante
 * eines Blocks zusätzlich zur technischen `section_type`-Klassifikation
 * (`blockTypeStyle.ts`) anzeigen. Eine `card_v1` kann je nach gepflegtem
 * Slot eine „Bildkarte", „Thumbnail-Karte", „Iconkarte" oder „Textkarte"
 * sein — der Code unten leitet diese Variante allein aus vorhandenen
 * Admin-Daten ab (vorhandene `cms_section_fields.field_key`s + aktive
 * `cms_assets`-Slots). Keine DB-Schreibzugriffe, kein neuer Section-Typ.
 *
 * Wichtig:
 * - Keine Renderer-Änderung, keine Whitelist-/Asset-Anlage.
 * - Nur Anzeigen/Badges im Admin (Baum + Detailkopf).
 * - Bestehende Renderer-Slot-Regeln (siehe `rendererSlotMap.ts`) bleiben
 *   maßgeblich — wir leiten Labels nur aus tatsächlich vorhandenen
 *   Slots/Feldern ab und erfinden keine.
 */

import { blockTypeStyle } from "./blockTypeStyle";

export type EditorialKind =
  | "standardkarte"
  | "bildkarte"
  | "thumbnail-karte"
  | "iconkarte-bildicon"
  | "iconkarte-lucide"
  | "iconkarte"
  | "textkarte"
  | "karte"
  | "kartenraster"
  | "kartenscroller"
  | "hub-raster"
  | "produktfilter-raster"
  | "feature-icon-raster"
  | "download-liste"
  | "kartencontainer"
  | "wechselteaser"
  | "kennzahlen"
  | "kennzahl"
  | "cta"
  | "kontaktblock"
  | "legacy"
  | "default";

export interface EditorialSectionKind {
  /** Maschineller Schlüssel (für Tests/Tracing). */
  kind: EditorialKind;
  /** Deutsches Kurzlabel für das Badge. */
  label: string;
  /** Erklärungstext für Tooltip — was sieht der Redakteur, warum diese Klasse. */
  hint: string;
  /**
   * Optionaler Hinweis (z. B. „Bild fehlt"), den das UI als zusätzliches
   * Warn-Badge neben dem Typ-Badge anzeigen kann.
   */
  warning?: string;
}

/**
 * Welche Informationen die Heuristik braucht. Alles optional, sodass die
 * Funktion auch dort funktioniert, wo wir (noch) keinen Feld-/Asset-Kontext
 * geladen haben — dann fällt sie auf die technische Klassifikation zurück.
 */
export interface EditorialKindContext {
  /** Alle `field_key`s, die für diese Section in `cms_section_fields` existieren. */
  fieldKeys?: ReadonlySet<string>;
  /**
   * Aktive `cms_assets.field_key`-Slots dieser Section
   * (z. B. `"image"`, `"thumbnail"`, `"icon_image"`).
   */
  assetSlots?: ReadonlySet<string>;
  /** Whitelist-Einträge (`cms_admin_editable_fields.field_key`) dieser Section. */
  whitelistFieldKeys?: ReadonlySet<string>;
  /** Ob der Block im CMS deaktiviert ist (Legacy / ausgeblendet). */
  isInactive?: boolean;
  /**
   * Technischer Typ des Eltern-Blocks (z. B. `product_scroller_v1`,
   * `cards_v1`). Wird genutzt, um eine `card_v1` ohne Bild innerhalb
   * eines Bildkarten-Containers trotzdem als „Bildkarte" (mit Hinweis
   * „Bild fehlt") zu klassifizieren statt als „Textkarte".
   */
  parentSectionType?: string | null;
  /** Eigener `section_key` (z. B. „products"). Steuert Sonderlabels. */
  sectionKey?: string | null;
  /** `section_key` des Eltern-Containers (für Scroller-Heuristik). */
  parentSectionKey?: string | null;
}

/**
 * Container-Typen, in denen eine Karte ohne Bild als echte Inhaltslücke
 * gewertet wird (Scroller erwartet zwingend ein 4:3-Bild).
 */
const SCROLLER_CONTAINER = new Set<string>(["product_scroller_v1"]);

/**
 * Container-Typen, die Standardkarten in einem Raster anzeigen — Bild ist
 * empfohlen, aber **nicht** Pflicht (Textkarte ist legitim).
 */
const RASTER_CONTAINER = new Set<string>(["cards_v1"]);

/** Hub-/Filter-Container — primärer Slot ist `thumbnail`, nicht `image`. */
const HUB_CONTAINER = new Set<string>([
  "card_grid_v1",
  "catalog_filter_grid_v1",
]);

/** Feature-/Icon-Raster — primär `icon_image` oder Lucide-`icon`. */
const FEATURE_CONTAINER = new Set<string>(["feature_grid_v1"]);

const has = (set: ReadonlySet<string> | undefined, key: string): boolean =>
  !!set && set.has(key);

const hasAny = (ctx: EditorialKindContext, key: string): boolean =>
  has(ctx.fieldKeys, key) ||
  has(ctx.assetSlots, key) ||
  has(ctx.whitelistFieldKeys, key);

/**
 * Etappe `cms-light-admin-realitaetsabgleich-raster-scroller-standardkarte-1`:
 *
 * Karten werden NICHT mehr pauschal als „Bildkarte" gelabelt. Grundlabel
 * ist „Standardkarte"; der Hint beschreibt, welche Module aktiv sind und
 * was der Container darüber davon rendert. Eine „Bild fehlt"-Warnung gibt
 * es nur dort, wo der Container das Bild wirklich braucht (Scroller).
 */
function classifyCard(ctx: EditorialKindContext): EditorialSectionKind {
  const parentType = (ctx.parentSectionType ?? "").trim();

  // Vorhandene Module aus DB/Assets/Whitelist ableiten.
  const hasImage = has(ctx.assetSlots, "image");
  const hasThumb = has(ctx.assetSlots, "thumbnail");
  const hasIconImage = has(ctx.assetSlots, "icon_image");
  const hasIconLucide = hasAny(ctx, "icon");
  const hasFeatures =
    has(ctx.fieldKeys, "features.0") ||
    has(ctx.fieldKeys, "features.1") ||
    has(ctx.fieldKeys, "features.2");
  const hasLinks =
    has(ctx.fieldKeys, "link_1_href") ||
    has(ctx.fieldKeys, "link_2_href");

  // Modul-Hints zusammenbauen — kurz, in Klammern-Stil.
  const mods: string[] = [];
  if (hasImage) mods.push("Bild aktiv");
  if (hasThumb) mods.push("Thumbnail aktiv");
  if (hasIconImage) mods.push("Icon aktiv (TCS-Bildicon)");
  else if (hasIconLucide) mods.push("Icon aktiv (Lucide)");
  if (hasFeatures) mods.push("Features aktiv");
  if (hasLinks) mods.push("Links aktiv");

  // Container-spezifische Hinweise und ggf. Warnungen.
  let containerHint = "";
  let warning: string | undefined;

  if (SCROLLER_CONTAINER.has(parentType)) {
    containerHint =
      "Liegt im Kartenscroller — Container erwartet 4:3-Bild, Titel und Beschreibung.";
    if (!hasImage) {
      warning = "Bild fehlt";
      containerHint +=
        " Es ist noch kein Bild im Slot `image` hinterlegt — bitte ergänzen, sonst wirkt die Karte im Scroller leer.";
    }
  } else if (RASTER_CONTAINER.has(parentType)) {
    containerHint =
      "Liegt im Kartenraster — Bild ist empfohlen, aber nicht Pflicht. Eine Textkarte ohne Bild ist hier legitim.";
  } else if (HUB_CONTAINER.has(parentType)) {
    containerHint =
      "Liegt im Hub-/Filter-Raster — Container liest `thumbnail`, nicht `image`.";
    if (!hasThumb) {
      warning = "Thumbnail fehlt";
      containerHint += " Es ist noch kein Thumbnail hinterlegt.";
    }
  } else if (FEATURE_CONTAINER.has(parentType)) {
    containerHint =
      "Liegt im Feature-/Icon-Raster — Container zeigt Icon (TCS-Bildicon oder Lucide), Titel und Beschreibung.";
    if (!hasIconImage && !hasIconLucide) {
      warning = "Icon fehlt";
      containerHint += " Es ist noch kein Icon hinterlegt.";
    }
  } else if (parentType === "download_list_v1") {
    containerHint =
      "Liegt in einer Download-Liste — Container liest aktuell nur `download_item_v1`-Kinder, eine Karte hier wird nicht gerendert.";
    warning = "Container ignoriert Karte";
  } else if (!parentType) {
    containerHint =
      "Karte ohne Container (oberste Ebene) — fachlich nicht vorgesehen. Bitte unter einen Karten-Container hängen.";
    warning = "kein Container";
  } else {
    containerHint = `Liegt in „${parentType}" — Container ist nicht als Karten-Container bekannt.`;
  }

  const moduleSummary = mods.length > 0 ? `Module: ${mods.join(" · ")}.` : "Noch keine Module aktiv (Karte ist leer).";

  return {
    kind: "standardkarte",
    label: "Standardkarte",
    hint: `${moduleSummary} ${containerHint}`.trim(),
    warning,
  };
}

/**
 * Liefert die redaktionelle Variante eines Blocks.
 * Fällt für unbekannte Typen auf die technische Beschriftung zurück
 * (`blockTypeStyle.label`).
 */
export function getEditorialSectionKind(
  sectionType: string | null | undefined,
  ctx: EditorialKindContext = {},
): EditorialSectionKind {
  const t = (sectionType ?? "").trim();

  if (!t) {
    return { kind: "default", label: "Block", hint: "Inhaltsblock — Typ unbekannt." };
  }

  switch (t) {
    case "card_v1":
      return classifyCard(ctx);
    case "cards_v1":
      // `cards_v1` mit `section_key="products"` wird öffentlich als
      // horizontaler Scroller gerendert (TuerenTorePage etc.) — Admin
      // labelt entsprechend als „Kartenscroller".
      if ((ctx.sectionKey ?? "") === "products") {
        return {
          kind: "kartenscroller",
          label: "Kartenscroller",
          hint: 'Kartenscroller (technisch cards_v1, section_key „products“) — wird auf der öffentlichen Seite als horizontaler Scroller gerendert. Karten ohne Bild wirken leer.',
        };
      }
      return {
        kind: "kartenraster",
        label: "Kartenraster",
        hint: "Kartenraster (cards_v1) — Standardkarten in 1–3 Spalten. Reihenfolge und Inhalte der Karten liegen unter diesem Block.",
      };
    case "product_scroller_v1":
      return {
        kind: "kartenscroller",
        label: "Kartenscroller",
        hint: "Kartenscroller (product_scroller_v1) — horizontaler Scroller mit Standardkarten (4:3-Bild). Karten ohne Bild wirken leer.",
      };
    case "card_grid_v1":
      return {
        kind: "hub-raster",
        label: "Hub-Raster",
        hint: "Hub-Raster (card_grid_v1) — Übersicht für Hub-Seiten. Karten zeigen `thumbnail`, nicht `image`.",
      };
    case "catalog_filter_grid_v1":
      return {
        kind: "produktfilter-raster",
        label: "Produktfilter-Raster",
        hint: "Produktfilter-Raster (catalog_filter_grid_v1) — gefilterte Produktübersicht. Karten zeigen `thumbnail`.",
      };
    case "feature_grid_v1":
      return {
        kind: "feature-icon-raster",
        label: "Feature-/Icon-Raster",
        hint: "Feature-/Icon-Raster (feature_grid_v1) — Karten zeigen Icon (TCS-Bildicon oder Lucide), Titel, Beschreibung und Features.",
      };
    case "download_list_v1":
      return {
        kind: "download-liste",
        label: "Download-Liste",
        hint: "Download-Liste (download_list_v1) — liest aktuell `download_item_v1`-Kinder; `card_v1` als Download-Eintrag wird hier noch nicht gerendert.",
      };
    case "teaser_2col_v1":
      return {
        kind: "wechselteaser",
        label: "Wechselteaser",
        hint: "Zweispaltiger Teaser mit Bild + Text, Seitenwechsel im Wechsel.",
      };
    case "stats_v1":
      return {
        kind: "kennzahlen",
        label: "Kennzahlen",
        hint: "Sammelblock für mehrere Kennzahlen.",
      };
    case "stat_v1":
      return {
        kind: "kennzahl",
        label: "Kennzahl",
        hint: "Einzelne Kennzahl (Wert + Beschriftung).",
      };
    case "cta_v1":
    case "cta":
      return {
        kind: "cta",
        label: "CTA",
        hint: "Call-to-Action-Block mit Aktionsbutton.",
      };
    case "contact_block_v1":
      return {
        kind: "kontaktblock",
        label: "Kontaktblock",
        hint: "Kontaktblock mit Ansprechpartner/-daten.",
      };
    default: {
      // Fallback: technische Beschriftung aus blockTypeStyle übernehmen.
      const style = blockTypeStyle(sectionType);
      return {
        kind: "default",
        label: style.label,
        hint: style.description,
      };
    }
  }
}
