/**
 * Normalizer for the real `datasheet-contract-2.0` payload.
 *
 * Rules:
 * - Contract order and titles are authoritative; nothing is invented.
 * - Only structurally known data is kept. Objects without the expected fields
 *   are dropped instead of being stringified ("[object Object]").
 * - Scalar cell values survive: strings and finite numbers, including `0`.
 * - Raw article-number patterns are never re-interpreted as a bill of
 *   materials: a `features` item without real text (e.g. the broken
 *   `scope_of_delivery` pseudo item `SSTICK%`) is dropped.
 * - Every list input is guarded: a malformed API object must not crash a page.
 * - Empty sections disappear.
 */

import type {
  ComponentRow,
  ContractBadge,
  ContractDatasheet,
  ContractSection,
  MediaBlock,
  NormalizedDatasheet,
  NormalizedSection,
  SpecGroup,
  SpecRow,
  TableBlock,
  TextBlock,
} from "./types";

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/** Scalar cell value: string or finite number (including 0). Never an object. */
function scalar(value: unknown): string | null {
  if (typeof value === "string") return value.trim() === "" ? null : value.trim();
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  return null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function num(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function sortItems(items: unknown[]): Record<string, unknown>[] {
  return list(items)
    .map(record)
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        (num(a.item["sort_order"]) ?? a.index) -
          (num(b.item["sort_order"]) ?? b.index) || a.index - b.index,
    )
    .map((entry) => entry.item);
}

function specRows(value: unknown): SpecRow[] {
  const rows: SpecRow[] = [];
  for (const raw of list(value)) {
    const row = record(raw);
    if (!row) continue;
    const label = text(row["label"]);
    const cell = scalar(row["value"]);
    if (label && cell !== null) rows.push({ label, value: cell });
  }
  return rows;
}

/**
 * Features accept plain strings (older contract rows) and objects with a real
 * `text` field. Pseudo items without text are dropped.
 */
function normalizeFeatures(items: unknown[]): string[] {
  const values: { value: string; sort: number; index: number }[] = [];
  list(items).forEach((raw, index) => {
    const direct = text(raw);
    if (direct) {
      values.push({ value: direct, sort: index, index });
      return;
    }
    const item = record(raw);
    if (!item) return;
    const value = text(item["text"]);
    if (!value) return;
    values.push({ value, sort: num(item["sort_order"]) ?? index, index });
  });
  return values
    .sort((a, b) => a.sort - b.sort || a.index - b.index)
    .map((entry) => entry.value);
}

function normalizeSpecGroups(items: unknown[]): SpecGroup[] {
  return sortItems(items)
    .map((item) => ({ title: text(item["title"]), rows: specRows(item["rows"]) }))
    .filter((group) => group.rows.length > 0);
}

function normalizeComponents(items: unknown[]): ComponentRow[] {
  const rows: ComponentRow[] = [];
  for (const item of sortItems(items)) {
    const artikelNr = text(item["artikel_nr"]);
    const title = text(item["title"]);
    if (!artikelNr || !title) continue;
    rows.push({
      artikelNr,
      title,
      quantity: num(item["quantity"]) ?? num(item["anzahl"]),
      roleLabel: text(item["role_label"]),
    });
  }
  return rows;
}

function normalizeText(items: unknown[]): TextBlock[] {
  return sortItems(items)
    .map((item) => ({
      title: text(item["title"]),
      text: text(item["text"]) ?? scalar(item["value"]) ?? "",
    }))
    .filter((block) => block.text !== "");
}

/** Columns may be plain strings or `{ key, label }` objects. */
function normalizeColumns(value: unknown): { key: string | null; label: string }[] {
  const columns: { key: string | null; label: string }[] = [];
  for (const raw of list(value)) {
    const direct = text(raw);
    if (direct) {
      columns.push({ key: null, label: direct });
      continue;
    }
    const column = record(raw);
    if (!column) continue;
    const key = text(column["key"]) ?? text(column["field"]) ?? text(column["name"]);
    const label = text(column["label"]) ?? text(column["title"]) ?? key;
    if (!label) continue;
    columns.push({ key, label });
  }
  return columns;
}

function normalizeTables(items: unknown[]): TableBlock[] {
  const tables: TableBlock[] = [];
  for (const item of sortItems(items)) {
    const columns = normalizeColumns(item["columns"]);
    const keys = columns
      .map((column) => column.key)
      .filter((key): key is string => key !== null);
    const rows: string[][] = [];

    for (const raw of list(item["rows"])) {
      if (Array.isArray(raw)) {
        const cells = raw.map((cell) => scalar(cell) ?? "");
        if (cells.some((cell) => cell !== "")) rows.push(cells);
        continue;
      }
      const row = record(raw);
      if (!row) continue;

      // Keyed columns win: read every declared column from the row object.
      if (keys.length > 0 && keys.length === columns.length) {
        const cells = columns.map((column) => scalar(row[column.key!]) ?? "");
        if (cells.some((cell) => cell !== "")) rows.push(cells);
        continue;
      }

      const label = text(row["label"]);
      const value = scalar(row["value"]);
      if (label || value !== null) rows.push([label ?? "", value ?? ""]);
    }

    if (rows.length > 0) {
      tables.push({
        title: text(item["title"]),
        columns: columns.map((column) => column.label),
        rows,
      });
    }
  }
  return tables;
}

function normalizeMedia(items: unknown[]): MediaBlock[] {
  const blocks: MediaBlock[] = [];
  for (const item of sortItems(items)) {
    const url = text(item["public_url"]);
    if (!url) continue;
    const title = text(item["title"]);
    blocks.push({
      url,
      caption: text(item["caption"]) ?? title,
      alt: text(item["alt_text"]) ?? title ?? "",
    });
  }
  return blocks;
}

function normalizeSection(raw: unknown): NormalizedSection | null {
  const source = record(raw) as (ContractSection & Record<string, unknown>) | null;
  if (!source) return null;
  const items = list(source.items);
  if (items.length === 0) return null;
  const key = text(source.section_key) ?? text(source.kind) ?? "section";
  const title = text(source.title);
  const kind = (text(source.kind) ?? "").toLowerCase();

  if (kind === "features") {
    const values = normalizeFeatures(items);
    return values.length > 0 ? { key, title, kind: "features", items: values } : null;
  }
  if (kind === "spec_groups" || kind === "specs") {
    const groups = normalizeSpecGroups(items);
    return groups.length > 0 ? { key, title, kind: "specs", groups } : null;
  }
  if (kind === "components" || kind === "package_components") {
    const rows = normalizeComponents(items);
    return rows.length > 0 ? { key, title, kind: "components", items: rows } : null;
  }
  if (kind === "text") {
    const blocks = normalizeText(items);
    return blocks.length > 0 ? { key, title, kind: "text", blocks } : null;
  }
  if (kind === "table" || kind === "tables") {
    const tables = normalizeTables(items);
    return tables.length > 0 ? { key, title, kind: "tables", tables } : null;
  }
  if (kind === "media") {
    const media = normalizeMedia(items);
    return media.length > 0 ? { key, title, kind: "media", items: media } : null;
  }
  return null;
}

export function normalizeDatasheet(
  contract: ContractDatasheet | null | undefined,
): NormalizedDatasheet | null {
  const source = record(contract);
  if (!source || source["found"] === false) return null;
  const header = record(source["header"]) ?? {};
  const artikelNr = text(header["artikel_nr"]);
  if (!artikelNr) return null;

  const sections = list(source["sections"])
    .map((section, index) => ({ section, index }))
    .sort(
      (a, b) =>
        (num(record(a.section)?.["sort_order"]) ?? a.index) -
          (num(record(b.section)?.["sort_order"]) ?? b.index) || a.index - b.index,
    )
    .map((entry) => normalizeSection(entry.section))
    .filter((section): section is NormalizedSection => section !== null);

  const media = record(source["media"]);
  const gallery = list(media?.["gallery"])
    .map(record)
    .filter((item): item is Record<string, unknown> => item !== null);
  const primary =
    record(media?.["primary_image"]) ??
    gallery.find((item) => item["is_primary"] === true) ??
    gallery[0] ??
    null;
  const primaryUrl = text(primary?.["public_url"]);

  const badges: ContractBadge[] = list(source["badges"])
    .map(record)
    .filter((badge): badge is Record<string, unknown> => badge !== null)
    .map((badge, index) => ({ badge, index }))
    .sort(
      (a, b) =>
        (num(a.badge["sort"]) ?? a.index) - (num(b.badge["sort"]) ?? b.index) ||
        a.index - b.index,
    )
    .map((entry) => entry.badge as ContractBadge);

  return {
    found: true,
    artikelNr,
    title: text(header["title"]),
    subtitle: text(header["subtitle"]),
    eyebrow: text(header["eyebrow"]),
    serie: text(header["serie"]),
    price: num(header["price"]),
    currency: text(header["currency"]) ?? "EUR",
    // Explicit contract permission only — a missing flag is not a yes.
    contractAllowsPrice: header["show_price"] === true,
    primaryImage: primaryUrl
      ? {
          url: primaryUrl,
          alt: text(primary?.["alt_text"]) ?? text(primary?.["title"]) ?? artikelNr,
        }
      : null,
    badges,
    sections,
  };
}
