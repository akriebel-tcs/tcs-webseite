/**
 * Spaltenmodell- und Filter-Resolver für den Online-Produktkatalog.
 *
 * Diese Datei enthält **keine** UI und **keine** Supabase-Aufrufe. Sie
 * normalisiert ausschließlich Roh-Datensätze aus den DB-Quellen
 * (`product_column_definitions`, `column_presets`, `column_preset_columns`,
 * `product_filter_options_view`) in das Frontend-eigene Modell
 * (`CatalogColumn`, `CatalogFilterGroup`).
 *
 * Wo Spaltennamen der DB-Tabellen nicht abschließend bekannt sind, werden
 * **tolerante Reader** verwendet (mehrere bekannte Konventionen). Es werden
 * **keine fachlichen Werte oder Filterlogiken** im Frontend erfunden – nur
 * die Spaltennamen-Konventionen, in denen Metadaten typischerweise abgelegt
 * sind. Die Quelle der Wahrheit bleibt die externe DB.
 */

import { pickProductLocalized } from "./productLocale";
import type {
  CatalogColumn,
  CatalogFilterGroup,
  CatalogFilterOption,
  ColumnDefinitionRow,
  ColumnPresetColumnRow,
  FilterOptionRow,
  SupabaseRecord,
} from "../types";

/** Liefert den ersten nicht-leeren String-Wert aus den genannten Schlüsseln. */
function pickString(
  row: SupabaseRecord,
  keys: readonly string[],
): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return null;
}

/** Liefert den ersten endlichen Number-Wert aus den genannten Schlüsseln. */
function pickNumber(
  row: SupabaseRecord,
  keys: readonly string[],
): number | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/** Liefert einen Boolean-Wert aus den genannten Schlüsseln (mit Default). */
function pickBoolean(
  row: SupabaseRecord,
  keys: readonly string[],
  defaultValue: boolean,
): boolean {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      if (v === "true") return true;
      if (v === "false") return false;
    }
  }
  return defaultValue;
}

/**
 * Bekannte View-Suffix-Konventionen der externen TCS-DB.
 *
 * `product_catalog_view` legt sprach- bzw. resolved-Varianten als eigene
 * Spalten ab (`<feld>_de`, `<feld>_resolved`). Wenn `source_field` aus
 * `product_column_definitions` direkt nicht vorkommt, ist die richtige
 * View-Spalte i. d. R. eine dieser Varianten. Das ist eine **Schema-**
 * **Konvention**, keine fachliche Logik – wir erfinden keine Werte, sondern
 * matchen nur den existierenden Spaltennamen.
 */
const VIEW_SUFFIX_VARIANTS = ["", "_resolved", "_de", "_en"] as const;

/**
 * Liefert den ersten Spaltennamen aus `availableKeys`, der zu `baseField`
 * passt – direkt oder mit einer bekannten Suffix-Variante. Gibt `null`
 * zurück, wenn keine Variante existiert (Spalte ist nicht in dieser View
 * vorhanden).
 */
function resolveViewKey(
  baseField: string,
  availableKeys: ReadonlySet<string>,
): string | null {
  for (const suffix of VIEW_SUFFIX_VARIANTS) {
    const candidate = `${baseField}${suffix}`;
    if (availableKeys.has(candidate)) return candidate;
  }
  return null;
}

/**
 * Erzeugt das Spaltenmodell aus Preset-Zuordnung + Definitionen.
 *
 * Wenn `presetColumns` leer ist (z. B. weil Preset `public_catalog` nicht
 * existiert), wird `null` zurückgegeben → die UI muss einen kontrollierten
 * Fallback wählen.
 *
 * `availableKeys` enthält die tatsächlich in `product_catalog_view`
 * vorhandenen Spaltennamen (aus dem ersten Datensatz abgeleitet). Spalten,
 * deren `source_field` weder direkt noch in einer bekannten Suffix-Variante
 * (`_resolved`, `_de`, `_en`) in der View vorkommt, werden ausgelassen –
 * sonst würden auf den Karten leere Felder erscheinen.
 */
export function resolveCatalogColumns(
  presetColumns: readonly ColumnPresetColumnRow[],
  definitions: readonly ColumnDefinitionRow[],
  availableKeys?: ReadonlySet<string>,
): CatalogColumn[] | null {
  if (!presetColumns.length) return null;

  // Definitions in eine Map: key (column_key/field/...) → row.
  // `column_key` ist die in der TCS-DB tatsächlich verwendete Spalte und
  // entspricht `column_preset_columns.column_key`. Weitere Konventionen
  // bleiben tolerant erhalten.
  const DEF_KEY_FIELDS = [
    "column_key",
    "field",
    "field_key",
    "key",
    "name",
    "column_name",
  ] as const;
  const defByKey = new Map<string, ColumnDefinitionRow>();
  for (const def of definitions) {
    const key = pickString(def, DEF_KEY_FIELDS);
    if (key) defByKey.set(key, def);
  }

  // Schlüsselkandidaten für die Preset-Zeile (Verknüpfung Preset → Definition).
  const PRESET_COL_KEY_FIELDS = [
    "column_key",
    "field",
    "field_key",
    "key",
    "column_name",
    "name",
  ] as const;

  const columns: CatalogColumn[] = [];

  presetColumns.forEach((row, idx) => {
    const presetColKey = pickString(row, PRESET_COL_KEY_FIELDS);
    if (!presetColKey) return;

    const def = defByKey.get(presetColKey);

    // Effektiver Feldschlüssel im `product_catalog_view`. `source_field` aus
    // den Definitions ist führend (so liefert die TCS-DB die echte
    // View-Spalte). Fällt das, nutzen wir den Preset-Spaltenschlüssel.
    const baseField =
      (def
        ? pickString(def, [
            "source_field",
            "field",
            "field_key",
            "column_name",
            "column_key",
          ])
        : null) ?? presetColKey;

    // Wenn die Liste der tatsächlich vorhandenen View-Spalten bekannt ist,
    // verwerfen wir Spalten, die in dieser View weder direkt noch in einer
    // bekannten Suffix-Variante existieren (z. B. `computed`,
    // `products_assignment_status_view.has_images`). So vermeiden wir leere
    // Detailzeilen auf den Karten – ohne Werte zu erfinden.
    let fieldKey: string | null = baseField;
    if (availableKeys) {
      fieldKey = resolveViewKey(baseField, availableKeys);
      if (!fieldKey) return;
    }

    const label =
      pickString(row, ["label", "label_de", "label_en", "title", "display_name"]) ??
      (def
        ? pickString(def, [
            "label_de",
            "label_en",
            "label",
            "title",
            "display_name",
            "name",
          ])
        : null) ??
      fieldKey;

    const sortOrder =
      pickNumber(row, [
        "display_order",
        "sort_order",
        "order",
        "position",
        "rank",
      ]) ??
      (def ? pickNumber(def, ["display_order", "sort_order"]) : null) ??
      idx;

    // Sichtbarkeit: bevorzugt aus der Preset-Zeile, sonst aus der Definition
    // (`public_visible` für den Public-Katalog, sonst `default_visible`).
    const visible = pickBoolean(
      row,
      ["visible", "is_visible", "enabled", "active"],
      def
        ? pickBoolean(
            def,
            ["public_visible", "default_visible", "is_active"],
            true,
          )
        : true,
    );

    const dataType = def
      ? pickString(def, ["data_type", "type", "value_type"])
      : null;

    const role = def ? pickString(def, ["role", "kind", "purpose"]) : null;

    columns.push({
      key: fieldKey,
      label,
      visible,
      sortOrder,
      dataType,
      role,
    });
  });

  if (!columns.length) return null;

  return columns
    .filter((c) => c.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Wählt aus den aufgelösten Spalten eine fachliche Rolle aus
 * (z. B. „image", „title", „subtitle"). Wertet **nur** das DB-Feld `role`
 * aus den Definitions aus – keine Heuristik auf Feldnamen.
 */
export function findColumnByRole(
  columns: readonly CatalogColumn[],
  role: string,
): CatalogColumn | null {
  return (
    columns.find((c) => (c.role ?? "").toLowerCase() === role.toLowerCase()) ??
    null
  );
}

/**
 * Gruppiert die Filteroptionen aus `rpc_get_localized_filter_options`
 * nach Feld.
 *
 * Vertrag der Produktbasis:
 *  - `field_key` / `field_label`  – Feldschlüssel + übersetzte Bezeichnung
 *  - `option_key`                 – technischer Filterwert (nie übersetzt)
 *  - `option_label`               – Anzeige in der angeforderten Sprache
 *  - `option_count`, `sort_order`, `hex_code`
 *
 * Die Sprachauflösung (angefordert → `en` → `de`) passiert feldweise in der
 * Datenbank. Der Client wählt hier **keine** Sprache mehr aus und kennt
 * keine hartkodierten `label_de`/`label_en`-Vorrangregeln. Älteren
 * Spaltennamen bleibt die Erkennung nur als Rückwärtskompatibilität
 * erhalten (z. B. in Tests mit Alt-Zeilen).
 */
export function groupFilterOptions(
  rows: readonly FilterOptionRow[],
  /**
   * Angeforderte Website-Sprache. Wird nur noch für sprachsuffigierte
   * Alt-Zeilen (`label_pl`, `label_en`, …) genutzt; der Regelfall sind die
   * bereits übersetzten Werte `option_label` / `field_label`.
   */
  locale: string = "de",
): CatalogFilterGroup[] {
  const FIELD_KEYS = [
    "field_key",
    "category",
    "field",
    "filter_field",
    "column",
    "column_name",
    "key",
  ] as const;
  const VALUE_KEYS = [
    "option_key",
    "option_value",
    "value",
    "filter_value",
    "val",
  ] as const;
  const LABEL_KEYS = [
    "option_label",
    "label",
    "filter_label",
    "display",
    "title",
    "name",
  ] as const;
  const FIELD_LABEL_KEYS = [
    "field_label",
    "category_label",
    "group_label",
  ] as const;

  type OptAcc = {
    value: string;
    label: string;
    count: number | null;
    sortOrder: number | null;
    swatchHex: string | null;
  };
  type Acc = {
    field: string;
    label: string;
    options: Map<string, OptAcc>;
  };
  const acc = new Map<string, Acc>();

  for (const row of rows) {
    const field = pickString(row, FIELD_KEYS);
    const value = pickString(row, VALUE_KEYS);
    if (!field || value === null) continue;

    const label =
      pickString(row, LABEL_KEYS) ??
      pickProductLocalized(row as Record<string, unknown>, "label", locale) ??
      value;
    const fieldLabel =
      pickString(row, FIELD_LABEL_KEYS) ??
      pickProductLocalized(
        row as Record<string, unknown>,
        "field_label",
        locale,
      ) ??
      field;
    const count = pickNumber(row, [
      "option_count",
      "anzahl",
      "count",
      "total",
    ]);
    const sortOrder = pickNumber(row, ["sort_order", "display_order", "order"]);
    const swatchHex = pickString(row, ["hex_code"]);

    const entry =
      acc.get(field) ??
      ({ field, label: fieldLabel, options: new Map() } as Acc);
    if (!acc.has(field)) acc.set(field, entry);
    if (!entry.options.has(value)) {
      entry.options.set(value, { value, label, count, sortOrder, swatchHex });
    }
  }


  const groups: CatalogFilterGroup[] = [];
  for (const entry of acc.values()) {
    const options: CatalogFilterOption[] = Array.from(entry.options.values())
      .sort((a, b) => {
        const sa = a.sortOrder ?? Number.POSITIVE_INFINITY;
        const sb = b.sortOrder ?? Number.POSITIVE_INFINITY;
        if (sa !== sb) return sa - sb;
        return a.label.localeCompare(b.label);
      })
      .map(({ value, label, count, sortOrder, swatchHex }) => ({
        value,
        label,
        count,
        sortOrder,
        swatchHex,
      }));

    groups.push({ field: entry.field, label: entry.label, options });
  }
  return groups;
}
