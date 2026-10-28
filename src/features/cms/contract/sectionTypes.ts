/**
 * Section-Type-Vertrag (maschinenlesbar)
 *
 * Quelle dieser Datenstruktur ist der Architektur-Entwurf in
 * `docs/02-architektur/section-type-vertrag-entwurf.md`. Dieses Modul
 * ist die TS-Spiegelung davon und ist **read-only**: Es wird in dieser
 * Etappe noch nicht produktiv vom Renderer oder Admin konsumiert.
 *
 * Zweck:
 *   - eine zentrale, typisierte Wahrheit, was jeder section_type darf,
 *     welche Felder er kennt, welche Asset-Slots existieren, welche
 *     Parents/Kinder erlaubt sind und wie sich Copy/Paste/Delete verhält
 *   - Grundlage für `scripts/cms/contract-audit.mjs`, das Lücken zwischen
 *     Vertrag, Renderer und (in späteren Etappen) DB meldet
 *
 * Bewusst NICHT enthalten:
 *   - Übersetzungen / i18n-Strings
 *   - Whitelist-Logik (gehört in eigene Etappe)
 *   - DB-Migrationen
 */

export type LocaleScope = "de-en" | "de-only";

export type RendererStatus =
  | "generic" // wird von CmsBodyRenderer.RENDERERS gerendert
  | "container" // generic, rendert selbst nur Kopf + Kinder
  | "special" // hat zusätzlich/ersetzend einen Spezial-Renderer (z. B. Türsprechanlagen)
  | "skip" // im CmsBodyRenderer übersprungen (z. B. hero_v1)
  | "legacy"; // hat keinen aktiven Renderer mehr, nur historische Daten

export type FieldRole = "text" | "richtext" | "url" | "toggle" | "enum" | "number";

export interface ContractTextField {
  field_key: string;
  /** Menschenlesbares Label für den Admin. */
  label: string;
  /** Optional: Pflichtgrad. `recommended` = Admin zeigt immer, leer erlaubt. */
  required: "required" | "recommended" | "optional";
  role: FieldRole;
  locale: LocaleScope;
  /** Wird der Wert auf der öffentlichen Seite gerendert? */
  public: boolean;
  /** Soll der Admin das Feld zur Bearbeitung anbieten? */
  admin: boolean;
  /** Aliase, die dieselbe Bedeutung haben (Pilot/Legacy-Namen). */
  aliases?: string[];
  /** Admin-Gruppe für UI-Gruppierung. */
  group?: string;
  /** Freitext-Hinweis für Admin/Audit. */
  note?: string;
}

export type AssetSlotKind = "image" | "thumbnail" | "icon_image" | "background";

export interface ContractAssetSlot {
  field_key: string;
  kind: AssetSlotKind;
  required: "required" | "recommended" | "optional";
  viewports: Array<"desktop" | "tablet" | "mobile">;
  public: boolean;
  admin: boolean;
  fallback?: string;
  note?: string;
}

export interface ContractCopyPasteRules {
  copyable: boolean;
  /** Darf der Block ohne Parent als Top-Level eingefügt werden? */
  pastableTopLevel: boolean;
  /** Beim Kopieren werden Kinder mitkopiert. */
  copiesChildren: boolean;
  /** Löschen erfordert Bestätigung (z. B. wegen Kindern). */
  deleteRequiresConfirm: boolean;
  /** Es darf höchstens eine Instanz pro Seite existieren. */
  singletonPerPage?: boolean;
  note?: string;
}

export interface ContractAdminGroup {
  /** Stabile Group-ID. */
  id: string;
  /** Label im Admin. */
  label: string;
  /** Soll die Gruppe sichtbar sein, auch wenn keine DB-Zeile existiert? */
  alwaysVisible: boolean;
  note?: string;
}

export interface SectionTypeContract {
  /** Kanonischer section_type (v1-Name). */
  section_type: string;
  /** Anzeigename im Admin. */
  admin_label: string;
  /** Renderer-Komponente(n) / Pfad zur Information. */
  renderer: string;
  status: RendererStatus;
  /** Darf der Typ als Top-Level-Section existieren? */
  top_level: boolean;
  /** Erlaubte Parent-Typen ('*' = beliebig, [] = keiner / nur top-level). */
  allowed_parents: string[];
  /** Erlaubte Kind-Typen ([] = keine Kinder erlaubt). */
  allowed_children: string[];
  /** Container darf 0..n Kinder haben? */
  is_container: boolean;
  /** Public/Admin-Textfelder laut Vertrag. */
  text_fields: ContractTextField[];
  /** Asset-Slots laut Vertrag. */
  asset_slots: ContractAssetSlot[];
  /** Technische Felder (Toggles, Layout-Enum, …). Nie public-sichtbarer Text. */
  technical_fields: ContractTextField[];
  copy_paste: ContractCopyPasteRules;
  admin_groups: ContractAdminGroup[];
  /** Pilot/Spezial-Hinweise, die das Audit bewusst durchwinken darf. */
  known_specials?: string[];
  /** Bewusste Doku-Konflikte für das Audit. */
  known_conflicts?: string[];
  note?: string;
}

/* -------------------------------------------------------------------------- */
/*  Hilfen                                                                    */
/* -------------------------------------------------------------------------- */

const T = (
  field_key: string,
  label: string,
  required: ContractTextField["required"] = "optional",
  extra: Partial<ContractTextField> = {},
): ContractTextField => ({
  field_key,
  label,
  required,
  role: extra.role ?? "text",
  locale: extra.locale ?? "de-en",
  public: extra.public ?? true,
  admin: extra.admin ?? true,
  aliases: extra.aliases,
  group: extra.group,
  note: extra.note,
});

const TOGGLE = (
  field_key: string,
  label: string,
  note?: string,
  group: string = "Technik",
): ContractTextField => ({
  field_key,
  label,
  required: "optional",
  role: "toggle",
  locale: "de-only",
  public: false,
  admin: true,
  group,
  note,
});

const IMG = (
  field_key: string,
  kind: AssetSlotKind,
  required: ContractAssetSlot["required"] = "optional",
  note?: string,
): ContractAssetSlot => ({
  field_key,
  kind,
  required,
  viewports: ["desktop", "tablet", "mobile"],
  public: true,
  admin: true,
  note,
});

const CP_FULL: ContractCopyPasteRules = {
  copyable: true,
  pastableTopLevel: true,
  copiesChildren: false,
  deleteRequiresConfirm: false,
};

const CP_CONTAINER: ContractCopyPasteRules = {
  copyable: true,
  pastableTopLevel: true,
  copiesChildren: true,
  deleteRequiresConfirm: true,
  note: "Mit Kindern kopieren; Löschen mit Kindern nur nach Bestätigung.",
};

const CP_CHILD_ONLY: ContractCopyPasteRules = {
  copyable: true,
  pastableTopLevel: false,
  copiesChildren: false,
  deleteRequiresConfirm: false,
  note: "Darf nur in einen passenden Container eingefügt werden.",
};

/* -------------------------------------------------------------------------- */
/*  Vertrag pro Section-Type                                                  */
/* -------------------------------------------------------------------------- */

export const SECTION_TYPE_CONTRACTS: Record<string, SectionTypeContract> = {
  hero_v1: {
    section_type: "hero_v1",
    admin_label: "Hero",
    renderer: "CmsPageLayout (Page-Hero) — im CmsBodyRenderer in SKIP_TYPES",
    status: "skip",
    top_level: true,
    allowed_parents: [],
    allowed_children: [],
    is_container: false,
    text_fields: [
      T("eyebrow", "Eyebrow (kurzer Auftakt)", "optional", { group: "Kopf", aliases: ["label"] }),
      T("headline", "Hauptüberschrift", "recommended", { group: "Kopf", aliases: ["title"] }),
      T("subline", "Unterzeile", "optional", { group: "Kopf", aliases: ["intro"] }),
      T("cta_label", "Button-Beschriftung", "optional", { group: "Link" }),
      T("cta_href", "Button-Ziel (URL)", "optional", { group: "Link", role: "url", public: true }),
    ],
    asset_slots: [IMG("image", "image", "required", "Hero-Hauptbild")],
    technical_fields: [],
    copy_paste: { ...CP_FULL, copyable: false, pastableTopLevel: false, singletonPerPage: true },
    admin_groups: [
      { id: "kopf", label: "Kopf", alwaysVisible: true },
      { id: "link", label: "Link", alwaysVisible: true },
      { id: "medien", label: "Medien", alwaysVisible: true },
    ],
    known_specials: ["Wird nicht im CmsBodyRenderer ausgegeben (SKIP_TYPES)."],
  },

  content_v1: {
    section_type: "content_v1",
    admin_label: "Textblock",
    renderer: "ContentSectionV1.tsx",
    status: "generic",
    top_level: true,
    allowed_parents: [],
    allowed_children: [],
    is_container: false,
    text_fields: [
      T("label", "Eyebrow (kurzer Auftakt)", "optional", { group: "Kopf" }),
      T("title", "Überschrift", "recommended", { group: "Kopf" }),
      T("text", "Fließtext", "recommended", { group: "Inhalt", role: "richtext", aliases: ["body", "intro"] }),
    ],
    // Optionaler Bild-Slot: Der Standard-Renderer (ContentSectionV1) zeigt
    // kein Bild, einzelne Sonderseiten (z. B. Systemdiagramm auf
    // gebaeudekommunikation.snipdoo-ip / B-061) lesen `image` jedoch aus.
    // Ohne Slot war ein vorhandenes Bild im Admin nicht austauschbar.
    asset_slots: [IMG("image", "image", "optional", "Bild (optional, nur von Sonderlayouts gelesen)")],
    technical_fields: [],
    copy_paste: CP_FULL,
    admin_groups: [
      { id: "kopf", label: "Kopf", alwaysVisible: true },
      { id: "inhalt", label: "Inhalt", alwaysVisible: true },
    ],
    known_conflicts: [
      "normalizeType aliasiert content, intro, content_block_v1, content_blocks_intro_v1 → content_v1.",
    ],
  },

  cards_v1: {
    section_type: "cards_v1",
    admin_label: "Kartencontainer (Bildkarten)",
    renderer: "CardsSectionV1.tsx",
    status: "container",
    top_level: true,
    allowed_parents: [],
    allowed_children: ["card_v1"],
    is_container: true,
    text_fields: [
      T("label", "Eyebrow (kurzer Auftakt)", "optional", { group: "Kopf" }),
      T("title", "Überschrift", "recommended", { group: "Kopf" }),
      T("intro", "Teaser (kurze Einleitung)", "optional", { group: "Kopf", role: "text" }),
    ],
    asset_slots: [],
    technical_fields: [
      T("card_aspect", "Bildformat der Karten (Layout)", "optional", {
        role: "enum",
        locale: "de-only",
        public: false,
        group: "Technik",
        note: "Werte: 21-9 | 16-9 | 4-3. Leer = automatische Ableitung aus der Reihengröße.",
      }),
    ],
    copy_paste: CP_CONTAINER,
    admin_groups: [
      { id: "kopf", label: "Kopf", alwaysVisible: true },
      { id: "kinder", label: "Karten", alwaysVisible: true },
    ],
    known_conflicts: [
      "P055 (B-2059): Header heute aus i18n, Vertrag verlangt DB-Felder label/title/intro am Container.",
    ],
  },

  product_scroller_v1: {
    section_type: "product_scroller_v1",
    admin_label: "Produkt-Scroller (Bildkarten)",
    renderer: "ProductScrollerV1.tsx (+ Spezial: TuersprechanlagenPage > ProduktScroller)",
    status: "special",
    top_level: true,
    allowed_parents: [],
    allowed_children: ["card_v1"],
    is_container: true,
    text_fields: [
      T("label", "Eyebrow (kurzer Auftakt)", "optional", { group: "Kopf" }),
      T("title", "Überschrift", "recommended", { group: "Kopf" }),
      T("intro", "Teaser (kurze Einleitung)", "optional", { group: "Kopf", role: "text" }),
    ],
    asset_slots: [],
    technical_fields: [
      T("card_aspect", "Bildformat der Karten (Layout)", "optional", {
        role: "enum",
        locale: "de-only",
        public: false,
        group: "Technik",
        note: "Werte: 21-9 | 16-9 | 4-3. Leer = automatische Ableitung aus der Reihengröße.",
      }),
    ],
    copy_paste: CP_CONTAINER,
    admin_groups: [
      { id: "kopf", label: "Kopf", alwaysVisible: true },
      { id: "kinder", label: "Karten", alwaysVisible: true },
    ],
    known_specials: [
      "Türsprechanlagen: Container-Header kommt aus i18n (tuersprechanlagen.*), nicht aus DB.",
      "Spezial-Renderer liest zusätzlich card.eyebrow/headline/beschreibung sowie *_enabled-Toggles.",
    ],
  },

  product_showcase_list_v1: {
    section_type: "product_showcase_list_v1",
    admin_label: "Produkt-Showcase (gestapelte 2-Spalten-Liste)",
    renderer: "ProductShowcaseListV1.tsx",
    status: "generic",
    top_level: true,
    allowed_parents: [],
    allowed_children: ["card_v1"],
    is_container: true,
    text_fields: [
      T("label", "Eyebrow (kurzer Auftakt)", "optional", { group: "Kopf" }),
      T("title", "Überschrift", "recommended", { group: "Kopf" }),
      T("intro", "Teaser (kurze Einleitung)", "optional", { group: "Kopf", role: "richtext" }),
    ],
    asset_slots: [],
    technical_fields: [],
    copy_paste: CP_CONTAINER,
    admin_groups: [
      { id: "kopf", label: "Kopf", alwaysVisible: true },
      { id: "kinder", label: "Karten", alwaysVisible: true },
    ],
    known_specials: [
      "Bewusst gestapelt — kein horizontaler Scroller. Alternierendes Bild-/Text-Layout.",
    ],
  },

  card_v1: {
    section_type: "card_v1",
    admin_label: "Karte (flexible Standard-Karte mit Presets)",
    renderer: "via Eltern (CardsSectionV1 / ProductScrollerV1 / Spezial)",
    status: "generic",
    // Zielmodell-Fixierung (Sprint zielbausteine-standardkarte):
    // `card_v1` ist der kanonische Kartentyp im CMS-Light. Die fachlichen
    // Varianten leben als Presets im Variantenmodell unten
    // (`CARD_V1_VARIANTS`) und werden NICHT als eigene Section-Types
    // ausgeprägt. Container (cards_v1, product_scroller_v1, card_grid_v1,
    // catalog_filter_grid_v1, feature_grid_v1, download_list_v1) bestimmen
    // das Layout; die Karte bestimmt den Inhalt.
    //
    // Offener Klärpunkt (bewusst NICHT im Vertrag, nicht geseedet):
    //   `tags.0..4` (aus PDF „Seiteninhaltselemente-Übersicht"). Felder
    //   sind heute weder in der Whitelist noch im Renderer vorgesehen.
    //   Aufnahme nur, wenn Whitelist + Renderer in einer eigenen Etappe
    //   gleichzeitig nachgezogen werden (sonst Admin-/Renderer-Drift).
    top_level: false,
    allowed_parents: [
      "cards_v1",
      "product_scroller_v1",
      "product_showcase_list_v1",
      "card_grid_v1",
      "catalog_filter_grid_v1",
      "feature_grid_v1",
      "download_list_v1",
    ],
    allowed_children: [],
    is_container: false,
    text_fields: [
      T("subtitle", "Eyebrow (kurzer Auftakt)", "optional", { group: "Kopf", aliases: ["eyebrow"] }),
      T("title", "Karten-Titel", "recommended", { group: "Kopf", aliases: ["headline"] }),
      T("description", "Karten-Text", "optional", { group: "Inhalt", role: "text", aliases: ["beschreibung"] }),
      T("icon", "Lucide-Iconname", "optional", { group: "Icon" }),
      T("bullets.0", "Bulletpoint 1", "optional", { group: "Bulletpoints", aliases: ["features.0"] }),
      T("bullets.1", "Bulletpoint 2", "optional", { group: "Bulletpoints", aliases: ["features.1"] }),
      T("bullets.2", "Bulletpoint 3", "optional", { group: "Bulletpoints", aliases: ["features.2"] }),
      T("bullets.3", "Bulletpoint 4", "optional", { group: "Bulletpoints", aliases: ["features.3"] }),
      T("bullets.4", "Bulletpoint 5", "optional", { group: "Bulletpoints", aliases: ["features.4"] }),
      T("chips.0", "Chip 1", "optional", { group: "Chips" }),
      T("chips.1", "Chip 2", "optional", { group: "Chips" }),
      T("chips.2", "Chip 3", "optional", { group: "Chips" }),
      T("chips.3", "Chip 4", "optional", { group: "Chips" }),
      T("chips.4", "Chip 5", "optional", { group: "Chips" }),
      T("cta_label", "Button-Beschriftung", "optional", { group: "Link" }),
      T("cta_href", "Button-Ziel (URL)", "optional", { group: "Link", role: "url" }),
      T("href", "Karten-Sprungziel (URL)", "optional", { group: "Link", role: "url" }),
      T("features.0", "Feature 1 (Bullet)", "optional", { group: "Features" }),
      T("features.1", "Feature 2 (Bullet)", "optional", { group: "Features" }),
      T("features.2", "Feature 3 (Bullet)", "optional", { group: "Features" }),
      T("features.3", "Feature 4 (Bullet)", "optional", { group: "Features" }),
      T("features.4", "Feature 5 (Bullet)", "optional", { group: "Features" }),
      T("link_1_label", "Link 1 — Beschriftung", "optional", { group: "Links" }),
      T("link_1_href", "Link 1 — URL", "optional", { group: "Links", role: "url" }),
      T("link_1_kind", "Link 1 — Art (primary/secondary/text)", "optional", { group: "Links", role: "enum" }),
      T("link_2_label", "Link 2 — Beschriftung", "optional", { group: "Links" }),
      T("link_2_href", "Link 2 — URL", "optional", { group: "Links", role: "url" }),
      T("link_2_kind", "Link 2 — Art", "optional", { group: "Links", role: "enum" }),
      T("link_3_label", "Link 3 — Beschriftung", "optional", { group: "Links" }),
      T("link_3_href", "Link 3 — URL", "optional", { group: "Links", role: "url" }),
      T("link_3_kind", "Link 3 — Art", "optional", { group: "Links", role: "enum" }),
    ],
    asset_slots: [
      IMG("image", "image", "optional", "Hauptbild (Bildkarte)"),
      IMG("thumbnail", "thumbnail", "optional", "Thumbnail (Hub/Filter-Grid)"),
      IMG("icon_image", "icon_image", "optional", "TCS-Bildicon (Iconkarte)"),
    ],
    technical_fields: [
      TOGGLE("image_enabled", "Hauptbild anzeigen (0/1)"),
      TOGGLE("icon_enabled", "Icon anzeigen (0/1)"),
      TOGGLE("eyebrow_enabled", "Eyebrow anzeigen (0/1)"),
      TOGGLE("bullets_0_enabled", "Bulletpoint 1 anzeigen (0/1)"),
      TOGGLE("bullets_1_enabled", "Bulletpoint 2 anzeigen (0/1)"),
      TOGGLE("bullets_2_enabled", "Bulletpoint 3 anzeigen (0/1)"),
      TOGGLE("bullets_3_enabled", "Bulletpoint 4 anzeigen (0/1)"),
      TOGGLE("bullets_4_enabled", "Bulletpoint 5 anzeigen (0/1)"),
      TOGGLE("chips_0_enabled", "Chip 1 anzeigen (0/1)"),
      TOGGLE("chips_1_enabled", "Chip 2 anzeigen (0/1)"),
      TOGGLE("chips_2_enabled", "Chip 3 anzeigen (0/1)"),
      TOGGLE("chips_3_enabled", "Chip 4 anzeigen (0/1)"),
      TOGGLE("chips_4_enabled", "Chip 5 anzeigen (0/1)"),
      TOGGLE("features_0_enabled", "Feature 1 anzeigen (0/1)"),
      TOGGLE("features_1_enabled", "Feature 2 anzeigen (0/1)"),
      TOGGLE("features_2_enabled", "Feature 3 anzeigen (0/1)"),
      TOGGLE("features_3_enabled", "Feature 4 anzeigen (0/1)"),
      TOGGLE("features_4_enabled", "Feature 5 anzeigen (0/1)"),
      TOGGLE("link_1_enabled", "Link 1 anzeigen (0/1)"),
      TOGGLE("link_2_enabled", "Link 2 anzeigen (0/1)"),
      TOGGLE("link_3_enabled", "Link 3 anzeigen (0/1)"),
    ],
    copy_paste: CP_CHILD_ONLY,
    admin_groups: [
      { id: "kopf", label: "Kopf", alwaysVisible: true },
      { id: "medien", label: "Medien", alwaysVisible: true },
      { id: "icon", label: "Icon", alwaysVisible: false },
      { id: "inhalt", label: "Inhalt", alwaysVisible: true },
      { id: "features", label: "Features", alwaysVisible: false },
      { id: "links", label: "Links", alwaysVisible: false },
      { id: "technik", label: "Technik (Schalter)", alwaysVisible: false },
    ],
    known_conflicts: [
      "Aliase eyebrow/headline/beschreibung werden generisch nicht gelesen (nur Spezial-Renderer).",
      "feature_grid_v1-Kinder dürfen kein image — Admin muss dort image-Slot ausblenden.",
      "card_grid_v1 / catalog_filter_grid_v1 lesen thumbnail, nicht image.",
    ],
  },

  feature_grid_v1: {
    section_type: "feature_grid_v1",
    admin_label: "Iconkarten-Grid",
    renderer: "FeatureGridV1.tsx",
    status: "container",
    top_level: true,
    allowed_parents: [],
    allowed_children: ["card_v1"],
    is_container: true,
    text_fields: [
      T("label", "Eyebrow", "optional", { group: "Kopf" }),
      T("title", "Überschrift", "recommended", { group: "Kopf" }),
      T("intro", "Einleitung", "optional", { group: "Kopf", role: "text" }),
    ],
    asset_slots: [],
    technical_fields: [],
    copy_paste: CP_CONTAINER,
    admin_groups: [
      { id: "kopf", label: "Kopf", alwaysVisible: true },
      { id: "kinder", label: "Iconkarten", alwaysVisible: true },
    ],
    known_conflicts: ["Kinder sind Iconkarten — image/thumbnail an Kindern bewusst nicht gerendert."],
  },

  teaser_2col_v1: {
    section_type: "teaser_2col_v1",
    admin_label: "Wechselteaser (2 Spalten)",
    renderer: "Teaser2ColV1.tsx",
    status: "generic",
    top_level: true,
    allowed_parents: [],
    allowed_children: [],
    is_container: false,
    text_fields: [
      T("label", "Eyebrow", "optional", { group: "Kopf" }),
      T("title", "Überschrift", "recommended", { group: "Kopf" }),
      T("text", "Fließtext", "recommended", { group: "Inhalt", role: "text" }),
      T("cta_label", "Button-Beschriftung", "optional", { group: "Link" }),
      T("cta_link", "Button-Ziel (URL)", "optional", { group: "Link", role: "url", note: "Achtung: cta_link, NICHT cta_href." }),
    ],
    asset_slots: [IMG("image", "image", "required", "Teaserbild")],
    technical_fields: [
      T("background_variant", "Hintergrund-Variante (Layout)", "optional", { group: "Technik", role: "enum", public: false, locale: "de-only" }),
      T("image_position", "Bildposition links/rechts", "optional", { group: "Technik", role: "enum", public: false, locale: "de-only" }),
      T("cta_kind", "Absprung-Darstellung (link | button)", "optional", { group: "Technik", role: "enum", public: false }),
      T("cta_enabled", "Knopf sichtbar (1 = ja, 0 = nein)", "optional", { group: "Technik", role: "enum", public: false, note: "Leer oder 1 = Knopf wird gezeigt (sofern Beschriftung und Ziel gefüllt sind), 0 = ausgeblendet." }),
    ],
    copy_paste: CP_FULL,
    admin_groups: [
      { id: "kopf", label: "Kopf", alwaysVisible: true },
      { id: "inhalt", label: "Inhalt", alwaysVisible: true },
      { id: "medien", label: "Medien", alwaysVisible: true },
      { id: "link", label: "Link", alwaysVisible: true },
      { id: "technik", label: "Technik (Layout)", alwaysVisible: false },
    ],
    known_conflicts: ["cta_link vs. cta_href: niemals im selben Adminfeld vermischen."],
  },

  faq_v1: {
    section_type: "faq_v1",
    admin_label: "FAQ",
    renderer: "FaqV1.tsx",
    status: "generic",
    top_level: true,
    allowed_parents: [],
    allowed_children: [],
    is_container: false,
    text_fields: [
      T("eyebrow", "Eyebrow", "optional", { group: "Kopf", aliases: ["label"] }),
      T("headline", "Überschrift", "recommended", { group: "Kopf", aliases: ["title"] }),
      T("intro", "Einleitung", "optional", { group: "Kopf", role: "richtext" }),
    ],
    asset_slots: [],
    technical_fields: [],
    copy_paste: CP_FULL,
    admin_groups: [
      { id: "kopf", label: "Kopf", alwaysVisible: true },
      { id: "items", label: "FAQ-Items", alwaysVisible: true },
    ],
    known_specials: [
      "Items leben als Felder items.<slug>.frage|antwort (nicht als Kindsection).",
      "Renderer akzeptiert drei Schemata: items.<slug>.frage|antwort, items.<slug>.question|answer, items.<n>.q|a.",
      "Optionales Item-CTA pro FAQ-Eintrag: items.<slug>.cta_label (Beschriftung) + items.<slug>.cta_href (URL, Pfad oder Kurz-ID). Nur sichtbar, wenn BEIDE Felder gefüllt sind. Intern (/route), extern (https://…, mailto:, tel:) und Kurz-IDs werden vom Renderer aufgelöst. Whitelist muss `items.<slug>.cta_label` + `items.<slug>.cta_href` (DE+EN) freigeben, damit die Redaktion sie pflegen kann.",
    ],
  },

  cta_v1: {
    section_type: "cta_v1",
    admin_label: "Call-to-Action",
    renderer: "CtaV1.tsx",
    status: "generic",
    top_level: true,
    allowed_parents: [],
    allowed_children: [],
    is_container: false,
    text_fields: [
      T("title", "Überschrift", "recommended", { group: "Kopf" }),
      T("text", "Fließtext", "optional", { group: "Inhalt", role: "text" }),
      T("cta_label", "Primär-Button: Beschriftung", "recommended", { group: "Primär-Button" }),
      T("cta_kind", "Primär-Button: Linkart (intern · extern · shortid)", "optional", {
        group: "Primär-Button",
        role: "enum",
        locale: "de-only",
        public: false,
        note: "Reine Eingabehilfe für den Admin: steuert den Platzhalter im Ziel-Feld. Werte: 'intern' (interner Pfad wie /produkte/eingangssysteme), 'extern' (https://…), 'shortid' (Kurz-ID wie P-203 oder B-014). Auf der öffentlichen Seite wird nur das Ziel-URL-Feld gerendert.",
      }),
      T("cta_href", "Primär-Button: Ziel (URL, Pfad oder Kurz-ID)", "recommended", { group: "Primär-Button", role: "url" }),
      T("cta_primary_color", "Primär-Button: Farbe (auto · dunkel · hell)", "optional", {
        group: "Primär-Button",
        role: "enum",
        locale: "de-only",
        public: true,
        note: "Werte: 'auto' (folgt Hintergrund, Standard), 'dark' (schwarzer Button mit weißer Schrift), 'light' (weißer Button mit schwarzer Schrift).",
      }),
      T("cta_secondary_label", "Sekundär-Button: Beschriftung", "optional", { group: "Sekundär-Button" }),
      T("cta_secondary_kind", "Sekundär-Button: Linkart (intern · extern · shortid)", "optional", {
        group: "Sekundär-Button",
        role: "enum",
        locale: "de-only",
        public: false,
        note: "Reine Eingabehilfe für den Admin: steuert den Platzhalter im Ziel-Feld. Werte: 'intern', 'extern', 'shortid'. Auf der öffentlichen Seite wird nur das Ziel-URL-Feld gerendert.",
      }),
      T("cta_secondary_href", "Sekundär-Button: Ziel (URL, Pfad oder Kurz-ID)", "optional", { group: "Sekundär-Button", role: "url" }),
      T("cta_secondary_color", "Sekundär-Button: Farbe (auto · dunkel · hell)", "optional", {
        group: "Sekundär-Button",
        role: "enum",
        locale: "de-only",
        public: true,
        note: "Werte: 'auto' (folgt Hintergrund, Standard), 'dark' (dunkle Outline), 'light' (helle Outline).",
      }),
      T("phone_label", "Telefon: Anzeige-Text (z. B. +49 7191 123 456-7)", "optional", { group: "Kontakt" }),
      T("phone_href", "Telefon: Wählbare Nummer (z. B. tel:+4971911234567)", "optional", { group: "Kontakt", role: "url" }),
      T("email_label", "E-Mail: Anzeige-Text (z. B. info@tcsag.de)", "optional", { group: "Kontakt" }),
      T("email_href", "E-Mail: mailto-Link (z. B. mailto:info@tcsag.de)", "optional", { group: "Kontakt", role: "url" }),
      T("background_variant", "Hintergrund (hell oder dunkel)", "optional", {
        group: "Hintergrund",
        role: "enum",
        locale: "de-only",
        public: true,
        note: "Werte: 'light' (heller Hintergrund, dunkle Buttons — Standard) oder 'dark' (dunkler Hintergrund, helle Buttons).",
      }),
    ],
    asset_slots: [IMG("image", "background", "optional", "Hintergrundbild (optional)")],
    technical_fields: [
      TOGGLE("show_secondary", "Sekundär-Button anzeigen", "Schalter an = der Sekundär-Button wird auf der öffentlichen Seite gerendert (zusätzlich muss die Beschriftung gesetzt sein).", "Sekundär-Button"),
      TOGGLE("show_phone", "Telefon-Zeile anzeigen", "Schalter an = Telefon-Zeile wird unter den Buttons eingeblendet.", "Kontakt"),
      TOGGLE("show_email", "E-Mail-Zeile anzeigen", "Schalter an = E-Mail-Zeile wird unter den Buttons eingeblendet.", "Kontakt"),
    ],
    copy_paste: CP_FULL,
    admin_groups: [
      { id: "kopf", label: "Kopf", alwaysVisible: true },
      { id: "inhalt", label: "Inhalt", alwaysVisible: true },
      { id: "primaer-button", label: "Primär-Button", alwaysVisible: true },
      { id: "sekundaer-button", label: "Sekundär-Button", alwaysVisible: true, note: "Schalter oben rechts steuert die Sichtbarkeit auf der öffentlichen Seite." },
      { id: "kontakt", label: "Kontakt", alwaysVisible: true, note: "Telefon-/E-Mail-Zeile unter den Buttons. Schalter oben rechts steuern die Sichtbarkeit." },
      { id: "hintergrund", label: "Hintergrund", alwaysVisible: true, note: "Heller (Standard) oder dunkler Hintergrund." },
      { id: "medien", label: "Medien", alwaysVisible: false, note: "Optionales Hintergrundbild." },
    ],
  },

  rich_v1: {
    section_type: "rich_v1",
    admin_label: "Rich-Text-Block",
    renderer: "RichV1.tsx",
    status: "generic",
    top_level: true,
    allowed_parents: [],
    allowed_children: [],
    is_container: false,
    text_fields: [
      T("title", "Überschrift", "optional", { group: "Kopf" }),
      T("body", "Rich-Text (HTML/Markdown)", "recommended", { group: "Inhalt", role: "richtext" }),
    ],
    asset_slots: [],
    technical_fields: [],
    copy_paste: CP_FULL,
    admin_groups: [
      { id: "kopf", label: "Kopf", alwaysVisible: true },
      { id: "inhalt", label: "Inhalt", alwaysVisible: true },
    ],
  },

  tabs_v1: {
    section_type: "tabs_v1",
    admin_label: "Tabs",
    renderer: "TabsV1.tsx",
    status: "container",
    top_level: true,
    allowed_parents: [],
    // Bewusst breit gehalten — Vertrag verlangt aber spätere Einschränkung.
    // Sprint 2f (R1): `tab_v1` ergänzt — TabsV1.tsx liest `ctx.children` mit
    // `section_type === "tab_v1"`. tab_v1.allowed_parents enthält bereits
    // `tabs_v1`; das war eine reine Symmetrielücke im Vertrag.
    allowed_children: ["tab_v1", "content_v1", "rich_v1", "cards_v1", "card_v1", "feature_grid_v1"],
    is_container: true,
    text_fields: [
      T("label", "Eyebrow", "optional", { group: "Kopf" }),
      T("title", "Überschrift", "recommended", { group: "Kopf" }),
      T("intro", "Einleitung", "optional", { group: "Kopf", role: "richtext" }),
      T("tablist_label", "Aria-Label der Tab-Liste", "optional", { group: "Technik", public: false }),
    ],
    asset_slots: [],
    technical_fields: [],
    copy_paste: CP_CONTAINER,
    admin_groups: [
      { id: "kopf", label: "Kopf", alwaysVisible: true },
      { id: "kinder", label: "Tabs", alwaysVisible: true },
    ],
    known_conflicts: ["Erlaubte Kindtypen müssen mittelfristig enger gefasst werden."],
  },

  stats_v1: {
    section_type: "stats_v1",
    admin_label: "Kennzahlen-Container",
    renderer: "StatsV1.tsx",
    status: "container",
    top_level: true,
    allowed_parents: [],
    allowed_children: ["stat_v1"],
    is_container: true,
    text_fields: [
      T("title", "Überschrift", "recommended", { group: "Kopf" }),
      T("intro", "Einleitung", "optional", { group: "Kopf", role: "richtext" }),
    ],
    asset_slots: [],
    technical_fields: [],
    copy_paste: CP_CONTAINER,
    admin_groups: [
      { id: "kopf", label: "Kopf", alwaysVisible: true },
      { id: "kinder", label: "Kennzahlen", alwaysVisible: true },
    ],
  },

  stat_v1: {
    section_type: "stat_v1",
    admin_label: "Kennzahl",
    renderer: "via Eltern (StatsV1)",
    status: "generic",
    top_level: false,
    allowed_parents: ["stats_v1"],
    allowed_children: [],
    is_container: false,
    text_fields: [
      T("value", "Wert (z. B. 1.200)", "recommended", { group: "Kopf" }),
      T("label", "Kurzlabel", "recommended", { group: "Kopf" }),
      T("description", "Beschreibung", "optional", { group: "Inhalt" }),
    ],
    asset_slots: [],
    technical_fields: [],
    copy_paste: CP_CHILD_ONLY,
    admin_groups: [
      { id: "kopf", label: "Kopf", alwaysVisible: true },
      { id: "inhalt", label: "Inhalt", alwaysVisible: false },
    ],
  },

  contact_block_v1: {
    section_type: "contact_block_v1",
    admin_label: "Kontaktblock",
    renderer: "ContactBlockV1.tsx",
    status: "generic",
    top_level: true,
    allowed_parents: [],
    allowed_children: [],
    is_container: false,
    text_fields: [
      T("title", "Überschrift", "recommended", { group: "Kopf" }),
      T("text", "Fließtext", "optional", { group: "Inhalt", role: "richtext" }),
      T("email", "E-Mail-Adresse", "optional", { group: "Kontakt" }),
      T("phone", "Telefonnummer", "optional", { group: "Kontakt" }),
      T("cta_label", "Button-Beschriftung", "optional", { group: "Link" }),
      T("cta_href", "Button-Ziel (URL)", "optional", { group: "Link", role: "url" }),
    ],
    asset_slots: [],
    technical_fields: [],
    copy_paste: CP_FULL,
    admin_groups: [
      { id: "kopf", label: "Kopf", alwaysVisible: true },
      { id: "inhalt", label: "Inhalt", alwaysVisible: true },
      { id: "kontakt", label: "Kontakt", alwaysVisible: true },
      { id: "link", label: "Link", alwaysVisible: false },
    ],
  },

  download_list_v1: {
    section_type: "download_list_v1",
    admin_label: "Download-Liste",
    renderer: "DownloadListV1.tsx",
    status: "container",
    top_level: true,
    allowed_parents: [],
    allowed_children: ["card_v1"],
    is_container: true,
    text_fields: [
      T("title", "Überschrift", "recommended", { group: "Kopf" }),
      T("intro", "Einleitung", "optional", { group: "Kopf", role: "richtext" }),
    ],
    asset_slots: [],
    technical_fields: [],
    copy_paste: CP_CONTAINER,
    admin_groups: [
      { id: "kopf", label: "Kopf", alwaysVisible: true },
      { id: "kinder", label: "Downloads", alwaysVisible: true },
    ],
    known_specials: ["Kinder card_v1 lesen file_label / cta_href, kein image-Slot erwartet."],
  },

  card_grid_v1: {
    section_type: "card_grid_v1",
    admin_label: "Hub-Karten-Grid",
    renderer: "über Hub-/Listing-Pages konsumiert (kein direkter CmsBodyRenderer-Eintrag)",
    status: "special",
    top_level: true,
    allowed_parents: [],
    allowed_children: ["card_v1"],
    is_container: true,
    text_fields: [
      T("label", "Eyebrow", "optional", { group: "Kopf" }),
      T("title", "Überschrift", "recommended", { group: "Kopf" }),
      T("intro", "Einleitung", "optional", { group: "Kopf", role: "richtext" }),
    ],
    asset_slots: [],
    technical_fields: [],
    copy_paste: CP_CONTAINER,
    admin_groups: [
      { id: "kopf", label: "Kopf", alwaysVisible: true },
      { id: "kinder", label: "Karten", alwaysVisible: true },
    ],
    known_specials: ["Kinder card_v1 lesen thumbnail statt image — Admin darf hier nur thumbnail anbieten."],
  },

  catalog_filter_grid_v1: {
    section_type: "catalog_filter_grid_v1",
    admin_label: "Katalog-Filter-Grid",
    renderer: "über Hub-/Listing-Pages konsumiert (kein direkter CmsBodyRenderer-Eintrag)",
    status: "special",
    top_level: true,
    allowed_parents: [],
    allowed_children: ["card_v1"],
    is_container: true,
    text_fields: [
      T("label", "Eyebrow", "optional", { group: "Kopf" }),
      T("title", "Überschrift", "recommended", { group: "Kopf" }),
      T("intro", "Einleitung", "optional", { group: "Kopf", role: "richtext" }),
    ],
    asset_slots: [],
    technical_fields: [],
    copy_paste: CP_CONTAINER,
    admin_groups: [
      { id: "kopf", label: "Kopf", alwaysVisible: true },
      { id: "kinder", label: "Karten", alwaysVisible: true },
    ],
    known_specials: ["Kinder card_v1 lesen thumbnail statt image."],
  },

  series_override_v1: {
    section_type: "series_override_v1",
    admin_label: "Serien-Override (Legacy)",
    renderer: "— (kein aktiver Renderer)",
    status: "legacy",
    top_level: true,
    allowed_parents: ["series_override_container_v1"],
    allowed_children: [],
    is_container: false,
    text_fields: [],
    asset_slots: [],
    technical_fields: [],
    copy_paste: { copyable: false, pastableTopLevel: false, copiesChildren: false, deleteRequiresConfirm: true },
    admin_groups: [],
    known_specials: ["Legacy/Fallback: nur Produktkatalog-Overrides, Admin read-only."],
  },

  // -----------------------------------------------------------------------
  // Sprint 2a: D1-Lückenschluss — bekannte Page-Spezial-/Legacy-Typen.
  // Diese Typen existieren in der DB und werden von Page-spezifischen
  // Renderern konsumiert. Sie sind bewusst NICHT im generischen
  // CmsBodyRenderer-RENDERERS-Set und sollen auch nicht dorthin wandern.
  // -----------------------------------------------------------------------

  list_v1: {
    section_type: "list_v1",
    admin_label: "Liste (Spezial: Referenzprojekte)",
    renderer: "ReferenzprojektDetailPage (Spezial) — cms.text(<section>, 'items')",
    status: "special",
    top_level: true,
    allowed_parents: [],
    allowed_children: [],
    is_container: false,
    text_fields: [
      T("items", "Listenpunkte (eine Zeile pro Punkt; alternativ JSON-Array)", "recommended", {
        group: "Inhalt",
        role: "richtext",
        note: "Wird zeilenweise gesplittet; leere Zeilen werden ignoriert.",
      }),
    ],
    asset_slots: [],
    technical_fields: [],
    copy_paste: CP_FULL,
    admin_groups: [{ id: "inhalt", label: "Inhalt", alwaysVisible: true }],
    known_specials: [
      "Konsumiert von ReferenzprojektDetailPage (anwendungen.referenzprojekte.<slug>, Sections 'highlights'/'systems').",
      "Kein generischer CmsBodyRenderer — Page liest das Feld 'items' direkt und splittet zeilenweise.",
    ],
  },

  role_tabs_v1: {
    section_type: "role_tabs_v1",
    admin_label: "Rollen-Tabs (Spezial: snipdoo IP)",
    renderer: "SnipdooIpPage (Spezial) — cms.text('role_tabs', 'tabs.<key>.label|headline|p1|p2')",
    status: "special",
    top_level: true,
    allowed_parents: [],
    allowed_children: [],
    is_container: false,
    text_fields: [],
    asset_slots: [],
    technical_fields: [],
    copy_paste: { copyable: false, pastableTopLevel: false, copiesChildren: false, deleteRequiresConfirm: true },
    admin_groups: [{ id: "tabs", label: "Tabs (dynamisch tabs.<key>.*)", alwaysVisible: true }],
    known_specials: [
      "Konsumiert von SnipdooIpPage (gebaeudekommunikation.snipdoo-ip, Section 'role_tabs').",
      "Felder leben dynamisch als tabs.<roleKey>.label|headline|p1|p2 — werden vom Audit als dynamic-Pattern behandelt.",
      "Kein generischer Renderer — die Page liest die Rollen-Keys aus i18n und fragt pro Schlüssel cms.text() ab.",
    ],
  },

  tab_v1: {
    section_type: "tab_v1",
    admin_label: "Tab (Kind von tabs_v1)",
    renderer: "via Eltern (TabsV1.tsx)",
    status: "generic",
    top_level: false,
    allowed_parents: ["tabs_v1"],
    allowed_children: [],
    is_container: false,
    text_fields: [
      T("tab_label", "Reiter-Beschriftung", "recommended", { group: "Kopf" }),
      T("title", "Panel-Überschrift", "recommended", { group: "Inhalt" }),
      T("description", "Panel-Beschreibung (italic)", "optional", { group: "Inhalt", role: "richtext" }),
    ],
    asset_slots: [IMG("image", "image", "optional", "Bild im Register (optional, über dem Panel-Text)")],
    technical_fields: [],
    copy_paste: CP_CHILD_ONLY,
    admin_groups: [
      { id: "kopf", label: "Kopf", alwaysVisible: true },
      { id: "inhalt", label: "Inhalt", alwaysVisible: true },
      { id: "vorteile", label: "Vorteile (dynamisch vorteile.<n>.*)", alwaysVisible: false },
    ],
    known_specials: [
      "Renderer liest zusätzlich vorteile.<n>.headline und vorteile.<n>.body (flach, max ~4 Einträge).",
      "Audit erkennt vorteile.<n>.headline|body als dynamic-Pattern.",
      "DB-Bestand auf mobile-tk-preview.root hat tab_v1 historisch ohne Parent (Top-Level) — D9 markiert das korrekt als child_only_at_top_level.",
    ],
  },

  series_override_container_v1: {
    section_type: "series_override_container_v1",
    admin_label: "Serien-Override-Container (Spezial: Produktkatalog)",
    renderer: "CatalogMvp (Spezial) — sort_order/thumbnail-Quelle für Serienkacheln",
    status: "special",
    top_level: true,
    allowed_parents: [],
    allowed_children: ["series_override_v1"],
    is_container: true,
    text_fields: [],
    asset_slots: [],
    technical_fields: [],
    copy_paste: { copyable: false, pastableTopLevel: false, copiesChildren: false, deleteRequiresConfirm: true },
    admin_groups: [{ id: "kinder", label: "Override-Einträge", alwaysVisible: true }],
    known_specials: [
      "Konsumiert von CatalogMvp/TuerkommunikationHub: nutzt sort_order der series_override_v1-Kinder als Sortierquelle für Serienkacheln.",
      "Container hat selbst keinen sichtbaren Header — reiner Admin-Pflegeblock.",
      "Children (series_override_v1) sind Legacy: pflegbar nur über Admin-spezifische Schreibwege; tragen Thumbnail-Override per cms_assets-Slot 'thumbnail'.",
    ],
  },
};

/* -------------------------------------------------------------------------- */
/*  API                                                                       */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  Globaler Hintergrund-Schalter `section_bg`                                 */
/* -------------------------------------------------------------------------- */

/**
 * Jeder Top-Level-Block darf redaktionell einen Hintergrund bekommen:
 *   default (Standard) | muted (grau, `bg-secondary`)
 *
 * Ausnahmen (haben bereits einen eigenen, feiner abgestuften Schalter über
 * `background_variant`): `cta_v1`, `teaser_2col_v1`.
 * Der Hero (`hero_v1`) nutzt den gleichen Schalter wie alle anderen Blöcke.
 * Kindkarten (`card_v1`) haben keinen eigenen Abschnitts-Hintergrund.
 */
export const SECTION_BG_FIELD_KEY = "section_bg";

export const SECTION_BG_EXCLUDED_TYPES: ReadonlySet<string> = new Set([
  // `hero_v1` ist seit Batch „Hero-Hintergrund" bewusst NICHT ausgenommen:
  // der Hero bekommt denselben Schalter (Standard / grau) wie alle Blöcke.
  "cta_v1",
  "teaser_2col_v1",
  "card_v1",
  "stat_v1",
  "tab_v1",
]);

/** Darf dieser Section-Typ den globalen Hintergrund-Schalter anbieten? */
export function supportsSectionBg(sectionType: string | null | undefined): boolean {
  if (!sectionType) return false;
  if (SECTION_BG_EXCLUDED_TYPES.has(sectionType)) return false;
  const c = SECTION_TYPE_CONTRACTS[sectionType];
  // Ohne Vertrag (Sonderfall) trotzdem erlauben, solange kein Kindtyp.
  return c ? c.top_level : true;
}

for (const contract of Object.values(SECTION_TYPE_CONTRACTS)) {
  if (!supportsSectionBg(contract.section_type)) continue;
  const known = [...contract.text_fields, ...contract.technical_fields].some(
    (f) => f.field_key === SECTION_BG_FIELD_KEY,
  );
  if (known) continue;
  contract.technical_fields.push(
    T(SECTION_BG_FIELD_KEY, "Hintergrund (Standard / grau)", "optional", {
      role: "enum",
      locale: "de-only",
      public: false,
      group: "Technik",
      note: "Werte: default (Standard) oder muted (grau). Leer = default.",
    }),
  );
}

/** Trennstrich über Kartenlinks (`card_dividers`): Block-Override zur globalen Einstellung. */
for (const type of ["cards_v1", "product_scroller_v1", "feature_grid_v1", "card_grid_v1"]) {
  const contract = SECTION_TYPE_CONTRACTS[type];
  if (!contract) continue;
  if (contract.technical_fields.some((f) => f.field_key === "card_dividers")) continue;
  contract.technical_fields.push(
    T("card_dividers", "Trennstrich über Kartenlinks (wie global / an / aus)", "optional", {
      role: "enum",
      locale: "de-only",
      public: false,
      group: "Technik",
      note: "Werte: on, off; leer = wie globale Einstellung (global.einstellungen/card_settings).",
    }),
  );
}

export function getContract(section_type: string | null | undefined): SectionTypeContract | null {
  if (!section_type) return null;
  return SECTION_TYPE_CONTRACTS[section_type] ?? null;
}


export function listContractTypes(): string[] {
  return Object.keys(SECTION_TYPE_CONTRACTS);
}

/** Typen, die der Vertrag als Spezial/Legacy markiert (Renderer-Audit darf das ignorieren). */
export const SPECIAL_OR_LEGACY_TYPES: ReadonlySet<string> = new Set(
  Object.values(SECTION_TYPE_CONTRACTS)
    .filter((c) => c.status === "special" || c.status === "legacy" || c.status === "skip")
    .map((c) => c.section_type),
);

/* -------------------------------------------------------------------------- */
/*  Sprint 2l — card_v1-Variantenmodell (read-only, beschreibend)             */
/*                                                                            */
/*  `card_v1` bleibt technisch ein Section-Type. Fachlich kennt die           */
/*  Redaktion aber sehr unterschiedliche Kartensorten. Dieses Modell macht    */
/*  diese Vielfalt sichtbar:                                                  */
/*    - Der Admin kann pro Karte nur die Felder als „erwartet" markieren,    */
/*      die zur erkannten Variante passen.                                    */
/*    - Audit/Triage können optionale Variantenfelder von echten              */
/*      Basisfeld-Lücken unterscheiden.                                       */
/*                                                                            */
/*  Garantien:                                                                */
/*    - Verändert NICHTS in der DB / Renderer / Whitelist.                    */
/*    - Bestehende Felder bleiben pflegbar — Variantenfilter dürfen nur     */
/*      „missing"-Einträge ausblenden, niemals vorhandene Felder verstecken. */
/*    - Erkennung ist konservativ: ohne Kontext → Text-Karte als sicherer   */
/*      Default (alle Variantenfelder bleiben optional, aber unterdrückt).   */
/* -------------------------------------------------------------------------- */

export type CardVariantKey =
  | "image_card"
  | "thumbnail_card"
  | "icon_card_lucide"
  | "icon_card_image"
  | "text_card"
  | "multi_link_card"
  | "download_card"
  | "unknown";

/**
 * Zielmodell-Fixierung: dokumentiert maschinenlesbar, dass `card_v1` die
 * flexible Standard-Karte ist und die folgenden Presets unterstützt. Die
 * Liste wird vom Audit/Admin gelesen (siehe `CARD_V1_VARIANTS`).
 * `download_card` ist hier bewusst Spezial-/Download-Preset und bleibt
 * bis zur Entscheidung über `download_list_v1` ein Klärpunkt.
 */
export const STANDARD_CARD_PRESETS: ReadonlyArray<CardVariantKey> = [
  "image_card",
  "thumbnail_card",
  "icon_card_lucide",
  "icon_card_image",
  "multi_link_card",
  "text_card",
  "download_card",
];


export interface CardVariant {
  variant_key: CardVariantKey;
  label: string;
  description: string;
  detection: {
    parent_types?: string[];
    required_asset_slot?: "image" | "thumbnail" | "icon_image";
    text_signals?: string[];
    text_exclusions?: string[];
    note?: string;
  };
  /** Felder, die in der Variante als sinnvoll/erwartet gelten. */
  base_fields: string[];
  /** Felder, die die Variante kennen kann, aber nicht braucht. */
  optional_fields: string[];
  /** Felder, die in dieser Variante fachlich nicht vorgesehen sind. */
  excluded_fields: string[];
  /** Asset-Slots, die zur Variante gehören. */
  asset_slots: Array<"image" | "thumbnail" | "icon_image">;
  admin_group_hint: string;
  audit_note?: string;
}

/** Karten-Basisfelder, die in JEDER Variante als sinnvoll gelten. */
export const CARD_V1_BASE_FIELDS: ReadonlyArray<string> = ["title", "description"];

/**
 * Alias-Beziehungen für `card_v1`-Felder (Doku/Audit).
 * Aliase werden NICHT automatisch migriert. Renderer lesen heute nur
 * den kanonischen Schlüssel — Aliase im DB-Bestand werden im Admin
 * sichtbar als „Alias" markiert (siehe buildAdminFieldPlan.ts).
 */
export const CARD_V1_FIELD_ALIASES: ReadonlyArray<{ canonical: string; alias: string; note: string }> = [
  { canonical: "title", alias: "headline", note: "Pilot/Legacy-Bestand auf einzelnen Karten." },
  { canonical: "description", alias: "beschreibung", note: "Frühe DE-only-Karten (snipdoo, Pilot)." },
  { canonical: "description", alias: "desc", note: "Vereinzelt aus Marketing-Quellen." },
  { canonical: "description", alias: "text", note: "Vereinzelt aus Marketing-Quellen." },
  { canonical: "subtitle", alias: "eyebrow", note: "Eyebrow-Bezeichnung an Karten." },
  { canonical: "cta_href", alias: "ctaUrl", note: "Legacy aus Code-Karten." },
  { canonical: "cta_label", alias: "ctaLabel", note: "Legacy aus Code-Karten." },
];

export const CARD_V1_VARIANTS: ReadonlyArray<CardVariant> = [
  {
    variant_key: "image_card",
    label: "Bildkarte",
    description: "Karte mit Bild (Hub-Teaser, Bildkarten-Scroller). Optional CTA, sonst per href klickbar.",
    detection: {
      parent_types: ["cards_v1", "product_scroller_v1"],
      required_asset_slot: "image",
      note: "Parent cards_v1 oder product_scroller_v1 → Bildkarte.",
    },
    base_fields: ["title", "description"],
    optional_fields: ["subtitle", "cta_label", "cta_href", "href", "link_1_label", "link_1_href", "link_2_label", "link_2_href", "link_3_label", "link_3_href", "bullets.0", "bullets.1", "bullets.2", "bullets.3", "bullets.4", "chips.0", "chips.1", "chips.2", "chips.3", "chips.4"],
    excluded_fields: [
      "icon",
      "features.0", "features.1", "features.2", "features.3", "features.4",
    ],
    asset_slots: ["image"],
    admin_group_hint: "Kopf · Inhalt · Medien · Link",
    audit_note: "Pauschales Seeding von features/link_* nicht sinnvoll — bleibt S3.",
  },
  {
    variant_key: "thumbnail_card",
    label: "Thumbnail-Karte",
    description: "Karte mit Thumbnail (Hub-Grid, Katalog-Filter-Grid). Bild kommt aus Slot `thumbnail`.",
    detection: {
      parent_types: ["card_grid_v1", "catalog_filter_grid_v1"],
      required_asset_slot: "thumbnail",
      note: "Renderer dieser Container lesen `thumbnail` — `image` wird ignoriert.",
    },
    base_fields: ["title", "description"],
    optional_fields: ["subtitle", "cta_label", "cta_href", "href", "link_1_label", "link_1_href", "bullets.0", "bullets.1", "bullets.2", "bullets.3", "bullets.4", "chips.0", "chips.1", "chips.2", "chips.3", "chips.4"],
    excluded_fields: [
      "icon",
      "features.0", "features.1", "features.2", "features.3", "features.4",
    ],
    asset_slots: ["thumbnail"],
    admin_group_hint: "Kopf · Inhalt · Medien (Thumbnail) · Link",
    audit_note: "Slot `image` an Thumbnail-Karten ist Drift — separat im Asset-Audit melden.",
  },
  {
    variant_key: "icon_card_lucide",
    label: "Iconkarte (Lucide)",
    description: "Karte mit Lucide-Iconname im Textfeld `icon`. Typisch in feature_grid_v1.",
    detection: {
      parent_types: ["feature_grid_v1"],
      text_signals: ["icon"],
      note: "Parent feature_grid_v1 ohne icon_image-Asset → Lucide-Iconkarte.",
    },
    base_fields: ["title", "description"],
    optional_fields: ["icon", "bullets.0", "bullets.1", "bullets.2", "bullets.3", "bullets.4", "features.0", "features.1", "features.2", "features.3", "features.4"],
    excluded_fields: [
      "subtitle", "cta_label", "cta_href", "href",
      "link_1_label", "link_1_href", "link_1_kind",
      "link_2_label", "link_2_href", "link_2_kind",
      "link_3_label", "link_3_href", "link_3_kind",
    ],
    asset_slots: [],
    admin_group_hint: "Kopf · Inhalt · Icon (Lucide) · Features",
    audit_note: "image/thumbnail an Iconkarten ist Drift.",
  },
  {
    variant_key: "icon_card_image",
    label: "Iconkarte (TCS-Bildicon)",
    description: "Karte mit Bildicon-Slot `icon_image` (TCS-Custom-Iconset).",
    detection: {
      parent_types: ["feature_grid_v1"],
      required_asset_slot: "icon_image",
    },
    base_fields: ["title", "description"],
    optional_fields: ["bullets.0", "bullets.1", "bullets.2", "bullets.3", "bullets.4", "features.0", "features.1", "features.2", "features.3", "features.4"],
    excluded_fields: [
      "icon",
      "subtitle", "cta_label", "cta_href", "href",
      "link_1_label", "link_1_href", "link_1_kind",
      "link_2_label", "link_2_href", "link_2_kind",
      "link_3_label", "link_3_href", "link_3_kind",
    ],
    asset_slots: ["icon_image"],
    admin_group_hint: "Kopf · Inhalt · Medien (Bildicon) · Features",
  },
  {
    variant_key: "download_card",
    label: "Download-Karte",
    description: "Download-Eintrag in download_list_v1. Linkt eine Datei.",
    detection: {
      parent_types: ["download_list_v1"],
      note: "Renderer liest cta_href als Dateilink; title als Beschriftung.",
    },
    base_fields: ["title", "description", "cta_href"],
    optional_fields: ["cta_label"],
    excluded_fields: [
      "subtitle", "icon", "href",
      "bullets.0", "bullets.1", "bullets.2", "bullets.3", "bullets.4",
      "chips.0", "chips.1", "chips.2", "chips.3", "chips.4",
      "features.0", "features.1", "features.2", "features.3", "features.4",
      "link_1_label", "link_1_href", "link_1_kind",
      "link_2_label", "link_2_href", "link_2_kind",
      "link_3_label", "link_3_href", "link_3_kind",
    ],
    asset_slots: [],
    admin_group_hint: "Kopf · Inhalt · Download-Link",
    audit_note: "image/thumbnail an Download-Karten ist Drift.",
  },
  {
    variant_key: "multi_link_card",
    label: "Multi-Link-Karte",
    description: "Karte mit mehreren Link-Zielen (link_1..3_*).",
    detection: {
      text_signals: ["link_1_label", "link_1_href", "link_2_label", "link_3_label"],
      note: "Mindestens ein link_N_*-Feld in der DB.",
    },
    base_fields: ["title", "description"],
    optional_fields: [
      "subtitle",
      "link_1_label", "link_1_href", "link_1_kind",
      "link_2_label", "link_2_href", "link_2_kind",
      "link_3_label", "link_3_href", "link_3_kind",
    ],
    excluded_fields: [
      "icon", "href", "cta_label", "cta_href",
      "features.0", "features.1", "features.2", "features.3", "features.4",
    ],
    asset_slots: [],
    admin_group_hint: "Kopf · Inhalt · Links",
  },
  {
    variant_key: "text_card",
    label: "Textkarte",
    description: "Reine Textkarte ohne Bild und Icon. Optional CTA.",
    detection: {
      text_exclusions: ["icon"],
      note: "Fallback ohne Bild/Icon/Link-Signale.",
    },
    base_fields: ["title", "description"],
    optional_fields: ["subtitle", "cta_label", "cta_href", "href"],
    excluded_fields: [
      "icon",
      "bullets.0", "bullets.1", "bullets.2", "bullets.3", "bullets.4",
      "chips.0", "chips.1", "chips.2", "chips.3", "chips.4",
      "features.0", "features.1", "features.2", "features.3", "features.4",
      "link_1_label", "link_1_href", "link_1_kind",
      "link_2_label", "link_2_href", "link_2_kind",
      "link_3_label", "link_3_href", "link_3_kind",
    ],
    asset_slots: [],
    admin_group_hint: "Kopf · Inhalt · Link",
  },
];

export interface CardVariantDetectionInput {
  parentSectionType?: string | null;
  dbFieldKeys?: ReadonlyArray<string>;
  assetFieldKeys?: ReadonlyArray<string>;
}

export interface CardVariantDetectionResult {
  variant: CardVariant;
  confidence: "high" | "medium" | "low";
  reason: string;
}

/**
 * Konservative Variantenerkennung für eine `card_v1`-Section.
 * Schreibt NICHT, ändert NICHT. Fallback ist Textkarte (sicherer Default).
 */
export function detectCardVariant(input: CardVariantDetectionInput): CardVariantDetectionResult {
  const parent = input.parentSectionType ?? null;
  const fields = new Set(input.dbFieldKeys ?? []);
  const assets = new Set(input.assetFieldKeys ?? []);
  const find = (k: CardVariantKey) => CARD_V1_VARIANTS.find((v) => v.variant_key === k)!;

  // 1) Asset-Slot ist das stärkste Signal.
  if (assets.has("icon_image")) {
    return { variant: find("icon_card_image"), confidence: "high",
      reason: "Asset-Slot `icon_image` vorhanden → Iconkarte (Bildicon)." };
  }
  if (assets.has("thumbnail") &&
      (!parent || ["card_grid_v1", "catalog_filter_grid_v1"].includes(parent))) {
    return { variant: find("thumbnail_card"), confidence: parent ? "high" : "medium",
      reason: parent ? `Asset \`thumbnail\` + Parent \`${parent}\` → Thumbnail-Karte.`
                     : "Asset `thumbnail` → Thumbnail-Karte (Parent unbekannt)." };
  }

  // 2) Parent als nächstes Signal.
  if (parent === "download_list_v1") {
    return { variant: find("download_card"), confidence: "high",
      reason: "Parent `download_list_v1` → Download-Karte." };
  }
  if (parent === "feature_grid_v1") {
    return { variant: find("icon_card_lucide"), confidence: "high",
      reason: "Parent `feature_grid_v1` → Iconkarte (Lucide)." };
  }
  if (parent === "card_grid_v1" || parent === "catalog_filter_grid_v1") {
    return { variant: find("thumbnail_card"), confidence: "medium",
      reason: `Parent \`${parent}\` → Thumbnail-Karte (Asset evtl. noch nicht gesetzt).` };
  }
  if (parent === "cards_v1" || parent === "product_scroller_v1") {
    return { variant: find("image_card"), confidence: assets.has("image") ? "high" : "medium",
      reason: assets.has("image") ? `Parent \`${parent}\` + Asset \`image\` → Bildkarte.`
                                  : `Parent \`${parent}\` → Bildkarte (Bild kann noch fehlen).` };
  }

  // 3) Textsignale (Multi-Link).
  for (const sig of ["link_1_label", "link_1_href", "link_2_label", "link_3_label"]) {
    if (fields.has(sig)) {
      return { variant: find("multi_link_card"), confidence: "medium",
        reason: `DB enthält \`${sig}\` → Multi-Link-Karte.` };
    }
  }

  // 4) Fallback nach Asset/Textfeld.
  if (assets.has("image")) {
    return { variant: find("image_card"), confidence: "low",
      reason: "Asset `image` vorhanden, kein Parent-Kontext → vermutlich Bildkarte." };
  }
  if (fields.has("icon")) {
    return { variant: find("icon_card_lucide"), confidence: "low",
      reason: "Textfeld `icon` vorhanden → vermutlich Iconkarte (Lucide)." };
  }

  return { variant: find("text_card"), confidence: "low",
    reason: "Kein eindeutiges Signal → Textkarte als sicherer Default." };
}

/**
 * Liefert true, wenn das Feld für die erkannte Variante als „erwartet/sinnvoll" gilt.
 * Nur diese Felder sollen im Admin als „fehlt in DB" angezeigt werden.
 * Aufrufer darf vorhandene DB-Felder NIE über diesen Check verstecken.
 */
export function isCardFieldExpectedForVariant(
  variant: CardVariant | null,
  fieldKey: string,
): boolean {
  if (!variant) return true;
  if (CARD_V1_BASE_FIELDS.includes(fieldKey)) return true;
  if (variant.base_fields.includes(fieldKey)) return true;
  if (variant.optional_fields.includes(fieldKey)) return true;
  if (variant.excluded_fields.includes(fieldKey)) return false;
  // Nicht ausdrücklich genannt → konservativ als nicht erwartet behandeln.
  return false;
}
