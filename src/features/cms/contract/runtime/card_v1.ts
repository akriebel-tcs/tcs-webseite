/**
 * Runtime-Vertrag: `card_v1`
 *
 * EINE Wahrheit für Karten — gemeinsam genutzt von:
 *  - Admin-Workspace (`BildkartenCardWorkspace`)
 *  - Public-Renderern (`CardsSectionV1`, `ProductScrollerV1`,
 *    `FeatureGridV1`, `CmsProductSolutionShell`, …)
 *  - Audit-Skripten (`scripts/cms/e2e-vertrag.mjs`,
 *    `wahrheits-check-ci.mjs`)
 *
 * Wer ein neues Karten-Layout baut oder ein Feld ergänzt, ändert NUR
 * diese Datei. Matrix, Resolver, Admin und Renderer ziehen automatisch
 * nach. Keine Doppelpflege.
 *
 * Bewusst klein gehalten: die echte Logik liegt weiterhin in
 *  - `cardRuntimeMatrix.ts`  → Container-Support-Tabelle
 *  - `cardVisibility.ts`     → Resolver (Status pro Feld)
 *
 * Diese Datei ist der **einzige öffentliche Einstiegspunkt** und der
 * Ort, an dem die Phase-1-Vertragsfelder dokumentiert sind. Bitte
 * NICHT Matrix/Resolver direkt aus Admin/Renderer importieren.
 */

export type {
  CardFieldGroup,
  ContainerSupport,
} from "../../lib/cardRuntimeMatrix";

export {
  CONTAINER_MATRIX,
  containerSupportFor,
  isFieldSupportedByContainer,
} from "../../lib/cardRuntimeMatrix";

export type {
  CardVisibility,
  CardVisibilityInput,
  CardRuntime,
  FieldRuntime,
  FieldStatus,
  LinkRuntime,
  EffectiveContainerKind,
} from "../../lib/cardVisibility";

export {
  resolveCardVisibility,
  resolveCardRuntime,
  effectiveContainerKindOf,
  expectedSlotOf,
} from "../../lib/cardVisibility";

/**
 * Statisches Feldinventar `card_v1`. Wird vom E2E-Skript benutzt, um
 * jede Karte gegen den Vertrag zu prüfen, ohne über Renderer-Code zu
 * iterieren. Spiegelt 1:1, was Admin pflegt und Resolver auswertet.
 */
export const CARD_V1_FIELD_INVENTORY = {
  text: [
    { key: "eyebrow", group: "eyebrow" as const, toggle: "eyebrow_enabled" },
    { key: "title", group: "title" as const, toggle: null },
    { key: "description", group: "description" as const, toggle: null },
  ],
  assets: [
    { role: "image", group: "image" as const, toggle: "image_enabled" },
    { role: "thumbnail", group: "thumbnail" as const, toggle: null },
    { role: "icon_image", group: "icon_image" as const, toggle: null },
  ],
  icon: { key: "icon", group: "icon" as const, toggle: "icon_enabled" },
  bullets: Array.from({ length: 5 }, (_, i) => ({
    key: `bullets.${i}`,
    legacyKey: `features.${i}`,
    toggle: `bullets_${i}_enabled`,
    legacyToggle: `features_${i}_enabled`,
    group: "bullets" as const,
    index: i,
  })),
  chips: Array.from({ length: 5 }, (_, i) => ({
    key: `chips.${i}`,
    toggle: `chips_${i}_enabled`,
    group: "chips" as const,
    index: i,
  })),
  links: Array.from({ length: 3 }, (_, i) => {
    const n = i + 1;
    return {
      label: `link_${n}_label`,
      href: `link_${n}_href`,
      kind: `link_${n}_kind`,
      toggle: `link_${n}_enabled`,
      group: "links" as const,
      index: i,
    };
  }),
} as const;

/**
 * Versionsmarker des Vertrags. Bei jeder Erweiterung (neues Feld,
 * neuer Container, geänderte Status-Semantik) hochzählen und im
 * Sprint-Bericht referenzieren.
 */
export const CARD_V1_CONTRACT_VERSION = "1.0.0" as const;
