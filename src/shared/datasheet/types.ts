/**
 * Portable datasheet types.
 *
 * This module is shared between Scantron and Web Neu. It must stay free of
 * app imports (`@/...`), routing, data fetching and i18n hooks — everything
 * arrives through props.
 */

/* ------------------------------------------------- contract input (raw) */

export interface ContractBadge {
  key?: string | null;
  label?: string | null;
  label_de?: string | null;
  label_en?: string | null;
  label_da?: string | null;
  tone?: string | null;
  sort?: number | null;
}

export interface ContractMediaItem {
  public_url?: string | null;
  title?: string | null;
  alt_text?: string | null;
  caption?: string | null;
  is_primary?: boolean | null;
  sort_order?: number | null;
}

export interface ContractSection {
  section_key?: string | null;
  kind?: string | null;
  title?: string | null;
  sort_order?: number | null;
  items?: unknown[];
}

export interface ContractDatasheet {
  found?: boolean;
  schema_version?: string | null;
  header?: {
    artikel_nr?: string | null;
    title?: string | null;
    subtitle?: string | null;
    eyebrow?: string | null;
    serie?: string | null;
    price?: number | string | null;
    currency?: string | null;
    show_price?: boolean | null;
  } | null;
  media?: {
    primary_image?: ContractMediaItem | null;
    gallery?: ContractMediaItem[] | null;
  } | null;
  badges?: ContractBadge[] | null;
  sections?: ContractSection[] | null;
}

/* ------------------------------------------------- normalized structures */

export interface SpecRow {
  label: string;
  value: string;
}

export interface SpecGroup {
  title: string | null;
  rows: SpecRow[];
}

export interface ComponentRow {
  artikelNr: string;
  title: string;
  quantity: number | null;
  roleLabel: string | null;
}

export interface TextBlock {
  title: string | null;
  text: string;
}

export interface TableBlock {
  title: string | null;
  columns: string[];
  rows: string[][];
}

export interface MediaBlock {
  url: string;
  caption: string | null;
  alt: string;
}

export type NormalizedSection =
  | { key: string; title: string | null; kind: "features"; items: string[] }
  | { key: string; title: string | null; kind: "specs"; groups: SpecGroup[] }
  | { key: string; title: string | null; kind: "components"; items: ComponentRow[] }
  | { key: string; title: string | null; kind: "text"; blocks: TextBlock[] }
  | { key: string; title: string | null; kind: "tables"; tables: TableBlock[] }
  | { key: string; title: string | null; kind: "media"; items: MediaBlock[] };

export interface NormalizedDatasheet {
  found: boolean;
  artikelNr: string;
  title: string | null;
  subtitle: string | null;
  eyebrow: string | null;
  serie: string | null;
  price: number | null;
  currency: string;
  /** Contract side of the price permission. */
  contractAllowsPrice: boolean;
  primaryImage: { url: string; alt: string } | null;
  badges: ContractBadge[];
  sections: NormalizedSection[];
}

/* ------------------------------------------------------- render contract */

export interface DatasheetBrandProfile {
  profile_key: string;
  company_name: string | null;
  logo_url: string | null;
  accent_color: string | null;
  /** Secondary brand accent; falls back to the primary accent when absent. */
  secondary_accent_color: string | null;
  footer_background: string | null;
  footer_text_color: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  /** Brand side of the price permission. */
  show_price: boolean;
  /** Foreground colour for accent surfaces; null on legacy profiles. */
  accent_text_color: string | null;
  /** Layout requested by the profile, e.g. "standard-product-sheet". */
  template_key: string | null;
  /** Version of the requested layout. */
  template_version: number | null;
}

export interface DatasheetLabels {
  /** Localized UI value for the document type block, e.g. "Datenblatt". */
  documentType: string;
  price: string;
  /** Fallback heading for a components section without a contract title. */
  contents: string;
  /** Fallback heading for a features section without a contract title. */
  features: string;
}

export interface DatasheetSheetProps {
  sheet: NormalizedDatasheet;
  brand: DatasheetBrandProfile;
  labels: DatasheetLabels;
  /** App-level price toggle; price needs contract AND brand AND this flag. */
  showPrices: boolean;
  /** Formats a price for the active locale. */
  formatPrice: (value: number, currency: string) => string;
  /** Resolves a badge label for the active locale. */
  resolveBadgeLabel?: (badge: ContractBadge) => string | null;
  /** Resolves a localized component title by article number. */
  resolveComponentTitle?: (artikelNr: string, fallback: string) => string;
  /** Optional additional component rows while a contract section is missing. */
  fallbackComponents?: ComponentRow[];
}
