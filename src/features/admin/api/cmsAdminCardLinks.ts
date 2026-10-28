/**
 * cmsAdminCardLinks — liest alle „Linkfelder" der Inhaltsblöcke einer Seite.
 *
 * Etappe `cms-admin-card-links-visible-audit-1`: zusätzlich zu `href`
 * (vor allem auf `card_v1`) wird auch `cta_link` (auf `content_v1`) gelesen,
 * damit der Admin-Baum für ALLE verlinkten Karten/Blöcke einer Seite eine
 * einheitliche „verlinkt auf …"-Pille anzeigen kann.
 *
 * Etappe Batch 42 (`cms-admin-link-pillen-standardbausteine-1`): erweitert
 * um die neuen Standard-Karten-Linkfelder `link_1_href`/`link_2_href`/
 * `link_3_href` (mit zugehörigen `link_N_enabled`-Schaltern) sowie um
 * `cta_href` (auf `cta_v1`/`teaser_2col_v1`/Karten). Mehrere gesetzte Links
 * pro Section werden alle zurückgegeben — der Admin-Baum rendert dann
 * mehrere kleine Pillen untereinander. Disabled Slots (`link_N_enabled=0`)
 * werden hier bereits herausgefiltert, damit keine „Geister-Pillen"
 * erscheinen.
 *
 * Reine Lese-Operation, kein Schreibvorgang. Nutzt den öffentlichen RLS-Pfad
 * (anon read auf `cms_section_fields`), weil Karten-/Block-Links in der
 * Prototyp-Phase stets auf aktive Sections zeigen und die Werte locale-
 * neutral sind (DE bevorzugt, EN als Fallback).
 */
import { getCmsSupabaseClient } from "@/lib/cmsSupabase/client";

/** Liste der Feldnamen, die im Admin-Tree als „Verlinkung" gewertet werden. */
const LINK_FIELD_KEYS = [
  "href",
  "cta_link",
  "cta_href",
  "link_1_href",
  "link_2_href",
  "link_3_href",
] as const;
/**
 * Hilfsfelder, die zwar selbst keine Pille auslösen, aber den zugehörigen
 * Link-Slot ein-/ausschalten können. Werden mitgeladen, damit gleich hier
 * gefiltert werden kann.
 */
const LINK_ENABLED_FIELD_KEYS = ["link_1_enabled", "link_2_enabled", "link_3_enabled"] as const;
const ALL_READ_FIELD_KEYS = [...LINK_FIELD_KEYS, ...LINK_ENABLED_FIELD_KEYS] as const;

/**
 * Typ der erkannten Linkfelder. Seit Batch 42 als String typisiert, weil die
 * Liste über Zeit weiter wachsen kann (z. B. `items.N.href`) und Konsumenten
 * den Wert ohnehin nur als Diagnose-Label rendern.
 */
export type LinkFieldKey = (typeof LINK_FIELD_KEYS)[number];

export interface CardLinkRow {
  section_key: string;
  /** Welches DB-Feld den Link liefert. */
  field_key: LinkFieldKey;
  /** Aufgelöster Link (DE bevorzugt, EN Fallback), getrimmt. */
  href: string;
}

/** Reihenfolge, in der mehrere Pillen pro Section sortiert werden. */
const FIELD_PRIORITY: Record<string, number> = {
  link_1_href: 0,
  link_2_href: 1,
  link_3_href: 2,
  href: 3,
  cta_href: 4,
  cta_link: 5,
};

function isDisabledValue(v: string | null | undefined): boolean {
  const s = (v ?? "").trim().toLowerCase();
  return s === "0" || s === "false" || s === "off" || s === "no";
}

export async function readPageCardLinks(pageKey: string): Promise<CardLinkRow[]> {
  try {
    const sb = getCmsSupabaseClient();
    const { data, error } = await sb
      .from("cms_section_fields")
      .select("section_key, field_key, value, locale")
      .eq("page_key", pageKey)
      .in("field_key", ALL_READ_FIELD_KEYS as unknown as string[])
      .in("locale", ["de", "en"]);
    if (error || !data) return [];
    type Row = { section_key: string; field_key: string; value: string | null; locale: string };
    // DE zuerst, dann EN — pro (section_key, field_key) gewinnt erster nicht-leerer Wert.
    const sorted = [...(data as Row[])].sort((a, b) => (a.locale === "de" ? -1 : 1));

    // Pro (section, field) den ersten nicht-leeren Wert merken — sowohl für
    // Link-Felder als auch für die zugehörigen `enabled`-Schalter.
    const linkValues = new Map<string, { fieldKey: LinkFieldKey; href: string }>();
    const enabledFlags = new Map<string, boolean>(); // key: section::slotIndex (1|2|3)

    for (const row of sorted) {
      const fk = row.field_key;
      const value = (row.value ?? "").trim();
      if (LINK_FIELD_KEYS.includes(fk as LinkFieldKey)) {
        if (!value) continue;
        const k = `${row.section_key}::${fk}`;
        if (linkValues.has(k)) continue;
        linkValues.set(k, { fieldKey: fk as LinkFieldKey, href: value });
        continue;
      }
      if (LINK_ENABLED_FIELD_KEYS.includes(fk as (typeof LINK_ENABLED_FIELD_KEYS)[number])) {
        const slot = fk.slice("link_".length, "link_".length + 1); // "1" | "2" | "3"
        const k = `${row.section_key}::${slot}`;
        if (enabledFlags.has(k)) continue;
        enabledFlags.set(k, !isDisabledValue(value));
      }
    }

    // Linkrows auf bewusst aktive Slots reduzieren und Duplikate
    // (gleiche href innerhalb derselben Section) entfernen.
    const out: CardLinkRow[] = [];
    const seenHref = new Map<string, Set<string>>(); // section_key → set of href
    const grouped = new Map<string, CardLinkRow[]>(); // section_key → rows
    for (const { fieldKey, href } of linkValues.values()) {
      // Den section_key haben wir oben in der Map-Konstruktion verloren —
      // rekonstruieren über erneuten Lauf wäre teuer; daher führen wir die
      // Struktur lieber direkt mit section_key.
      void fieldKey;
      void href;
    }
    // Reparse mit section_key.
    for (const [k, { fieldKey, href }] of linkValues.entries()) {
      const section_key = k.slice(0, k.length - `::${fieldKey}`.length);
      // Slot-Disable berücksichtigen (nur für link_N_href).
      const slotMatch = /^link_(\d)_href$/.exec(fieldKey);
      if (slotMatch) {
        const slot = slotMatch[1];
        const enabled = enabledFlags.get(`${section_key}::${slot}`);
        if (enabled === false) continue;
      }
      const seen = seenHref.get(section_key) ?? new Set<string>();
      if (seen.has(href)) continue;
      seen.add(href);
      seenHref.set(section_key, seen);
      const list = grouped.get(section_key) ?? [];
      list.push({ section_key, field_key: fieldKey, href });
      grouped.set(section_key, list);
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => (FIELD_PRIORITY[a.field_key] ?? 99) - (FIELD_PRIORITY[b.field_key] ?? 99));
      out.push(...list);
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Pages-Lookup für die Auflösung interner Linkziele im Admin-Tree.
 * Wird vom NavigationTreeEditor einmal aus `readPagesWithNav()` gebaut und
 * über `SortableBranch` an die `SectionList` weitergereicht.
 */
export interface PageLookup {
  page_key: string;
  page_no: number | null;
  title_de: string | null;
  status: string;
  is_active: boolean;
}
