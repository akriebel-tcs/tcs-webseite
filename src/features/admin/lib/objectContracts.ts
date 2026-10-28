/**
 * Vertragskatalog pro Objekt-Typ.
 *
 * Pro `TruthObjectKind` (CTA, FAQ, Karte, Hero, …) ist hier hinterlegt,
 * welche **Bausteine** (= fachliche Gruppen von Feldern oder Kind-Sections)
 * ein Objekt eigentlich hat. Der Wahrheits-Check zeigt diese Bausteine als
 * Zeilen — nicht mehr die 10–15 Rohfelder.
 *
 * Zwei Arten von Bausteinen:
 *
 * 1. **Feld-Baustein** — der Renderer liest direkt Felder der eigenen
 *    Section (`f(ctx, "title")` etc.). Ausgedrückt über `contentFields`
 *    (Pflicht-Inhalt) und optional `auxFields` (Hilfsfelder wie Farbe).
 *
 * 2. **Kind-Baustein** — der Renderer iteriert echte Kind-Sections eines
 *    bestimmten `section_type` (z. B. `stats_v1` → `stat_v1`,
 *    `tabs_v1` → `tab_v1`, `download_list_v1` → `download_item_v1`,
 *    `cards_v1` → `card_v1`). Ausgedrückt über `childSectionType` plus
 *    `childContentFields` (welche Felder einer Kind-Section gelten als
 *    „inhaltlich gefüllt"). Pflicht-Baustein heißt hier: **mindestens
 *    eine** Kind-Section dieses Typs muss existieren.
 *
 * - `required: true`   → Pflichtbaustein. Fehlt der Inhalt, ist das
 *                        Objekt rot.
 * - `required: false`  → Optionaler Baustein. Standardmäßig ausgeblendet,
 *                        sobald „aktiv" (Toggle an oder Inhalt vorhanden),
 *                        zählt er voll in die Außenampel mit.
 * - `activeIfToggle`   → Toggle-Feld (z. B. `show_phone`). Wenn vorhanden,
 *                        gilt der Baustein als aktiv, sobald der Toggle =
 *                        "1" ist ODER eines der Inhaltsfelder befüllt ist.
 *
 * Diese Datei beschreibt nur die **Sicht** im Wahrheits-Check.
 * Sie ändert nichts an Renderer, Whitelist oder Migrationen.
 */
import type { TruthObjectKind } from "@/features/admin/lib/truthSources";

export interface ObjectContractGroup {
  /** Stabiler Schlüssel, z. B. "kopf", "primary_button", "items". */
  key: string;
  /** Anzeigetext im Wahrheits-Check (deutsch, klar). */
  label: string;
  /** Kurzerklärung als Tooltip / sekundäre Zeile. */
  hint?: string;
  /** Inhalts-Felder der eigenen Section (Text oder Bild). */
  contentFields: string[];
  /** Hilfsfelder (z. B. Farbe, Variante). Zählen nicht für Inhalts-Ampel. */
  auxFields?: string[];
  /** Pflicht-Baustein? */
  required: boolean;
  /** Optionaler Toggle, der den Baustein aktiv schaltet. */
  activeIfToggle?: string;
  /**
   * Wenn gesetzt: dieser Baustein bezieht sich auf **Kind-Sections** des
   * angegebenen `section_type` (z. B. "stat_v1"). `contentFields` werden
   * dann ignoriert; stattdessen wird geprüft, ob mindestens eine
   * Kind-Section vorhanden ist und ob deren Felder aus `childContentFields`
   * befüllt sind.
   */
  childSectionType?: string;
  /** Welche Felder einer Kind-Section zählen als Inhalt. */
  childContentFields?: string[];
}

export interface ObjectContract {
  kind: TruthObjectKind;
  /** Die Bausteine in Anzeigereihenfolge. */
  groups: ObjectContractGroup[];
}

/* -------------------------------------------------------------------------- */
/* CTA — exakt 7 Bausteine                                                    */
/* -------------------------------------------------------------------------- */

const CTA_CONTRACT: ObjectContract = {
  kind: "cta",
  groups: [
    {
      key: "kopf",
      label: "Kopf (Überschrift)",
      hint: "Hauptüberschrift der Call-to-Action.",
      contentFields: ["title"],
      required: true,
    },
    {
      key: "inhalt",
      label: "Inhalt (Fließtext)",
      hint: "Erklärender Text unter der Überschrift.",
      contentFields: ["text", "description", "body"],
      required: true,
    },
    {
      key: "primary_button",
      label: "Primärbutton",
      hint: "Hauptaktion (z. B. „Beratungstermin vereinbaren“).",
      contentFields: ["cta_label", "cta_href"],
      auxFields: ["cta_kind", "cta_primary_color"],
      required: true,
    },
    {
      key: "secondary_button",
      label: "Sekundärbutton",
      hint: "Optionaler zweiter Button neben dem Primärbutton.",
      contentFields: ["cta_secondary_label", "cta_secondary_href"],
      auxFields: ["cta_secondary_kind", "cta_secondary_color"],
      required: false,
      activeIfToggle: "show_secondary",
    },
    {
      key: "contact_phone",
      label: "Kontakt · Telefon",
      hint: "Direkt anrufbare Rufnummer unter den Buttons.",
      contentFields: ["phone_label", "phone_href"],
      required: false,
      activeIfToggle: "show_phone",
    },
    {
      key: "contact_email",
      label: "Kontakt · E-Mail",
      hint: "Direkt anschreibbare Mail-Adresse unter den Buttons.",
      contentFields: ["email_label", "email_href", "email"],
      required: false,
      activeIfToggle: "show_email",
    },
    {
      key: "background",
      label: "Hintergrund (hell / dunkel)",
      hint: "Optische Variante des CTA-Blocks.",
      contentFields: ["background_variant"],
      required: true,
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* FAQ                                                                        */
/* -------------------------------------------------------------------------- */

const FAQ_CONTRACT: ObjectContract = {
  kind: "faq",
  groups: [
    {
      key: "kopf",
      label: "Kopf (Eyebrow + Überschrift + Intro)",
      hint: "Bereichsüberschrift und kurzer Einleitungstext über den FAQ-Einträgen.",
      contentFields: ["eyebrow", "label", "headline", "title", "intro"],
      required: false,
    },
    {
      key: "items",
      label: "FAQ-Einträge (Frage + Antwort)",
      hint: "Die einzelnen Frage-Antwort-Paare. FaqV1 liest die Items flach aus der eigenen Section (Felder `items.<n>.frage` / `items.<n>.antwort`).",
      contentFields: ["items.*"],
      required: true,
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Hero / Teaser / Standardkarte / Hub-Karte                                  */
/* -------------------------------------------------------------------------- */

const HERO_CONTRACT: ObjectContract = {
  kind: "hero",
  groups: [
    {
      key: "kopf",
      label: "Kopf (Eyebrow + Überschrift + Subline)",
      contentFields: ["eyebrow", "title", "headline", "subtitle", "subline", "lead"],
      required: true,
    },
    {
      key: "image",
      label: "Hero-Bild",
      contentFields: ["image"],
      required: true,
    },
    {
      key: "cta",
      label: "Hero-CTA (optional)",
      contentFields: ["cta_label", "cta_href"],
      auxFields: ["cta_kind"],
      required: false,
    },
  ],
};

const CARD_CONTRACT: ObjectContract = {
  kind: "card",
  groups: [
    {
      key: "image",
      label: "Bild (Karte / Thumbnail / Icon-Bild)",
      hint: "Containerabhängig: Raster=image, Hub=thumbnail, Feature-Grid=icon_image.",
      contentFields: ["image", "thumbnail", "icon_image"],
      required: false,
    },
    {
      key: "text",
      label: "Titel + Beschreibung",
      contentFields: ["title", "headline", "subtitle", "description", "text", "body"],
      required: true,
    },
    {
      key: "link",
      label: "Verlinkung (CTA)",
      contentFields: ["cta_label", "cta_href", "href", "link"],
      required: false,
    },
  ],
};

const TEASER_CONTRACT: ObjectContract = {
  kind: "teaser",
  groups: [
    {
      key: "kopf",
      label: "Kopf (Überschrift + Subline)",
      contentFields: ["eyebrow", "title", "headline", "subtitle", "subline"],
      required: true,
    },
    {
      key: "image",
      label: "Bild",
      contentFields: ["image"],
      required: true,
    },
    {
      key: "text",
      label: "Inhalt (Fließtext)",
      contentFields: ["text", "description", "body", "intro"],
      required: true,
    },
    {
      key: "cta",
      label: "CTA (optional)",
      contentFields: ["cta_label", "cta_href"],
      required: false,
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Container — Kopf OPTIONAL, Kinder = Pflicht                                */
/* -------------------------------------------------------------------------- */

function containerContract(
  kind: TruthObjectKind,
  childrenLabel: string,
  childSectionType: string,
  childContentFields: string[],
  childrenHint: string,
): ObjectContract {
  return {
    kind,
    groups: [
      {
        key: "kopf",
        label: "Kopf (Überschrift + Intro, optional)",
        hint: "Bereichsüberschrift über dem Container. Der Renderer zeigt den Container auch ohne Kopf, sobald Kinder vorhanden sind.",
        contentFields: ["eyebrow", "label", "title", "headline", "subtitle", "subline", "intro", "lead"],
        required: false,
      },
      {
        key: "items",
        label: childrenLabel,
        hint: childrenHint,
        contentFields: [],
        required: true,
        childSectionType,
        childContentFields,
      },
    ],
  };
}

const CARDS_GRID_CONTRACT = containerContract(
  "cards_grid",
  "Karten (`card_v1`)",
  "card_v1",
  ["title", "headline", "description", "text", "image", "thumbnail", "icon_image", "cta_label", "cta_href", "href", "link"],
  "Kartenraster benötigt mindestens eine Kind-Section `card_v1` mit Titel oder Bild.",
);

const CARDS_SCROLLER_CONTRACT = containerContract(
  "cards_scroller",
  "Karten (`card_v1`)",
  "card_v1",
  ["title", "headline", "description", "text", "image", "thumbnail", "icon_image", "cta_label", "cta_href", "href", "link"],
  "Kartenscroller benötigt mindestens eine Kind-Section `card_v1`.",
);

const FEATURE_GRID_CONTRACT = containerContract(
  "feature_grid",
  "Icon-Karten (`card_v1`)",
  "card_v1",
  ["title", "headline", "description", "text", "icon_image", "image"],
  "Icon-Raster benötigt mindestens eine Kind-Section `card_v1` mit Icon/Bild und Titel.",
);

/* -------------------------------------------------------------------------- */
/* Stats / Tabs / Downloads — Kinder-basiert                                  */
/* -------------------------------------------------------------------------- */

const STATS_CONTRACT: ObjectContract = {
  kind: "stats",
  groups: [
    {
      key: "kopf",
      label: "Kopf (Überschrift + Intro, optional)",
      contentFields: ["eyebrow", "title", "headline", "intro"],
      required: false,
    },
    {
      key: "items",
      label: "Kennzahlen (`stat_v1` Kind-Sections)",
      hint: "`StatsV1` liest Kind-Sections vom Typ `stat_v1` (Felder `value`, `label`, optional `description`).",
      contentFields: [],
      required: true,
      childSectionType: "stat_v1",
      childContentFields: ["value", "label", "description"],
    },
  ],
};

const TABS_CONTRACT: ObjectContract = {
  kind: "tabs",
  groups: [
    {
      key: "kopf",
      label: "Kopf (Überschrift + Intro, optional)",
      contentFields: ["label", "title", "headline", "intro", "tablist_label"],
      required: false,
    },
    {
      key: "items",
      label: "Tabs (`tab_v1` Kind-Sections)",
      hint: "`TabsV1` liest Kind-Sections vom Typ `tab_v1` (`tab_label`, `title`, `description`, `vorteile.<n>.headline/body`).",
      contentFields: [],
      required: true,
      childSectionType: "tab_v1",
      childContentFields: ["tab_label", "title", "description", "vorteile.*"],
    },
  ],
};

const DOWNLOADS_CONTRACT: ObjectContract = {
  kind: "downloads",
  groups: [
    {
      key: "kopf",
      label: "Kopf (Überschrift + Intro, optional)",
      contentFields: ["title", "headline", "intro"],
      required: false,
    },
    {
      key: "items",
      label: "Download-Einträge (`download_item_v1` Kind-Sections)",
      hint: "`DownloadListV1` liest Kind-Sections vom Typ `download_item_v1` (`title`, `description`, `file_label`, `cta_href`).",
      contentFields: [],
      required: true,
      childSectionType: "download_item_v1",
      childContentFields: ["title", "description", "file_label", "cta_href"],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Reine Textbausteine                                                        */
/* -------------------------------------------------------------------------- */

const RICH_CONTRACT: ObjectContract = {
  kind: "rich",
  groups: [
    {
      key: "kopf",
      label: "Kopf (Überschrift, optional)",
      contentFields: ["eyebrow", "title", "headline"],
      required: false,
    },
    {
      key: "body",
      label: "Inhalt (Freitext)",
      contentFields: ["body", "text", "content", "intro"],
      required: true,
    },
  ],
};

const CONTENT_CONTRACT: ObjectContract = {
  kind: "content",
  groups: [
    {
      key: "kopf",
      label: "Kopf (Überschrift, optional)",
      contentFields: ["eyebrow", "title", "headline", "subtitle"],
      required: false,
    },
    {
      key: "body",
      label: "Inhalt (Fließtext)",
      contentFields: ["body", "text", "intro", "lead", "description"],
      required: true,
    },
  ],
};

const CONTACT_CONTRACT: ObjectContract = {
  kind: "contact",
  groups: [
    {
      key: "kopf",
      label: "Kopf (Überschrift)",
      contentFields: ["title", "headline", "eyebrow"],
      required: true,
    },
    {
      key: "phone",
      label: "Telefon",
      contentFields: ["phone_label", "phone_href"],
      required: false,
    },
    {
      key: "email",
      label: "E-Mail",
      contentFields: ["email_label", "email_href", "email"],
      required: false,
    },
    {
      key: "address",
      label: "Adresse",
      contentFields: ["address", "street", "city", "zip", "country"],
      required: false,
    },
  ],
};

export const OBJECT_CONTRACTS: Record<TruthObjectKind, ObjectContract> = {
  cta: CTA_CONTRACT,
  faq: FAQ_CONTRACT,
  hero: HERO_CONTRACT,
  card: CARD_CONTRACT,
  teaser: TEASER_CONTRACT,
  cards_grid: CARDS_GRID_CONTRACT,
  cards_scroller: CARDS_SCROLLER_CONTRACT,
  feature_grid: FEATURE_GRID_CONTRACT,
  stats: STATS_CONTRACT,
  tabs: TABS_CONTRACT,
  rich: RICH_CONTRACT,
  downloads: DOWNLOADS_CONTRACT,
  contact: CONTACT_CONTRACT,
  content: CONTENT_CONTRACT,
};

/** Liefert für ein kind alle eigenen field_keys, die einer Vertragsgruppe zugeordnet sind. */
export function contractFieldsOf(kind: TruthObjectKind): Set<string> {
  const out = new Set<string>();
  for (const g of OBJECT_CONTRACTS[kind].groups) {
    if (g.childSectionType) continue; // Kind-Bausteine haben keine eigenen Felder
    for (const f of g.contentFields) out.add(f);
    for (const f of g.auxFields ?? []) out.add(f);
    if (g.activeIfToggle) out.add(g.activeIfToggle);
  }
  return out;
}

/** Matched ein field_key gegen eine Vertragsliste (mit Wildcard `items.*`, `vorteile.*` …)? */
export function fieldMatchesContract(fieldKey: string, contractList: string[]): boolean {
  for (const c of contractList) {
    if (c === fieldKey) return true;
    if (c.endsWith(".*")) {
      const prefix = c.slice(0, -1);
      if (fieldKey.startsWith(prefix)) return true;
    }
  }
  return false;
}
