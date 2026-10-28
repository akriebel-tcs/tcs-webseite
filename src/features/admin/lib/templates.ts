/**
 * Stufe-0 Template-Registry (statisch, nur Admin-Sicht).
 *
 * Beschreibt Seiten-Gruppen mit gemeinsamer Struktur. Rein zur Übersicht im
 * /admin — keine Template-Engine, keine Vererbung, keine Public-Wirkung.
 *
 * Seit 2026-05-21: Ein Template ist eine **Familie** mit erlaubten
 * Strukturvarianten. Section-Keys dürfen sprachliche Synonyme haben
 * (`benefits` ↔ `vorteile`, `useCases` ↔ `anwendungen`) und der Mittelteil
 * darf entweder Vorteile/Anwendungen ODER Produkte zeigen.
 *
 * Quelle der Struktur-Definition: docs/01-strategie/templates.md
 *   Referenz: P-015 `zutrittskontrolle.elektronische-drueckergarnitur`
 */

export interface TemplateDefinitionSection {
  sort_order: number;
  section_key: string;
  section_type: string;
}

/** Ein erlaubter Slot innerhalb eines Templates. */
export interface TemplateSlot {
  /** Stabiler Slot-Name (z. B. "hero", "mittelteil", "useCases", "cta"). */
  slot: string;
  /** Anzeige-Label im Admin. */
  label: string;
  /** Pflicht-Slot? */
  required: boolean;
  /**
   * Erlaubte konkrete Section-Treffer für diesen Slot.
   * `section_type` darf eine Liste sein (z. B. `cta_v1` ODER `content_v1`).
   * `variant_tag` markiert, welche Strukturvariante dieser Treffer auslöst,
   * `lang_tag` markiert die sprachliche Variante.
   */
  options: Array<{
    section_key: string;
    section_types: string[];
    variant_tag?: "vorteile_anwendungen" | "produkte_anwendungen";
    lang_tag?: "de" | "en_tech";
  }>;
}

export interface TemplateDefinition {
  /** Stabiler Schlüssel (für spätere Stufe 2: cms_pages.template_key). */
  template_key: string;
  /** Anzeigename im Admin. */
  name: string;
  /** Kurze, redaktionelle Beschreibung. */
  description: string;
  /** page_key der Referenzseite. */
  reference_page_key: string;
  /** Slot-basierte Definition (neu, Hauptquelle). */
  slots: TemplateSlot[];
  /**
   * Erwartete Top-Level-Sections der Referenzseite (Kompatibilität für die
   * mittige Strukturansicht, wenn keine Slot-Ansicht gerendert wird).
   */
  reference_sections: TemplateDefinitionSection[];
  /** page_keys der Seiten, die nach diesem Template gepflegt werden sollen. */
  member_page_keys: string[];
  /** Begründungen für bewusst nicht aufgenommene Kandidaten. */
  excluded_notes?: Array<{ page_key: string; reason: string }>;
}

export const TEMPLATE_REGISTRY: TemplateDefinition[] = [
  {
    template_key: "produkt_sub_v1",
    name: "Produkt-Unterseite / Produktlösungsseite",
    description:
      "Familie aller Produkt-Unterseiten unter Zutrittskontrolle. Erlaubt zwei " +
      "Strukturvarianten: (A) Hero · Vorteile · Anwendungen · CTA und " +
      "(B) Hero · Produkte · Anwendungen · CTA. Sprachvarianten " +
      "`benefits`/`useCases` und `vorteile`/`anwendungen` sind beide zulässig.",
    reference_page_key: "zutrittskontrolle.elektronische-drueckergarnitur",
    slots: [
      {
        slot: "hero",
        label: "Hero",
        required: true,
        options: [{ section_key: "hero", section_types: ["hero_v1", "hero"] }],
      },
      {
        slot: "mittelteil_1",
        label: "Vorteile · ODER · Produkte",
        required: true,
        options: [
          {
            section_key: "benefits",
            section_types: ["cards_v1"],
            variant_tag: "vorteile_anwendungen",
            lang_tag: "en_tech",
          },
          {
            section_key: "vorteile",
            section_types: ["cards_v1"],
            variant_tag: "vorteile_anwendungen",
            lang_tag: "de",
          },
          {
            section_key: "produkte",
            section_types: ["cards_v1", "product_scroller_v1"],
            variant_tag: "produkte_anwendungen",
          },
        ],
      },
      {
        slot: "mittelteil_2",
        label: "Anwendungen",
        required: true,
        options: [
          {
            section_key: "useCases",
            section_types: ["cards_v1"],
            lang_tag: "en_tech",
          },
          {
            section_key: "anwendungen",
            section_types: ["cards_v1"],
            lang_tag: "de",
          },
        ],
      },
      {
        slot: "cta",
        label: "CTA",
        required: true,
        options: [
          {
            section_key: "cta",
            section_types: ["content_v1", "cta_v1", "cta"],
          },
        ],
      },
    ],
    reference_sections: [
      { sort_order: 10, section_key: "hero", section_type: "hero_v1" },
      { sort_order: 20, section_key: "benefits", section_type: "cards_v1" },
      { sort_order: 30, section_key: "useCases", section_type: "cards_v1" },
      { sort_order: 40, section_key: "cta", section_type: "content_v1" },
    ],
    member_page_keys: [
      // klassische Variante A (Vorteile + Anwendungen)
      "zutrittskontrolle.elektronische-drueckergarnitur",
      "zutrittskontrolle.elektronischer-knaufzylinder",
      "zutrittskontrolle.bcm-handsender",
      "zutrittskontrolle.funkvernetzte-offline-leser",
      "zutrittskontrolle.bcm-online-leser",
      "zutrittskontrolle.vorhaengeschloss",
      // Variante B (Produkte + Anwendungen)
      "zutrittskontrolle.biometrie",
      "zutrittskontrolle.zufahrtskontrolle",
      // weitere CMS-only Produktlösungsseiten (Tranche B2)
      "zutrittskontrolle.bcm-door-app",
      "zutrittskontrolle.gsm-gateway",
      "zutrittskontrolle.bcm-mini-cloud",
      "zutrittskontrolle.digitale-briefkasten",
      "zutrittskontrolle.zutrittssoftware",
      "zutrittskontrolle.schrankschloss",
      "zutrittskontrolle.serverschrankschloss",
    ],
    excluded_notes: [
      {
        page_key: "zutrittskontrolle.aussenstation-adx5",
        reason:
          "Außenstation ADX5 ist Teil der Gebäudekommunikations-Familie und folgt " +
          "einem anderen Section-Muster (Türstation/Sprechanlage), nicht der " +
          "Produkt-Unterseiten-Familie.",
      },
    ],
  },
];

// ---------- Vergleichs-Helfer ----------

export interface ObservedSection {
  sort_order: number;
  section_key: string;
  section_type: string;
}

export type TemplateMatchStatus =
  | "match" // Voll passend (kanonische Form benefits/useCases + content_v1)
  | "match_variant" // Passende Variante (erlaubte Alternative)
  | "partial" // Abweichung (einzelne Pflichtslots fehlen)
  | "missing"; // Nicht zugeordnet (gar nichts trifft)

export type VariantTag = "vorteile_anwendungen" | "produkte_anwendungen";
export type LangTag = "de" | "en_tech" | "gemischt";

export interface SlotMatch {
  slot: string;
  label: string;
  required: boolean;
  /** Beobachtete Section, die diesen Slot füllt. */
  observed: ObservedSection | null;
  /** Erlaubt? */
  ok: boolean;
  /** War der Typ exakt erwartet? */
  typeOk: boolean;
}

export interface TemplateMatchResult {
  status: TemplateMatchStatus;
  /** „Produkte + Anwendungen" / „Vorteile + Anwendungen" / null. */
  variant: VariantTag | null;
  variantLabel: string | null;
  /** Sprachvariante der Section-Keys. */
  langVariant: LangTag | null;
  langVariantLabel: string | null;
  /** Slot-für-Slot-Auswertung. */
  slots: SlotMatch[];
  /** Beobachtete Sections über das Template hinaus. */
  extraKeys: string[];
  /** Pflichtslots ohne Treffer (Sektion-Slot-Name, z. B. „mittelteil_2"). */
  missingSlots: string[];

  // ---- Kompatibilität mit alter API ----
  matchedKeys: string[];
  missingKeys: string[];
  typeMismatches: Array<{ section_key: string; expected: string; actual: string }>;
}

const variantLabelMap: Record<VariantTag, string> = {
  vorteile_anwendungen: "Vorteile + Anwendungen",
  produkte_anwendungen: "Produkte + Anwendungen",
};

const langLabelMap: Record<LangTag, string> = {
  de: "Sprachvariante: vorteile / anwendungen",
  en_tech: "Sprachvariante: benefits / useCases",
  gemischt: "Sprachvariante: gemischt",
};

/**
 * Slot-basierter Vergleich. Erkennt automatisch Struktur- und Sprachvariante.
 * Reine Leseoperation.
 */
export function matchTemplate(
  template: TemplateDefinition,
  observed: ObservedSection[],
): TemplateMatchResult {
  const observedByKey = new Map(observed.map((s) => [s.section_key, s] as const));
  const consumed = new Set<string>();
  const slotResults: SlotMatch[] = [];
  const variantTags = new Set<VariantTag>();
  const langTags = new Set<"de" | "en_tech">();
  let anyTypeMismatch = false;
  let usedAlternative = false;

  for (const slot of template.slots) {
    let chosen: { obs: ObservedSection; opt: TemplateSlot["options"][number] } | null = null;
    for (const opt of slot.options) {
      const obs = observedByKey.get(opt.section_key);
      if (!obs) continue;
      chosen = { obs, opt };
      break;
    }
    if (!chosen) {
      slotResults.push({
        slot: slot.slot,
        label: slot.label,
        required: slot.required,
        observed: null,
        ok: !slot.required,
        typeOk: !slot.required,
      });
      continue;
    }
    consumed.add(chosen.obs.section_key);
    const typeOk = chosen.opt.section_types.includes(chosen.obs.section_type);
    if (!typeOk) anyTypeMismatch = true;
    // Markiere "alternativ", wenn nicht die jeweils erste (kanonische) Option getroffen wurde
    if (slot.options[0].section_key !== chosen.opt.section_key) usedAlternative = true;
    if (chosen.opt.variant_tag) variantTags.add(chosen.opt.variant_tag);
    if (chosen.opt.lang_tag) langTags.add(chosen.opt.lang_tag);
    slotResults.push({
      slot: slot.slot,
      label: slot.label,
      required: slot.required,
      observed: chosen.obs,
      ok: typeOk,
      typeOk,
    });
  }

  const extraKeys = observed
    .map((o) => o.section_key)
    .filter((k) => !consumed.has(k));

  const missingSlots = slotResults
    .filter((s) => s.required && !s.observed)
    .map((s) => s.slot);

  let status: TemplateMatchStatus;
  if (slotResults.every((s) => s.observed) && !anyTypeMismatch) {
    status = usedAlternative ? "match_variant" : "match";
  } else if (slotResults.some((s) => s.observed)) {
    status = "partial";
  } else {
    status = "missing";
  }

  const variant: VariantTag | null =
    variantTags.size === 1 ? Array.from(variantTags)[0] : null;
  const langVariant: LangTag | null =
    langTags.size === 0 ? null : langTags.size === 1 ? Array.from(langTags)[0] : "gemischt";

  // Kompatibilitätsfelder
  const matchedKeys = slotResults.filter((s) => s.observed && s.typeOk).map((s) => s.observed!.section_key);
  const missingKeys = missingSlots;
  const typeMismatches = slotResults
    .filter((s) => s.observed && !s.typeOk)
    .map((s) => ({
      section_key: s.observed!.section_key,
      expected: template.slots
        .find((sl) => sl.slot === s.slot)!
        .options.map((o) => o.section_types[0])
        .join(" | "),
      actual: s.observed!.section_type,
    }));

  return {
    status,
    variant,
    variantLabel: variant ? variantLabelMap[variant] : null,
    langVariant,
    langVariantLabel: langVariant ? langLabelMap[langVariant] : null,
    slots: slotResults,
    extraKeys,
    missingSlots,
    matchedKeys,
    missingKeys,
    typeMismatches,
  };
}

/**
 * @deprecated — alter Strukturvergleich. Verwendet jetzt intern `matchTemplate`,
 * damit bestehende Aufrufer (Übersichts-Sheet) das gleiche Ergebnis sehen.
 */
export function compareToReference(
  _reference: TemplateDefinitionSection[],
  observed: ObservedSection[],
  template: TemplateDefinition = TEMPLATE_REGISTRY[0],
): TemplateMatchResult {
  return matchTemplate(template, observed);
}

export function statusLabelLong(status: TemplateMatchStatus): string {
  switch (status) {
    case "match":
      return "Voll passend";
    case "match_variant":
      return "Passende Variante";
    case "partial":
      return "Abweichung";
    case "missing":
      return "Nicht zugeordnet";
  }
}
