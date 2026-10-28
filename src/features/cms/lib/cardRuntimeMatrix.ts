/**
 * cardRuntimeMatrix — Container-aware Karten-Wahrheit (`card_v1`).
 *
 * Zentrale, importierbare Matrix: pro Eltern-Container wird festgelegt,
 * welche Karten-Module (Eyebrow, Title, Description, Bullets, Chips,
 * Links, Image, Thumbnail, Icon, Icon-Image) öffentlich wirksam sind.
 *
 * Konsumenten:
 *  - `cardVisibility.resolveCardRuntime` (Status pro Feld)
 *  - Public-Renderer (`CardsSectionV1`, `ProductScrollerV1`,
 *    `FeatureGridV1`, …) — entscheiden, was sie rendern.
 *  - Admin-Workspace (`BildkartenCardWorkspace`) — markiert Felder, die
 *    im aktuellen Container nicht ausgespielt werden, klar als
 *    „in diesem Layout nicht sichtbar".
 *
 * Reine Code-Wahrheit. Keine DB-/Whitelist-Aufweichung.
 */

import matrixJson from "../contract/runtime/card_v1.matrix.json";
import {
  type EffectiveContainerKind,
  effectiveContainerKindOf,
} from "./cardVisibility";

export type CardFieldGroup =
  | "eyebrow"
  | "title"
  | "description"
  | "image"
  | "thumbnail"
  | "icon"
  | "icon_image"
  | "bullets"
  | "chips"
  | "links";

/** Stütze für Renderer & Admin. */
export interface ContainerSupport {
  /** Welche Karten-Module dieser Container öffentlich rendert. */
  supports: Record<CardFieldGroup, boolean>;
  /**
   * Erwarteter Bild-/Icon-Slot des Containers (für Pflicht-/Warnlogik).
   * `none` = Karten in diesem Container haben keinen Mediennutzungspfad.
   */
  expectedSlot: "image" | "thumbnail" | "icon_image" | "none";
}

/**
 * Container-Matrix aus `src/features/cms/contract/runtime/card_v1.matrix.json`.
 * Diese Datei ist die einzige Quelle der Wahrheit; sie wird auch vom
 * E2E-Skript `scripts/cms/e2e-vertrag.mjs` direkt gelesen. Wer ein neues
 * Container-Layout baut, trägt sich dort ein — Admin, Renderer und Audit
 * ziehen automatisch nach.
 */
export const CONTAINER_MATRIX: Record<EffectiveContainerKind, ContainerSupport> =
  matrixJson.containers as Record<EffectiveContainerKind, ContainerSupport>;

export function containerSupportFor(
  parentSectionType: string | null | undefined,
  parentSectionKey: string | null | undefined,
): ContainerSupport {
  const kind = effectiveContainerKindOf(parentSectionType, parentSectionKey);
  return CONTAINER_MATRIX[kind] ?? CONTAINER_MATRIX.unknown;
}

export function isFieldSupportedByContainer(
  group: CardFieldGroup,
  parentSectionType: string | null | undefined,
  parentSectionKey: string | null | undefined,
): boolean {
  return containerSupportFor(parentSectionType, parentSectionKey).supports[group];
}
