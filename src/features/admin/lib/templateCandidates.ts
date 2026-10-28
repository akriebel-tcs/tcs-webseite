/**
 * Stufe-0.4 Template-Kandidaten-Analyse (read-only).
 *
 *  - Seitenkandidaten (Top-Level-Signaturen)
 *  - Karten-/Block-Templates (Container → Kind, grobe Sicht, Stufe 0.3)
 *  - Karten-Familien (feingranular pro Einzel-Karte: Feldsignatur,
 *    Bild/Icon/Link/CTA, Container-Kontext). Familien sind Arbeitstitel
 *    wie `benefit_card_v1`, `usecase_card_v1`, `application_card_v1`, …
 *
 * Keine Schreibzugriffe, keine Migration, keine Public-Wirkung.
 */

interface RawSection {
  page_key: string;
  section_key: string;
  section_type: string;
  sort_order: number;
  parent_section_id: string | null;
  id: string;
}

interface RawField {
  page_key: string;
  section_key: string;
  field_key: string;
}

interface RawAsset {
  page_key: string;
  section_key: string;
}

export interface PageCandidateGroup {
  signature: string;
  pattern: string;
  pages: Array<{ page_key: string; section_keys: string[] }>;
  templateReady: boolean;
  workingTitle: string;
}

export interface CardTemplateOccurrence {
  page_key: string;
  page_no?: number;
  page_title?: string;
  page_route?: string;
  container_section_key: string;
  container_section_no?: number;
  child_section_keys: string[];
  child_count: number;
  has_image: boolean;
  has_link: boolean;
  has_icon: boolean;
}

export interface CardTemplate {
  /** stable key, e.g. `cards_v1|card_v1` */
  key: string;
  containerType: string;
  childType: string;
  workingTitle: string;
  description: string;
  /** Anzahl Container-Sections, die dieses Muster zeigen. */
  containerCount: number;
  /** Anzahl Karten-Sections insgesamt. */
  childCount: number;
  /** Feldinventar: field_key + Anzahl Karten, die das Feld setzen. */
  fieldInventory: Array<{ field_key: string; usage: number; coverage: number }>;
  hasImage: boolean;
  hasLink: boolean;
  hasIcon: boolean;
  /** True, wenn Kindtyp kanonisch (card_v1) und keine bekannten Synonym-Felder vorhanden. */
  cleanlyModeled: boolean;
  /** Hinweise auf heterogene/synonyme Felder ("desc" vs "description" usw.). */
  inconsistencyHints: string[];
  /** Konkrete Vorkommen (max. 50). */
  occurrences: CardTemplateOccurrence[];
}

export interface CardPatternGroup {
  pattern: string;
  containerType: string;
  childType: string;
  containerCount: number;
  examplePages: string[];
}

export interface CardFamilyOccurrence {
  page_key: string;
  page_no?: number;
  page_title?: string;
  page_route?: string;
  container_section_key: string;
  container_section_no?: number;
  container_type: string;
  child_section_key: string;
  child_section_no?: number;
  raw_fields: string[];
  has_image: boolean;
  has_icon: boolean;
  has_link: boolean;
  has_cta: boolean;
  synonyms: string[];
  /** Legacy-Felder dieser Karte, deren kanonisches Pendant bereits vorhanden ist. */
  legacy_fields: string[];
  is_clean: boolean;
  /** True, wenn das Kind als echte Kind-Section (parent_section_id) im Baum hängt. */
  modelled_as_child: boolean;
}

export type CardFamilyStatus =
  | "clean"
  | "near_clean"
  | "heterogeneous"
  | "renderer_special";

export interface CardFamily {
  key: string;
  workingTitle: string;
  description: string;
  parentTypes: string[];
  cardCount: number;
  pageCount: number;
  fieldInventory: Array<{ field_key: string; usage: number; coverage: number }>;
  synonymHints: string[];
  /** Legacy→canonical Hinweise (z. B. „desc → description"). */
  legacyHints: string[];
  status: CardFamilyStatus;
  hasImage: boolean;
  hasIcon: boolean;
  hasLink: boolean;
  hasCta: boolean;
  example: CardFamilyOccurrence | null;
  occurrences: CardFamilyOccurrence[];
}

export interface CandidatesReport {
  pageGroups: PageCandidateGroup[];
  cardPatterns: CardPatternGroup[];
  cardTemplates: CardTemplate[];
  cardFamilies: CardFamily[];
  totalPagesAnalyzed: number;
  totalSections: number;
  error?: string;
}

// ---- Heuristiken ----

const CANONICAL_CARD_FIELDS = new Set([
  "title",
  "subtitle",
  "description",
  "text",
  "intro",
  "href",
  "cta_label",
  "cta_href",
  "icon",
  "image",
  "slug",
  "filter_key",
  "count_hint",
]);

const SYNONYM_HINTS: Record<string, string> = {
  desc: 'Synonym für "description" — bitte vereinheitlichen',
  beschreibung: 'Deutsches Synonym für "description"',
  headline: 'Synonym für "title"',
  eyebrow: 'Synonym für "subtitle" / "label"',
  cta: 'Mehrdeutig — bitte cta_label / cta_href verwenden',
  cta_link: 'Synonym für "cta_href"',
};

/**
 * Legacy-Felder, die bereits ein kanonisches Pendant in der DB haben.
 * Wenn das kanonische Feld vorhanden ist, gilt das Legacy-Feld nur noch
 * als Fallback (Renderer liest zuerst canonical, dann legacy) und wird
 * im Workshop als „Legacy-Feld" gekennzeichnet, nicht als Abweichung.
 */
const LEGACY_FIELD_MAP: Record<string, string> = {
  desc: "description",
  beschreibung: "description",
  text: "description",
};

const LINK_FIELDS = new Set(["href", "cta_href", "cta_link", "cta", "url", "link"]);
const ICON_FIELDS = new Set(["icon", "icon_name"]);

const CONTAINER_TITLES: Record<string, { title: string; desc: string }> = {
  "cards_v1|card_v1": {
    title: "Karten-Grid (allgemein)",
    desc: "Standard-Kartenreihe: Titel, Beschreibung, optional Bild/Icon/Link.",
  },
  "product_scroller_v1|card_v1": {
    title: "Scroller-Karte",
    desc: "Horizontaler Scroller mit Bildkarten (Subtitle · Titel · Beschreibung · Bild).",
  },
  "catalog_filter_grid_v1|card_v1": {
    title: "Katalog-Filter-Karte",
    desc: "Karten, die einen Filter im Produktkatalog setzen (Slug + Filter-Key).",
  },
  "card_grid_v1|card_v1": {
    title: "Card-Grid (Alias-Container)",
    desc: "Älterer Alias-Container — sollte nach `cards_v1` konsolidiert werden.",
  },
  "series_override_container_v1|series_override_v1": {
    title: "Produktreihen-Override",
    desc: "Pflege-Block für Produktreihen-Overrides; keine sichtbare Karte.",
  },
  "rich_v1|rich_v1": {
    title: "Rich-Block (verschachtelt)",
    desc: "Verschachtelte Rich-Text-Blöcke — Sonderfall.",
  },
};

function titleFor(key: string, containerType: string, childType: string): { title: string; desc: string } {
  return (
    CONTAINER_TITLES[key] ?? {
      title: `${containerType} → ${childType}`,
      desc: "Wiederkehrendes Container/Kind-Muster.",
    }
  );
}

const PAGE_TITLE_HINTS: Array<{ match: (sig: string) => boolean; title: string; ready: boolean }> = [
  {
    match: (s) => s === "hero_v1|cards_v1|cards_v1|content_v1",
    title: "Produkt-Unterseiten (Hero · Vorteile · Anwendungen · CTA)",
    ready: true,
  },
  {
    match: (s) => s.includes("overview_v1|products_v1"),
    title: "Hub-Seiten (Hero · Übersicht · Produkte)",
    ready: true,
  },
  {
    match: (s) => s.startsWith("hero_v1|content_v1") && s.split("|").length <= 4,
    title: "Content-Seiten (Hero · Inhalt)",
    ready: true,
  },
];

function guessPageTitle(sig: string, sectionKeys: string[]): { title: string; ready: boolean } {
  for (const h of PAGE_TITLE_HINTS) {
    if (h.match(sig)) return { title: h.title, ready: h.ready };
  }
  return { title: `Strukturmuster: ${sectionKeys.slice(0, 3).join(" · ") || sig}`, ready: false };
}

// ---- Karten-Familien-Klassifikation ----

const FAMILY_TITLES: Record<string, { title: string; desc: string }> = {
  catalog_filter_card_v1: {
    title: "Katalog-Filter-Karte",
    desc: "Setzt einen Filter im Produktkatalog (Slug · Filter-Key · Titel · Beschreibung).",
  },
  hub_area_card_v1: {
    title: "Hub-Bereichs-Karte",
    desc: "Hub-Seiten-Karte (Bild · Titel · Intro · CTA/Link) — Alias-Container card_grid_v1.",
  },
  product_solution_card_v1: {
    title: "Bildkarte (Scroller)",
    desc: "Karte im Scroller: Subtitle · Titel · Beschreibung · Bild · Link.",
  },
  benefit_card_v1: {
    title: "Vorteils-Karte",
    desc: "Icon + Titel + Beschreibung. Klassische Vorteile-/USP-Liste.",
  },
  usecase_card_v1: {
    title: "Anwendungs-Karte (Icon + Text)",
    desc: "Icon + Titel + Text. Anwendungs-/Einsatzbereich-Liste.",
  },
  application_card_v1: {
    title: "Anwendungs-/Bereichs-Karte",
    desc: "Bild + Subtitle + Titel + Beschreibung + Link. Klickbare Bereichs-Karte.",
  },
  integration_card_v1: {
    title: "Integrationsform-Karte",
    desc: "Bild + Subtitle + Titel + Beschreibung. Statisch, ohne Link.",
  },
  info_card_v1: {
    title: "Info-Karte (3-spaltig)",
    desc: "Subtitle + Titel + Beschreibung, ohne Bild — reine Textkarte.",
  },
  content_block_card_v1: {
    title: "Content-Block-Karte",
    desc: "Bild + Titel + Beschreibung. Persona-/Startseiten-Content-Block.",
  },
  simple_text_card_v1: {
    title: "Einfache Text-Karte",
    desc: "Nur Titel + Beschreibung. Häufig Use-Case-/Anwendungsliste ohne Icon.",
  },
  feature_card_v1: {
    title: "Material-/Feature-Karte",
    desc: "Bild + Eyebrow + Titel + Beschreibung + Bulletpoints (bullets.0..n, Legacy features.0..n).",
  },
  empty_card_v1: {
    title: "Leere Karte",
    desc: "Kind-Section ohne Felder. Renderer-Sonderfall oder Pflege-Lücke.",
  },
  misc_card_v1: {
    title: "Sonstige Karte",
    desc: "Konnte keiner bekannten Familie zugeordnet werden — bitte prüfen.",
  },
};

function normalizeFieldKey(k: string): string {
  if (k === "desc" || k === "beschreibung") return "description";
  if (k === "headline") return "title";
  if (k === "eyebrow") return "subtitle";
  if (k === "text") return "description";
  if (k === "cta" || k === "cta_link") return "cta_href";
  if (k === "url" || k === "link") return "href";
  if (k === "icon_name") return "icon";
  return k;
}

const CARD_CONTAINER_TYPES = new Set([
  "cards_v1",
  "card_grid_v1",
  "product_scroller_v1",
  "catalog_filter_grid_v1",
]);

function classifyCardFamily(input: {
  parent_type: string;
  raw_fields: string[];
  has_image: boolean;
  has_icon: boolean;
  has_link: boolean;
  has_cta: boolean;
}): string {
  const { parent_type, raw_fields, has_image, has_icon, has_link, has_cta } = input;
  if (raw_fields.length === 0) return "empty_card_v1";
  if (parent_type === "catalog_filter_grid_v1") return "catalog_filter_card_v1";
  if (parent_type === "card_grid_v1") return "hub_area_card_v1";
  if (parent_type === "product_scroller_v1") return "product_solution_card_v1";
  // parent_type === cards_v1 (oder andere)
  const hasBullets = raw_fields.some((k) => /^(bullets|features)\.\d+$/.test(k));
  if (hasBullets) return "feature_card_v1";
  const N = new Set(raw_fields.map(normalizeFieldKey));
  if (has_icon && N.has("description") && !N.has("subtitle")) {
    // Unterscheide benefit vs usecase über das Roh-Feld: 'text' → usecase, 'desc'/'description' → benefit
    if (raw_fields.includes("text")) return "usecase_card_v1";
    return "benefit_card_v1";
  }
  const T = N.has("title");
  const D = N.has("description");
  const S = N.has("subtitle");
  const L = has_link || has_cta;
  if (T && D && S && L) return "application_card_v1";
  if (T && D && S) return has_image ? "integration_card_v1" : "info_card_v1";
  if (T && D) return has_image ? "content_block_card_v1" : "simple_text_card_v1";
  return "misc_card_v1";
}

// ---- Lader ----

export async function loadCandidatesReport(): Promise<CandidatesReport> {
  try {
    const { getCmsSupabaseClient } = await import("@/lib/cmsSupabase/client");
    const supabase = getCmsSupabaseClient();

    const sectionsRes = await supabase
      .from("cms_sections")
      .select("id, page_key, section_key, section_type, sort_order, parent_section_id, section_no")
      .order("page_key", { ascending: true })
      .order("sort_order", { ascending: true })
      .range(0, 9999);
    if (sectionsRes.error) {
      return emptyReport(sectionsRes.error.message);
    }
    const sections = (sectionsRes.data ?? []) as Array<RawSection & { section_no?: number }>;

    const pagesRes = await supabase
      .from("cms_pages")
      .select("page_key, page_no, title_de, route_path")
      .range(0, 9999);
    const pagesMeta = new Map<string, { page_no?: number; title?: string; route?: string }>();
    for (const r of (pagesRes.data ?? []) as Array<{
      page_key: string;
      page_no?: number;
      title_de?: string;
      route_path?: string;
    }>) {
      pagesMeta.set(r.page_key, { page_no: r.page_no, title: r.title_de, route: r.route_path });
    }

    const fieldsRes = await supabase
      .from("cms_section_fields")
      .select("page_key, section_key, field_key")
      .range(0, 49999);
    const fields = (fieldsRes.data ?? []) as RawField[];

    const assetsRes = await supabase
      .from("cms_assets")
      .select("page_key, section_key")
      .eq("is_active", true)
      .range(0, 9999);
    const assets = (assetsRes.data ?? []) as RawAsset[];

    // Index: (page_key|section_key) -> Set<field_key>
    const fieldsByPS = new Map<string, Set<string>>();
    for (const f of fields) {
      const k = `${f.page_key}|${f.section_key}`;
      if (!f.field_key) continue;
      let s = fieldsByPS.get(k);
      if (!s) {
        s = new Set();
        fieldsByPS.set(k, s);
      }
      s.add(f.field_key);
    }

    // Index: (page_key|section_key) -> has asset
    const assetByPS = new Set<string>();
    for (const a of assets) assetByPS.add(`${a.page_key}|${a.section_key}`);

    // Top-Level / children
    const topByPage = new Map<string, RawSection[]>();
    const childrenByParentId = new Map<string, Array<RawSection & { section_no?: number }>>();
    for (const s of sections) {
      if (s.parent_section_id === null) {
        const arr = topByPage.get(s.page_key) ?? [];
        arr.push(s);
        topByPage.set(s.page_key, arr);
      } else {
        const arr = childrenByParentId.get(s.parent_section_id) ?? [];
        arr.push(s);
        childrenByParentId.set(s.parent_section_id, arr);
      }
    }

    // ---- Seitengruppen ----
    const pageGroupMap = new Map<string, PageCandidateGroup>();
    for (const [pageKey, tops] of topByPage.entries()) {
      const sorted = [...tops].sort((a, b) => a.sort_order - b.sort_order);
      const sig = sorted.map((s) => s.section_type).join("|");
      if (!sig) continue;
      const sectionKeys = sorted.map((s) => s.section_key);
      let g = pageGroupMap.get(sig);
      if (!g) {
        const { title, ready } = guessPageTitle(sig, sectionKeys);
        g = {
          signature: sig,
          pattern: sig.split("|").join(" · "),
          pages: [],
          templateReady: ready,
          workingTitle: title,
        };
        pageGroupMap.set(sig, g);
      }
      g.pages.push({ page_key: pageKey, section_keys: sectionKeys });
    }
    const pageGroups = Array.from(pageGroupMap.values())
      .filter((g) => g.pages.length >= 2)
      .sort((a, b) => b.pages.length - a.pages.length);

    // ---- Karten-Templates (Container → Kind) ----
    type Bucket = {
      containerType: string;
      childType: string;
      containerIds: Set<string>;
      childCount: number;
      fieldUsage: Map<string, number>;
      occMap: Map<string, CardTemplateOccurrence>; // key = containerId
    };
    const bucketMap = new Map<string, Bucket>();

    for (const parent of sections) {
      const kids = childrenByParentId.get(parent.id);
      if (!kids || kids.length === 0) continue;
      // dominanter Kindtyp
      const counts = new Map<string, number>();
      for (const k of kids) counts.set(k.section_type, (counts.get(k.section_type) ?? 0) + 1);
      let childType = "";
      let max = 0;
      for (const [t, c] of counts) {
        if (c > max) {
          max = c;
          childType = t;
        }
      }
      if (!childType) continue;
      const bkey = `${parent.section_type}|${childType}`;
      let b = bucketMap.get(bkey);
      if (!b) {
        b = {
          containerType: parent.section_type,
          childType,
          containerIds: new Set(),
          childCount: 0,
          fieldUsage: new Map(),
          occMap: new Map(),
        };
        bucketMap.set(bkey, b);
      }
      b.containerIds.add(parent.id);

      const occChildKeys: string[] = [];
      let hasImg = false;
      let hasLink = false;
      let hasIcon = false;
      for (const kid of kids) {
        if (kid.section_type !== childType) continue;
        b.childCount += 1;
        occChildKeys.push(kid.section_key);
        const psKey = `${kid.page_key}|${kid.section_key}`;
        const fset = fieldsByPS.get(psKey);
        if (fset) {
          for (const fk of fset) {
            b.fieldUsage.set(fk, (b.fieldUsage.get(fk) ?? 0) + 1);
            if (LINK_FIELDS.has(fk)) hasLink = true;
            if (ICON_FIELDS.has(fk)) hasIcon = true;
          }
        }
        if (assetByPS.has(psKey)) hasImg = true;
      }

      const meta = pagesMeta.get(parent.page_key);
      b.occMap.set(parent.id, {
        page_key: parent.page_key,
        page_no: meta?.page_no,
        page_title: meta?.title,
        page_route: meta?.route,
        container_section_key: parent.section_key,
        container_section_no: parent.section_no,
        child_section_keys: occChildKeys,
        child_count: occChildKeys.length,
        has_image: hasImg,
        has_link: hasLink,
        has_icon: hasIcon,
      });
    }

    const cardTemplates: CardTemplate[] = Array.from(bucketMap.entries())
      .filter(([, b]) => b.containerIds.size >= 1)
      .map(([key, b]) => {
        const occList = Array.from(b.occMap.values()).sort((a, b2) => {
          return (a.page_no ?? 9999) - (b2.page_no ?? 9999);
        });
        const fieldInventory = Array.from(b.fieldUsage.entries())
          .map(([field_key, usage]) => ({
            field_key,
            usage,
            coverage: b.childCount > 0 ? usage / b.childCount : 0,
          }))
          .sort((a, b2) => b2.usage - a.usage);

        const hasImage = occList.some((o) => o.has_image);
        const hasLink = occList.some((o) => o.has_link);
        const hasIcon = occList.some((o) => o.has_icon);

        const inconsistencyHints: string[] = [];
        for (const inv of fieldInventory) {
          const hint = SYNONYM_HINTS[inv.field_key];
          if (hint) inconsistencyHints.push(`${inv.field_key}: ${hint}`);
        }
        const canonicalChild = b.childType === "card_v1";
        const cleanlyModeled =
          canonicalChild &&
          inconsistencyHints.length === 0 &&
          fieldInventory.every(
            (f) => CANONICAL_CARD_FIELDS.has(f.field_key) || /^features\.\d+$/.test(f.field_key),
          );

        const { title, desc } = titleFor(key, b.containerType, b.childType);
        return {
          key,
          containerType: b.containerType,
          childType: b.childType,
          workingTitle: title,
          description: desc,
          containerCount: b.containerIds.size,
          childCount: b.childCount,
          fieldInventory,
          hasImage,
          hasLink,
          hasIcon,
          cleanlyModeled,
          inconsistencyHints,
          occurrences: occList.slice(0, 50),
        };
      })
      .sort((a, b) => b.childCount - a.childCount);

    // Kompakte alte Liste für Sidebar-Kompatibilität
    const cardPatterns: CardPatternGroup[] = cardTemplates
      .filter((c) => c.containerCount >= 2)
      .map((c) => ({
        pattern: `${c.containerType} → ${c.childType}`,
        containerType: c.containerType,
        childType: c.childType,
        containerCount: c.containerCount,
        examplePages: Array.from(new Set(c.occurrences.map((o) => o.page_key))).slice(0, 6),
      }));

    // ---- Karten-Familien (Stufe 0.4): pro Einzelkarte klassifizieren ----
    type FamilyAcc = {
      cards: CardFamilyOccurrence[];
      fieldUsage: Map<string, number>;
      parentTypes: Set<string>;
      pages: Set<string>;
      synonyms: Set<string>;
      legacy: Set<string>;
    };
    const famAcc = new Map<string, FamilyAcc>();
    // Auch verwaiste card_v1 (parent nicht in Karten-Container) berücksichtigen.
    for (const parent of sections) {
      const kids = childrenByParentId.get(parent.id);
      if (!kids) continue;
      const parentType = parent.section_type;
      const isCardContainer = CARD_CONTAINER_TYPES.has(parentType);
      for (const kid of kids) {
        if (kid.section_type !== "card_v1") continue;
        const psKey = `${kid.page_key}|${kid.section_key}`;
        const fset = fieldsByPS.get(psKey);
        const raw_fields = fset ? Array.from(fset).sort() : [];
        const has_image = assetByPS.has(psKey);
        const has_icon = raw_fields.some((k) => ICON_FIELDS.has(k));
        const has_link = raw_fields.some((k) => k === "href" || k === "url" || k === "link");
        const has_cta = raw_fields.some(
          (k) => k === "cta_href" || k === "cta_label" || k === "cta" || k === "cta_link",
        );
        // Legacy: Feld hat kanonisches Pendant, das auch vorhanden ist → kein Fehler, nur Hinweis.
        const legacy_fields = raw_fields.filter(
          (k) => LEGACY_FIELD_MAP[k] && raw_fields.includes(LEGACY_FIELD_MAP[k]),
        );
        // Synonyme: nur, wenn kein kanonisches Pendant existiert (sonst Legacy).
        const synonyms = raw_fields.filter(
          (k) => SYNONYM_HINTS[k] && !legacy_fields.includes(k),
        );
        const familyKey = isCardContainer
          ? classifyCardFamily({
              parent_type: parentType,
              raw_fields,
              has_image,
              has_icon,
              has_link,
              has_cta,
            })
          : "misc_card_v1";
        const is_clean =
          synonyms.length === 0 &&
          raw_fields.every(
            (k) =>
              CANONICAL_CARD_FIELDS.has(k) ||
              /^features\.\d+$/.test(k) ||
              legacy_fields.includes(k),
          ) &&
          raw_fields.length > 0;
        const meta = pagesMeta.get(kid.page_key);
        const occ: CardFamilyOccurrence = {
          page_key: kid.page_key,
          page_no: meta?.page_no,
          page_title: meta?.title,
          page_route: meta?.route,
          container_section_key: parent.section_key,
          container_section_no: parent.section_no,
          container_type: parentType,
          child_section_key: kid.section_key,
          child_section_no: kid.section_no,
          raw_fields,
          has_image,
          has_icon,
          has_link,
          has_cta,
          synonyms,
          legacy_fields,
          is_clean,
          modelled_as_child: true,
        };
        let acc = famAcc.get(familyKey);
        if (!acc) {
          acc = {
            cards: [],
            fieldUsage: new Map(),
            parentTypes: new Set(),
            pages: new Set(),
            synonyms: new Set(),
            legacy: new Set(),
          };
          famAcc.set(familyKey, acc);
        }
        acc.cards.push(occ);
        acc.parentTypes.add(parentType);
        acc.pages.add(kid.page_key);
        for (const fk of raw_fields) {
          acc.fieldUsage.set(fk, (acc.fieldUsage.get(fk) ?? 0) + 1);
        }
        for (const fk of synonyms) acc.synonyms.add(fk);
        for (const fk of legacy_fields) acc.legacy.add(fk);
      }
    }

    const cardFamilies: CardFamily[] = Array.from(famAcc.entries())
      .map(([key, acc]) => {
        const meta = FAMILY_TITLES[key] ?? {
          title: key,
          desc: "Heuristisch erkannte Kartenfamilie.",
        };
        const cardCount = acc.cards.length;
        const fieldInventory = Array.from(acc.fieldUsage.entries())
          .map(([field_key, usage]) => ({
            field_key,
            usage,
            coverage: cardCount > 0 ? usage / cardCount : 0,
          }))
          .sort((a, b) => b.usage - a.usage);
        const synonymHints = Array.from(acc.synonyms).map(
          (k) => `${k}: ${SYNONYM_HINTS[k] ?? "Synonym"}`,
        );
        const legacyHints = Array.from(acc.legacy).map(
          (k) =>
            `${k} → ${LEGACY_FIELD_MAP[k]}: Altbestand-Feld, wird noch als Fallback gelesen.`,
        );
        const hasImage = acc.cards.some((c) => c.has_image);
        const hasIcon = acc.cards.some((c) => c.has_icon);
        const hasLink = acc.cards.some((c) => c.has_link);
        const hasCta = acc.cards.some((c) => c.has_cta);
        const cleanShare =
          cardCount > 0 ? acc.cards.filter((c) => c.is_clean).length / cardCount : 0;
        let status: CardFamilyStatus;
        if (key === "empty_card_v1" || key === "misc_card_v1") status = "renderer_special";
        else if (synonymHints.length === 0 && cleanShare >= 0.95) status = "clean";
        else if (synonymHints.length <= 1 && cleanShare >= 0.7) status = "near_clean";
        else status = "heterogeneous";
        const sortedCards = [...acc.cards].sort(
          (a, b) => (a.page_no ?? 9999) - (b.page_no ?? 9999),
        );
        return {
          key,
          workingTitle: meta.title,
          description: meta.desc,
          parentTypes: Array.from(acc.parentTypes),
          cardCount,
          pageCount: acc.pages.size,
          fieldInventory,
          synonymHints,
          legacyHints,
          status,
          hasImage,
          hasIcon,
          hasLink,
          hasCta,
          example: sortedCards[0] ?? null,
          occurrences: sortedCards.slice(0, 100),
        };
      })
      .sort((a, b) => b.cardCount - a.cardCount);

    return {
      pageGroups,
      cardPatterns,
      cardTemplates,
      cardFamilies,
      totalPagesAnalyzed: topByPage.size,
      totalSections: sections.length,
    };
  } catch (e) {
    return emptyReport(e instanceof Error ? e.message : String(e));
  }
}

function emptyReport(error?: string): CandidatesReport {
  return {
    pageGroups: [],
    cardPatterns: [],
    cardTemplates: [],
    cardFamilies: [],
    totalPagesAnalyzed: 0,
    totalSections: 0,
    error,
  };
}
