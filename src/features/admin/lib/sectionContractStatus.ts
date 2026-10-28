/**
 * sectionContractStatus — Sprint-0 Drift-Auswertung pro Section.
 *
 * Read-only. Vergleicht für genau eine Section drei Quellen:
 *   1) den Section-Type-Vertrag (`src/features/cms/contract/sectionTypes.ts`),
 *   2) die in der DB vorhandenen `field_key`s (aus `cms_section_fields`),
 *   3) (optional) die Renderer-Information aus `CmsBodyRenderer.RENDERERS`.
 *
 * Es werden NUR Diagnose-Daten zurückgegeben — kein Schreibzugriff,
 * keine Whitelist-Mutation. Genutzt vom Admin-UI (Statusbadge je Block)
 * und vom Drift-Audit-Skript.
 */
import {
  SECTION_TYPE_CONTRACTS,
  getContract,
  type SectionTypeContract,
} from "@/features/cms/contract/sectionTypes";
import { RENDERERS, SKIP_TYPES, normalizeType } from "@/features/cms/components/CmsBodyRenderer";

export type SectionStatusLevel = "ok" | "info" | "warn" | "error";

export interface SectionStatusBadge {
  level: SectionStatusLevel;
  label: string;
  hint: string;
}

export interface SectionStatusInput {
  pageKey: string;
  sectionKey: string;
  /** Roher `section_type` aus der DB (kann legacy/null sein). */
  sectionType: string | null | undefined;
  /** Eltern-Section-Key (oder null = top-level). */
  parentSectionKey?: string | null;
  /** Eltern-Section-Type, falls bekannt (nur für Kindcheck verwendet). */
  parentSectionType?: string | null;
  /** Alle in DB vorhandenen field_keys dieser Section (DE+EN zusammengefasst). */
  fieldKeys: ReadonlyArray<string>;
  /** Whitelist-Einträge (page+section+field+locale) dieser Section. */
  whitelistFieldKeys?: ReadonlyArray<string>;
  /** In `cms_assets` aktiv vorhandene field_keys / Slots. */
  assetSlots?: ReadonlyArray<string>;
  /** is_active aus `cms_sections`. */
  isActive: boolean;
}

export interface SectionStatusResult {
  /** Kanonisierter section_type (nach normalizeType). */
  canonicalType: string | null;
  contract: SectionTypeContract | null;
  rendererKnown: boolean;
  rendererSpecial: boolean;
  rendererSkipped: boolean;
  badges: SectionStatusBadge[];
  /** Maschinenlesbare Drift-Codes (für Audit-Aggregation). */
  drift: string[];
}

const KNOWN_CHILD_ONLY_TYPES = new Set<string>(
  Object.values(SECTION_TYPE_CONTRACTS)
    .filter((c) => !c.top_level)
    .map((c) => c.section_type),
);

/** Felder, die in keinem Vertrag stehen, aber breit als technische Steuerung gelten. */
const TECHNICAL_FIELD_KEYS = new Set<string>([
  "image_enabled",
  "icon_enabled",
  "eyebrow_enabled",
]);

function isContractField(contract: SectionTypeContract, fieldKey: string): boolean {
  for (const f of contract.text_fields) {
    if (f.field_key === fieldKey) return true;
    if (f.aliases?.includes(fieldKey)) return true;
  }
  for (const f of contract.technical_fields) {
    if (f.field_key === fieldKey) return true;
    if (f.aliases?.includes(fieldKey)) return true;
  }
  for (const a of contract.asset_slots) {
    if (a.field_key === fieldKey) return true;
  }
  // Karten/FAQ verwenden indizierte Item-Felder (items.<n>.*, features.<n>).
  if (/^items\.[A-Za-z0-9_-]+\./.test(fieldKey)) return true;
  if (/^features\.\d+$/.test(fieldKey)) return true;
  return false;
}

export function evaluateSectionStatus(input: SectionStatusInput): SectionStatusResult {
  const canonical = normalizeType(input.sectionType ?? null);
  const contract = canonical ? getContract(canonical) : null;
  const rendererKnown = !!canonical && canonical in RENDERERS;
  const rendererSkipped = !!canonical && SKIP_TYPES.has(canonical);
  const rendererSpecial = !!contract && contract.status === "special";

  const badges: SectionStatusBadge[] = [];
  const drift: string[] = [];

  // 1) Vertrag
  if (!canonical) {
    badges.push({
      level: "warn",
      label: "Vertrag: unbekannt (kein section_type)",
      hint: "Die Section hat keinen erkennbaren section_type. Sprint-0 prüft nur, schreibt nicht.",
    });
    drift.push("type_missing");
  } else if (!contract) {
    badges.push({
      level: "warn",
      label: `Vertrag: fehlt (${canonical})`,
      hint: "Dieser section_type ist im Vertrag (sectionTypes.ts) nicht erfasst.",
    });
    drift.push("contract_missing");
  } else {
    badges.push({
      level: "ok",
      label: "Vertrag: erkannt",
      hint: `Typ „${canonical}" laut Vertrag (Status: ${contract.status}).`,
    });
  }

  // 2) Renderer
  if (canonical && rendererSkipped) {
    badges.push({
      level: "info",
      label: "Renderer: bewusst übersprungen (Hero)",
      hint: "hero_v1 rendert über CmsPageLayout — nicht über den generischen BodyRenderer.",
    });
  } else if (rendererSpecial) {
    badges.push({
      level: "info",
      label: "Renderer: Spezial/Altbestand",
      hint: "Dieser Typ wird über einen Spezialpfad (Hub/Listing/Türsprechanlagen) gerendert.",
    });
  } else if (rendererKnown) {
    badges.push({ level: "ok", label: "Renderer: generisch", hint: "CmsBodyRenderer kennt diesen Typ." });
  } else if (canonical && contract?.top_level !== false) {
    badges.push({
      level: "warn",
      label: "Warnung: kein Renderer",
      hint: "Aktiver Top-Level-Typ ohne bekannten Renderer — Inhalt erscheint öffentlich evtl. nicht.",
    });
    if (input.isActive) drift.push("active_without_renderer");
  }

  // 3) Feld-Drift gegen Vertrag
  if (contract) {
    const dbFields = Array.from(new Set(input.fieldKeys));
    const dbUnknown = dbFields.filter(
      (fk) => !isContractField(contract, fk) && !TECHNICAL_FIELD_KEYS.has(fk),
    );
    if (dbUnknown.length > 0) {
      badges.push({
        level: "warn",
        label: `Warnung: ${dbUnknown.length} Feld(er) nicht im Vertrag`,
        hint: `In der DB, nicht im Vertrag: ${dbUnknown.slice(0, 6).join(", ")}${dbUnknown.length > 6 ? "…" : ""}`,
      });
      drift.push("fields_unknown_to_contract");
    }

    const expected = [...contract.text_fields, ...contract.technical_fields]
      .filter((f) => f.required === "required")
      .map((f) => f.field_key);
    const missingRequired = expected.filter((fk) => !dbFields.includes(fk));
    if (missingRequired.length > 0) {
      badges.push({
        level: "warn",
        label: `Warnung: Pflichtfeld(er) fehlen`,
        hint: `Vertrag erwartet: ${missingRequired.join(", ")}`,
      });
      drift.push("required_fields_missing");
    }

    // Asset-Slot-Drift
    const dbSlots = input.assetSlots ?? [];
    const slotsUnknown = dbSlots.filter(
      (slot) => !contract.asset_slots.some((s) => s.field_key === slot),
    );
    if (slotsUnknown.length > 0) {
      badges.push({
        level: "warn",
        label: `Warnung: Bildslot(s) nicht im Vertrag`,
        hint: `In cms_assets, nicht im Vertrag: ${slotsUnknown.join(", ")}`,
      });
      drift.push("asset_slot_unknown_to_contract");
    }

    // Whitelist-Drift: Whitelist hat Feld, das im Vertrag fehlt.
    const wlUnknown = (input.whitelistFieldKeys ?? []).filter(
      (fk) => !isContractField(contract, fk) && !TECHNICAL_FIELD_KEYS.has(fk),
    );
    if (wlUnknown.length > 0) {
      badges.push({
        level: "info",
        label: `Hinweis: ${wlUnknown.length} Whitelist-Feld(er) nicht im Vertrag`,
        hint: `Freigabe existiert, Vertrag (noch) nicht: ${wlUnknown.slice(0, 6).join(", ")}${wlUnknown.length > 6 ? "…" : ""}`,
      });
      drift.push("whitelist_unknown_to_contract");
    }
  }

  // 4) Kindstruktur
  if (input.parentSectionKey && contract) {
    const parentType = input.parentSectionType ? normalizeType(input.parentSectionType) : null;
    if (contract.top_level && !contract.allowed_parents.length) {
      // Top-Level-Typ liegt unter einem Parent
      badges.push({
        level: "warn",
        label: "Kindstruktur: Warnung",
        hint: `Typ „${canonical}" ist laut Vertrag Top-Level, liegt hier aber unter „${input.parentSectionKey}".`,
      });
      drift.push("child_of_top_level_type");
    } else if (parentType && contract.allowed_parents.length && !contract.allowed_parents.includes(parentType)) {
      badges.push({
        level: "warn",
        label: "Kindstruktur: Warnung",
        hint: `Typ „${canonical}" ist laut Vertrag nicht unter „${parentType}" erlaubt (erlaubt: ${contract.allowed_parents.join(", ")}).`,
      });
      drift.push("disallowed_parent");
    } else {
      badges.push({ level: "ok", label: "Kindstruktur: OK", hint: "Parent-Typ ist laut Vertrag erlaubt." });
    }
  } else if (!input.parentSectionKey && contract && contract.top_level === false) {
    badges.push({
      level: "warn",
      label: "Kindstruktur: Warnung",
      hint: `Typ „${canonical}" darf laut Vertrag nicht Top-Level sein (erlaubte Parents: ${contract.allowed_parents.join(", ") || "—"}).`,
    });
    drift.push("child_only_at_top_level");
  }

  return { canonicalType: canonical, contract, rendererKnown, rendererSpecial, rendererSkipped, badges, drift };
}

/**
 * Gemeinsamer Vertrags-Check für Strukturaktionen (Paste UND Move/Parent).
 *
 * Liefert eine menschenlesbare Begründung oder null, wenn die Platzierung
 * laut Vertrag unproblematisch ist. Keine harte Blockade — Aufrufer nutzen
 * das Ergebnis als Warnung mit bewusster Confirm-Bestätigung.
 *
 * Geprüfte Fälle:
 *  - child-only Typ als Top-Level
 *  - child-only Typ unter nicht erlaubtem Parent
 *  - Top-Level-only Typ unter einem Parent
 *  - Parent mit `allowed_children`-Whitelist, Kind-Typ steht nicht drin
 *  - Ziel-Parent-Typ unbekannt oder ohne Vertrag (Prüfung unsicher)
 */
export function evaluateStructurePlacementRisk(args: {
  /** Typ des Blocks, der platziert werden soll (Paste oder Move). */
  movingSectionType: string | null;
  /** Ziel-Parent (null = Top-Level). */
  targetParentSectionKey: string | null;
  /** Section-Type des Ziel-Parents (null wenn Top-Level oder unbekannt). */
  targetParentSectionType: string | null;
  /** Optional: Aktion für etwas klarere Texte ("paste" | "move"). */
  action?: "paste" | "move";
}): string | null {
  const canonical = normalizeType(args.movingSectionType);
  if (!canonical) return null;
  const contract = getContract(canonical);
  if (!contract) {
    return `Typ „${canonical}" ist im Vertrag nicht erfasst — Auswirkungen unklar.`;
  }

  // 1) Ziel: Top-Level
  if (!args.targetParentSectionKey) {
    if (contract.top_level === false) {
      return `Typ „${canonical}" ist laut Vertrag nur als Kind erlaubt (Parents: ${contract.allowed_parents.join(", ") || "—"}). Top-Level würde die Struktur verletzen.`;
    }
    if (KNOWN_CHILD_ONLY_TYPES.has(canonical) && contract.copy_paste?.pastableTopLevel === false) {
      return `Typ „${canonical}" gilt im Vertrag als Kind-Block — Top-Level-Platzierung ist nicht vorgesehen.`;
    }
    return null;
  }

  // 2) Ziel: unter einem Parent
  const parentCanonical = normalizeType(args.targetParentSectionType);

  // 2a) Top-Level-only Typ darf kein Kind sein
  if (contract.top_level === true && contract.allowed_parents.length === 0) {
    return `Typ „${canonical}" ist laut Vertrag Top-Level und darf nicht unter einen Parent gesetzt werden (Ziel: „${parentCanonical ?? args.targetParentSectionKey}").`;
  }

  // 2b) Ziel-Parent unbekannt / kein Vertrag → Prüfung unsicher
  if (!parentCanonical) {
    return `Ziel-Parent „${args.targetParentSectionKey}" hat keinen erkennbaren section_type — Vertragsprüfung unsicher.`;
  }
  const parentContract = getContract(parentCanonical);
  if (!parentContract) {
    return `Ziel-Parent-Typ „${parentCanonical}" ist im Vertrag nicht erfasst — Auswirkungen unklar.`;
  }

  // 2c) allowed_parents auf Kind-Typ
  if (contract.allowed_parents.length && !contract.allowed_parents.includes(parentCanonical)) {
    return `Typ „${canonical}" ist laut Vertrag nicht unter „${parentCanonical}" erlaubt (erlaubt: ${contract.allowed_parents.join(", ")}).`;
  }

  // 2d) allowed_children am Parent
  if (parentContract.allowed_children.length && !parentContract.allowed_children.includes(canonical)) {
    return `Parent „${parentCanonical}" erlaubt laut Vertrag nur folgende Kind-Typen: ${parentContract.allowed_children.join(", ")} — „${canonical}" ist nicht dabei.`;
  }

  return null;
}

/**
 * Strukturwarnung beim Einfügen aus der Zwischenablage.
 * Dünner Wrapper um `evaluateStructurePlacementRisk`, damit Paste und Move
 * dieselbe Vertragslogik nutzen (keine zweite Wahrheit im Admin).
 */
export function evaluatePasteRisk(args: {
  clipboardSectionType: string | null;
  targetParentSectionKey: string | null;
  targetParentSectionType: string | null;
}): string | null {
  return evaluateStructurePlacementRisk({
    movingSectionType: args.clipboardSectionType,
    targetParentSectionKey: args.targetParentSectionKey,
    targetParentSectionType: args.targetParentSectionType,
    action: "paste",
  });
}

/** Schnelle Hilfe für die Delete-Warnung: Container mit Kindern erfordert klaren Hinweis. */
export function describeDeleteRisk(args: {
  sectionType: string | null;
  childCount: number;
}): string | null {
  const canonical = normalizeType(args.sectionType);
  const contract = canonical ? getContract(canonical) : null;
  if (args.childCount > 0) {
    return `Dieser Block hat ${args.childCount} Kind-Block/-Blöcke. Sie werden mitgelöscht.`;
  }
  if (contract?.copy_paste?.deleteRequiresConfirm) {
    return `Vertrag verlangt für „${canonical}" eine bewusste Löschbestätigung.`;
  }
  return null;
}
