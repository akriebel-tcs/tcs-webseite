/**
 * Geteilte Typen für die PDP-Sub-Komponenten.
 *
 * Beschreiben ausschließlich das, was die PDP-Renderer aus dem Kanal-Payload
 * (`rpc_get_channel_product_pdp` → `pdp`, inkl. `technical_specs_display`
 * und `documents`) sowie `api_v1_paket_komponenten` tatsächlich anzeigen.
 * Es werden keine zusätzlichen Felder erfunden.
 */

export interface FeatureItem {
  readonly key: string;
  readonly label: string;
  readonly description: string | null;
}

export interface SpecItem {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly groupKey: string | null;
}

export interface SpecGroup {
  readonly key: string;
  readonly label: string | null;
  readonly items: readonly SpecItem[];
}

export interface DocumentItem {
  readonly key: string;
  readonly label: string;
  readonly url: string | null;
  readonly category: string | null;
  readonly fileType: string | null;
}

export interface DocumentGroup {
  readonly key: string;
  readonly label: string;
  readonly items: readonly DocumentItem[];
}

export interface ImageItem {
  readonly key: string;
  readonly url: string;
  readonly alt: string | null;
}

export interface PaketKomponenteItem {
  readonly key: string;
  readonly rolle: string | null;
  readonly artikelNr: string | null;
  readonly title: string | null;
  readonly anzahl: number | null;
}
