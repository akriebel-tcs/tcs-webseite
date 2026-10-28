/**
 * Stufe-0 Block-/Teaser-Template-Registry (read-only).
 *
 * Listet einzelne Block-/Teaser-Section-Typen, die als wiederverwendbares
 * Muster im Admin sichtbar sein sollen — ohne Vererbung, ohne DB-Spalte
 * und ohne Public-Wirkung. Die Vorkommen werden live aus `cms_sections`
 * gelesen (parent_section_id IS NULL, is_active = true).
 *
 * Quelle der Definition: docs/02-architektur/section-typen-katalog.md
 */

export interface BlockTemplateField {
  field_key: string;
  required: boolean;
  description: string;
}

export interface BlockTemplateDefinition {
  /** Stabiler Schlüssel = `cms_sections.section_type`. */
  template_key: string;
  /** Anzeigename im Admin. */
  name: string;
  /** Kurzbeschreibung für die Liste. */
  description: string;
  /** Feldschema (cms_section_fields). */
  fields: BlockTemplateField[];
  /** Asset-Slots (cms_assets.field_key/asset_role). */
  asset_slots: Array<{ slot: string; required: boolean; description: string }>;
  /** Layout- und Verhaltens-Konventionen (Code-seitig, kein Template-Setting). */
  layout_notes: string[];
}

export const BLOCK_TEMPLATE_REGISTRY: BlockTemplateDefinition[] = [
  {
    template_key: "hero_v1",
    name: "Hero (Seitenkopf)",
    description:
      "Großer Seitenkopf mit Eyebrow (kleine Mini-Überschrift), Headline und kurzem Intro-Text. " +
      "Steht ganz oben auf fast jeder Seite und wird vom Seitenlayout, nicht vom Body-Renderer ausgegeben.",
    fields: [
      { field_key: "label", required: false, description: "Eyebrow (kleine Mini-Überschrift über der Headline)." },
      { field_key: "headline", required: true, description: "Hauptüberschrift der Seite." },
      { field_key: "intro", required: false, description: "Kurzer Einleitungstext unter der Headline." },
    ],
    asset_slots: [
      { slot: "image", required: false, description: "Hero-Bild (Viewports desktop/tablet/mobile)." },
    ],
    layout_notes: [
      "Wird vom Seitenlayout gerendert, nicht vom Body-Renderer.",
      "Steht immer als erster Block einer Seite (Sichtbarkeit `is_active = true`).",
    ],
  },
  {
    template_key: "content_v1",
    name: "Intro / Textblock",
    description:
      "Einfacher Fließtext-Block mit optionalem Eyebrow und Überschrift. Wird als Intro unter dem Hero " +
      "oder als Zwischenabschnitt im Seitenfluss eingesetzt.",
    fields: [
      { field_key: "label", required: false, description: "Eyebrow (kleine Mini-Überschrift)." },
      { field_key: "title", required: false, description: "Optionale Überschrift des Textblocks." },
      { field_key: "text", required: true, description: "Fließtext (mehrere Absätze möglich)." },
    ],
    asset_slots: [],
    layout_notes: [
      "Einspaltig, zentriert, ohne Bild.",
      "Wird häufig direkt nach dem Hero als Intro verwendet.",
    ],
  },
  {
    template_key: "teaser_2col_v1",
    name: "Wechselteaser",
    description:
      "2-Spalten-Teaser mit Bild/Text-Wechsel, 16:9-Bildformat, Hover-Zoom und optionalem CTA " +
      "(Call-to-Action = Link mit Beschriftung). Standard für redaktionelle Wechselblöcke auf Hubseiten.",
    fields: [
      { field_key: "label", required: false, description: "Eyebrow (kleine Mini-Überschrift über dem Titel)." },
      { field_key: "title", required: true, description: "Überschrift des Teasers." },
      { field_key: "text", required: true, description: "Fließtext des Teasers." },
      { field_key: "cta_label", required: false, description: "Beschriftung des Links/Buttons (nur mit cta_link sichtbar)." },
      { field_key: "cta_link", required: false, description: "Ziel des Links (intern /... oder extern https://...)." },
      {
        field_key: "image_position",
        required: false,
        description: "Position des Bildes ab Desktop (lg): `left` oder `right`. Default: `right`.",
      },
      {
        field_key: "background_variant",
        required: false,
        description: "Hintergrund: `default` oder `muted` (gedämpft). Default: `default`.",
      },
    ],
    asset_slots: [
      {
        slot: "image",
        required: false,
        description: "Teaser-Bild (Viewports desktop/tablet/mobile gemäß Asset-Strategie). 16:9-Bildformat.",
      },
    ],
    layout_notes: [
      "Desktop ab `lg`: zweispaltig (Bild + Text nebeneinander).",
      "Darunter (< lg): gestapelt — Text immer oben, Bild unten (Lesbarkeit).",
      "Bild/Text-Wechsel je Section über `image_position` (left/right).",
      "Bildformat fix 16:9, sanfter Hover-Zoom (Code-Konvention im Renderer).",
      "Hintergrund-Variante `muted` rendert `bg-secondary/30`.",
      "CTA wird nur gerendert, wenn `cta_label` und `cta_link` beide gefüllt sind.",
    ],
  },
  {
    template_key: "cards_v1",
    name: "Kartenraster",
    description:
      "Container für ein Raster aus Standardkarten (`card_v1`). Die Standardkarten kommen als " +
      "Kind-Sections (`parent_section_id`) im Raster zusammen. Sinnvoll für Vorteile, Anwendungen, " +
      "Lösungen, Personas — also alles, was als gleichwertige Kacheln nebeneinander stehen soll.",
    fields: [
      { field_key: "label", required: false, description: "Eyebrow (kleine Mini-Überschrift)." },
      { field_key: "title", required: false, description: "Überschrift über dem Raster." },
      { field_key: "text", required: false, description: "Optionaler Einleitungstext." },
    ],
    asset_slots: [],
    layout_notes: [
      "Kinder sind Sections vom Typ `card_v1` (= Standardkarte), sortiert über `sort_order`.",
      "Karten-Familien-Regel: `benefits`-Familie max. 3 Karten pro Reihe, alle anderen Familien (default, Produkte, Lösungen …) max. 4 pro Reihe. Auf Mobil immer gestapelt.",
      "Reihen-/Spaltenberechnung zentral über `cardGridClass()` / `cardGridItemClass()` aus `src/features/cms/lib/cardGrid.ts` — keine hartcodierten Grid-Klassen am Container.",
      "Bild auf der Standardkarte ist empfohlen, aber nicht Pflicht (Textkarten sind erlaubt).",
    ],
  },
  {
    template_key: "product_scroller_v1",
    name: "Kartenscroller",
    description:
      "Horizontaler Scroller (waagerecht wischbar) mit Standardkarten als Kind-Sections (`card_v1`). " +
      "Ab 5 Karten erscheinen Navigationspfeile. Standard für Produkt- und Lösungslisten, wo Bild Pflicht ist.",
    fields: [
      { field_key: "label", required: false, description: "Eyebrow (kleine Mini-Überschrift)." },
      { field_key: "title", required: false, description: "Überschrift über dem Scroller." },
      { field_key: "text", required: false, description: "Optionaler Einleitungstext." },
    ],
    asset_slots: [],
    layout_notes: [
      "Kinder sind Sections vom Typ `card_v1` (= Standardkarte).",
      "Bildslot der Standardkarte ist `image` (4:3-Bildformat, faktisch Pflicht im Scroller).",
      "Navigationspfeile erscheinen automatisch ab 5 sichtbaren Karten.",
    ],
  },
  {
    template_key: "card_v1",
    name: "Standardkarte",
    description:
      "Einzelne Karte als Kind-Section. Regulär verwendet unter `cards_v1` " +
      "(Kartenraster) und `product_scroller_v1` (Kartenscroller). Pflichtfelder " +
      "sind Titel und Beschreibung; optional kommen Icon, Bild/Thumbnail und " +
      "Link dazu. Pro Karte ist immer nur EIN großer Bildslot aktiv: `image` " +
      "(vollflächig) ODER `thumbnail` (klein). `icon_image` ist ein separater, " +
      "kleiner Bildicon-Slot — kein Lucide-/Google-Icon-Name.",
    fields: [
      { field_key: "label", required: false, description: "Eyebrow (kleine Mini-Überschrift)." },
      { field_key: "title", required: true, description: "Titel der Karte." },
      { field_key: "description", required: true, description: "Beschreibungstext der Karte." },
      { field_key: "icon", required: false, description: "Icon-Name als Textfeld (kebab-case Lucide-Name, z. B. `shield-check`). KEIN Bild-Upload — für ein Bildicon den Slot `icon_image` benutzen." },
      { field_key: "cta_label", required: false, description: "Beschriftung des Links/Buttons." },
      { field_key: "cta_href", required: false, description: "Ziel des Links (intern oder extern)." },
    ],
    asset_slots: [
      { slot: "image", required: false, description: "Vollflächiges Karten-Bild (Teaser-/Hero-Stil)." },
      { slot: "thumbnail", required: false, description: "Kleines Produkt-Bild (Scroller-/Hub-Stil)." },
      { slot: "icon_image", required: false, description: "Grafisches Bildicon (eigene Bilddatei, z. B. SVG/PNG). Ist ein BILDSLOT — nicht zu verwechseln mit dem Lucide-Textfeld `icon`. Renderer-Priorität: `icon_image` vor `icon` vor Code-Fallback." },
    ],
    layout_notes: [
      "Reguläre Eltern-Container: `cards_v1` (Kartenraster) und `product_scroller_v1` (Kartenscroller).",
      "`feature_grid_v1` ist als Eltern-Container historisch (0× aktiv) — für neue Vorteils-/Merkmal-Raster bitte `cards_v1` verwenden; Icons funktionieren dort gleichwertig (`icon` als Lucide-Textfeld oder `icon_image` als Bildslot).",
      "Pro Karte nur EIN großer Bildslot aktiv (`image` ODER `thumbnail`). `icon_image` ist orthogonal und meist Icon-Karten vorbehalten.",
      "Reihenfolge im Eltern-Container über `sort_order`.",
      "Icons als Text leben in `cms_section_fields.icon`, Bildicons als Asset im Slot `icon_image`.",
    ],
  },

  {
    template_key: "cta_v1",
    name: "CTA-Block (Call-to-Action)",
    description:
      "Aufmerksamkeits-Block am Ende eines Themas: Titel, kurzer Text und ein primärer Link/Button. " +
      'Typisch für „Jetzt Kontakt aufnehmen" oder „Zur Beratung".',
    fields: [
      { field_key: "title", required: true, description: "Überschrift des CTA-Blocks." },
      { field_key: "text", required: false, description: "Kurzer Begleittext." },
      { field_key: "cta_label", required: false, description: "Beschriftung des Primärbuttons." },
      { field_key: "cta_kind", required: false, description: "Linkart des Primärbuttons (Eingabehilfe Admin: `intern` · `extern` · `shortid`)." },
      { field_key: "cta_href", required: false, description: "Ziel des Primärbuttons (intern /... oder extern https://...)." },
      { field_key: "cta_primary_color", required: false, description: "Farbe Primärbutton: `auto` (Standard, folgt Hintergrund), `dark` oder `light`." },
      { field_key: "cta_secondary_label", required: false, description: "Beschriftung des optionalen Sekundärbuttons." },
      { field_key: "cta_secondary_kind", required: false, description: "Linkart des Sekundärbuttons (Eingabehilfe Admin: `intern` · `extern` · `shortid`)." },
      { field_key: "cta_secondary_href", required: false, description: "Ziel des Sekundärbuttons (Fallback `#`, wenn leer)." },
      { field_key: "cta_secondary_color", required: false, description: "Farbe Sekundärbutton: `auto` (Standard), `dark` oder `light`." },
      { field_key: "show_secondary", required: false, description: "Sekundärbutton anzeigen? `1` an, sonst aus." },
      { field_key: "show_phone", required: false, description: "Telefon-Zeile anzeigen? `1` an, sonst aus." },
      { field_key: "show_email", required: false, description: "E-Mail-Zeile anzeigen? `1` an, sonst aus." },
      { field_key: "phone_label", required: false, description: "Sichtbarer Text der Telefon-Zeile (nur mit `show_phone=1`)." },
      { field_key: "phone_href", required: false, description: "Ziel der Telefon-Zeile (z. B. `tel:+49…`)." },
      { field_key: "email_label", required: false, description: "Sichtbarer Text der E-Mail-Zeile (nur mit `show_email=1`)." },
      { field_key: "email_href", required: false, description: "Ziel der E-Mail-Zeile (z. B. `mailto:…`)." },
      { field_key: "background_variant", required: false, description: "Hintergrundvariante: `light` (Standard, dunkle Buttons) oder `dark` (heller Hintergrund verlässt, helle Buttons)." },
    ],
    asset_slots: [
      { slot: "image", required: false, description: "Optionales Hintergrundbild für den CTA-Block." },
    ],
    layout_notes: [
      "Einspaltig, zentriert, optisch hervorgehoben.",
      "Steht meist als letzter Block einer Unterseite.",
      "Vollständiger Renderer-Vertrag siehe `src/features/cms/contract/sectionTypes.ts` → `cta_v1`.",
    ],
  },
  {
    template_key: "faq_v1",
    name: "FAQ (Fragen & Antworten)",
    description:
      "Klappliste mit Fragen und Antworten als Kind-Sections. Sinnvoll auf Detail- und Sonderseiten " +
      "(Kontakt, Service, Karriere).",
    fields: [
      { field_key: "label", required: false, description: "Eyebrow (kleine Mini-Überschrift)." },
      { field_key: "title", required: false, description: "Überschrift über der FAQ-Liste." },
    ],
    asset_slots: [],
    layout_notes: [
      "Kinder = einzelne Frage/Antwort-Sections, sortiert über `sort_order`.",
      "Akkordeon-Verhalten: ein offener Eintrag, Rest geschlossen.",
    ],
  },
  {
    template_key: "stats_v1",
    name: "Kennzahlen-Leiste",
    description:
      'Reihe großer Zahlen mit Kurzlabel (z. B. „120+ Standorte"). Kinder vom Typ `stat_v1`.',
    fields: [
      { field_key: "label", required: false, description: "Eyebrow (kleine Mini-Überschrift)." },
      { field_key: "title", required: false, description: "Optionale Überschrift." },
    ],
    asset_slots: [],
    layout_notes: [
      "Kinder = `stat_v1` mit Zahl und Kurzlabel.",
      "Wird häufig auf der Startseite eingesetzt.",
    ],
  },
  {
    template_key: "feature_grid_v1",
    name: "Icon-Raster (Feature-Grid)",
    description:
      "Historisch / nicht mehr verwenden. Früher Raster aus Karten mit Bildicon/" +
      "Lucide-Icon statt großem Bild. Aktuell 0× im CMS aktiv. Für neue " +
      "Vorteils-/Merkmal-Raster bitte `cards_v1` (Kartenraster) verwenden — " +
      "Icons funktionieren dort gleichwertig (`icon` als Lucide-Textfeld oder " +
      "`icon_image` als Bildslot). Renderer bleibt als Fallback erhalten.",
    fields: [
      { field_key: "label", required: false, description: "Eyebrow (kleine Mini-Überschrift)." },
      { field_key: "title", required: false, description: "Überschrift über dem Raster." },
      { field_key: "intro", required: false, description: "Optionaler Einleitungstext." },
    ],
    asset_slots: [],
    layout_notes: [
      "Historisch: nicht für neue Inhalte einsetzen — bitte `cards_v1` verwenden.",
      "Falls noch vorhanden: Kinder sind `card_v1` mit Icon (`icon` als Lucide-Textfeld) oder Bildicon (`icon_image`).",
      "Karten-Familien-Regel galt analog zu `cards_v1` (benefits=3, default=4).",
    ],
  },
  {
    template_key: "download_list_v1",
    name: "Download-Liste",
    description:
      "Liste herunterladbarer Dateien (z. B. Datenblätter, Broschüren, PDF). Dateien " +
      "kommen als Kind-Sections vom Typ `download_item_v1`.",
    fields: [
      { field_key: "title", required: true, description: "Überschrift über der Liste." },
      { field_key: "intro", required: false, description: "Optionaler Einleitungstext." },
    ],
    asset_slots: [],
    layout_notes: [
      'Kinder = `download_item_v1` (Titel, Beschreibung, Datei-Label wie „PDF, 2,4 MB", Download-Link).',
      "Reihenfolge über `sort_order`.",
    ],
  },
  {
    template_key: "contact_block_v1",
    name: "Kontaktblock",
    description:
      "Kompakte Kontakt-Karte mit Telefon, E-Mail und optionalem Call-to-Action. " +
      "Wird auf Kontakt- und Serviceseiten als eigenständiger Block eingesetzt.",
    fields: [
      { field_key: "title", required: true, description: "Überschrift des Kontaktblocks." },
      { field_key: "text", required: false, description: "Kurze Beschreibung / Hinweis." },
      { field_key: "phone", required: false, description: "Telefonnummer (E.164 bevorzugt, z. B. `+49…`)." },
      { field_key: "email", required: false, description: "E-Mail-Adresse." },
      { field_key: "cta_label", required: false, description: "Beschriftung des Links/Buttons." },
      { field_key: "cta_href", required: false, description: "Ziel des Links." },
    ],
    asset_slots: [],
    layout_notes: [
      "Eigenständiger Block ohne Kind-Sections.",
      "Telefon-/E-Mail-Zeilen werden nur ausgegeben, wenn die Felder gefüllt sind.",
    ],
  },
  {
    template_key: "rich_v1",
    name: "Rich-Text / Markdown",
    description:
      "Reiner Fließtext-Block mit Markdown-Unterstützung (Listen, Links, Zwischenüberschriften). " +
      "Wird für Rechtstexte, Lerninhalte und längere Erklärungen eingesetzt.",
    fields: [
      { field_key: "title", required: false, description: "Optionale Überschrift." },
      { field_key: "body", required: true, description: "Markdown-Quelltext (Absätze, Listen, Links, Zwischenüberschriften …)." },
    ],
    asset_slots: [],
    layout_notes: [
      "Einspaltig, lesefreundliche Maximalbreite.",
      "Wird mit `react-markdown` gerendert — kein Roh-HTML im Feld erlaubt.",
    ],
  },
  {
    template_key: "tabs_v1",
    name: "Tab-Reiter",
    description:
      "Horizontale Reiternavigation mit ARIA-konformen Tabs. Inhalte je Reiter kommen " +
      "als Kind-Sections vom Typ `tab_v1`.",
    fields: [
      { field_key: "label", required: false, description: "Eyebrow (kleine Mini-Überschrift)." },
      { field_key: "title", required: false, description: "Überschrift über der Tab-Leiste." },
      { field_key: "intro", required: false, description: "Optionaler Einleitungstext." },
      { field_key: "tablist_label", required: false, description: "ARIA-Label des Tab-Containers (Barrierefreiheit)." },
    ],
    asset_slots: [],
    layout_notes: [
      "Kinder = `tab_v1` mit Reiter-Beschriftung, Titel, Beschreibung und optionalen Vorteilen.",
      "Reihenfolge der Reiter über `sort_order`; erster Reiter ist beim Aufruf aktiv.",
    ],
  },
];


// ─── Standardkarte (card_v1) — Vorkommen als Kind-Sections ──────────────────

export interface CardOccurrence {
  page_key: string;
  page_no: number | null;
  page_title: string | null;
  page_route: string | null;
  parent_section_key: string;
  parent_section_type: string;
  parent_section_no: number | null;
  card_section_key: string;
  card_section_no: number | null;
  sort_order: number;
}

export interface CardOccurrenceGroup {
  page_key: string;
  page_no: number | null;
  page_title: string | null;
  page_route: string | null;
  parent_section_key: string;
  parent_section_type: string;
  parent_section_no: number | null;
  cards: CardOccurrence[];
}

/**
 * Lädt aktive `card_v1`-Sections (mit Eltern-Container) und gruppiert sie
 * nach (Seite · Eltern-Container). Read-only.
 */
export async function loadCardOccurrencesGrouped(): Promise<{
  groups: CardOccurrenceGroup[];
  totalCards: number;
  error?: string;
}> {
  try {
    const { getCmsSupabaseClient } = await import("@/lib/cmsSupabase/client");
    const supabase = getCmsSupabaseClient();

    const cardsRes = await supabase
      .from("cms_sections")
      .select("id, page_key, section_key, section_no, sort_order, parent_section_id, is_active")
      .eq("section_type", "card_v1")
      .eq("is_active", true)
      .not("parent_section_id", "is", null)
      .range(0, 9999);
    if (cardsRes.error) return { groups: [], totalCards: 0, error: cardsRes.error.message };
    const cards = (cardsRes.data ?? []) as Array<{
      id: string;
      page_key: string;
      section_key: string;
      section_no: number | null;
      sort_order: number;
      parent_section_id: string;
    }>;

    const parentIds = Array.from(new Set(cards.map((c) => c.parent_section_id)));
    const parents = new Map<
      string,
      { section_key: string; section_type: string; section_no: number | null; page_key: string }
    >();
    if (parentIds.length > 0) {
      const parRes = await supabase
        .from("cms_sections")
        .select("id, page_key, section_key, section_type, section_no")
        .in("id", parentIds)
        .range(0, 9999);
      for (const r of (parRes.data ?? []) as Array<{
        id: string;
        page_key: string;
        section_key: string;
        section_type: string;
        section_no: number | null;
      }>) {
        parents.set(r.id, {
          section_key: r.section_key,
          section_type: r.section_type,
          section_no: r.section_no,
          page_key: r.page_key,
        });
      }
    }

    const pageKeys = Array.from(new Set(cards.map((c) => c.page_key)));
    const pageMeta = new Map<
      string,
      { page_no: number | null; title: string | null; route: string | null }
    >();
    if (pageKeys.length > 0) {
      const pagesRes = await supabase
        .from("cms_pages")
        .select("page_key, page_no, title_de, route_path")
        .in("page_key", pageKeys)
        .range(0, 9999);
      for (const r of (pagesRes.data ?? []) as Array<{
        page_key: string;
        page_no: number | null;
        title_de: string | null;
        route_path: string | null;
      }>) {
        pageMeta.set(r.page_key, { page_no: r.page_no, title: r.title_de, route: r.route_path });
      }
    }

    const groupMap = new Map<string, CardOccurrenceGroup>();
    for (const c of cards) {
      const par = parents.get(c.parent_section_id);
      if (!par) continue;
      const meta = pageMeta.get(c.page_key);
      const gkey = `${c.page_key}::${par.section_key}`;
      let g = groupMap.get(gkey);
      if (!g) {
        g = {
          page_key: c.page_key,
          page_no: meta?.page_no ?? null,
          page_title: meta?.title ?? null,
          page_route: meta?.route ?? null,
          parent_section_key: par.section_key,
          parent_section_type: par.section_type,
          parent_section_no: par.section_no,
          cards: [],
        };
        groupMap.set(gkey, g);
      }
      g.cards.push({
        page_key: c.page_key,
        page_no: meta?.page_no ?? null,
        page_title: meta?.title ?? null,
        page_route: meta?.route ?? null,
        parent_section_key: par.section_key,
        parent_section_type: par.section_type,
        parent_section_no: par.section_no,
        card_section_key: c.section_key,
        card_section_no: c.section_no,
        sort_order: c.sort_order,
      });
    }
    const groups = Array.from(groupMap.values()).sort((a, b) => {
      const pa = a.page_no ?? 9_999;
      const pb = b.page_no ?? 9_999;
      if (pa !== pb) return pa - pb;
      return (a.parent_section_no ?? 0) - (b.parent_section_no ?? 0);
    });
    for (const g of groups) {
      g.cards.sort((a, b) => a.sort_order - b.sort_order);
    }
    return { groups, totalCards: cards.length };
  } catch (e) {
    return { groups: [], totalCards: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface BlockTemplateOccurrence {
  page_key: string;
  page_no: number | null;
  page_title: string | null;
  page_route: string | null;
  section_key: string;
  section_no: number | null;
  sort_order: number;
}

export interface BlockTemplateOccurrencesByKey {
  [template_key: string]: BlockTemplateOccurrence[];
}

/**
 * Lädt aktive Top-Level-Vorkommen aller registrierten Block-Templates
 * (read-only). Verwendet den CMS-Light-Client.
 */
export async function loadBlockTemplateOccurrences(): Promise<{
  byKey: BlockTemplateOccurrencesByKey;
  error?: string;
}> {
  try {
    const { getCmsSupabaseClient } = await import("@/lib/cmsSupabase/client");
    const supabase = getCmsSupabaseClient();

    const keys = BLOCK_TEMPLATE_REGISTRY.map((b) => b.template_key);
    const byKey: BlockTemplateOccurrencesByKey = {};
    for (const k of keys) byKey[k] = [];

    const sectionsRes = await supabase
      .from("cms_sections")
      .select("page_key, section_key, section_type, sort_order, section_no, parent_section_id, is_active")
      .in("section_type", keys)
      .is("parent_section_id", null)
      .eq("is_active", true)
      .order("page_key", { ascending: true })
      .order("sort_order", { ascending: true })
      .range(0, 9999);
    if (sectionsRes.error) {
      return { byKey, error: sectionsRes.error.message };
    }
    const sections = (sectionsRes.data ?? []) as Array<{
      page_key: string;
      section_key: string;
      section_type: string;
      sort_order: number;
      section_no: number | null;
    }>;

    const pageKeys = Array.from(new Set(sections.map((s) => s.page_key)));
    const pageMeta = new Map<string, { page_no: number | null; title: string | null; route: string | null }>();
    if (pageKeys.length > 0) {
      const pagesRes = await supabase
        .from("cms_pages")
        .select("page_key, page_no, title_de, route_path")
        .in("page_key", pageKeys)
        .range(0, 9999);
      for (const r of (pagesRes.data ?? []) as Array<{
        page_key: string;
        page_no: number | null;
        title_de: string | null;
        route_path: string | null;
      }>) {
        pageMeta.set(r.page_key, { page_no: r.page_no, title: r.title_de, route: r.route_path });
      }
    }

    for (const s of sections) {
      const meta = pageMeta.get(s.page_key);
      const arr = byKey[s.section_type];
      if (!arr) continue;
      arr.push({
        page_key: s.page_key,
        page_no: meta?.page_no ?? null,
        page_title: meta?.title ?? null,
        page_route: meta?.route ?? null,
        section_key: s.section_key,
        section_no: s.section_no ?? null,
        sort_order: s.sort_order,
      });
    }
    return { byKey };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const byKey: BlockTemplateOccurrencesByKey = {};
    for (const b of BLOCK_TEMPLATE_REGISTRY) byKey[b.template_key] = [];
    return { byKey, error: msg };
  }
}
