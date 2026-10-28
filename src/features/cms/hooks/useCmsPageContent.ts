/**
 * useCmsPageContent — Liest CMS-Inhalte (Texte + Bilder) einer Seite aus
 * der Datenbank und stellt eine kleine Lookup-API für die Render-Komponenten
 * bereit.
 *
 * Sicherheits-/Stabilitätsphilosophie:
 *   - RLS lässt nur veröffentlichte (`status='published'`, `is_active=true`)
 *     Seiten an `anon` durch. Code-Komponenten reichen daher IMMER einen
 *     i18n-Fallback an `text()` und einen Code-Asset-Fallback an `asset()`.
 *   - Der Hook crasht nie laut: wenn Supabase nicht erreichbar ist oder die
 *     Seite nicht freigegeben ist, sind die Maps leer und die Komponenten
 *     rendern automatisch ihre Fallbacks (Bisheriges Verhalten = Stand vor
 *     der CMS-Migration).
 *
 * Lese-Pfad ohne Schreibrechte. Nutzt den eigenen CMS-Light-Client
 * (`getCmsSupabaseClient`), nicht den Produkt-DB-Client.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { appLocaleChain, normalizeAppLocale, type AppLocale } from "@/i18n/locale";
import { cachedLocaleRegistry, localeChainFromRegistry, readLocaleRegistry } from "@/i18n/localeRegistry";

/**
 * Rückfallkette: bevorzugt die in `cms_locales` gepflegte Kette, solange das
 * Sprachregister noch nicht geladen ist die Code-Kette (zuletzt Deutsch).
 */
const localeChain = (locale: AppLocale): readonly AppLocale[] => {
  const rows = cachedLocaleRegistry();
  return rows ? localeChainFromRegistry(locale, rows) : appLocaleChain(locale);
};

type Locale = AppLocale;

interface FieldRow {
  section_key: string;
  field_key: string;
  locale: Locale;
  value: string | null;
  /** 'geprueft' | 'maschinell' | 'maschinell_veraltet' — veraltete Maschinenwerte werden nicht ausgespielt. */
  review_status?: string | null;
}

export type Viewport = "mobile" | "tablet" | "desktop";

interface AssetRow {
  section_key: string;
  field_key: string | null;
  public_url: string | null;
  alt_de: string | null;
  alt_en: string | null;
  alt_pl: string | null;
  viewport: Viewport | null;
  /** Vertikale Übersetzungen (führend). */
  cms_asset_translations?: Array<{ locale: string | null; alt_text: string | null }> | null;
}

/** Bildschirmgrößen-Set eines Bild-Slots. Leer = kein DB-Bild. */
export interface AssetSet {
  mobile?: string;
  tablet?: string;
  desktop?: string;
  /** Beliebige Variante mit Vorrang Desktop → Tablet → Mobile. */
  any?: string;
  /** Alt-Texte je Sprache, aus der zuerst gefundenen Variante. */
  alt_de?: string;
  alt_en?: string;
  alt_pl?: string;
  /** Alt-Texte je Sprache aus `cms_asset_translations` (beliebig viele Sprachen). */
  alts?: Record<string, string>;
}

interface SectionRow {
  section_key: string;
  sort_order: number;
  /** Nur gesetzt für Kind-Sections (z. B. card_v1 unter product-scroller). */
  parent_section_key?: string | null;
  section_type?: string | null;
}

export interface CmsPageContent {
  /** Roher Lookup eines Feldes; bevorzugt benannte Helper unten. */
  text: (sectionKey: string, fieldKey: string, locale: Locale, fallback?: string) => string;
  /**
   * Lookup ohne Sprachkette: liefert den Wert **genau** in der uebergebenen
   * Sprache oder einen leeren String. Damit kann ein Renderer erkennen, ob
   * eine echte Uebersetzung vorliegt, statt still auf Deutsch zu fallen.
   */
  textInLocale: (sectionKey: string, fieldKey: string, locale: Locale) => string;
  /** Alle vorhandenen field_keys einer Section, nach Feldname sortiert. */
  fieldKeys: (sectionKey: string) => string[];
  /** Liefert public_url eines aktiven Bild-Slots oder den Code-Fallback.
   *  Sucht in der Reihenfolge Desktop → Tablet → Mobile. */
  asset: (sectionKey: string, fieldKey: string, fallback?: string) => string;
  /** Liefert alle aktiven Varianten eines Bild-Slots (mobile/tablet/desktop). */
  assetSet: (sectionKey: string, fieldKey: string) => AssetSet;
  /** Alt-Text aus DB oder Fallback. */
  assetAlt: (sectionKey: string, fieldKey: string, locale: Locale, fallback?: string) => string;
  /**
   * Aktive Sections der Seite, sortiert nach `sort_order`. Enthält nur echte
   * Wurzeln (kein Elternverweis) und Nachkommen mit vollständig erreichbarer,
   * sichtbarer Elternkette. Verwaiste Kinder werden **nicht** zu Wurzeln.
   */
  sections: SectionRow[];
  loading: boolean;
  /** True, wenn DB-Werte verfügbar sind. Sonst werden ausschließlich Fallbacks gerendert. */
  hasDbContent: boolean;
  /**
   * Additiv: Kennung eines Lade-/Konfigurationsfehlers (`read_failed`,
   * `unconfigured`) oder `null`. Damit ist „leer" von „Ladefehler"
   * unterscheidbar. Bei gesetztem Fehler sind alle Maps leer und
   * `hasDbContent` ist false — es wird **kein** Teilergebnis ausgespielt.
   */
  error: string | null;
}

const EMPTY: CmsPageContent = {
  text: (_s, _f, _l, fallback) => fallback ?? "",
  textInLocale: () => "",
  fieldKeys: () => [],
  asset: (_s, _f, fallback) => fallback ?? "",
  assetSet: () => ({}),
  assetAlt: (_s, _f, _l, fallback) => fallback ?? "",
  sections: [],
  loading: false,
  hasDbContent: false,
  error: null,
};

const PAGE_SIZE = 1000;

/**
 * Liest eine Tabelle vollständig über `range()`-Seiten.
 *
 * Fehler oder `null`-Daten (auch ab der zweiten Seite) führen zu einer
 * Ausnahme — es wird **niemals** eine Teilmenge als Erfolg zurückgegeben.
 *
 * Hinweis: Eine eindeutige Sortierung (fachliche Reihenfolge + `id` als
 * Tiebreaker) macht das Blättern deterministisch. Sie ist **keine**
 * Momentaufnahme-Garantie der Datenbank: parallele Schreibvorgänge zwischen
 * zwei Seiten können weiterhin zu einem gemischten Lesestand führen.
 */
async function readAllCmsRows<T>(
  resource: string,
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await fetchPage(from, to);

    if (error) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: unknown }).message)
          : String(error);
      throw new Error(`cms_read_failed:${resource}:${message}`);
    }
    if (!data) throw new Error(`cms_read_failed:${resource}:no_data`);

    rows.push(...data);

    if (data.length < PAGE_SIZE) return rows;
  }
}

interface RawSectionRow {
  id: string;
  section_key: string;
  section_type: string | null;
  sort_order: number;
  parent_section_id: string | null;
}

/**
 * Nur echte Wurzeln (`parent_section_id IS NULL`) und deren Nachkommen mit
 * durchgehend vorhandener, sichtbarer Elternkette. Iterativ und endlich:
 * Zyklen und Nachfahren fehlender/inaktiver Eltern bleiben ausgeschlossen,
 * ohne künstliche Tiefengrenze.
 */
export function buildSectionTree(rows: RawSectionRow[]): SectionRow[] {
  const byId = new Map<string, RawSectionRow>();
  for (const r of rows) byId.set(r.id, r);

  const childrenOf = new Map<string | null, RawSectionRow[]>();
  for (const r of rows) {
    const parent = r.parent_section_id;
    // Verweise auf nicht gelesene (fehlende/inaktive) Eltern werden bewusst
    // NICHT auf null umgedeutet.
    const bucket = parent === null ? null : byId.has(parent) ? parent : "__missing__";
    if (bucket === "__missing__") continue;
    const list = childrenOf.get(bucket) ?? [];
    list.push(r);
    childrenOf.set(bucket, list);
  }

  const reachable = new Set<string>();
  const queue: RawSectionRow[] = [...(childrenOf.get(null) ?? [])];
  while (queue.length > 0) {
    const node = queue.shift() as RawSectionRow;
    if (reachable.has(node.id)) continue;
    reachable.add(node.id);
    for (const child of childrenOf.get(node.id) ?? []) {
      if (!reachable.has(child.id)) queue.push(child);
    }
  }

  // Die Zeilen kommen bereits eindeutig sortiert aus der Datenbank
  // (`sort_order`, `id`). Es wird nur gefiltert, NICHT neu geordnet.
  return rows
    .filter((r) => reachable.has(r.id))
    .map((r) => ({
      section_key: r.section_key,
      sort_order: r.sort_order,
      section_type: r.section_type,
      parent_section_key: r.parent_section_id
        ? byId.get(r.parent_section_id)?.section_key ?? null
        : null,
    }));
}


interface LoadState {
  /** Seite, zu der die Daten gehören. Nie mit einer anderen Seite mischen. */
  pageKey: string | null;
  fields: FieldRow[];
  assets: AssetRow[];
  sections: SectionRow[];
  loading: boolean;
  error: string | null;
}

const INITIAL_STATE: LoadState = {
  pageKey: null,
  fields: [],
  assets: [],
  sections: [],
  loading: false,
  error: null,
};

export function useCmsPageContent(pageKey: string | null | undefined): CmsPageContent {
  const [state, setState] = useState<LoadState>(INITIAL_STATE);
  const requestRef = useRef(0);
  const mountedRef = useRef(true);
  const [registryTick, setRegistryTick] = useState(0);

  // Sprachregister unabhängig vom Inhaltsladen. Kommt es später an, wird die
  // gewünschte Rückfallkette durch den Tick renderwirksam — ein Ausfall
  // blockiert das Inhaltsladen nicht.
  useEffect(() => {
    if (cachedLocaleRegistry()) return;
    let cancelled = false;
    readLocaleRegistry()
      .then(() => {
        if (!cancelled) setRegistryTick((n) => n + 1);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Nach dem Ausbau darf keine Antwort mehr etwas setzen.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const request = ++requestRef.current;
    // Nur die jüngste Anfrage dieser noch eingebauten Komponente darf schreiben.
    const isCurrent = () => mountedRef.current && requestRef.current === request;

    if (!pageKey) {
      setState({ ...INITIAL_STATE, pageKey: null });
      return;
    }

    setState({ ...INITIAL_STATE, pageKey: null, loading: true });

    (async () => {
      try {
        // Lazy geladen, damit ein Konfigurationsfehler nicht beim Modul-Import
        // der Seite auftritt. Der Modulcache der Laufzeit greift von selbst.
        const mod = await import("@/lib/cmsSupabase/client");
        if (!isCurrent()) return;
        if (!mod.isCmsSupabaseConfigured()) {
          setState({ ...INITIAL_STATE, pageKey, loading: false, error: "unconfigured" });
          return;
        }
        const sb = mod.getCmsSupabaseClient();

        // Jede geblätterte Abfrage braucht eine eindeutige Sortierung
        // (fachliche Reihenfolge + `id`), damit keine Zeile doppelt oder gar
        // nicht gelesen wird.
        const [fieldRows, assetRows, sectionRows] = await Promise.all([
          readAllCmsRows<FieldRow>("cms_section_fields", async (from, to) =>
            await sb
              .from("cms_section_fields")
              .select("section_key, field_key, locale, value, review_status")
              .eq("page_key", pageKey)
              .order("section_key", { ascending: true })
              .order("field_key", { ascending: true })
              .order("locale", { ascending: true })
              .order("id", { ascending: true })
              .range(from, to),
          ),
          readAllCmsRows<AssetRow>("cms_assets", async (from, to) =>
            await sb
              .from("cms_assets")
              .select(
                "section_key, field_key, public_url, alt_de, alt_en, alt_pl, viewport, cms_asset_translations(locale, alt_text)",
              )
              .eq("page_key", pageKey)
              .eq("is_active", true)
              .order("section_key", { ascending: true })
              .order("sort_order", { ascending: true })
              .order("id", { ascending: true })
              .range(from, to),
          ),
          readAllCmsRows<RawSectionRow>("cms_sections", async (from, to) =>
            await sb
              .from("cms_sections")
              .select("id, section_key, section_type, sort_order, parent_section_id")
              .eq("page_key", pageKey)
              .eq("is_active", true)
              .order("sort_order", { ascending: true })
              .order("id", { ascending: true })
              .range(from, to),
          ),
        ]);

        if (!isCurrent()) return;
        // Erst wenn alle drei Ressourcen vollständig gelesen sind, wird die
        // Seite als Ganzes übernommen — kein Teilergebnis.
        setState({
          pageKey,
          fields: fieldRows,
          assets: assetRows,
          sections: buildSectionTree(sectionRows),
          loading: false,
          error: null,
        });
      } catch (err) {
        console.warn("[useCmsPageContent] read failed, falling back to code/i18n:", err);
        if (!isCurrent()) return;
        setState({ ...INITIAL_STATE, pageKey, loading: false, error: "read_failed" });
      }
    })();

  }, [pageKey]);

  return useMemo<CmsPageContent>(() => {
    if (!pageKey) return EMPTY;
    // Solange die Daten nicht zu DIESER Seite gehören, wird nie der Stand der
    // vorherigen Seite ausgegeben.
    if (state.pageKey !== pageKey) return { ...EMPTY, loading: true };

    const { fields, assets, sections, loading, error } = state;

    const textMap = new Map<string, string>();
    for (const r of fields) {
      // Maschinelle Übersetzungen dürfen sichtbar sein; veraltete
      // Maschinenwerte werden ausgelassen (Deutsch-Rückfall greift).
      if (r.review_status === "maschinell_veraltet") continue;
      const key = `${r.section_key}|${r.field_key}|${r.locale}`;
      if (r.value != null && r.value !== "") textMap.set(key, r.value);
    }
    // Pro Slot (section|field) bis zu drei Viewports gruppieren.
    const assetSetMap = new Map<string, AssetSet>();
    for (const a of assets) {
      if (!a.field_key || !a.public_url) continue;
      const key = `${a.section_key}|${a.field_key}`;
      const set = assetSetMap.get(key) ?? {};
      const vp = (a.viewport ?? "desktop") as Viewport;
      set[vp] = a.public_url;
      // alt-Texte: erste nicht-leere Variante gewinnt
      if (!set.alt_de && a.alt_de) set.alt_de = a.alt_de;
      if (!set.alt_en && a.alt_en) set.alt_en = a.alt_en;
      if (!set.alt_pl && a.alt_pl) set.alt_pl = a.alt_pl;
      // Vertikale Struktur hat Vorrang vor den alten Spalten.
      for (const t of a.cms_asset_translations ?? []) {
        if (!t?.locale || !t.alt_text || t.alt_text.trim() === "") continue;
        set.alts = { ...(set.alts ?? {}), [t.locale]: t.alt_text };
      }
      assetSetMap.set(key, set);
    }
    // any-Helper: Desktop → Tablet → Mobile
    for (const set of assetSetMap.values()) {
      set.any = set.desktop ?? set.tablet ?? set.mobile;
    }

    // Sprach-Fallback: gewünschte Sprache zuerst, danach Register-/Code-Kette.
    // So bleibt eine noch nicht übersetzte Stelle gefüllt statt leer.
    const textInLocale = (s: string, f: string, l: Locale) =>
      textMap.get(`${s}|${f}|${l}`) ?? "";

    const text = (s: string, f: string, l: Locale, fallback = "") => {
      for (const candidate of localeChain(l)) {
        const value = textMap.get(`${s}|${f}|${candidate}`);
        if (value) return value;
      }
      return fallback;
    };

    const fieldKeyMap = new Map<string, Set<string>>();
    for (const r of fields) {
      if (!fieldKeyMap.has(r.section_key)) fieldKeyMap.set(r.section_key, new Set());
      fieldKeyMap.get(r.section_key)?.add(r.field_key);
    }

    const fieldKeys = (sectionKey: string) =>
      Array.from(fieldKeyMap.get(sectionKey) ?? []).sort((a, b) => a.localeCompare(b));

    const asset = (s: string, f: string, fallback = "") =>
      assetSetMap.get(`${s}|${f}`)?.any ?? fallback;

    const assetSet = (s: string, f: string): AssetSet =>
      assetSetMap.get(`${s}|${f}`) ?? {};

    /** Alte Spalten gelten GENAU für de/en/pl; andere Sprachen nutzen die
     *  vertikalen Übersetzungen und die Register-Rückfallkette. */
    const legacyAlt = (set: AssetSet, candidate: string): string | undefined =>
      candidate === "de"
        ? set.alt_de
        : candidate === "en"
          ? set.alt_en
          : candidate === "pl"
            ? set.alt_pl
            : undefined;

    const assetAlt = (s: string, f: string, l: Locale, fallback = "") => {
      const set = assetSetMap.get(`${s}|${f}`);
      if (!set) return fallback;
      for (const candidate of localeChain(l)) {
        const value = set.alts?.[candidate] ?? legacyAlt(set, candidate);
        if (value) return value;
      }
      return fallback;
    };

    return {
      text,
      textInLocale,
      fieldKeys,
      asset,
      assetSet,
      assetAlt,
      sections,
      loading,
      hasDbContent: textMap.size > 0,
      error,
    };
    // `registryTick` macht eine später eintreffende Rückfallkette renderwirksam.
  }, [pageKey, state, registryTick]);
}

/** Konvenienz: aktuelles `i18next`-Locale auf eine unterstützte Sprache reduzieren. */
export function normalizeLocale(raw: string | undefined | null): Locale {
  return normalizeAppLocale(raw);
}

export type { AppLocale };
