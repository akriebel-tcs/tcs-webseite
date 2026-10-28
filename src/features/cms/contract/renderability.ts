import type { AppLocale } from "@/i18n/locale";
/**
 * renderability.ts — Single Source of Truth für Renderfähigkeit
 * öffentlicher Standardbausteine (CMS-Light Batch 56 / Phase 1, in
 * Batch 56.1 auf Renderer-Parität gebracht).
 *
 * Diese Datei ist die Wahrheit. Audit, Admin-Diagnose, RPC-Härtung,
 * Tests und der SQL-Spiegel (`public.cms_section_renderability`) lesen
 * ausschließlich diese Regeln. Eine zweite Definition derselben Stopper
 * darf an keiner anderen Stelle entstehen.
 *
 * „Renderfähig" heißt: der Renderer gibt für mindestens eine geforderte
 * Locale einen sichtbaren Block zurück (kein `null`-Render). Whitelist-
 * Einträge sind KEIN Beleg für Renderfähigkeit — sie bedeuten nur
 * „editierbar".
 *
 * Wer hier Regeln ändert, MUSS:
 *   1) die SQL-Funktion `public.cms_section_renderability` im selben
 *      Schritt nachziehen (Migration `…_batch56_1_renderfaehigkeit_paritaet.sql`)
 *   2) die TS-Tests in `__tests__/renderability.test.ts` ergänzen
 *   3) das Renderability-Gate `scripts/cms/renderability-gate.mjs`
 *      lokal ausführen und prüfen, dass der bereinigte Bestand exit 0
 *      liefert.
 */

export type Locale = AppLocale;
export const REQUIRED_LOCALES: Locale[] = ["de", "en"];

export interface RenderabilityRule {
  /** Jede Locale braucht für JEDES dieser Felder einen nicht leeren Wert. */
  requiredFieldsBilingual?: string[];
  /**
   * Jede Locale braucht je Gruppe mindestens EIN nicht leeres Feld
   * (z. B. `content_v1`: „title oder text").
   */
  requiredAnyOfBilingual?: string[][];
  /**
   * Pro Gruppe reicht es, wenn IRGENDEINE Locale ein Feld der Gruppe
   * gepflegt hat. Wird für Renderer benutzt, die ihre Render-
   * Entscheidung nicht locale-getrennt treffen (z. B. `contact_block_v1`,
   * `rich_v1` mit shared body, card_v1).
   */
  requiredAnyOfAnyLocale?: string[][];
  /** Mindestanzahl aktiver, vom Renderer akzeptierter Kinder. */
  minActiveChildren?: number;
  /**
   * Welche Kind-`section_type`s der Renderer überhaupt akzeptiert.
   * Beispiel: `cards_v1` akzeptiert nur `card_v1`-Kinder; ein aktives
   * Kind anderen Typs zählt NICHT als „Container voll".
   */
  acceptedChildTypes?: string[];
  /**
   * Container-Spezial: wenn ein nicht leerer Titel/Headline-Wert in
   * IRGENDEINER Locale gepflegt ist, rendert der Renderer den Header
   * auch ohne Kinder (z. B. `cards_v1`, `feature_grid_v1`,
   * `product_scroller_v1`, `download_list_v1`,
   * `product_showcase_list_v1`). Dann ist `minActiveChildren` weich.
   * `null` ⇒ Header-Fallback deaktiviert (strikt children-only, z. B.
   * `stats_v1`, `tabs_v1`).
   */
  titleFallbackField?: string | null;
  /**
   * FAQ-Items: mindestens ein aktives Item, das in JEDER geforderten
   * Locale Frage UND Antwort gefüllt hat. Items mit
   * `enabled="0"` / `is_active="0"` / `hidden="1"` / `visible="0"`
   * zählen NICHT mit (Spiegel zu FaqV1.tsx).
   */
  faqItemsRequired?: boolean;
  /** Welche Locales sind Pflicht? Default: DE+EN. */
  locales?: Locale[];
  /** Notiz für Doku / Audit-Hint. */
  note?: string;
}

/**
 * Pflicht-Render-Stopper pro Standard-Section-Type. Quelle pro Eintrag
 * ist der zugehörige Renderer unter `src/features/cms/components/sections/`.
 *
 * Faustregel für die Wahl der Regelart:
 *  - Renderer prüft Locale-spezifisch via `f(ctx, key)` ⇒ bilingual.
 *  - Renderer prüft locale-übergreifend (Shared-Feld, Asset, Telefon) ⇒ anyLocale.
 *  - Renderer kennt Container-Title-Fallback ⇒ `titleFallbackField`.
 */
export const SECTION_RENDERABILITY: Record<string, RenderabilityRule> = {
  // CtaV1.tsx: `if (!title || !ctaLabel || !ctaHref) return null;`
  cta_v1: {
    requiredFieldsBilingual: ["title", "cta_label", "cta_href"],
    note: "CtaV1 rendert null, sobald eines der drei Pflichtfelder leer ist (pro Locale).",
  },

  // ContentSectionV1.tsx: `if (!hasAnyField(ctx, ['title','text'])) return null;`
  content_v1: {
    requiredAnyOfBilingual: [["title", "text"]],
    note: "ContentSectionV1: mindestens title ODER text in jeder Locale.",
  },

  // RichV1.tsx: `if (!body) return null;` — locale-spezifisch
  rich_v1: {
    requiredAnyOfBilingual: [["body"]],
    note: "RichV1 rendert null, wenn `body` in einer Locale leer ist.",
  },

  // Teaser2ColV1.tsx: `if (!title && !text) return null;` — locale-spezifisch
  teaser_2col_v1: {
    requiredAnyOfBilingual: [["title", "text"]],
    note: "Teaser2ColV1: mindestens title ODER text in jeder Locale.",
  },

  // ContactBlockV1.tsx: `if (!title && !phone && !email && !ctaHref) return null;`
  // Telefon/E-Mail sind in der Praxis sprachneutral → anyLocale reicht.
  contact_block_v1: {
    requiredAnyOfAnyLocale: [["title", "phone", "email", "cta_href"]],
    note: "ContactBlockV1: mindestens title, phone, email ODER cta_href in irgendeiner Locale.",
  },

  // FaqV1.tsx: per-Item enabled/is_active/hidden/visible-Schalter werden
  // im Sammler gefiltert; mindestens ein sichtbares Item mit Q+A pro Locale.
  faq_v1: {
    faqItemsRequired: true,
    note: "Mindestens ein aktives Item (enabled≠0, is_active≠0, hidden≠1, visible≠0) mit Frage UND Antwort je Locale.",
  },

  // CardsSectionV1.tsx: `if (cards.length === 0 && !title) return null;`
  // Kinder = ausschließlich card_v1.
  cards_v1: {
    minActiveChildren: 1,
    acceptedChildTypes: ["card_v1"],
    titleFallbackField: "title",
    note: "Container rendert, sobald ein aktives card_v1-Kind ODER ein Container-Titel gepflegt ist.",
  },
  feature_grid_v1: {
    minActiveChildren: 1,
    acceptedChildTypes: ["card_v1"],
    titleFallbackField: "title",
    note: "FeatureGridV1: gleiche Regel wie cards_v1.",
  },
  product_scroller_v1: {
    minActiveChildren: 1,
    acceptedChildTypes: ["card_v1"],
    titleFallbackField: "title",
    note: "ProductScrollerV1: gleiche Regel wie cards_v1.",
  },
  product_showcase_list_v1: {
    minActiveChildren: 1,
    acceptedChildTypes: ["card_v1"],
    titleFallbackField: "title",
    note: "ProductShowcaseListV1: gleiche Regel wie cards_v1.",
  },
  download_list_v1: {
    minActiveChildren: 1,
    acceptedChildTypes: ["download_item_v1"],
    titleFallbackField: "title",
    note: "DownloadListV1: akzeptiert nur download_item_v1-Kinder oder Container-Titel.",
  },

  // StatsV1.tsx: `if (items.length === 0) return null;` — KEIN Title-Fallback.
  stats_v1: {
    minActiveChildren: 1,
    acceptedChildTypes: ["stat_v1"],
    titleFallbackField: null,
    note: "StatsV1 rendert ausschließlich, wenn mindestens ein aktives stat_v1-Kind vorhanden ist.",
  },

  // TabsV1.tsx: `if (tabs.length === 0) return null;` — KEIN Title-Fallback.
  tabs_v1: {
    minActiveChildren: 1,
    acceptedChildTypes: ["tab_v1"],
    titleFallbackField: null,
    note: "TabsV1 rendert nichts ohne aktives tab_v1-Kind.",
  },

  // card_v1 als Kind: Renderer rendert immer ein <article>; ohne irgendeinen
  // sichtbaren Inhalt wäre die Karte aber visuell leer. Spiegel zum Renderer:
  // Beschreibung, Eyebrow, Bullets, Chips, Links zählen ebenfalls als
  // „sichtbarer Inhalt". Bild/Icon-Asset wird in dieser Vertrags-Etappe
  // bewusst NICHT geprüft (Assets liegen in cms_assets; SQL-Spiegel hat
  // keinen unverhältnismäßigen Mehraufwand wert) — das wird im Audit als
  // dokumentierte Grenze ausgewiesen, nicht als „grün".
  card_v1: {
    requiredAnyOfAnyLocale: [[
      "title", "description", "beschreibung",
      "eyebrow", "subtitle",
      "bullets.0", "bullets.1", "bullets.2", "bullets.3", "bullets.4",
      "features.0", "features.1", "features.2", "features.3", "features.4",
      "chips.0", "chips.1", "chips.2", "chips.3", "chips.4",
      "link_1_label", "link_2_label", "link_3_label",
      "link_1_href",  "link_2_href",  "link_3_href",
      "icon",
    ]],
    note: "card_v1 renderfähig, sobald Text/Bullet/Chip/Link/Icon-Name gepflegt ist. Reine Bild-/Asset-Karten werden in v1 nicht erfasst (dokumentierte Grenze).",
  },
};

/* -------------------------------------------------------------------------- */
/*  Evaluator                                                                 */
/* -------------------------------------------------------------------------- */

export type ReasonCode =
  | "missing_required_field"
  | "missing_required_any_of"
  | "missing_required_any_of_any_locale"
  | "no_active_children"
  | "wrong_child_type"
  | "no_valid_faq_items";

export interface RenderabilityMissing {
  /** Locale, in der der Stopper greift. Für anyLocale/Struktur: "de". */
  locale: Locale;
  field_keys: string[];
  reason: ReasonCode;
}

export interface SectionFactView {
  /** Für jedes (field_key, locale) der nicht-leere Wert. */
  has: (fieldKey: string, locale: Locale) => boolean;
  /** Anzahl aktiver Kinder eines vom Renderer akzeptierten Typs. */
  acceptedChildrenCount: number;
  /**
   * Anzahl aktiver Kinder gesamt (für Diagnose; trennt „Kinder vorhanden,
   * aber falscher Typ" von „gar keine Kinder").
   */
  totalActiveChildrenCount: number;
  /**
   * FAQ-Items: Liste der Slugs, je Slug pro Locale ob Frage+Antwort
   * gefüllt sind und ob das Item sichtbar geschaltet ist.
   */
  faqItems?: Array<{
    slug: string;
    enabled: boolean;
    valid: Record<Locale, boolean>;
  }>;
}

export interface RenderabilityResult {
  canonicalType: string;
  renderable: boolean;
  reasonCodes: ReasonCode[];
  missing: RenderabilityMissing[];
  checkedLocales: Locale[];
  contractKnown: boolean;
}

export function evaluateSectionRenderability(
  canonicalType: string,
  facts: SectionFactView,
): RenderabilityResult {
  const rule = SECTION_RENDERABILITY[canonicalType];
  const checkedLocales = rule?.locales ?? REQUIRED_LOCALES;
  if (!rule) {
    return {
      canonicalType,
      renderable: true,
      reasonCodes: [],
      missing: [],
      checkedLocales,
      contractKnown: false,
    };
  }

  const missing: RenderabilityMissing[] = [];
  const reasonSet = new Set<ReasonCode>();

  if (rule.requiredFieldsBilingual?.length) {
    for (const locale of checkedLocales) {
      for (const fk of rule.requiredFieldsBilingual) {
        if (!facts.has(fk, locale)) {
          missing.push({ locale, field_keys: [fk], reason: "missing_required_field" });
          reasonSet.add("missing_required_field");
        }
      }
    }
  }

  if (rule.requiredAnyOfBilingual?.length) {
    for (const locale of checkedLocales) {
      for (const group of rule.requiredAnyOfBilingual) {
        if (!group.some((fk) => facts.has(fk, locale))) {
          missing.push({ locale, field_keys: [...group], reason: "missing_required_any_of" });
          reasonSet.add("missing_required_any_of");
        }
      }
    }
  }

  if (rule.requiredAnyOfAnyLocale?.length) {
    for (const group of rule.requiredAnyOfAnyLocale) {
      const ok = checkedLocales.some((l) => group.some((fk) => facts.has(fk, l)));
      if (!ok) {
        missing.push({
          locale: "de",
          field_keys: [...group],
          reason: "missing_required_any_of_any_locale",
        });
        reasonSet.add("missing_required_any_of_any_locale");
      }
    }
  }

  if (rule.minActiveChildren) {
    const titleOk = rule.titleFallbackField
      ? checkedLocales.some((l) => facts.has(rule.titleFallbackField as string, l))
      : false;
    const childrenOk = facts.acceptedChildrenCount >= rule.minActiveChildren;
    if (!childrenOk && !titleOk) {
      // Diagnose verfeinern: ist „Kinder da, aber falscher Typ"?
      if (
        rule.acceptedChildTypes?.length &&
        facts.totalActiveChildrenCount > 0 &&
        facts.acceptedChildrenCount === 0
      ) {
        missing.push({
          locale: "de",
          field_keys: ["__children__"],
          reason: "wrong_child_type",
        });
        reasonSet.add("wrong_child_type");
      } else {
        missing.push({
          locale: "de",
          field_keys: ["__children__"],
          reason: "no_active_children",
        });
        reasonSet.add("no_active_children");
      }
    }
  }

  if (rule.faqItemsRequired) {
    const items = (facts.faqItems ?? []).filter((it) => it.enabled);
    for (const locale of checkedLocales) {
      const ok = items.some((it) => it.valid[locale]);
      if (!ok) {
        missing.push({
          locale,
          field_keys: ["items.*.question", "items.*.answer"],
          reason: "no_valid_faq_items",
        });
        reasonSet.add("no_valid_faq_items");
      }
    }
  }

  return {
    canonicalType,
    renderable: missing.length === 0,
    reasonCodes: [...reasonSet],
    missing,
    checkedLocales,
    contractKnown: true,
  };
}

/* -------------------------------------------------------------------------- */
/*  Fixture-Helper                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Hilfsfunktion: aus flachen Rows einen `SectionFactView` bauen.
 *
 * - `rows` → reguläre Section-Felder.
 * - `opts.faqSlugFields` → FAQ-Item-Felder (Slug, Locale, Feldname, Wert).
 *   Erkennt automatisch Sichtbarkeits-Schalter (`enabled`, `is_active`,
 *   `hidden`, `visible`) und nimmt deren Wert sprachunabhängig (jede
 *   Locale-Variante zählt — Spiegel zu FaqV1).
 */
export function factsFromFieldRows(
  rows: ReadonlyArray<{ field_key: string; locale: string; value: string | null | undefined }>,
  opts: {
    acceptedChildrenCount?: number;
    totalActiveChildrenCount?: number;
    /** Alias-Kompatibilität (Altaufrufer aus Batch 56). */
    activeChildrenCount?: number;
    faqSlugFields?: ReadonlyArray<{
      slug: string;
      locale: Locale;
      field_key: string;
      value: string | null | undefined;
    }>;
  } = {},
): SectionFactView {
  const map = new Map<string, string>();
  for (const r of rows) {
    if (r.value && r.value.trim().length > 0) {
      map.set(`${r.field_key}@@${r.locale}`, r.value);
    }
  }
  const QUESTION_SUF = ["frage", "question", "q"];
  const ANSWER_SUF = ["antwort", "answer", "a"];

  let faqItems: SectionFactView["faqItems"];
  if (opts.faqSlugFields) {
    const bySlug = new Map<string, Map<string, string>>();
    for (const r of opts.faqSlugFields) {
      if (!r.value || !r.value.trim()) continue;
      if (!bySlug.has(r.slug)) bySlug.set(r.slug, new Map());
      bySlug.get(r.slug)!.set(`${r.field_key}@@${r.locale}`, r.value);
    }
    faqItems = [...bySlug.entries()].map(([slug, m]) => {
      const valid: Record<Locale, boolean> = { de: false, en: false, pl: false };
      for (const locale of REQUIRED_LOCALES) {
        const hasQ = QUESTION_SUF.some((suf) => m.has(`${suf}@@${locale}`));
        const hasA = ANSWER_SUF.some((suf) => m.has(`${suf}@@${locale}`));
        valid[locale] = hasQ && hasA;
      }
      // Sichtbarkeit: Schalter werden in ANY Locale gelesen. "0" / "1"
      // gem. FaqV1.collectItems. enabled="0" ODER is_active="0" ODER
      // hidden="1" ODER visible="0" ⇒ Item ausgeblendet.
      const anyVal = (k: string): string | null => {
        for (const lo of REQUIRED_LOCALES) {
          const v = m.get(`${k}@@${lo}`);
          if (v) return v.trim();
        }
        return null;
      };
      const en = anyVal("enabled");
      const ia = anyVal("is_active");
      const hi = anyVal("hidden");
      const vi = anyVal("visible");
      const disabled = en === "0" || ia === "0" || hi === "1" || vi === "0";
      return { slug, enabled: !disabled, valid };
    });
  }

  const accepted =
    opts.acceptedChildrenCount ??
    opts.activeChildrenCount ??
    0;
  return {
    has: (fk, locale) => map.has(`${fk}@@${locale}`),
    acceptedChildrenCount: accepted,
    totalActiveChildrenCount: opts.totalActiveChildrenCount ?? accepted,
    faqItems,
  };
}
