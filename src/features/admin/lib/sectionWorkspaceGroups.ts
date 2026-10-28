/**
 * Workspace-Gruppen für die drei Standard-Bausteine
 * (Sprint `cms-light-baustein-workspaces-wechselteaser-hero-content-1`):
 *
 *  - `hero_v1`         (Hero einer Seite, Page-Hero)
 *  - `teaser_2col_v1`  (Wechselteaser: Bild + Text in 2 Spalten)
 *  - `content_v1`      (Textblock / Intro)
 *
 * Diese Datei kuratiert ausschließlich die ANZEIGE im Admin: welche
 * Felder sind sichtbar, in welcher Reihenfolge, mit welcher deutschen
 * Klartext-Beschriftung, und welche Wirksamkeit haben sie öffentlich.
 *
 * Keine eigene Vertragswahrheit: die führende Quelle bleibt
 * `src/features/cms/contract/sectionTypes.ts` plus die echten Renderer-
 * Reads (`CmsPageLayout` für Hero, `Teaser2ColV1.tsx`, `ContentSectionV1.tsx`).
 *
 * `expectation` bedeutet:
 *  - `public`       — Renderer liest das Feld nachweislich (Standard-Inhalt).
 *  - `optional`     — Renderer liest es, darf aber leer sein.
 *  - `not-rendered` — Vertrag listet das Feld, der Renderer liest es heute
 *                     NICHT (im Admin als Diagnose sichtbar, nicht ohne
 *                     Renderer-Etappe wieder „grün" machen).
 *  - `legacy`       — historisches Feld, nur sichtbar wenn DB es noch hat.
 */

export type WorkspaceFieldRole =
  | "text" // einzeiliger Klartext
  | "richtext" // mehrzeiliger Fließtext
  | "url" // Link/Pfad (technisch)
  | "enum"; // Auswahlwert (z. B. image_position)

export type WorkspaceExpectation =
  | "public"
  | "optional"
  | "not-rendered"
  | "legacy";

export type WorkspaceGroupKey = "kopf" | "inhalt" | "link" | "medien" | "technik";

export interface WorkspaceFieldDef {
  fieldKey: string;
  label: string;
  /** Kurze Erklärung in Klammern-Stil für die Redaktion. */
  hint?: string;
  role: WorkspaceFieldRole;
  expectation: WorkspaceExpectation;
  /** Wo landet das Feld auf der Webseite? Kurz, ein Satz. */
  rendererNote: string;
  /** Optional: erwartete Enum-Werte (für `role === "enum"`). */
  enumOptions?: ReadonlyArray<{ value: string; label: string }>;
  /**
   * Alternative DB-`field_key`s, die der Renderer als Quelle für dasselbe
   * öffentliche Feld akzeptiert (Sprint Batch 50: z. B. `intro` ist im Hero
   * ein Alias für `subline`; `label` ein Alias für `eyebrow`). Solche Keys
   * gelten im Workspace als „abgedeckt" und tauchen damit **nicht** mehr
   * in der orangen „Altbestand-Felder"-Box auf, obwohl der Workspace
   * weiterhin den kanonischen Key (oben) anzeigt.
   */
  aliasKeys?: ReadonlyArray<string>;
}

export interface WorkspaceGroupDef {
  key: WorkspaceGroupKey;
  label: string;
  hint: string;
  defaultOpen: boolean;
  fields: ReadonlyArray<WorkspaceFieldDef>;
}

export interface SectionWorkspaceConfig {
  sectionType: "hero_v1" | "teaser_2col_v1" | "content_v1";
  adminLabel: string;
  /** Kurzbeschreibung des Bausteins für die Workspace-Kopfzeile. */
  description: string;
  /** Asset-Slot, falls der Renderer Bilder liest. */
  assetSlot?: {
    fieldKey: string;
    label: string;
    hint: string;
    expectation: "required" | "optional";
  };
  groups: ReadonlyArray<WorkspaceGroupDef>;
}

// ───────── hero_v1 ─────────────────────────────────────────────────────
// Renderer-Quelle: `src/features/cms/components/CmsPageLayout.tsx`
//   - pick(cms, "hero", loc, ["label", "eyebrow"])      → Eyebrow
//   - pick(cms, "hero", loc, ["headline"])              → Headline
//   - pick(cms, "hero", loc, ["subheader","subheadline"]) → Subheader (opt.)
//   - pick(cms, "hero", loc, ["intro","introText","subline","description"])
//   - cms.asset("hero","image") + assetSet("hero","image") (3 Viewports)
//   - cms.assetAlt("hero","image", loc, ...)
// CTA-Felder (cta_label / cta_href) sind im Vertrag, werden aber von
// `CmsPageLayout` aktuell NICHT als Hero-CTA gerendert → `not-rendered`.

const HERO_V1: SectionWorkspaceConfig = {
  sectionType: "hero_v1",
  adminLabel: "Hero (Seitenkopf mit Bild)",
  description:
    "Seitenkopf: Eyebrow (kleine Zeile darüber), Hauptüberschrift, Unterzeile und Hero-Bild für Desktop/Tablet/Mobile inkl. Alt-Text.",
  assetSlot: {
    fieldKey: "image",
    label: "Hero-Bild (Desktop · Tablet · Mobile + Alt-Text)",
    hint: "Pflichtbild für den Seitenkopf. Drei Viewports pflegen oder per Fokuspunkt steuern.",
    expectation: "required",
  },
  groups: [
    {
      key: "kopf",
      label: "Kopf (Eyebrow · Headline · Unterzeile)",
      hint: "Die drei sichtbaren Textzeilen über dem Hero-Bild.",
      defaultOpen: true,
      fields: [
        {
          fieldKey: "eyebrow",
          label: "Eyebrow (kleine Zeile über der Überschrift)",
          hint: 'Kurzer Auftakt, z. B. „Lösung" oder „Service".',
          role: "text",
          expectation: "optional",
          rendererNote: "Wird in CmsPageLayout als Label über der Headline ausgegeben.",
          aliasKeys: ["label"],
        },
        {
          fieldKey: "headline",
          label: "Hauptüberschrift (Headline)",
          hint: "Größter Text im Hero. Ein klarer Satz.",
          role: "text",
          expectation: "public",
          rendererNote: "Hauptüberschrift im Hero (PageLayout > headline).",
          aliasKeys: ["title"],
        },
        {
          fieldKey: "subheadline",
          label: "Subheader (optionaler Zusatz unter der Headline)",
          hint:
            'Optional. Nur ausfüllen, wenn die Seite eine zweite Zeile direkt unter der Headline braucht (Variante „subheader").',
          role: "text",
          expectation: "optional",
          rendererNote: 'Wird in CmsPageLayout als „subheader" gelesen (alternativ aus „subheader").',
          aliasKeys: ["subheader"],
        },
        {
          fieldKey: "subline",
          label: "Intro / Subline (kurzer Beschreibungstext)",
          hint: "1–2 Sätze unter der Überschrift, die den Inhalt der Seite einleiten.",
          role: "richtext",
          expectation: "public",
          rendererNote:
            'CmsPageLayout liest hier in dieser Reihenfolge: intro → introText → subline → description.',
          aliasKeys: ["intro", "introText"],
        },
        {
          fieldKey: "description",
          label: "Beschreibungssatz (Zusatztext unter dem Seitenkopf)",
          hint:
            "Optional. Ein zusätzlicher Satz, den Anwendungs-Detailseiten unter dem Seitenkopf ausgeben.",
          role: "richtext",
          expectation: "optional",
          rendererNote:
            "Anwendungs-Detailseiten lesen hero.description (Rückfall: content.description). Im Standard-Hero nur letzte Rückfallebene für die Subline.",
        },
      ],
    },
    {
      key: "technik",
      label: "Bild-Feinsteuerung (Fixierungspunkt)",
      hint:
        'Legt fest, welcher Bildausschnitt beim Zuschneiden sichtbar bleibt (CSS „object-position"). Layout-Feld, wird aus dem DE-Wert gelesen.',
      defaultOpen: false,
      fields: [
        {
          fieldKey: "image_focus",
          label: "Fixierungspunkt des Hero-Bildes",
          hint: 'Leer = Standard (mittig). Beispiel: „right center" hält die rechte Bildmitte sichtbar.',
          role: "enum",
          expectation: "public",
          rendererNote: "CmsPageLayout gibt den Wert als object-position an das Hero-Bild weiter.",
          enumOptions: [
            { value: "center", label: "mittig (Standard)" },
            { value: "left center", label: "links Mitte" },
            { value: "right center", label: "rechts Mitte" },
            { value: "center top", label: "oben Mitte" },
            { value: "center bottom", label: "unten Mitte" },
          ],
        },
      ],
    },

    {
      key: "link",
      label: "Hero-Button (aktuell nicht im Standard-Hero gerendert)",
      hint:
        "Im Vertrag vorgesehen, der Standard-Hero in CmsPageLayout rendert aktuell jedoch keinen Button. Pflegen erlaubt — wirkt erst, wenn eine eigene Renderer-Etappe das nachzieht.",
      defaultOpen: false,
      fields: [
        {
          fieldKey: "cta_label",
          label: "Button-Beschriftung",
          hint: 'Z. B. „Mehr erfahren". Nur sichtbar, wenn der Standard-Hero einen Button rendert (heute nicht).',
          role: "text",
          expectation: "not-rendered",
          rendererNote: "Steht im Vertrag (hero_v1), wird vom Standard-Hero-Renderer (CmsPageLayout) nicht gelesen.",
        },
        {
          fieldKey: "cta_href",
          label: "Button-Ziel (URL/Pfad)",
          hint: "Linkziel des Hero-Buttons. Heute nicht aktiv im Standard-Hero.",
          role: "url",
          expectation: "not-rendered",
          rendererNote: "Vertrag-Feld ohne Standard-Hero-Renderer-Read.",
        },
      ],
    },
  ],
};

// ───────── teaser_2col_v1 ──────────────────────────────────────────────
// Renderer-Quelle: `src/features/cms/components/sections/Teaser2ColV1.tsx`
//   f(ctx, "label" | "title" | "text" | "cta_label" | "cta_link"
//        | "image_position" | "background_variant")
//   img(ctx, sectionKey) + imgAlt(ctx, sectionKey)
// → alle hier gelisteten Felder werden öffentlich gelesen.

const TEASER_2COL_V1: SectionWorkspaceConfig = {
  sectionType: "teaser_2col_v1",
  adminLabel: "Wechselteaser (Bild + Text in zwei Spalten)",
  description:
    "Zweispaltiger Teaser: Eyebrow, Titel, Fließtext, ein Button mit Link sowie ein Bild. Bildposition (links/rechts) und Hintergrund-Variante (hell/grau) sind separat schaltbar.",
  assetSlot: {
    fieldKey: "image",
    label: "Teaser-Bild (Alt-Text pflegen!)",
    hint: "Bild der rechten oder linken Spalte. Pflichtbild — ohne Bild wirkt der Teaser unvollständig.",
    expectation: "required",
  },
  groups: [
    {
      key: "kopf",
      label: "Kopf (Eyebrow · Titel)",
      hint: "Eyebrow steht klein über dem Titel; Titel ist die Überschrift im Teaser.",
      defaultOpen: true,
      fields: [
        {
          fieldKey: "label",
          label: "Eyebrow (kleine Zeile über dem Titel)",
          hint: "Kurzer Auftakt, optional.",
          role: "text",
          expectation: "optional",
          rendererNote: "Teaser2ColV1 zeigt das Label als kleine Zeile über dem Titel.",
        },
        {
          fieldKey: "title",
          label: "Titel (Hauptüberschrift im Teaser)",
          hint: "Ein klarer Satz. Sollte gefüllt sein.",
          role: "text",
          expectation: "public",
          rendererNote: "Hauptüberschrift im Teaser2ColV1.",
        },
      ],
    },
    {
      key: "inhalt",
      label: "Inhalt (Fließtext)",
      hint: "1–3 Sätze, beschreibt das Thema des Teasers.",
      defaultOpen: true,
      fields: [
        {
          fieldKey: "text",
          label: "Fließtext",
          hint: "Hauptbeschreibung des Teasers.",
          role: "richtext",
          expectation: "public",
          rendererNote: "Fließtext-Absatz im Teaser2ColV1.",
        },
      ],
    },
    {
      key: "link",
      label: "Button + Link (zusammen ein Paar)",
      hint: 'Button erscheint nur, wenn beide Felder gefüllt sind: Beschriftung UND Ziel.',
      defaultOpen: true,
      fields: [
        {
          fieldKey: "cta_label",
          label: "Button-Beschriftung",
          hint: 'Z. B. „Mehr erfahren". Leer = kein Button.',
          role: "text",
          expectation: "optional",
          rendererNote: "Teaser2ColV1 zeigt den Button nur, wenn Beschriftung UND Ziel gefüllt sind.",
        },
        {
          fieldKey: "cta_link",
          label: "Button-Ziel (URL oder Pfad)",
          hint:
            'Hier wirklich „cta_link" — NICHT „cta_href". Akzeptiert interne Pfade (/loesungen/…), URLs (https://), mailto:, tel: und Anker (#…).',
          role: "url",
          expectation: "optional",
          rendererNote:
            "Teaser2ColV1 erkennt anhand des Werts, ob ein <Link> (intern) oder <a> (extern/mailto/tel/Anker) gerendert wird.",
          aliasKeys: ["cta_href"],
        },
      ],
    },
    {
      key: "technik",
      label: "Layout-Schalter (Bildposition · Hintergrund)",
      hint:
        'Diese Felder steuern Layout, nicht Sprache — werden vom Renderer aus dem DE-Wert gelesen und sind „de-only".',
      defaultOpen: false,
      fields: [
        {
          fieldKey: "image_position",
          label: "Bildposition (links oder rechts vom Text)",
          hint:
            'Default „right". Auf Mobile/Tablet steht der Text immer oben, ab Desktop greift die Wechsel-Logik.',
          role: "enum",
          expectation: "public",
          rendererNote: 'Teaser2ColV1: rawPos === "left" ? links : rechts.',
          enumOptions: [
            { value: "right", label: "rechts (Standard)" },
            { value: "left", label: "links" },
          ],
        },
        {
          fieldKey: "background_variant",
          label: "Hintergrund (weiß oder dezent grau)",
          hint: 'Default „default" (weiß). „muted" gibt der Sektion einen dezenten grauen Hintergrund.',
          role: "enum",
          expectation: "public",
          rendererNote: 'Teaser2ColV1: rawBg === "muted" ? bg-secondary/30 : bg-background.',
          enumOptions: [
            { value: "default", label: "weiß (Standard)" },
            { value: "muted", label: "dezent grau (muted)" },
          ],
        },
        {
          fieldKey: "cta_kind",
          label: "Absprung-Darstellung (Textlink oder Button)",
          hint:
            'Zwei Werte: „link" (Standard) zeigt den Absprung als kleinen Textlink mit Pfeil, „button" zeigt ihn als Umriss-Button ohne Pfeil. Leer oder unbekannt = „link". In DE und EN denselben Wert eintragen.',
          role: "text",
          expectation: "public",
          rendererNote: 'Teaser2ColV1: rawKind === "button" ? Umriss-Button ohne Pfeil : Textlink mit Pfeil.',
        },

      ],
    },
  ],
};

// ───────── content_v1 ──────────────────────────────────────────────────
// Renderer-Quelle: `src/features/cms/components/sections/ContentSectionV1.tsx`
//   f(ctx, "label" | "title" | "text")
// → kein CTA, kein Bild im Standard-Renderer.

const CONTENT_V1: SectionWorkspaceConfig = {
  sectionType: "content_v1",
  adminLabel: "Textblock (Intro/Beschreibung)",
  description:
    "Schlanker Textblock mit Eyebrow, Überschrift und Fließtext. Ein Bild ist optional — der Standard-Renderer zeigt keins, einzelne Sonderseiten (z. B. Systemdiagramme) lesen es aber aus.",
  assetSlot: {
    fieldKey: "image",
    label: "Bild des Textblocks (optional, mit Alt-Text)",
    hint:
      "Optional. Der Standard-Textblock zeigt kein Bild; Sonderseiten mit eigenem Layout (z. B. Systemdiagramm auf snipdoo® IP) lesen dieses Bild aus. Ein bereits hochgeladenes Bild kann hier immer ausgetauscht werden.",
    expectation: "optional",
  },
  groups: [
    {
      key: "kopf",
      label: "Kopf (Eyebrow · Überschrift)",
      hint: "Eyebrow steht klein über der Überschrift.",
      defaultOpen: true,
      fields: [
        {
          fieldKey: "label",
          label: "Eyebrow (kleine Zeile über der Überschrift)",
          hint: "Kurzer Auftakt, optional.",
          role: "text",
          expectation: "optional",
          rendererNote: "ContentSectionV1 zeigt das Label als kleine Zeile über dem Titel.",
        },
        {
          fieldKey: "title",
          label: "Überschrift",
          hint: "Klarer Satz; sollte für sichtbare Textblöcke gefüllt sein.",
          role: "text",
          expectation: "public",
          rendererNote: "Hauptüberschrift im ContentSectionV1.",
        },
      ],
    },
    {
      key: "inhalt",
      label: "Inhalt (Fließtext)",
      hint: 'Mehrere Absätze möglich — eine Leerzeile zwischen den Absätzen trennt sie.',
      defaultOpen: true,
      fields: [
        {
          fieldKey: "text",
          label: "Fließtext",
          hint: 'Absätze werden an Leerzeilen getrennt. Aliase „body" / „intro" sind im Vertrag erlaubt, kanonisch heißt das Feld „text".',
          role: "richtext",
          expectation: "public",
          rendererNote: "ContentSectionV1 splittet den Text an Leerzeilen in Absätze.",
          aliasKeys: ["body", "intro"],
        },
      ],
    },
  ],
};

const REGISTRY: Record<string, SectionWorkspaceConfig> = {
  hero_v1: HERO_V1,
  teaser_2col_v1: TEASER_2COL_V1,
  content_v1: CONTENT_V1,
};

export function getWorkspaceConfigForSectionType(
  sectionType: string | null | undefined,
): SectionWorkspaceConfig | null {
  if (!sectionType) return null;
  return REGISTRY[sectionType] ?? null;
}

export function isStandardBausteinSectionType(
  sectionType: string | null | undefined,
): sectionType is "hero_v1" | "teaser_2col_v1" | "content_v1" {
  if (!sectionType) return false;
  return sectionType === "hero_v1" || sectionType === "teaser_2col_v1" || sectionType === "content_v1";
}

/**
 * Alle vom Workspace „gepflegten" field_keys eines Section-Typs
 * (ohne Asset-Slot). Wird gebraucht, um in einer Section vorhandene
 * DB-Felder zu erkennen, die NICHT vom Workspace abgedeckt sind
 * (= Legacy/Altbestand, separat anzeigen).
 */
export function workspaceFieldKeysFor(sectionType: string | null | undefined): Set<string> {
  const cfg = getWorkspaceConfigForSectionType(sectionType);
  if (!cfg) return new Set();
  const s = new Set<string>();
  for (const g of cfg.groups)
    for (const f of g.fields) {
      s.add(f.fieldKey);
      for (const a of f.aliasKeys ?? []) s.add(a);
    }
  // Asset-Slot (z. B. hero_v1 → "image"): das eigentliche Bild lebt in
  // `cms_assets`; trotzdem schleppen einige Sections eine alte
  // `cms_section_fields`-Zeile mit gleichem `field_key` als Migrations-
  // Geist mit (immer leer). Wir markieren den Slot-Key als abgedeckt,
  // damit diese Geister nicht als „Altbestand" angezeigt werden.
  if (cfg.assetSlot?.fieldKey) s.add(cfg.assetSlot.fieldKey);
  return s;
}
