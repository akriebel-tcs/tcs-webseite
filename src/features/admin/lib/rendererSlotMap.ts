/**
 * Renderer-Erwartungskarte (statisch).
 *
 * Gibt für jeden CMS-`section_type` an, welche Bild-`field_key`s die
 * zugehörige Vorschau-Komponente (Renderer) tatsächlich liest.
 *
 * Stand: 2026-05-23. Quelle = `src/features/cms/components/sections/*` +
 * Hero-Konvention (`hero.image` wird in jeder Seite über `CmsPageLayout`
 * bzw. direkt per `cms.asset("hero","image")` konsumiert).
 *
 * Wenn ein Renderer keine Bilder liest (z. B. `content_v1`, `faq_v1`,
 * `tabs_v1`), bleibt das Array leer. Container-Typen (`cards_v1`,
 * `product_scroller_v1`, `feature_grid_v1`) lesen Bilder **nicht selbst** —
 * ihre Kind-Sections (`card_v1`) tragen die Bilder.
 *
 * Diese Karte ist read-only und wird von der Validierungs-Ansicht im
 * Admin verwendet, um DB-Bildslots mit der Renderer-Erwartung abzugleichen.
 */

export interface RendererSlotSpec {
  /** field_key, den der Renderer als Bild liest. */
  fieldKey: string;
  /** Kurzbeschreibung für den Admin-Tooltip. */
  purpose: string;
  /** "required" = ohne Bild wird der Bildbereich versteckt. "optional" = darf leer sein. */
  expectation: "required" | "optional";
}

export const RENDERER_SLOT_MAP: Record<string, RendererSlotSpec[]> = {
  // Hero wird nicht im CmsBodyRenderer, sondern per CmsPageLayout/Page
  // konsumiert (`cms.asset("hero","image")`).
  hero_v1: [{ fieldKey: "image", purpose: "Hero-Bild der Seite", expectation: "required" }],

  // Body-Sections (CmsBodyRenderer)
  content_v1: [],
  cards_v1: [], // Bilder auf Kindern (card_v1.image)
  card_grid_v1: [], // Hub-Container, Kind-`card_v1` liest `thumbnail`
  catalog_filter_grid_v1: [], // Filter-Grid-Container, Kind-`card_v1` liest `thumbnail`
  card_v1: [
    { fieldKey: "image", purpose: "Karten-Bild", expectation: "optional" },
    { fieldKey: "thumbnail", purpose: "Karten-Thumbnail (Hub/Filter-Grid-Kontext)", expectation: "optional" },
    { fieldKey: "icon_image", purpose: "TCS-Bildicon (grafisches Icon, ersetzt Lucide)", expectation: "optional" },
  ],
  feature_grid_v1: [], // Icons statt Bilder
  product_scroller_v1: [], // Bilder auf Kindern (card_v1.image)
  download_list_v1: [],
  contact_block_v1: [],
  stats_v1: [],
  cta_v1: [{ fieldKey: "image", purpose: "CTA-Hintergrundbild", expectation: "optional" }],
  rich_v1: [],
  faq_v1: [],
  teaser_2col_v1: [{ fieldKey: "image", purpose: "Wechselteaser-Bild", expectation: "required" }],
  tabs_v1: [],
  tab_v1: [
    // Kind-Section von tabs_v1 (Tab-Eintrag): Text + optionales Registerbild.
    // Zusätzlich liest der Renderer dynamisch `vorteile.<n>.image`
    // (optionales Bild je Eintrag, z. B. Porträt eines Ansprechpartners).
    { fieldKey: "image", purpose: "Bild im Register", expectation: "optional" },
  ],
  stat_v1: [], // Kind-Section von stats_v1 (Zahl + Kurzlabel, kein Bild)
  list_v1: [], // Listenblock (Referenzprojekte „highlights"/„systems"), Text-only
  role_tabs_v1: [], // Persona-/Rollen-Tab-Block (Text)
  series_override_v1: [],
  series_override_container_v1: [],
  // Container: gestapelte 2-Spalten-Produktliste. Bilder liegen auf Kind-`card_v1`.
  product_showcase_list_v1: [],
};

/** Alle bekannten section_types. */
export const KNOWN_SECTION_TYPES = new Set(Object.keys(RENDERER_SLOT_MAP));

/**
 * Aliasing alter section_type-Werte (parallel zu CmsBodyRenderer.normalizeType).
 * Wird benutzt, damit DB-Werte wie `content` oder `cta` als `content_v1` /
 * `cta_v1` validiert werden.
 */
export function normalizeSectionType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const map: Record<string, string> = {
    hero: "hero_v1",
    content: "content_v1",
    intro: "content_v1",
    content_block_v1: "content_v1",
    content_blocks_intro_v1: "content_v1",
    cta: "cta_v1",
    rich: "rich_v1",
    "feature-grid": "feature_grid_v1",
    "product-scroller": "product_scroller_v1",
    products: "product_scroller_v1",
  };
  return map[raw] ?? raw;
}

/** Liefert die erwartete Renderer-Komponente (Dateipfad-Hinweis) je section_type. */
export const RENDERER_COMPONENT_HINT: Record<string, string> = {
  hero_v1: "CmsPageLayout / Page-Hero (cms.asset('hero','image'))",
  content_v1: "ContentSectionV1.tsx",
  cards_v1: "CardsSectionV1.tsx",
  card_v1: "CardsSectionV1.tsx / ProductScrollerV1.tsx (Kind)",
  feature_grid_v1: "FeatureGridV1.tsx",
  product_scroller_v1: "ProductScrollerV1.tsx",
  download_list_v1: "DownloadListV1.tsx",
  contact_block_v1: "ContactBlockV1.tsx",
  stats_v1: "StatsV1.tsx",
  cta_v1: "CtaV1.tsx",
  rich_v1: "RichV1.tsx",
  faq_v1: "FaqV1.tsx",
  teaser_2col_v1: "Teaser2ColV1.tsx",
  tabs_v1: "TabsV1.tsx",
  tab_v1: "TabsV1.tsx (Kind-Section)",
  stat_v1: "StatsV1.tsx (Kind-Section)",
  list_v1: "Referenzprojekt-Listenblock (Text-only)",
  role_tabs_v1: "RoleTabsBlock.tsx",
  card_grid_v1: "CardGridV1.tsx / Hub-Pages (Kind-card_v1 liest 'thumbnail')",
  catalog_filter_grid_v1: "CategoryListPage / TuerkommunikationHubPage (Kind-card_v1 liest 'thumbnail')",
  series_override_v1: "Produktkatalog-Overrides (kein Bildslot)",
  series_override_container_v1: "Produktkatalog-Overrides-Container (kein Bildslot)",
  product_showcase_list_v1: "ProductShowcaseListV1.tsx (Container, Bilder auf Kind-card_v1)",
};
