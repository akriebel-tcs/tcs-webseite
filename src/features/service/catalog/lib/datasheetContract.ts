/**
 * Datenblatt-Vertrag `datasheet-contract-2.0`.
 *
 * Einzige Inhaltsquelle des Website-Datenblatts ist
 * `rpc_get_channel_product_datasheet('datenblatt_de', artikel_nr, locale)`
 * bzw. der darin enthaltene Wert `datasheet` (siehe `getProductDatasheet`).
 *
 * Führend sind ausschließlich:
 *  - `header`   (Kopf: eyebrow, title, subtitle, artikel_nr, Preis)
 *  - `branding` (Dokumenttyp und Absenderangaben)
 *  - `media`    (`primary_image`, `gallery`)
 *  - `badges`   (`label`, `sort`)
 *  - `sections` (`section_key`, `title`, `sort_order`, `kind`, `items`)
 *
 * Es gibt in diesem Pfad KEINE parallelen Feldlisten, keine eigene
 * Gruppierungs-/Sortierlogik, keine `block_visibility`-Einzelfelder, keinen
 * `summary.langbeschreibung`-Fallback und keine Lebenszyklusdarstellung.
 * Leere Sections werden nicht gerendert. Produktfelder werden nicht
 * hartkodiert; unbekannte `kind`-Werte werden übersprungen.
 */

import { asNumber, asString, asArray } from "./pdpAssets";

export type DatasheetSectionKind =
  | "features"
  | "spec_groups"
  | "text"
  | "table"
  | "media"
  | "package_components";

export interface DatasheetHeader {
  readonly eyebrow: string | null;
  readonly title: string | null;
  readonly subtitle: string | null;
  readonly artikelNr: string | null;
  readonly priceFormatted: string | null;
}

export interface DatasheetBranding {
  readonly documentType: string | null;
  readonly companyName: string | null;
  readonly address: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly website: string | null;
  readonly fileName: string | null;
}

export interface DatasheetImage {
  readonly url: string;
  readonly alt: string;
}

export interface DatasheetMedia {
  readonly primary: DatasheetImage | null;
  readonly gallery: readonly DatasheetImage[];
}

export interface DatasheetSpecRow {
  readonly label: string;
  readonly value: string;
}

export interface DatasheetSpecGroup {
  readonly key: string;
  readonly title: string | null;
  readonly rows: readonly DatasheetSpecRow[];
}

export interface DatasheetTableRow {
  readonly cells: readonly string[];
}

export type DatasheetSection =
  | {
      readonly kind: "features";
      readonly sectionKey: string;
      readonly title: string | null;
      readonly items: readonly string[];
    }
  | {
      readonly kind: "spec_groups";
      readonly sectionKey: string;
      readonly title: string | null;
      readonly groups: readonly DatasheetSpecGroup[];
    }
  | {
      readonly kind: "text";
      readonly sectionKey: string;
      readonly title: string | null;
      readonly paragraphs: readonly string[];
    }
  | {
      readonly kind: "table";
      readonly sectionKey: string;
      readonly title: string | null;
      readonly columns: readonly string[];
      readonly rows: readonly DatasheetTableRow[];
    }
  | {
      readonly kind: "media";
      readonly sectionKey: string;
      readonly title: string | null;
      readonly images: readonly DatasheetImage[];
    }
  | {
      readonly kind: "package_components";
      readonly sectionKey: string;
      readonly title: string | null;
      readonly rows: readonly DatasheetSpecRow[];
    };

export interface DatasheetModel {
  readonly schemaVersion: string | null;
  readonly header: DatasheetHeader;
  readonly branding: DatasheetBranding;
  readonly media: DatasheetMedia;
  readonly badges: readonly string[];
  readonly sections: readonly DatasheetSection[];
}

function rec(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readImage(value: unknown): DatasheetImage | null {
  const r = rec(value);
  if (!r) return null;
  const url = asString(r.public_url) ?? asString(r.url);
  if (!url) return null;
  const alt = asString(r.alt_text) ?? asString(r.title) ?? "";
  return { url, alt };
}

function readHeader(raw: Record<string, unknown> | null): DatasheetHeader {
  const h = raw ?? {};
  const price = asNumber(h.price);
  const currency = asString(h.currency);
  const showPrice = h.show_price !== false;
  let priceFormatted: string | null = null;
  if (showPrice && price !== null) {
    priceFormatted = new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: currency ?? "EUR",
      minimumFractionDigits: 2,
    }).format(price);
  }
  return {
    eyebrow: asString(h.eyebrow),
    title: asString(h.title),
    subtitle: asString(h.subtitle),
    artikelNr: asString(h.artikel_nr),
    priceFormatted,
  };
}

function readBranding(raw: Record<string, unknown> | null): DatasheetBranding {
  const b = raw ?? {};
  return {
    documentType: asString(b.document_type),
    companyName: asString(b.company_name),
    address: asString(b.address),
    phone: asString(b.phone),
    email: asString(b.email),
    website: asString(b.website),
    fileName: asString(b.file_name),
  };
}

function readMedia(raw: Record<string, unknown> | null): DatasheetMedia {
  const m = raw ?? {};
  const gallery = asArray(m.gallery)
    .map(readImage)
    .filter((i): i is DatasheetImage => i !== null);
  return { primary: readImage(m.primary_image), gallery };
}

function readBadges(raw: unknown): string[] {
  return asArray(raw)
    .map((entry) => {
      const r = rec(entry);
      if (!r) return null;
      const label = asString(r.label);
      if (!label) return null;
      return { label, sort: asNumber(r.sort) ?? 0 };
    })
    .filter((b): b is { label: string; sort: number } => b !== null)
    .sort((a, b) => a.sort - b.sort)
    .map((b) => b.label);
}

function readTextItems(items: readonly unknown[]): string[] {
  return items
    .map((entry) => {
      if (typeof entry === "string") return asString(entry);
      const r = rec(entry);
      if (!r) return null;
      return asString(r.text) ?? asString(r.value) ?? asString(r.label);
    })
    .filter((s): s is string => s !== null);
}

function readRows(items: readonly unknown[]): DatasheetSpecRow[] {
  return items
    .map((entry) => {
      const r = rec(entry);
      if (!r) return null;
      const label = asString(r.label) ?? asString(r.title);
      const value = asString(r.value) ?? asString(r.display_value);
      if (!label && !value) return null;
      return { label: label ?? "", value: value ?? "" };
    })
    .filter((r): r is DatasheetSpecRow => r !== null);
}

function readSection(entry: unknown): DatasheetSection | null {
  const r = rec(entry);
  if (!r) return null;
  const sectionKey = asString(r.section_key);
  const kind = asString(r.kind);
  if (!sectionKey || !kind) return null;
  const title = asString(r.title);
  const items = asArray(r.items);
  if (items.length === 0) return null;

  switch (kind as DatasheetSectionKind) {
    case "features": {
      const values = readTextItems(items);
      if (values.length === 0) return null;
      return { kind: "features", sectionKey, title, items: values };
    }
    case "spec_groups": {
      const groups = items
        .map((g, index) => {
          const gr = rec(g);
          if (!gr) return null;
          const rows = readRows(asArray(gr.rows));
          if (rows.length === 0) return null;
          return {
            key: asString(gr.group_key) ?? `${sectionKey}-${index}`,
            title: asString(gr.title),
            rows,
            sort: asNumber(gr.sort_order) ?? 0,
          };
        })
        .filter((g) => g !== null)
        .sort((a, b) => a.sort - b.sort)
        .map(({ key, title: gTitle, rows }) => ({ key, title: gTitle, rows }));
      if (groups.length === 0) return null;
      return { kind: "spec_groups", sectionKey, title, groups };
    }
    case "text": {
      const paragraphs = readTextItems(items);
      if (paragraphs.length === 0) return null;
      return { kind: "text", sectionKey, title, paragraphs };
    }
    case "table": {
      const rows: DatasheetTableRow[] = [];
      const columns: string[] = [];
      for (const entryRow of items) {
        const rr = rec(entryRow);
        if (!rr) continue;
        const cells = asArray(rr.cells);
        if (cells.length > 0) {
          rows.push({
            cells: cells.map((c) => asString(c) ?? ""),
          });
          continue;
        }
        // Objekt-Zeile: Spalten ergeben sich aus den gelieferten Schlüsseln.
        const keys = Object.keys(rr);
        for (const k of keys) if (!columns.includes(k)) columns.push(k);
        rows.push({ cells: columns.map((k) => asString(rr[k]) ?? "") });
      }
      if (rows.length === 0) return null;
      const headerRow = asArray(r.columns).map((c) => asString(c) ?? "");
      return {
        kind: "table",
        sectionKey,
        title,
        columns: headerRow.length > 0 ? headerRow : columns,
        rows,
      };
    }
    case "media": {
      const images = items
        .map(readImage)
        .filter((i): i is DatasheetImage => i !== null);
      if (images.length === 0) return null;
      return { kind: "media", sectionKey, title, images };
    }
    case "package_components": {
      const rows = readRows(items);
      if (rows.length === 0) return null;
      return { kind: "package_components", sectionKey, title, rows };
    }
    default:
      return null;
  }
}

/**
 * Normalisiert den Wert `datasheet` des Kanal-RPC in ein Rendermodell.
 * Reihenfolge kommt ausschließlich aus `sort_order`; leere Sections fallen weg.
 */
export function readDatasheet(raw: unknown): DatasheetModel | null {
  const d = rec(raw);
  if (!d) return null;
  if (d.found === false) return null;

  const sections = asArray(d.sections)
    .map((entry, index) => {
      const parsed = readSection(entry);
      if (!parsed) return null;
      const sort = asNumber(rec(entry)?.sort_order) ?? index;
      return { parsed, sort, index };
    })
    .filter(
      (s): s is { parsed: DatasheetSection; sort: number; index: number } =>
        s !== null,
    )
    .sort((a, b) => a.sort - b.sort || a.index - b.index)
    .map((s) => s.parsed);

  return {
    schemaVersion: asString(d.schema_version),
    header: readHeader(rec(d.header)),
    branding: readBranding(rec(d.branding)),
    media: readMedia(rec(d.media)),
    badges: readBadges(d.badges),
    sections,
  };
}
