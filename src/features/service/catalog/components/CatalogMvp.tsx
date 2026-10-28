import { useEffect, useMemo, useState } from "react";
import { pickProductLocalized } from "../lib/productLocale";
import { useTranslation } from "react-i18next";
import { AlertCircle, Package, Search, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  getCatalogContext,
  getFacetsForSelection,
  getSharedLocalizedFilterOptions,
  getProductColorFacets,
  getProductColorsForArticles,
  getSharedProductListing,
  getSharedProductListingLocalized,
  getSerieFamilies,
  normalizeLocale,
  withLimitedRetry,
  describeDbError,
  isAbortError,
  type ListingLocaleResolution,
  type CatalogLocale,
  type CatalogNavGroup,
  type ProductColorAssignment,
  type ProductColorFacet,
  type ProductListingParams,
  type SerieFacets,
  type SerieFamily,
} from "../api/catalog";


import {
  getCatalogDiagnostics,
  type CatalogDiagnostics,
} from "../api/diagnostics";
import { groupFilterOptions } from "../lib/columnModel";
import type {
  CatalogFilterGroup,
  CatalogFilterState,
  CatalogProduct,
} from "../types";
import CatalogStatus from "./CatalogStatus";
import CatalogFilters from "./CatalogFilters";
import CatalogProductGrid from "./CatalogProductGrid";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import MerklisteIndicator from "@/features/produkte/merkliste/MerklisteIndicator";
import { useCmsPageContent } from "@/features/cms/hooks/useCmsPageContent";
import { serieSectionKey } from "../lib/seriesOverride";

/**
 * Online-Produktkatalog — Listing-Block für eine ausgewählte Nav-Gruppe.
 *
 * Quellen strikt nach Datenvertrag:
 *  1. `rpc_get_catalog_context()`     – Kontext-Initialisierung
 *  2. `rpc_get_localized_filter_options(p_locale)` – Filtergruppen + Werte
 *  3. `rpc_get_product_listing(...)`  – serverseitiges Listing
 *
 * Verhalten:
 *  - Wird nur gerendert, wenn das Parent eine Nav-Gruppe ausgewählt hat.
 *  - Filterzeile zeigt nur die in `selectedNav.applicable_filters` erlaubten
 *    Felder; leere Optionen (Treffer = 0) werden automatisch ausgeblendet.
 *  - Hard-Filter: `category_slugs` der gewählten Nav-Gruppe.
 */

/**
 * Ladezustand der Produktliste. `loading` und `error` behalten die zuletzt
 * erfolgreich geladene Liste (`products`), damit eine brauchbare Anzeige bei
 * einem vorübergehenden Nachladen nicht unnötig geleert wird.
 */
type LoadState =
  | { phase: "init"; products: CatalogProduct[]; contextKey: null }
  | { phase: "loading"; products: CatalogProduct[]; contextKey: string | null }
  | { phase: "ready"; products: CatalogProduct[]; contextKey: string }
  | { phase: "error"; message: string; products: CatalogProduct[]; contextKey: string | null };

type SortKey = "artikel_nr_asc" | "price_asc" | "price_desc";

function buildListingParams(
  locale: CatalogLocale,
  filters: CatalogFilterState,
  search: string,
  sort: SortKey,
  categorySlugs: readonly string[],
  series: readonly string[],
): ProductListingParams {
  const f = filters;

  const ipGateway =
    f["ip_gateway"] === undefined
      ? null
      : f["ip_gateway"] === "true"
        ? true
        : f["ip_gateway"] === "false"
          ? false
          : null;

  const sortCol =
    sort === "artikel_nr_asc"
      ? "artikel_nr"
      : sort === "price_asc" || sort === "price_desc"
        ? "preis"
        : null;
  const sortDir = sort === "price_desc" ? "desc" : "asc";

  const wohneinheitenNum = f["wohneinheiten"]
    ? Number(f["wohneinheiten"]) || null
    : null;

  // SmartStick: UI-Wert (Feldname `smartstick_status` aus der View, Werte
  // "ja"/"nein") wird auf den RPC-Parameter `p_smartstick_possible`
  // (boolean) gemappt. Leer/„egal" = null.
  const smartstickRaw = f["smartstick_possible"] ?? f["smartstick_status"];
  const smartstickPossible =
    smartstickRaw === undefined || smartstickRaw === ""
      ? null
      : smartstickRaw === "true" || smartstickRaw === "ja"
        ? true
        : smartstickRaw === "false" || smartstickRaw === "nein"
          ? false
          : null;

  return {
    locale,
    limit: 1000,
    search: search.trim() || null,
    system_typ: f["system_typ"] ?? null,
    paket_klasse: f["paket_klasse"] ?? null,
    montageart: f["montageart"] ?? null,
    drahtanzahl: f["drahtanzahl"] ?? null,
    ip_gateway: ipGateway,
    bauform: f["bauform"] ?? null,
    tastenanzahl: f["tastenanzahl"] ? Number(f["tastenanzahl"]) || null : null,
    wohneinheiten_min: wohneinheitenNum,
    wohneinheiten_max: wohneinheitenNum,
    category_slugs: categorySlugs.length > 0 ? categorySlugs : null,
    series: series.length > 0 ? series : null,
    smartstick_possible: smartstickPossible,
    // Farbfilter läuft serverseitig über den Kanalvertrag (`p_color`).
    color: f["color"] ?? null,
    sort_col: sortCol,
    sort_dir: sortDir,
  };

}

export interface CatalogMvpProps {
  /** Aktuelle Auswahl aus dem Hub. Wenn null, rendert die Komponente nichts. */
  selectedNav: CatalogNavGroup | null;
  /** Callback „Auswahl zurücksetzen" (z. B. um zur Kartenansicht zu wechseln). */
  onClear?: () => void;
  /**
   * Optional: CMS-Light-Seitenschlüssel der umgebenden Hub-Seite (z. B.
   * `produkte.tuerkommunikation`). Wenn gesetzt, liest die Komponente
   * Serien-Overrides (Thumbnail, Sortierung) aus den Sections
   * `series-override.<slug>` und lässt diese gegenüber der Produkt-DB
   * gewinnen. Fehlt der Prop, verhält sich der Katalog wie bisher.
   */
  cmsPageKey?: string;
}

const CatalogMvp = ({ selectedNav, onClear, cmsPageKey }: CatalogMvpProps) => {
  const { t, i18n } = useTranslation("service");
  const locale = normalizeLocale(i18n.language);
  // CMS-Light-Inhalte der umgebenden Hub-Seite (nur Lesen, kein Schreiben).
  // Wenn `cmsPageKey` nicht gesetzt ist, liefert der Hook leere Maps und
  // alle Overrides sind automatisch wirkungslos.
  const cms = useCmsPageContent(cmsPageKey ?? null);

  const [state, setState] = useState<LoadState>({
    phase: "init",
    products: [],
    contextKey: null,
  });
  const [diagnostics, setDiagnostics] = useState<CatalogDiagnostics | null>(
    null,
  );
  const [filters, setFilters] = useState<CatalogFilterState>({});
  // `searchInput` ist der lokale Draft im Eingabefeld (sofortige Anzeige).
  // `search` ist der debounced Wert, der Filter/Listing-Refetch auslöst.
  const [searchInput, setSearchInput] = useState<string>("");
  const search = useDebouncedValue(searchInput, 350);
  const [sort, setSort] = useState<SortKey>("artikel_nr_asc");
  const [filterGroups, setFilterGroups] = useState<CatalogFilterGroup[]>([]);
  const [navProducts, setNavProducts] = useState<CatalogProduct[]>([]);
  /**
   * Ladezustand der Filterbasis (Nav-Produkte + Filteroptionen). Früher wurde
   * ein Fehler still zu einer leeren Liste — die Filterzeile verschwand
   * kommentarlos. Jetzt werden „lädt", „Fehler" und „leer" unterschieden.
   */
  const [filterBaseState, setFilterBaseState] = useState<
    "init" | "loading" | "ready" | "error"
  >("init");
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(
    null,
  );
  /** Zähler für „Erneut versuchen" (löst beide Ladewege neu aus). */
  const [filterRetryToken, setFilterRetryToken] = useState(0);

  // Serienfamilien (zweite Filterstufe). Inhalte kommen aus
  // `rpc_get_channel_serie_families`, Auswahl ist Multi-Select.
  // Die Familien-Kacheln sind sichtbar; an den Produktlistenvertrag gehen
  // ausschließlich die technischen Serien (`serie_slugs`) der Auswahl.
  const [families, setFamilies] = useState<SerieFamily[]>([]);
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  // Boolesche Facetten-Counts (DB-First). Quelle:
  // `api_v1_filter_facets_by_serie.ip_gateway_counts`. Beide Werte
  // (`true`/`false`) sind in der API immer gesetzt – auch wenn 0.
  // Damit zeigt die UI z. B. bei Serie PES "Ja (0)" deaktiviert und
  // "Nein (34)" aktiv, statt "Ja" komplett auszublenden.
  const [facets, setFacets] = useState<SerieFacets | null>(null);
  // Map `serie` (Produktfeld) → erstes verfügbares Produktbild-URL aus der
  // Produktdatenbank. Quelle: `rpc_get_product_listing` (ohne Serien-Filter),
  // damit Thumbnails auch sichtbar sind, solange noch keine Serie gewählt
  // ist (Serien-Gate). Bilder bleiben Eigentum der Produkt-DB — wird die
  // View `api_v1_filter_series_by_category.thumbnail_path` redaktionell
  // gepflegt, hat sie Vorrang vor dieser Ableitung.
  const [serieThumbs, setSerieThumbs] = useState<Map<string, string>>(
    () => new Map(),
  );
  // Farbfilter (Etappe `catalog-color-filter-1`).
  // `colorAssignments`: Farbzuordnungen der aktuell geladenen Nav-Produkte
  // aus `api_v1_product_colors` (mehrere Farben pro Artikel möglich).
  // `colorFacets`: globale Farbdefinitionen (Label, hex_code, sort_order).
  const [colorAssignments, setColorAssignments] = useState<
    ProductColorAssignment[]
  >([]);
  const [colorFacets, setColorFacets] = useState<ProductColorFacet[]>([]);
  /**
   * Von der Produktbasis tatsächlich gelieferte Listing-Sprache. Der
   * Sprachvertrag (angefordert → `en` → `de`) wird feldweise serverseitig
   * aufgelöst; der Client schaltet die Sprache nicht mehr selbst um.
   */
  const [listingLocale, setListingLocale] =
    useState<ListingLocaleResolution | null>(null);

  useEffect(() => {
    setListingLocale(null);
  }, [locale]);

  /** Sprache aller Produktdaten-Abfragen (Listing, Facetten, Thumbnails). */
  const dataLocale: CatalogLocale = locale;

  /**
   * Technische Serien der ausgewählten Familien (Vereinigung, ohne
   * Dubletten). Nur diese Werte gehen als `p_series` an den bestehenden
   * Produktlistenvertrag — niemals `family_slug`. Der Schlüssel hält die
   * Array-Identität stabil, damit die Ladewege nicht unnötig neu starten.
   */
  const selectedSeriesKey = useMemo(() => {
    if (selectedFamilies.length === 0) return "";
    const picked = new Set(selectedFamilies);
    const out = new Set<string>();
    for (const fam of families) {
      if (!picked.has(fam.family_slug)) continue;
      for (const slug of fam.serie_slugs) out.add(slug);
    }
    return Array.from(out).sort().join("\u0001");
  }, [families, selectedFamilies]);
  const selectedSeries = useMemo(
    () => (selectedSeriesKey ? selectedSeriesKey.split("\u0001") : []),
    [selectedSeriesKey],
  );




  // Bei jedem Nav-Wechsel Filter/Suche/Sortierung/Serien zurücksetzen.
  useEffect(() => {
    setFilters({});
    setSearchInput("");
    setSort("artikel_nr_asc");
    setSelectedFamilies([]);
  }, [selectedNav?.nav_slug]);

  // Diagnostics + Filteroptionen einmal beim Mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const diag = await getCatalogDiagnostics();
      if (cancelled) return;
      setDiagnostics(diag);

      if (
        !diag.supabaseConfigured ||
        diag.catalogContextRpc.status === "fail"
      ) {
        setState({ phase: "ready", products: [], contextKey: "unavailable" });
        return;
      }

      try {
        await getCatalogContext();
        // Begrenztes Wiederholen: die Produktbasis bricht große Abfragen
        // gelegentlich mit `57014` ab. Ein Fehler hier darf die Produktliste
        // NICHT mehr in den Fehlerzustand versetzen — nur die Beschriftungen
        // der Filter fehlen dann.
        const filterRows = await withLimitedRetry(() =>
          getSharedLocalizedFilterOptions(locale),
        );
        if (cancelled) return;
        setFilterOptionsError(null);
        setFilterGroups(groupFilterOptions(filterRows, locale));
      } catch (err) {
        if (cancelled || isAbortError(err)) return;
        const message = describeDbError(err);
        // eslint-disable-next-line no-console
        console.error("[katalog] Filteroptionen fehlgeschlagen:", message);
        setFilterOptionsError(message);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Sprachwechsel lädt die Filteroptionen neu (Bezeichnungen/Werte).
  }, [locale, filterRetryToken]);


  const categorySlugs = useMemo(
    () => (selectedNav ? selectedNav.categories.map((c) => c.category_slug) : []),
    [selectedNav],
  );
  const requiresSeries = useMemo(
    () => Boolean(selectedNav?.primary_filters?.includes("serie")),
    [selectedNav],
  );
  const seriesGateBlocked = requiresSeries && selectedSeries.length === 0;
  const listingContextKey = useMemo(
    () => JSON.stringify([locale, filters, search, sort, categorySlugs, selectedSeries]),
    [locale, filters, search, sort, categorySlugs, selectedSeries],
  );

  // Listing nachladen, sobald sich Nav / Filter / Suche / Sortierung ändern.
  useEffect(() => {
    if (!selectedNav) return;
    // Erst laden, wenn die Diagnose vorliegt: sonst lief dieselbe Abfrage
    // zweimal (einmal vor, einmal nach der Diagnose).
    if (!diagnostics) return;
    if (seriesGateBlocked) {
      setState({ phase: "ready", products: [], contextKey: listingContextKey });
      return;
    }
    if (
      diagnostics &&
      (!diagnostics.supabaseConfigured ||
        diagnostics.catalogContextRpc.status === "fail")
    ) {
      return;
    }
    let cancelled = false;
    // Überholte Abfragen (Kategorie-/Sprachwechsel, neuer Filter) werden
    // abgebrochen, statt im Hintergrund weiterzulaufen und die Produktbasis
    // zusätzlich zu belasten.
    const controller = new AbortController();
    (async () => {
      setState((prev) => ({
        phase: "loading",
        products: prev.products,
        contextKey: prev.contextKey,
      }));
      try {
        const params = buildListingParams(
          locale,
          filters,
          search,
          sort,
          categorySlugs,
          selectedSeries,
        );
        // Begrenztes Wiederholen bei vorübergehenden Fehlern der Produktbasis
        // (z. B. `57014` statement timeout) — kein Dauer-Polling.
        const listing = await getSharedProductListingLocalized({
          ...params,
          signal: controller.signal,
        });

        if (cancelled) return;
        setListingLocale(listing.locale);
        setState({
          phase: "ready",
          products: listing.products,
          contextKey: listingContextKey,
        });
      } catch (err) {
        if (cancelled || isAbortError(err)) return;
        // Echte Fehlerangaben der Produktbasis (code/message/details/hint)
        // statt „[object Object]" — und kein pauschales „Konfiguration fehlt".
        const message = describeDbError(err);
        // eslint-disable-next-line no-console
        console.error("[katalog] Produktliste fehlgeschlagen:", message);
        setState((prev) => ({
          phase: "error",
          message,
          products: prev.products,
          contextKey: prev.contextKey,
        }));
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    locale,
    dataLocale,
    filters,
    search,
    sort,
    categorySlugs,
    selectedSeries,
    selectedNav,
    diagnostics,
    seriesGateBlocked,
    listingContextKey,
  ]);

  // Nav-Produktbasis (ungefiltert bzgl. Detail-Filtern, aber inkl. Serien-
  // Auswahl). Quelle für die Filter-Optionen + Treffer-Zahlen, damit diese
  // sich auf die aktuell sichtbare Produktmenge beziehen.
  //
  // Sortierung bewusst `artikel_nr`/`asc`: identisch zur Standard-Sortierung
  // der Produktliste. Bei identischen Parametern teilen sich Hauptliste,
  // Filterbasis und Serien-Thumbnails denselben gemeinsamen Ladeweg.
  useEffect(() => {
    if (!selectedNav || seriesGateBlocked) {
      setNavProducts([]);
      setFilterBaseState("init");
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      setFilterBaseState("loading");
      try {
        const all = await getSharedProductListing({
          locale: dataLocale,
          limit: 1000,
          category_slugs: categorySlugs.length > 0 ? categorySlugs : null,
          series: selectedSeries.length > 0 ? selectedSeries : null,
          sort_col: "artikel_nr",
          sort_dir: "asc",
          signal: controller.signal,
        });
        if (cancelled) return;
        setNavProducts(all);
        setFilterBaseState("ready");
      } catch (err) {
        if (cancelled || isAbortError(err)) return;
        // Fehler wird sichtbar gemacht (mit „Erneut versuchen"), statt die
        // Filterzeile kommentarlos zu entfernen.
        // eslint-disable-next-line no-console
        console.error("[katalog] Filterbasis fehlgeschlagen:", describeDbError(err));
        setNavProducts([]);
        setFilterBaseState("error");
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    dataLocale,
    categorySlugs,
    selectedSeries,
    selectedNav,
    seriesGateBlocked,
    filterRetryToken,
  ]);


  // Serienfamilien laden, sobald sich Kategorien oder Sprache ändern.
  // Quelle: `rpc_get_channel_serie_families` (Gruppierung, Labels,
  // Artikelzahlen und Reihenfolge kommen vollständig aus der Produkt-DB).
  useEffect(() => {
    if (!selectedNav || categorySlugs.length === 0) {
      setFamilies([]);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      try {
        const rows = await getSerieFamilies(
          dataLocale,
          categorySlugs,
          controller.signal,
        );
        if (!cancelled) setFamilies(rows);
      } catch {
        if (!cancelled) setFamilies([]);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [categorySlugs, selectedNav, dataLocale]);

  // Boolesche Facetten aus `api_v1_filter_facets_by_serie` laden. DB-First:
  // Domäne der Pills (z. B. ip_gateway = true/false) wird nicht mehr aus
  // der Trefferliste rekonstruiert, sondern aus der Facetten-View gelesen.
  // Beide Werte sind dort immer gesetzt — auch bei Count 0.
  useEffect(() => {
    if (!selectedNav || categorySlugs.length === 0) {
      setFacets(null);
      return;
    }
    if (seriesGateBlocked) {
      setFacets(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const f = await getFacetsForSelection(categorySlugs, selectedSeries);
        if (!cancelled) setFacets(f);
      } catch {
        if (!cancelled) setFacets(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categorySlugs, selectedSeries, selectedNav, seriesGateBlocked]);

  // Serien-Thumbnails ableiten: pro Serie das erste verfügbare Produktbild.
  // Bewusst unabhängig vom Serien-Gate, damit die Kacheln auch dann Bilder
  // zeigen, wenn noch keine Serie gewählt ist. Keine Schreibzugriffe,
  // keine neue RPC — nur ein Read über das bestehende `rpc_get_product_listing`.
  useEffect(() => {
    if (!selectedNav || categorySlugs.length === 0) {
      setSerieThumbs(new Map());
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      try {
        const all = await getSharedProductListing({
          locale: dataLocale,
          limit: 1000,
          category_slugs: categorySlugs,
          sort_col: "artikel_nr",
          sort_dir: "asc",
          signal: controller.signal,
        });

        if (cancelled) return;
        const map = new Map<string, string>();
        for (const p of all) {
          const rec = p as Record<string, unknown>;
          const serie =
            typeof rec.serie === "string" ? rec.serie.trim() : "";
          if (!serie || map.has(serie)) continue;
          const url =
            (typeof rec.primary_image_public_url === "string"
              ? rec.primary_image_public_url
              : null) ??
            (typeof rec.primary_image_url === "string"
              ? rec.primary_image_url
              : null);
          if (url) map.set(serie, url);
        }
        setSerieThumbs(map);
      } catch {
        if (!cancelled) setSerieThumbs(new Map());
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [dataLocale, categorySlugs, selectedNav]);





  // Nur Filtergruppen anzeigen, die für die gewählte Nav-Gruppe relevant sind.
  // Optionen + Counts werden aus den tatsächlich vorhandenen Produkten der
  // Nav-Gruppe abgeleitet — keine globalen Zahlen, keine doppelten Pills.
  // `serie` wird durch die Serien-Chips abgebildet — aus der generischen
  // Detail-Filterzeile entfernen, damit es kein doppeltes UI gibt.
  const applicableSet = useMemo(
    () =>
      new Set(
        (selectedNav?.applicable_filters ?? []).filter((f) => f !== "serie"),
      ),
    [selectedNav],
  );

  // Globale Farbdefinitionen einmal laden (Labels, hex_code, sort_order).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const facetsRows = await getProductColorFacets();
        if (!cancelled) setColorFacets(facetsRows);
      } catch {
        if (!cancelled) setColorFacets([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Kaskadierende Farbfacette: Basis ist die Trefferbasis der Produktliste
  // mit ALLEN aktiven Filtern außer dem Farbfilter selbst (Kategorie, Serien,
  // Suche, System, Montageart, IP, Wohneinheiten …). Dadurch zeigen die
  // Farbzahlen genau die Artikel, die bei der aktuellen Auswahl noch möglich
  // sind — und die eigene Farbauswahl schränkt die übrigen Farben nicht ein.
  const colorBaseFilters = useMemo(() => {
    const next: CatalogFilterState = { ...filters };
    delete next["color"];
    return next;
  }, [filters]);
  const colorBaseParams = useMemo(
    () =>
      buildListingParams(
        dataLocale,
        colorBaseFilters,
        search,
        "artikel_nr_asc",
        categorySlugs,
        selectedSeries,
      ),
    [dataLocale, colorBaseFilters, search, categorySlugs, selectedSeries],
  );
  const colorBaseKey = useMemo(
    () => JSON.stringify(colorBaseParams),
    [colorBaseParams],
  );

  useEffect(() => {
    if (!selectedNav || seriesGateBlocked || !applicableSet.has("color")) {
      setColorAssignments([]);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      try {
        const base = await getSharedProductListing({
          ...colorBaseParams,
          signal: controller.signal,
        });
        if (cancelled) return;
        const artikelNrs: string[] = [];
        for (const p of base) {
          const raw = (p as Record<string, unknown>).artikel_nr;
          const nr = typeof raw === "string" ? raw.trim() : "";
          if (nr) artikelNrs.push(nr);
        }
        if (artikelNrs.length === 0) {
          setColorAssignments([]);
          return;
        }
        const rows = await getProductColorsForArticles(artikelNrs);
        if (!cancelled) setColorAssignments(rows);
      } catch (err) {
        if (cancelled || isAbortError(err)) return;
        setColorAssignments([]);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorBaseKey, applicableSet, selectedNav, seriesGateBlocked]);


  /**
   * Anzeigefertige Familien-Kacheln. Gruppierung, Label, Artikelzahl und
   * Reihenfolge kommen aus `rpc_get_channel_serie_families`.
   *
   * Etappe `catalog-series-order-from-section-sortorder-1` bleibt erhalten:
   * existiert im CMS-Light eine Section `series-override.<slug>` zur
   * Familie, gewinnt deren `sort_order` (Drag & Drop im Admin wirkt 1:1).
   * Ohne Section gilt der Wert aus der Produkt-DB.
   */
  const familyTiles = useMemo(() => {
    if (families.length === 0) {
      return [] as Array<{
        family_slug: string;
        label: string;
        product_count: number;
        sort_order: number;
        serie_slugs: readonly string[];
        thumbnail_path: string | null;
      }>;
    }
    const sectionSortByKey = new Map<string, number>();
    for (const sec of cms.sections) {
      if (sec.section_key.startsWith("series-override.")) {
        sectionSortByKey.set(sec.section_key, sec.sort_order);
      }
    }
    const rows = families.map((fam) => {
      const sectionSort = sectionSortByKey.get(serieSectionKey(fam.family_slug));
      return {
        family_slug: fam.family_slug,
        label: (fam.label ?? "").trim() || fam.family_slug,
        product_count: fam.product_count,
        sort_order:
          typeof sectionSort === "number" ? sectionSort : fam.sort_order,
        serie_slugs: fam.serie_slugs,
        thumbnail_path: fam.thumbnail_path,
      };
    });
    return rows.sort(
      (a, b) =>
        a.sort_order - b.sort_order ||
        a.label.localeCompare(b.label, undefined, { numeric: true }),
    );
  }, [families, cms]);
  const supportedFilterGroups = useMemo<CatalogFilterGroup[]>(() => {
    if (applicableSet.size === 0 || navProducts.length === 0) return [];
    const labelByField = new Map<string, string>();
    const optionLabelByFieldValue = new Map<string, Map<string, string>>();
    const optionSortByFieldValue = new Map<string, Map<string, number>>();
    for (const g of filterGroups) {
      labelByField.set(g.field, g.label);
      const lm = new Map<string, string>();
      const sm = new Map<string, number>();
      for (const o of g.options) {
        lm.set(o.value, o.label);
        if (o.sortOrder !== null && o.sortOrder !== undefined) {
          sm.set(o.value, o.sortOrder);
        }
      }
      optionLabelByFieldValue.set(g.field, lm);
      optionSortByFieldValue.set(g.field, sm);
    }
    const out: CatalogFilterGroup[] = [];
    for (const field of applicableSet) {
      // `ip_gateway` und `smartstick_possible`/`smartstick_status` werden
      // DB-first aus `api_v1_filter_facets_by_serie` gespeist (siehe
      // `finalFilterGroups` unten), damit Pills für 0-Counts sichtbar
      // bleiben (z. B. "Ja (0)" deaktiviert bei Serie TASTA).
      if (field === "ip_gateway") continue;
      // `color` wird DB-first aus `api_v1_product_colors` /
      // `api_v1_product_color_facets` gespeist (siehe `finalFilterGroups`).
      if (field === "color") continue;

      if (field === "smartstick_possible" || field === "smartstick_status") continue;

      const isSmartstick =
        field === "smartstick_possible" || field === "smartstick_status";
      const counts = new Map<string, number>();
      for (const p of navProducts) {
        const record = p as Record<string, unknown>;
        const raw = isSmartstick
          ? (record[field] ?? record.smartstick_possible ?? record.smartstick_status)
          : record[field];
        if (raw === null || raw === undefined || raw === "") continue;
        if (field === "wohneinheiten") {
          // Wohneinheiten ist numerisch; jede vorkommende Zahl wird zur Option.
          const n = Number(raw);
          if (!Number.isFinite(n)) continue;
          const value = String(n);
          counts.set(value, (counts.get(value) ?? 0) + 1);
          continue;
        }
        const value = isSmartstick
          ? raw === true || String(raw).toLowerCase() === "true" || String(raw).toLowerCase() === "ja"
            ? "true"
            : raw === false || String(raw).toLowerCase() === "false" || String(raw).toLowerCase() === "nein"
              ? "false"
              : String(raw)
          : typeof raw === "boolean"
            ? String(raw)
            : String(raw);
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      if (counts.size === 0) continue;
      const labelMap = optionLabelByFieldValue.get(field) ?? new Map<string, string>();
      const sortMap = optionSortByFieldValue.get(field) ?? new Map<string, number>();
      const options = Array.from(counts.entries())
        .map(([value, count]) => {
          let label = labelMap.get(value) ?? value;
          // Ja/Nein sind Bedienungstexte und kommen aus den
          // Oberflächen-Sprachdateien — unabhängig davon, ob die Produkt-DB
          // für diesen Filter nur deutsche Werte kennt.
          const boolish = `${value} ${label}`.trim().toLowerCase();
          if (isSmartstick || /^(true|ja|yes)\b/.test(boolish)) {
            if (/^(true|ja|yes)/.test(value.toLowerCase()) || /^(ja|yes)$/.test(label.trim().toLowerCase())) {
              label = t("katalog.filters.bool.yes");
            }
          }
          if (isSmartstick || /^(false|nein|no)\b/.test(boolish)) {
            if (/^(false|nein|no)/.test(value.toLowerCase()) || /^(nein|no)$/.test(label.trim().toLowerCase())) {
              label = t("katalog.filters.bool.no");
            }
          }
          const sortOrder = sortMap.has(value) ? sortMap.get(value)! : null;
          return { value, label, count, sortOrder };
        })
        .sort((a, b) => {
          // 1) DB-Reihenfolge aus product_filter_options_view (sort_order).
          const sa = a.sortOrder ?? Number.POSITIVE_INFINITY;
          const sb = b.sortOrder ?? Number.POSITIVE_INFINITY;
          if (sa !== sb) return sa - sb;
          // 2) Tie-Break: Label (DE), numerisch-fähig.
          return a.label.localeCompare(b.label, undefined, { numeric: true });
        });
      out.push({
        field,
        label:
          labelByField.get(field) ??
          (isSmartstick ? "SmartStick-fähig" : field),
        options,
      });
    }
    return out;
  }, [filterGroups, applicableSet, navProducts]);

  /**
   * Endgültige Filtergruppen für die UI: kombiniert die produktbasierten
   * Gruppen (`supportedFilterGroups`) mit DB-first-Facetten aus
   * `api_v1_filter_facets_by_serie`. Aktuell: `ip_gateway_counts` und
   * `smart_stick_counts`. Pills mit Count 0 bleiben sichtbar, sind aber
   * deaktiviert (`disabled: true`).
   */
  const finalFilterGroups = useMemo<CatalogFilterGroup[]>(() => {
    const groups = supportedFilterGroups.filter(
      (g) =>
        g.field !== "ip_gateway" &&
        g.field !== "smartstick_possible" &&
        g.field !== "smartstick_status",
    );
    const labelByField = new Map(filterGroups.map((g) => [g.field, g.label]));

    if (applicableSet.has("ip_gateway") && facets) {
      const { true: tCount, false: fCount } = facets.ip_gateway;
      if (tCount > 0 || fCount > 0) {
        groups.push({
          field: "ip_gateway",
          label: labelByField.get("ip_gateway") ?? "IP-Gateway",
          options: [
            { value: "true", label: t("katalog.filters.bool.yes"), count: tCount, sortOrder: 0, disabled: tCount === 0 },
            { value: "false", label: t("katalog.filters.bool.no"), count: fCount, sortOrder: 1, disabled: fCount === 0 },
          ],
        });
      }
    }

    const smartstickField = applicableSet.has("smartstick_possible")
      ? "smartstick_possible"
      : applicableSet.has("smartstick_status")
        ? "smartstick_status"
        : null;
    if (smartstickField && facets) {
      const { true: tCount, false: fCount } = facets.smart_stick;
      if (tCount > 0 || fCount > 0) {
        groups.push({
          field: smartstickField,
          label: labelByField.get(smartstickField) ?? "SmartStick-fähig",
          options: [
            { value: "true", label: t("katalog.filters.bool.yes"), count: tCount, sortOrder: 0, disabled: tCount === 0 },
            { value: "false", label: t("katalog.filters.bool.no"), count: fCount, sortOrder: 1, disabled: fCount === 0 },
          ],
        });
      }
    }

    // Farbfilter (DB-first). Auswahl-Counts entstehen aus den
    // Farbzuordnungen der bereits geladenen Nav-Produkte; ein Produkt wird
    // pro Farbe nur einmal gezählt (Mehrfachfarben möglich).
    if (applicableSet.has("color")) {
      const facetByKey = new Map(colorFacets.map((c) => [c.color_key, c]));
      const optionLabelFromView =
        filterGroups.find((g) => g.field === "color")?.options ?? [];
      const viewLabelByValue = new Map(
        optionLabelFromView.map((o) => [o.value, o.label]),
      );
      const viewSortByValue = new Map(
        optionLabelFromView
          .filter((o) => o.sortOrder !== null && o.sortOrder !== undefined)
          .map((o) => [o.value, o.sortOrder as number]),
      );

      const articlesByColor = new Map<string, Set<string>>();
      const localByKey = new Map<string, ProductColorAssignment>();
      for (const row of colorAssignments) {
        if (!row.color_key || !row.artikel_nr) continue;
        if (!localByKey.has(row.color_key)) localByKey.set(row.color_key, row);
        let set = articlesByColor.get(row.color_key);
        if (!set) {
          set = new Set<string>();
          articlesByColor.set(row.color_key, set);
        }
        set.add(row.artikel_nr);
      }

      // Nur Farben mit Treffern in der Basis (ohne Farbfilter) anzeigen.
      // Die ausgewählte Farbe ist darin automatisch enthalten, solange sie
      // zur restlichen Auswahl passt — sie wird nicht künstlich ergänzt.
      const keys = new Set(articlesByColor.keys());


      const options = Array.from(keys).map((key) => {
        const facet = facetByKey.get(key) ?? null;
        const local = localByKey.get(key) ?? null;
        const dbLabel =
          pickProductLocalized(
            (facet as unknown) as Record<string, unknown> | null,
            "label",
            locale,
          ) ??
          pickProductLocalized(
            (local as unknown) as Record<string, unknown> | null,
            "label",
            locale,
          );
        const label = viewLabelByValue.get(key) ?? dbLabel ?? key;
        const count = articlesByColor.get(key)?.size ?? 0;
        const sortOrder =
          viewSortByValue.get(key) ??
          facet?.sort_order ??
          local?.sort_order ??
          null;
        return {
          value: key,
          label,
          count,
          sortOrder,
          disabled: count === 0,
          swatchHex: facet?.hex_code ?? local?.hex_code ?? null,
        };
      });

      if (options.length > 0) {
        options.sort((a, b) => {
          const sa = a.sortOrder ?? Number.POSITIVE_INFINITY;
          const sb = b.sortOrder ?? Number.POSITIVE_INFINITY;
          if (sa !== sb) return sa - sb;
          return a.label.localeCompare(b.label, undefined, { numeric: true });
        });
        groups.push({
          field: "color",
          label:
            labelByField.get("color") ?? t("katalog.filters.color"),
          options,
        });
      }
    }

    return groups;
  }, [
    supportedFilterGroups,
    facets,
    applicableSet,
    filterGroups,
    colorAssignments,
    colorFacets,
    filters,
    locale,
  ]);


  if (!selectedNav) return null;


  // Bei „lädt" und „Fehler" bleibt die zuletzt geladene Liste sichtbar.
  const products = !seriesGateBlocked
    ? state.products
    : ([] as CatalogProduct[]);
  const totalProducts = products.length;
  const loading =
    !seriesGateBlocked &&
    (state.phase === "loading" || state.phase === "init");
  const error =
    !seriesGateBlocked && state.phase === "error" ? state.message : null;

  /** Es gibt noch eine brauchbare Liste aus dem letzten erfolgreichen Laden. */
  const hasUsableList = totalProducts > 0;
  const showsPreviousSelection =
    hasUsableList && state.contextKey !== listingContextKey;
  const showGrid = !seriesGateBlocked && (state.phase === "ready" || hasUsableList);
  const showEmpty =
    !seriesGateBlocked && !loading && !error && totalProducts === 0;
  const counterText = seriesGateBlocked
    ? t("katalog.target.seriesGate.counter")
    : loading
      ? t("katalog.target.subline.loading")
      : t("katalog.target.subline.count", { count: totalProducts });

  return (
    <section className="pt-2 pb-8">

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{counterText}</p>
        <div className="flex items-center gap-3">
          <MerklisteIndicator />
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <X className="w-3 h-3" />
              {t("katalog.target.selection.reset")}
            </button>
          ) : null}
        </div>
      </div>

      {!seriesGateBlocked ? (
        <div className="mb-4 relative max-w-xl">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter wendet sofort an, indem wir den Draft-Wert nochmal
              // setzen (Debounce löst dadurch unmittelbar aus). Verhindert
              // das Form-Submit-Default.
              if (e.key === "Enter") {
                e.preventDefault();
                setSearchInput((v) => v);
              }
            }}
            placeholder={t("katalog.target.search.placeholder")}
            aria-label={t("katalog.target.search.aria")}
            className="pl-9 pr-9 rounded-sm"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label={t("katalog.target.search.clear")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      {(loading || !!error) ? (
        <CatalogStatus
          loading={loading}
          error={error}
          count={totalProducts}
          diagnostics={diagnostics}
          showDiagnosticsTable={false}
          showCount={false}
        />
      ) : null}

      {!loading && !error && familyTiles.length > 0 ? (
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-muted-foreground">
              {t("katalog.filters.series")}
              {requiresSeries ? " *" : ""}
            </div>
            {selectedFamilies.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedFamilies([])}
                className="text-xs text-accent hover:underline"
              >
                {t("katalog.filters.reset")}
              </button>
            ) : null}
          </div>
          <div
            className="grid gap-2 grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12"
            role="group"
            aria-label={t("katalog.target.seriesGate.filterAria")}
          >
            {familyTiles.map((s) => {
              const active = selectedFamilies.includes(s.family_slug);
              // Label kommt bereits in der angefragten Sprache aus der
              // Familien-RPC (`p_locale`).
              const label = s.label;
              // Thumbnail-Fallback-Kette:
              //   1) CMS-Override (`series-override.<slug>` Slot `thumbnail`)
              //   2) `thumbnail_path` der Familie (nur vollständige URL —
              //      es werden im Frontend keine Speicherpfade gebaut)
              //   3) erstes Produktbild einer technischen Serie der Familie
              //   4) Platzhalter-Icon (siehe Package-Komponente unten)
              const cmsThumb = cms.asset(
                serieSectionKey(s.family_slug),
                "thumbnail",
                "",
              );
              const dbThumb =
                s.thumbnail_path && /^https?:\/\//i.test(s.thumbnail_path)
                  ? s.thumbnail_path
                  : null;
              const serieThumb =
                s.serie_slugs
                  .map((slug) => serieThumbs.get(slug))
                  .find((url) => !!url) ?? null;
              const thumb = cmsThumb || dbThumb || serieThumb || null;
              return (
                <button
                  key={s.family_slug}
                  type="button"
                  onClick={() =>
                    setSelectedFamilies((prev) =>
                      prev.includes(s.family_slug)
                        ? prev.filter((x) => x !== s.family_slug)
                        : [...prev, s.family_slug],
                    )
                  }
                  aria-pressed={active}
                  className={
                    "group relative flex flex-col overflow-hidden rounded-md border text-left transition-colors " +
                    (active
                      ? "border-foreground ring-2 ring-foreground bg-card"
                      : "border-border bg-card hover:border-accent/60")
                  }
                >
                  <div className="relative aspect-square w-full bg-muted flex items-center justify-center overflow-hidden">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-contain p-1 transition-transform group-hover:scale-[1.03]"
                        onError={(e) => {
                          // Bei kaputtem Bild auf Fallback-Icon zurückfallen,
                          // damit kein zerbrochenes Bild stehen bleibt.
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    ) : (
                      <Package
                        className="w-5 h-5 text-muted-foreground/60"
                        aria-hidden="true"
                      />
                    )}
                    {active ? (
                      <span
                        className="absolute top-0.5 right-0.5 rounded-sm bg-foreground text-background text-[9px] leading-none px-1 py-0.5"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                    ) : null}
                  </div>
                  <div className="px-1.5 py-1 border-t border-border">
                    <div
                      className="text-[11px] font-semibold text-foreground truncate leading-tight"
                      title={label}
                    >
                      {label}
                    </div>
                    <div className="text-[10px] text-muted-foreground leading-tight">
                      {s.product_count}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}


      {seriesGateBlocked ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t("katalog.target.seriesGate.hint")}
          </CardContent>
        </Card>
      ) : null}

      {!seriesGateBlocked && finalFilterGroups.length > 0 ? (
        <CatalogFilters
          groups={finalFilterGroups}
          value={filters}
          onChange={setFilters}
        />
      ) : null}

      {/*
        Filterzeile fehlt: „lädt", „Fehler" und „keine Filter vorgesehen"
        werden unterschieden. Vorher verschwand die Zeile kommentarlos, wenn
        die Filterbasis mit einem Fehler abbrach.
      */}
      {!loading &&
      !error &&
      !seriesGateBlocked &&
      finalFilterGroups.length === 0 &&
      applicableSet.size > 0 ? (
        <div className="mb-6 rounded-lg border border-border bg-card p-4 text-sm">
          {filterBaseState === "error" || filterOptionsError ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 text-foreground">
                <AlertCircle
                  className="w-4 h-4 text-destructive"
                  aria-hidden="true"
                />
                {t("katalog.filters.status.error")}
              </span>
              <button
                type="button"
                onClick={() => setFilterRetryToken((n) => n + 1)}
                className="text-xs text-accent hover:underline"
              >
                {t("katalog.filters.status.retry")}
              </button>
            </div>
          ) : (
            <span className="text-muted-foreground">
              {t("katalog.filters.status.loading")}
            </span>
          )}
        </div>
      ) : null}


      {!loading && !error && totalProducts > 0 ? (
        <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            {t("katalog.target.sort.label")}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
            >
              <option value="artikel_nr_asc">
                {t("katalog.target.sort.options.artikel_nr_asc")}
              </option>
              <option value="price_asc">
                {t("katalog.target.sort.options.price_asc")}
              </option>
              <option value="price_desc">
                {t("katalog.target.sort.options.price_desc")}
              </option>
            </select>
          </label>
        </div>
      ) : null}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-40 w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {error && hasUsableList ? (
        <div
          className="mb-4 flex flex-wrap items-start gap-2 rounded-md border border-destructive/30 bg-card p-3 text-xs"
          role="alert"
        >
          <AlertCircle
            className="w-4 h-4 text-destructive shrink-0"
            aria-hidden="true"
          />
          <span className="text-foreground">
            {t("katalog.mvp.errorBox.stale")}
          </span>
          <code className="text-muted-foreground break-all">{error}</code>
        </div>
      ) : null}

      {loading && showsPreviousSelection ? (
        <div
          className="mb-4 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground"
          role="status"
        >
          {t("katalog.mvp.errorBox.previous")}
        </div>
      ) : null}

      {!loading && error && !hasUsableList ? (
        <Card className="border-destructive/30">
          <CardContent className="p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-foreground font-medium mb-1">
                {t("katalog.mvp.errorBox.headline")}
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                {t("katalog.mvp.errorBox.text")}
              </p>
              <pre className="text-xs text-muted-foreground bg-muted/40 rounded p-2 overflow-x-auto">
                {error}
              </pre>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showEmpty ? (
        <Card>
          <CardContent className="p-6 flex items-start gap-3">
            <Package className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-foreground font-medium mb-1">
                {t("katalog.mvp.empty.headline")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("katalog.mvp.empty.text")}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showGrid ? <CatalogProductGrid products={products} /> : null}
    </section>
  );
};

export default CatalogMvp;
