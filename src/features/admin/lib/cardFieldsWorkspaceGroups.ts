/**
 * Allgemeine Gruppierung für `card_v1`-Felder im Admin-Arbeitsbereich
 * (Etappe `cms-light-standardkarte-admin-arbeitsbereich-vollausbau-1`).
 *
 * Reine UI-Klassifikation auf vorhandenen `field_key`-Werten:
 *  - Schreibt nichts.
 *  - Verändert keine DB-Strukturen.
 *  - Versteckt nie vorhandene DB-Felder. Unbekanntes landet in
 *    `technisch` und bleibt dort sichtbar.
 *  - Asset-Slots (image/thumbnail/icon_image) werden ABSICHTLICH nicht
 *    eingruppiert — die laufen weiterhin über `SectionAssetsBlock`.
 *
 * Sie unterscheidet sich bewusst von der Bildkarten-Pilotlogik
 * (`cardFieldGroups.ts`), die hart auf `aussenstationen`/`innenstationen`
 * zugeschnitten ist und Slots wie `thumbnail`/`icon_image` global
 * ausblendet — diese Sonderannahmen dürfen nicht auf alle Karten kippen.
 */
import type { CardVariantKey } from "@/features/cms/contract/sectionTypes";

export type CardGroupKey =
  | "grunddaten"
  | "medien"
  | "sichtbarkeit"
  | "features"
  | "links"
  | "technisch";

export interface CardGroupDef {
  key: CardGroupKey;
  label: string;
  /** Kurze Erklärung in Klammern-Stil für die Redaktion. */
  hint: string;
  /** Standard-Aufklapp-Verhalten, kann durch Inhalt überschrieben werden. */
  defaultOpen: boolean;
}

export const CARD_GROUPS: ReadonlyArray<CardGroupDef> = [
  {
    key: "grunddaten",
    label: "Grunddaten (Eyebrow, Titel, Beschreibung)",
    hint: "Sichtbare Texte der Karte — Eyebrow (kleine Zeile darüber), Titel, Beschreibung.",
    defaultOpen: true,
  },
  {
    key: "medien",
    label: "Medien & Icon",
    hint: "Lucide-Iconname als Textfeld. Bilder/Thumbnails/Bildicons werden weiter unten als Asset-Slots gepflegt.",
    defaultOpen: true,
  },
  {
    key: "sichtbarkeit",
    label: "Sichtbarkeit (Toggles)",
    hint: "Schaltfelder, die einzelne Teile der Karte ein- oder ausblenden (z. B. eyebrow_enabled).",
    defaultOpen: false,
  },
  {
    key: "features",
    label: "Features (Aufzählung)",
    hint: "Bis zu 5 kurze Aufzählungspunkte (features.0 – features.4).",
    defaultOpen: false,
  },
  {
    key: "links",
    label: "Links / Call-to-Action",
    hint: "Buttons (cta_label/cta_href) und weiterführende Links (link_1 – link_3, href).",
    defaultOpen: true,
  },
  {
    key: "technisch",
    label: "Technik / Altbestand",
    hint: "Alias-Felder, nicht im Vertrag erfasste Felder (Altbestand) und fehlende Pflichtfelder. Nicht löschen, sondern sichtbar lassen.",
    defaultOpen: false,
  },
];

const GRUND_KEYS: ReadonlySet<string> = new Set([
  "eyebrow",
  "label",
  "kicker",
  "subtitle",
  "subheadline",
  "subline",
  "title",
  "headline",
  "intro",
  "lead",
  "text",
  "description",
  "beschreibung",
  "desc",
  "body",
]);

const LINK_TOP: ReadonlySet<string> = new Set([
  "cta_label",
  "cta_href",
  "cta_link",
  "href",
]);

const isFeatureKey = (fk: string) => /^features\.\d+/.test(fk);
const isLinkNKey = (fk: string) => /^link_[1-3]_(label|href|kind)$/.test(fk);
const isNestedHref = (fk: string) => /^items\.\d+\.href$/.test(fk);

/**
 * Klassifiziert einen Field-Key in genau eine Anzeige-Gruppe.
 * Wenn die Variantenerkennung (`card_v1`) für einen Field-Key keine
 * sinnvolle Gruppe kennt, landet er bewusst in `technisch` — nie verstecken.
 */
export function classifyCardFieldKey(fk: string): CardGroupKey {
  if (fk.endsWith("_enabled")) return "sichtbarkeit";
  if (isFeatureKey(fk)) return "features";
  if (isLinkNKey(fk) || LINK_TOP.has(fk) || isNestedHref(fk)) return "links";
  if (fk === "icon") return "medien";
  if (GRUND_KEYS.has(fk)) return "grunddaten";
  return "technisch";
}

/**
 * Liefert eine kurze Hinweiszeile für die Preset-spezifische Bedeutung
 * einer Gruppe. Wird im Akkordeon-Header als kleine Beschreibung angezeigt.
 * Verändert keine Sichtbarkeit von Feldern — informativ.
 */
export function presetHintForGroup(
  group: CardGroupKey,
  variant: CardVariantKey | undefined,
): string | null {
  if (!variant) return null;
  switch (variant) {
    case "image_card":
      if (group === "medien") return "Bildkarte: Bild-Slot `image` ist relevant.";
      if (group === "features" || group === "links") return "Bildkarte: meist nur ein CTA — Features/Multi-Links optional.";
      return null;
    case "thumbnail_card":
      if (group === "medien") return "Thumbnail-Karte: Slot `thumbnail` ist relevant — `image` wird hier nicht gelesen.";
      return null;
    case "icon_card_lucide":
      if (group === "medien") return "Iconkarte (Lucide): Textfeld `icon` ist Pflicht; `icon_image` wird nicht genutzt.";
      if (group === "features") return "Iconkarte: Aufzählung `features.0–4` ist typisch.";
      return null;
    case "icon_card_image":
      if (group === "medien") return "Iconkarte (Bildicon): Slot `icon_image` ist Pflicht; Lucide-`icon` wird nicht genutzt.";
      return null;
    case "multi_link_card":
      if (group === "links") return "Multi-Link-Karte: mehrere Link-Ziele (link_1 – link_3).";
      if (group === "features") return "Multi-Link-Karte: Features sind kein Standard — nur befüllen, wenn vorhanden.";
      return null;
    case "text_card":
      if (group === "medien") return "Textkarte: Medien sind optional.";
      return null;
    case "download_card":
      if (group === "links") return "Download-Karte: cta_href ist der Dateilink (Datei-Asset-Modell offen).";
      if (group === "medien") return "Download-Karte: keine Bild-/Icon-Slots.";
      return null;
    default:
      return null;
  }
}

/**
 * Container-abhängige Hinweise für den Karten-Arbeitsbereich
 * (Etappe `cms-light-standardkarte-admin-maske-vereinheitlichen-1`).
 *
 * Reine Anzeige, keine Verhaltensänderung. Wird im Workspace-Header
 * und im Medien-Akkordeon angezeigt, damit Redaktion sofort sieht,
 * welcher Bild-/Icon-Slot im aktuellen Container wirksam ist.
 */
export interface ContainerHint {
  /** Redaktioneller Containername, z. B. „Kartenraster". */
  containerLabel: string;
  /** Kurzer Hinweis, was der Container von der Karte rendert. */
  summary: string;
  /** Erwarteter Bild-/Icon-Slot im aktuellen Container. */
  expectedSlot: "image" | "thumbnail" | "icon_image" | "none";
  /** Ob fehlender Slot eine Warnung auslöst (statt nur Hinweis). */
  slotIsRequired: boolean;
}

export function containerHintFor(
  parentSectionType: string | null | undefined,
  parentSectionKey?: string | null | undefined,
): ContainerHint | null {
  const t = (parentSectionType ?? "").trim();
  const k = (parentSectionKey ?? "").trim();
  switch (t) {
    case "cards_v1":
      // Sonderfall: `cards_v1` mit section_key=products wird redaktionell
      // als Kartenscroller geführt (Eine-Wahrheit-Etappe).
      if (k === "products") {
        return {
          containerLabel: "Kartenscroller",
          summary:
            "Container wird als Scroller geführt — Bild und Titel sind hier Pflicht.",
          expectedSlot: "image",
          slotIsRequired: true,
        };
      }
      return {
        containerLabel: "Kartenraster",
        summary:
          "Bild ist empfohlen, aber nicht Pflicht — eine Textkarte ohne Bild ist hier legitim.",
        expectedSlot: "image",
        slotIsRequired: false,
      };
    case "product_scroller_v1":
      return {
        containerLabel: "Kartenscroller",
        summary:
          "Container erwartet 4:3-Bild, Titel und Beschreibung. Ohne Bild wirkt die Karte im Scroller leer.",
        expectedSlot: "image",
        slotIsRequired: true,
      };
    case "card_grid_v1":
      return {
        containerLabel: "Hub-Raster",
        summary: "Container liest `thumbnail`, nicht `image`.",
        expectedSlot: "thumbnail",
        slotIsRequired: true,
      };
    case "catalog_filter_grid_v1":
      return {
        containerLabel: "Produktfilter-Raster",
        summary: "Container liest `thumbnail` und Filter-Metadaten.",
        expectedSlot: "thumbnail",
        slotIsRequired: true,
      };
    case "feature_grid_v1":
      return {
        containerLabel: "Feature-/Icon-Raster",
        summary:
          "Container zeigt Icon (TCS-Bildicon oder Lucide), Titel und Beschreibung.",
        expectedSlot: "icon_image",
        slotIsRequired: true,
      };
    case "download_list_v1":
      return {
        containerLabel: "Download-Liste",
        summary:
          "Container liest aktuell nur `download_item_v1`-Kinder — eine Standardkarte hier wird nicht gerendert.",
        expectedSlot: "none",
        slotIsRequired: false,
      };
    default:
      return null;
  }
}

/**
 * Empty-State-Hinweise pro Gruppe, wenn keine Einträge vorhanden sind.
 * Werden im Arbeitsbereich angezeigt, damit Redaktion versteht, warum
 * die Gruppe leer ist — statt sie unsichtbar zu machen.
 */
export function emptyGroupHint(group: CardGroupKey): string {
  switch (group) {
    case "grunddaten":
      return "Für diese Karte sind noch keine Grundtexte (Titel/Beschreibung/Eyebrow) angelegt.";
    case "medien":
      return "Bild, Thumbnail und Icon werden weiter unten als Asset-Slots gepflegt.";
    case "sichtbarkeit":
      return "Für diese Karte sind noch keine Sichtbarkeits-Schalter angelegt.";
    case "features":
      return "Für diese Karte sind keine Aufzählungspunkte angelegt.";
    case "links":
      return "Für diese Karte sind keine Links oder CTAs angelegt.";
    case "technisch":
      return "Keine Altbestand- oder Technikfelder vorhanden.";
  }
}
