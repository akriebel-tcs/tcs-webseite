/**
 * PDP-Reader: wandelt die Roh-Payload aus `rpc_get_channel_product_pdp`
 * (Wert `pdp`) in die Anzeige-Strukturen für die Sub-Komponenten um.
 * Geteilt zwischen Seiten-PDP und Karten-Popup.
 *
 * Wichtig:
 *  - Einzige inhaltliche Quelle ist der Kanalvertrag. Technische Gruppen
 *    kommen ausschließlich aus `pdp.technical_specs_display`
 *    (`group_key`, `group_label`, `group_sort`, `column_key`, `label`,
 *    `display_value`, `display_order`). Es gibt keinen zweiten Spec-Aufruf
 *    und keine Ersatz-Feldliste im Frontend.
 */
import type {
  DocumentGroup,
  DocumentItem,
  FeatureItem,
  ImageItem,
  PaketKomponenteItem,
  SpecGroup,
  SpecItem,
} from "../components/pdp/types";
import {
  asArray,
  asNumber,
  asString,
  resolvePublicUrl,
} from "../lib/pdpAssets";
import type { PaketKomponente, PdpPayload } from "../api/pdp";
import { pickProductLocalized, productLocaleChain } from "./productLocale";

export function readBadges(
  payload: PdpPayload,
  locale: string,
): string[] {
  const raw = asArray(payload.badges);
  const out: { sort: number; label: string }[] = [];
  raw.forEach((item, idx) => {
    if (!item || typeof item !== "object") return;
    const rec = item as Record<string, unknown>;
    const label = pickProductLocalized(rec, "label", locale);
    if (!label) return;
    out.push({ sort: asNumber(rec.sort) ?? idx, label });
  });
  out.sort((a, b) => a.sort - b.sort);
  return out.map((b) => b.label);
}

export function readFeatures(payload: PdpPayload): FeatureItem[] {
  const raw = asArray(payload.features);
  const items: { sort: number; item: FeatureItem }[] = [];
  raw.forEach((entry, idx) => {
    if (!entry || typeof entry !== "object") return;
    const rec = entry as Record<string, unknown>;
    const label = asString(rec.text) ?? asString(rec.label);
    if (!label) return;
    const sort = asNumber(rec.sort_order) ?? asNumber(rec.priority) ?? idx;
    items.push({
      sort,
      item: { key: `f-${idx}`, label, description: null },
    });
  });
  items.sort((a, b) => a.sort - b.sort);
  return items.map((i) => i.item);
}

function prettyGroupLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Spec-Gruppen ausschließlich aus `pdp.technical_specs_display` mit fertig
 * lokalisiertem `display_value`, gruppiert über `group_key`, Überschrift
 * `group_label`, Reihenfolge `group_sort` → `display_order`.
 */
export function readSpecGroups(payload: PdpPayload | null): SpecGroup[] {
  type Acc = {
    spec: SpecItem;
    groupKey: string;
    groupLabel: string | null;
    groupSort: number;
    rowSort: number;
  };
  const accs: Acc[] = [];

  const display = payload ? asArray(payload.technical_specs_display) : [];
  display.forEach((entry, idx) => {
    if (!entry || typeof entry !== "object") return;
    const rec = entry as Record<string, unknown>;
    const label = asString(rec.label) ?? asString(rec.column_key);
    const value = asString(rec.display_value);
    if (!label || !value) return;
    const gKey = asString(rec.group_key) ?? "_default";
    const gLabel = asString(rec.group_label);
    const gSort = asNumber(rec.group_sort) ?? 0;
    const rowSort = asNumber(rec.display_order) ?? idx;
    accs.push({
      spec: {
        key: `d-${idx}-${asString(rec.column_key) ?? label}`,
        label,
        value,
        groupKey: gKey,
      },
      groupKey: gKey,
      groupLabel: gLabel,
      groupSort: gSort,
      rowSort,
    });
  });


  const groupMeta = new Map<
    string,
    { sort: number; label: string | null }
  >();
  const groupItems = new Map<string, Acc[]>();
  for (const a of accs) {
    if (!groupItems.has(a.groupKey)) groupItems.set(a.groupKey, []);
    groupItems.get(a.groupKey)!.push(a);
    const existing = groupMeta.get(a.groupKey);
    if (!existing) {
      groupMeta.set(a.groupKey, { sort: a.groupSort, label: a.groupLabel });
    } else {
      groupMeta.set(a.groupKey, {
        sort: Math.min(existing.sort, a.groupSort),
        label: existing.label ?? a.groupLabel,
      });
    }
  }

  return Array.from(groupItems.entries())
    .sort(
      (a, b) =>
        (groupMeta.get(a[0])?.sort ?? 0) - (groupMeta.get(b[0])?.sort ?? 0),
    )
    .map(([key, list]) => {
      list.sort((a, b) => a.rowSort - b.rowSort);
      const meta = groupMeta.get(key);
      const label =
        key === "_default"
          ? null
          : (meta?.label ?? prettyGroupLabel(key));
      return {
        key,
        label,
        items: list.map((l) => l.spec),
      };
    });
}

/**
 * Dokumente aus `pdp.documents` (kanalgebunden). Gruppierschlüssel ist
 * `category`, sichtbare Überschrift bevorzugt `category_label`.
 */
export function readDocumentGroups(payload: PdpPayload): DocumentGroup[] {
  const raw = asArray(payload.documents);
  const items: DocumentItem[] = [];
  const categoryLabels = new Map<string, string>();
  raw.forEach((entry, idx) => {
    if (!entry || typeof entry !== "object") return;
    const rec = entry as Record<string, unknown>;
    const linkStatus = asString(rec.link_status);
    if (linkStatus && linkStatus !== "active") return;
    const label =
      asString(rec.title) ??
      asString(rec.label) ??
      asString(rec.file_name) ??
      asString(rec.name);
    if (!label) return;
    const category = asString(rec.category);
    const categoryLabel = asString(rec.category_label);
    if (category && categoryLabel && !categoryLabels.has(category)) {
      categoryLabels.set(category, categoryLabel);
    }
    items.push({
      key:
        asString(rec.id) ??
        asString(rec.document_id) ??
        `d-${idx}-${label}`,
      label,
      url: resolvePublicUrl(rec),
      category,
      fileType: asString(rec.file_type),
    });
  });

  if (items.length === 0) return [];
  const map = new Map<string, DocumentItem[]>();
  const order: string[] = [];
  for (const it of items) {
    const k = it.category ?? "_other";
    if (!map.has(k)) {
      map.set(k, []);
      order.push(k);
    }
    map.get(k)!.push(it);
  }
  return order.map((k) => ({
    key: k,
    label:
      categoryLabels.get(k) ??
      (k === "_other" ? "Weitere" : prettyGroupLabel(k)),
    items: map.get(k)!,
  }));
}

export function readImages(payload: PdpPayload): ImageItem[] {
  const raw = asArray(payload.images);
  const out: { sort: number; primary: boolean; item: ImageItem }[] = [];
  raw.forEach((item, idx) => {
    if (!item || typeof item !== "object") return;
    const rec = item as Record<string, unknown>;
    const url = resolvePublicUrl(rec);
    if (!url) return;
    out.push({
      sort: asNumber(rec.sort_order) ?? idx,
      primary: rec.is_primary === true,
      item: {
        key: `i-${idx}-${url}`,
        url,
        alt: asString(rec.alt_text) ?? asString(rec.alt) ?? null,
      },
    });
  });
  out.sort((a, b) => {
    if (a.primary !== b.primary) return a.primary ? -1 : 1;
    return a.sort - b.sort;
  });
  return out.map((o) => o.item);
}

export function readAusschreibungstext(
  payload: PdpPayload,
  locale: string,
): string | null {
  const a = payload.ausschreibung;
  if (a && typeof a === "object") {
    const rec = a as Record<string, unknown>;
    return (
      pickProductLocalized(rec, "langbeschreibung", locale) ??
      pickProductLocalized(rec, "kurzbeschreibung", locale)
    );
  }
  return asString(a);
}

/** Sprachcodes der Produkt-Rückfallkette (Re-Export für Aufrufer). */
export { productLocaleChain };

export function readPaketKomponentenItems(
  payloadComponents: unknown,
  fallback: readonly PaketKomponente[],
): PaketKomponenteItem[] {
  const fromPayload = asArray(payloadComponents);
  const source: Record<string, unknown>[] =
    fromPayload.length > 0
      ? fromPayload.filter(
          (e): e is Record<string, unknown> => !!e && typeof e === "object",
        )
      : (fallback as unknown as Record<string, unknown>[]);

  return source.map((r, idx) => ({
    key: `${asString(r.resolved_artikel_nr) ?? asString(r.artikel_nr) ?? "x"}-${asString(r.rolle) ?? "x"}-${idx}`,
    rolle: asString(r.rolle),
    artikelNr:
      asString(r.resolved_artikel_nr) ?? asString(r.artikel_nr),
    title:
      asString(r.resolved_title) ??
      asString(r.kurztext) ??
      asString(r.title),
    anzahl: asNumber(r.anzahl),
  }));
}

export function isPaket(
  payload: PdpPayload,
  components: readonly unknown[],
): boolean {
  const klasse = asString(payload.paket_klasse);
  return Boolean(klasse) && components.length > 0;
}

export function formatPrice(
  amount: number | null,
  currency: string | null,
  locale: string,
): string | null {
  if (amount === null) return null;
  try {
    if (currency) {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        currencyDisplay: "code",
      }).format(amount);
    }
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return currency ? `${amount} ${currency}` : String(amount);
  }
}
