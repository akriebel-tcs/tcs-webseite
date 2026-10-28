/**
 * buildAdminFieldPlanForSection — Sprint-1a Helper (read-only).
 *
 * Liefert für eine Section die im Admin anzuzeigende Feldliste, geführt
 * vom Section-Type-Vertrag (`sectionTypes.ts`) und ergänzt um DB-Felder,
 * die der Vertrag (noch) nicht kennt.
 *
 * Wichtig:
 *  - Keine DB-Mutation, keine Whitelist-Mutation, keine Feldanlage.
 *  - Asset-Slots werden bewusst NICHT aufgenommen — die laufen
 *    weiterhin über SectionAssetsBlock / AssetUploader.
 *  - Aliase werden nicht migriert: liegt in der DB ein Alias-Key vor,
 *    wird er unter seinem realen Namen angezeigt und nur als „Alias"
 *    markiert (kein Rename auf den kanonischen Namen).
 */
import {
  getContract,
  detectCardVariant,
  isCardFieldExpectedForVariant,
  type CardVariant,
  type CardVariantKey,
} from "@/features/cms/contract/sectionTypes";
import { fieldDisplayLabel } from "@/features/admin/lib/fieldDisplay";

// Hinweis: normalizeType liegt nicht in sectionTypes.ts — wir importieren
// die kanonisierende Funktion über sectionContractStatus' Quelle (CmsBodyRenderer).
// Um Zirkular-Imports zu vermeiden, machen wir hier eine sehr schlanke Variante.
function safeNormalize(type: string | null | undefined): string | null {
  if (!type) return null;
  return type.trim() || null;
}

export type AdminFieldSource =
  | "contract" // im Vertrag definiert und in der DB vorhanden
  | "contract_alias" // in der DB als Alias eines Vertragsfeldes vorhanden
  | "missing" // im Vertrag definiert, in der DB nicht vorhanden
  | "dynamic" // items.*/features.* — laut Vertrag erwartete dynamische Struktur
  | "legacy"; // in der DB, aber im Vertrag nicht erfasst

export interface AdminFieldPlanEntry {
  /** Real existierender DB-field_key (für RPC-Schreiben). */
  fieldKey: string;
  /** Kanonischer Vertragsname, falls bekannt. */
  canonicalKey: string | null;
  source: AdminFieldSource;
  /** Anzeige-Label (Vertrag bevorzugt, sonst fieldDisplayLabel). */
  label: string;
  /** Technisch (Toggle/Layout) — wird im Admin separat klappbar dargestellt. */
  isTechnical: boolean;
  /** Pflichtgrad laut Vertrag (nur bei contract oder missing). */
  required?: "required" | "recommended" | "optional";
  /** Vertragsfeld-Rolle (text/richtext/url/toggle/enum/number). */
  role?: string;
  /** Vertrags-Gruppe (Kopf/Inhalt/…). */
  group?: string;
}

export interface AdminFieldPlan {
  /** Kanonischer Section-Type laut Eingabe (nicht aus Renderer-Tabelle). */
  canonicalType: string | null;
  /** Wurde ein Vertrag gefunden? */
  hasContract: boolean;
  /** Geordnete Anzeigeliste. */
  entries: AdminFieldPlanEntry[];
  /** Sprint 2l: erkannte card_v1-Variante (nur bei section_type=card_v1). */
  cardVariant?: {
    variant_key: CardVariantKey;
    label: string;
    confidence: "high" | "medium" | "low";
    reason: string;
  };
}

const DYNAMIC_PATTERNS = [
  /^items\.[A-Za-z0-9_-]+\./,
  /^features\.\d+$/,
  // Sprint 2a: role_tabs_v1 (snipdoo IP) — tabs.<roleKey>.label|headline|p1|p2
  /^tabs\.[A-Za-z0-9_-]+\.(label|headline|p1|p2)$/,
  // Sprint 2a: tab_v1 (mobile-tk-preview) — vorteile.<n>.headline|body
  /^vorteile\.\d+\.(headline|body)$/,
];

function isDynamicKey(fk: string): boolean {
  return DYNAMIC_PATTERNS.some((re) => re.test(fk));
}

const TECHNICAL_PATTERNS = [/_enabled$/];
function looksTechnical(fk: string): boolean {
  return TECHNICAL_PATTERNS.some((re) => re.test(fk));
}

export function buildAdminFieldPlanForSection(args: {
  sectionType: string | null | undefined;
  /** In der DB vorhandene field_keys (DE+EN zusammengefasst, dedupliziert). */
  dbFieldKeys: ReadonlyArray<string>;
  /**
   * Sprint 2l (optional): Section-Type des Parent-Containers — verbessert
   * Variantenerkennung für `card_v1`. Wird nichts übergeben, läuft der Plan
   * wie bisher.
   */
  parentSectionType?: string | null;
  /**
   * Sprint 2l (optional): Aktive Asset-Slots dieser Section (z. B. ["image"]).
   * Verbessert Variantenerkennung für `card_v1`.
   */
  assetFieldKeys?: ReadonlyArray<string>;
}): AdminFieldPlan {
  const canonical = safeNormalize(args.sectionType);
  const contract = canonical ? getContract(canonical) : null;
  const db = new Set(args.dbFieldKeys);

  // Fallback: ohne Vertrag → unverändertes Verhalten (DB-Felder wie bisher).
  if (!contract) {
    const entries: AdminFieldPlanEntry[] = [...db].map((fk) => ({
      fieldKey: fk,
      canonicalKey: null,
      source: isDynamicKey(fk) ? "dynamic" : "legacy",
      label: fieldDisplayLabel(fk),
      isTechnical: looksTechnical(fk),
    }));
    return { canonicalType: canonical, hasContract: false, entries };
  }

  // Sprint 2l: card_v1-Variantenerkennung (nur für Filter von missing-Einträgen).
  let variant: CardVariant | null = null;
  let variantInfo: AdminFieldPlan["cardVariant"] = undefined;
  if (canonical === "card_v1") {
    const det = detectCardVariant({
      parentSectionType: args.parentSectionType ?? null,
      dbFieldKeys: args.dbFieldKeys,
      assetFieldKeys: args.assetFieldKeys ?? [],
    });
    variant = det.variant;
    variantInfo = {
      variant_key: det.variant.variant_key,
      label: det.variant.label,
      confidence: det.confidence,
      reason: det.reason,
    };
  }

  const entries: AdminFieldPlanEntry[] = [];
  const consumed = new Set<string>(); // DB-Keys, die durch Vertrag/Alias abgedeckt sind

  const pushContractField = (
    f: { field_key: string; label: string; required: AdminFieldPlanEntry["required"]; role?: string; aliases?: string[]; group?: string },
    isTechnical: boolean,
  ) => {
    const canon = f.field_key;
    const hasCanon = db.has(canon);
    const aliasInDb = (f.aliases ?? []).find((a) => db.has(a)) ?? null;

    if (hasCanon) {
      consumed.add(canon);
      entries.push({
        fieldKey: canon,
        canonicalKey: canon,
        source: "contract",
        label: f.label || fieldDisplayLabel(canon),
        isTechnical,
        required: f.required,
        role: f.role,
        group: f.group,
      });
      // Falls zusätzlich ein Alias in der DB liegt: separat als Alias zeigen
      // (Inhalt nicht stillschweigend zusammenführen).
      for (const a of f.aliases ?? []) {
        if (a !== canon && db.has(a)) {
          consumed.add(a);
          entries.push({
            fieldKey: a,
            canonicalKey: canon,
            source: "contract_alias",
            label: `${f.label || fieldDisplayLabel(canon)} (Alias)`,
            isTechnical,
            required: f.required,
            role: f.role,
            group: f.group,
          });
        }
      }
    } else if (aliasInDb) {
      consumed.add(aliasInDb);
      entries.push({
        fieldKey: aliasInDb,
        canonicalKey: canon,
        source: "contract_alias",
        label: `${f.label || fieldDisplayLabel(canon)} (Alias)`,
        isTechnical,
        required: f.required,
        role: f.role,
        group: f.group,
      });
    } else {
      // Sprint 2l: bei card_v1 prüfen, ob das Feld zur erkannten Variante
      // gehört. Wenn nicht (z. B. `features.0` auf einer Bildkarte), wird
      // der „missing"-Eintrag unterdrückt — die Pflege ist heute nicht
      // möglich und es würde nur Feldmüll im Admin entstehen.
      if (variant && !isCardFieldExpectedForVariant(variant, canon)) {
        return;
      }
      // Vertrag erwartet, DB hat nichts → leer anzeigen.
      entries.push({
        fieldKey: canon,
        canonicalKey: canon,
        source: "missing",
        label: f.label || fieldDisplayLabel(canon),
        isTechnical,
        required: f.required,
        role: f.role,
        group: f.group,
      });
    }
  };

  for (const f of contract.text_fields) pushContractField(f, false);
  for (const f of contract.technical_fields) pushContractField(f, true);

  // Asset-Slots überspringen (laufen via SectionAssetsBlock).
  const assetSlotKeys = new Set(contract.asset_slots.map((a) => a.field_key));

  // DB-Felder, die weder Vertrag noch Alias noch Asset-Slot sind → Legacy oder Dynamic.
  // Vorhandene Felder werden NIE durch Variantenlogik unterdrückt.
  for (const fk of args.dbFieldKeys) {
    if (consumed.has(fk)) continue;
    if (assetSlotKeys.has(fk)) continue;
    if (isDynamicKey(fk)) {
      entries.push({
        fieldKey: fk,
        canonicalKey: null,
        source: "dynamic",
        label: fieldDisplayLabel(fk),
        isTechnical: false,
      });
    } else {
      entries.push({
        fieldKey: fk,
        canonicalKey: null,
        source: "legacy",
        label: fieldDisplayLabel(fk),
        isTechnical: looksTechnical(fk),
      });
    }
  }

  return { canonicalType: canonical, hasContract: true, entries, cardVariant: variantInfo };
}
