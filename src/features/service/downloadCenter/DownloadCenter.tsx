/**
 * Öffentliches Download-Center (datenbank-first, Struktur zuerst).
 *
 * Fachliche Wahrheit ausschließlich aus der Download-Contract-Datenbank:
 * - Struktur (Zielgruppen → Bereiche): `api_v1_download_center_structure_contract`
 * - Ergebnisliste: `api_v1_download_center_public_contract` (serverseitig gefiltert)
 * - Filteroptionen + Zähler: `api_v1_download_center_facets_v2(...)`
 *
 * Es gibt im Frontend keine fachlichen Listen (Zielgruppen, Bereiche,
 * Kategorien, Serien, Systeme, Typen, Dateien) und keine Heuristik über
 * Dateinamen. Die Untergliederung innerhalb eines Bereichs (z. B. Archiv)
 * kommt aus `display_group_slug` / `display_group_label` des Contracts.
 * CMS-Light liefert nur Bedienbeschriftungen.
 *
 * Bedienfluss: Suche (breit, ganz oben) → Einstieg nach Zielgruppe bzw.
 * Unterlagentyp → Bereich → Ergebnisliste mit kompakter Navigation links.
 */

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  Download,
  Eye,
  ExternalLink,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchDownloadCenterFacets,
  fetchDownloadCenterRows,
  fetchDownloadCenterStructure,
  type DownloadCenterFacet,
  type DownloadCenterRow,
  type DownloadCenterSelection,
  type DownloadCenterStructureRow,
} from "./api";

const ALL = "__all__";

/**
 * Redaktionell pflegbare Bedienbeschriftungen (CMS-Light, Section
 * `dokumente`). Die Werte hier sind nur der Notfall-Fallback. Es sind
 * ausschließlich UI-Texte — keine fachlichen Download-Werte.
 */
export interface DownloadCenterLabels {
  label_bereich: string;
  label_produktkategorie: string;
  label_familie_serie: string;
  label_system: string;
  label_asset_typ: string;
  label_dokument_quellentyp: string;
  label_sprache: string;
  label_verfuegbarkeit: string;
  label_alle: string;
  label_suche: string;
  label_filter: string;
  label_filter_zuruecksetzen: string;
  label_weitere_filter: string;
  label_zugeordnete_artikel: string;
  label_zielgruppen: string;
  label_unterlagentypen: string;
  label_uebersicht: string;
  label_kapitel: string;
  label_eintrag: string;
  label_eintraege: string;
  btn_download: string;
  btn_open: string;
  btn_view: string;
  btn_new_tab: string;
  btn_close_preview: string;
  preview_unavailable_hint: string;
  badge_external_link: string;
  empty_hint: string;
  choose_audience_hint: string;
  error_hint: string;
  limit_hint: string;
}

const DEFAULT_LABELS: DownloadCenterLabels = {
  label_bereich: "Bereich / Unterlagentyp",
  label_produktkategorie: "Produktkategorie",
  label_familie_serie: "Familie / Serie",
  label_system: "System",
  label_asset_typ: "Asset-Typ (Art der Datei)",
  label_dokument_quellentyp: "Dokument-/Quellentyp",
  label_sprache: "Sprache",
  label_verfuegbarkeit: "Verfügbarkeit",
  label_alle: "Alle",
  label_suche: "Suchen: Produkt, Serie, Artikelnummer, Titel oder Dateiname …",
  label_filter: "Filter",
  label_filter_zuruecksetzen: "Filter zurücksetzen",
  label_weitere_filter: "Weitere Filter",
  label_zugeordnete_artikel: "Zugeordnete Artikel",
  label_zielgruppen: "Einstieg nach Zielgruppe",
  label_unterlagentypen: "Einstieg nach Unterlagentyp",
  label_uebersicht: "Übersicht",
  label_kapitel: "Kapitel",
  label_eintrag: "Eintrag",
  label_eintraege: "Einträge",
  btn_download: "Download",
  btn_open: "Öffnen",
  btn_view: "Ansicht",
  btn_new_tab: "Neuer Tab",
  btn_close_preview: "Vorschau schließen",
  preview_unavailable_hint:
    "Für dieses Dokument ist hier keine Vorschau möglich. Bitte in einem neuen Tab öffnen.",
  badge_external_link: "Externer Link",
  empty_hint: "Keine Treffer für die aktuelle Auswahl.",
  choose_audience_hint:
    "Suchen Sie direkt — oder wählen Sie einen Einstieg nach Zielgruppe oder Unterlagentyp.",
  error_hint:
    "Die Downloads können derzeit nicht geladen werden. Bitte versuchen Sie es später erneut.",
  limit_hint:
    "Es werden nur die ersten Treffer angezeigt. Bitte Suchbegriff ergänzen oder Filter setzen.",
};

/**
 * Filter-Slots entsprechen 1:1 den `facet_key`-Werten der Facetten-RPC.
 * `primary: true` = prominent sichtbar, sonst nur unter „Weitere Filter“.
 */
/** Obergrenze der gleichzeitig geladenen und gerenderten Treffer. */
const MAX_RESULT_ROWS = 400;

const FACET_FILTERS = [
  { facetKey: "product_category", labelKey: "label_produktkategorie", primary: true },
  { facetKey: "family_or_series", labelKey: "label_familie_serie", primary: true },
  {
    facetKey: "document_or_source_type",
    labelKey: "label_dokument_quellentyp",
    primary: false,
  },
  { facetKey: "system", labelKey: "label_system", primary: false },
  { facetKey: "language", labelKey: "label_sprache", primary: false },
] as const;

type FacetFilterKey = (typeof FACET_FILTERS)[number]["facetKey"];

const EMPTY_FILTERS: Record<FacetFilterKey, string> = {
  product_category: ALL,
  family_or_series: ALL,
  document_or_source_type: ALL,
  system: ALL,
  language: ALL,
};

/** Externe Ziele werden geöffnet, Dateien heruntergeladen. */
const OPEN_KINDS = new Set(["external_link", "html_source"]);

/**
 * Interne Import-/Qualitätshinweise aus der Quelle werden in der öffentlichen
 * Liste nicht angezeigt. Kein fachliches Mapping — nur Textfilter für Meta-Zeilen.
 */
const SUPPRESSED_META = [
  "ohne produktbezug",
  "ohne familie/serie",
  "ohne serie",
  "ohne konkrete artikelzuordnung",
  "automatisch ergänzt",
  "automatisch ergaenzt",
  "datenbankeintrag vorhanden",
  "datei fehlt",
];

const isSuppressed = (value: string) => {
  const v = value.toLowerCase();
  return SUPPRESSED_META.some((needle) => v.includes(needle));
};

/**
 * Kapitel eines Treffers — ausschließlich Contract-Werte, in dieser Reihenfolge:
 * `display_group_*` → `document_type*` → `section_*`. Keine Heuristik über
 * Dateinamen, keine im Code gepflegte Typliste.
 */
function chapterOf(row: DownloadCenterRow): { key: string; label: string } | null {
  const candidates: Array<[string | null, string | null]> = [
    [row.display_group_slug, row.display_group_label],
    [row.document_type, row.document_type_label],
    [row.section_slug, row.section_label],
  ];
  for (const [slug, label] of candidates) {
    const text = (label || "").trim();
    const key = (slug || label || "").trim();
    if (key && text && !isSuppressed(text)) return { key, label: text };
  }
  return null;
}

/** Vorschau-Typ eines Treffers (nur Dateiendung/Asset-Art aus dem Contract). */
type PreviewMode = "pdf" | "image" | "iframe" | "none";

function previewMode(row: DownloadCenterRow): PreviewMode {
  const ext = (row.file_ext || "").toLowerCase().replace(".", "");
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
  if (!ext && (row.asset_kind === "html_source" || row.asset_kind === "external_link")) {
    return "iframe";
  }
  if (ext === "html" || ext === "htm") return "iframe";
  return "none";
}


const num = (value: number) => value.toLocaleString("de-DE");


function formatSize(bytes: number | null): string | null {
  if (!bytes || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/**
 * Zählt die zugeordneten Artikel aus dem Contract-Text. Der Text selbst wird
 * nicht angezeigt (er kann sehr lang sein und enthält Importhinweise); er darf
 * aber weiterhin serverseitig für die Suche genutzt werden.
 */
function countAssignedArticles(text: string | null): number {
  if (!text || isSuppressed(text)) return 0;
  const tokens = text
    .split(/[,;\n/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && /\d/.test(t));
  return new Set(tokens).size;
}

const orNull = (v: string) => (v === ALL ? null : v);

const sortFacets = (a: DownloadCenterFacet, b: DownloadCenterFacet) => {
  const sa = a.sort_order ?? Number.MAX_SAFE_INTEGER;
  const sb = b.sort_order ?? Number.MAX_SAFE_INTEGER;
  if (sa !== sb) return sa - sb;
  return (a.option_label || a.option_key).localeCompare(
    b.option_label || b.option_key,
    "de",
  );
};

interface DownloadCenterProps {
  /**
   * Optionale Vorauswahl der Zielgruppe aus CMS-Light
   * (`default_audience_slug`). Ohne Wert startet die Seite ohne fachliche
   * Auswahl.
   */
  defaultAudienceSlug?: string | null;
  /** Redaktionelle Bedienbeschriftungen aus CMS-Light (mit i18n-Fallback). */
  labels?: Partial<DownloadCenterLabels>;
}

const DownloadCenter = ({
  defaultAudienceSlug = null,
  labels: labelOverrides,
}: DownloadCenterProps) => {
  const L = useMemo<DownloadCenterLabels>(() => {
    const merged = { ...DEFAULT_LABELS };
    Object.entries(labelOverrides ?? {}).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim().length > 0) {
        (merged as Record<string, string>)[key] = value;
      }
    });
    return merged;
  }, [labelOverrides]);

  const [structure, setStructure] = useState<DownloadCenterStructureRow[]>([]);
  const [rows, setRows] = useState<DownloadCenterRow[]>([]);
  const [facets, setFacets] = useState<DownloadCenterFacet[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audience, setAudience] = useState<string | null>(null);
  const [sectionSlug, setSectionSlug] = useState<string | null>(null);
  const [displayGroup, setDisplayGroup] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [preview, setPreview] = useState<DownloadCenterRow | null>(null);

  /**
   * Vorschau-Quelle: bevorzugt die Ansicht-URL (`url`). `download_url` liefert oft
   * einen Anhang-Header (`?download=`), der im Browser keine Vorschau zeigt —
   * dieser Parameter wird für die Einbettung entfernt.
   */
  const previewUrl = useMemo(() => {
    if (!preview) return null;
    const raw = (preview.url || preview.download_url || "").trim();
    if (raw.length === 0) return null;
    try {
      const parsed = new URL(raw, window.location.origin);
      parsed.searchParams.delete("download");
      return parsed.toString();
    } catch {
      return raw;
    }
  }, [preview]);


  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Struktur einmalig laden — sie ist die Navigationsbasis des Download-Centers.
  useEffect(() => {
    let active = true;
    fetchDownloadCenterStructure()
      .then((data) => {
        if (!active) return;
        setStructure(data);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "unknown_error");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  /** Zielgruppen aus dem Struktur-Contract (Reihenfolge aus der Datenbank). */
  const audiences = useMemo(() => {
    const map = new Map<
      string,
      { slug: string; label: string; sort: number; files: number }
    >();
    structure.forEach((row) => {
      const entry = map.get(row.audience_slug) ?? {
        slug: row.audience_slug,
        label: row.audience_label || row.audience_slug,
        sort: row.audience_sort_order ?? Number.MAX_SAFE_INTEGER,
        files: 0,
      };
      entry.files += row.current_file_count ?? 0;
      map.set(row.audience_slug, entry);
    });
    return Array.from(map.values()).sort(
      (a, b) => a.sort - b.sort || a.label.localeCompare(b.label, "de"),
    );
  }, [structure]);

  /** CMS-Light-Vorgabe gilt nur, wenn sie im Contract existiert. */
  const cmsDefaultAudience = useMemo(() => {
    const slug = (defaultAudienceSlug ?? "").trim();
    if (!slug) return null;
    return audiences.some((a) => a.slug === slug) ? slug : null;
  }, [defaultAudienceSlug, audiences]);

  const activeAudience = audience ?? cmsDefaultAudience;
  const searching = debouncedQuery.length > 1;

  /**
   * Bereiche der aktiven Zielgruppe aus dem Struktur-Contract. Leere Bereiche
   * (`current_file_count = 0`) werden nicht angeboten.
   */
  const audienceSections = useMemo(() => {
    if (!activeAudience) return [];
    return structure
      .filter(
        (row) =>
          row.audience_slug === activeAudience &&
          (row.current_file_count ?? 0) > 0,
      )
      .sort(
        (a, b) =>
          (a.section_sort_order ?? Number.MAX_SAFE_INTEGER) -
            (b.section_sort_order ?? Number.MAX_SAFE_INTEGER) ||
          (a.section_label || a.section_slug).localeCompare(
            b.section_label || b.section_slug,
            "de",
          ),
      );
  }, [structure, activeAudience]);

  /**
   * Zweiter, gleichwertiger Einstieg: Unterlagentypen (Bereiche) über alle
   * Zielgruppen hinweg. Kommt derselbe Bereich in mehreren Zielgruppen vor,
   * wird er zu einem Einstieg zusammengefasst. Auch hier gilt: alle Werte und
   * Zähler kommen aus dem Struktur-Contract, es gibt keine Liste im Code.
   */
  const documentTypes = useMemo(() => {
    const map = new Map<
      string,
      {
        slug: string;
        label: string;
        sort: number;
        files: number;
        audienceLabels: string[];
      }
    >();
    structure.forEach((row) => {
      const files = row.current_file_count ?? 0;
      if (files <= 0) return;
      const entry = map.get(row.section_slug) ?? {
        slug: row.section_slug,
        label: row.section_label || row.section_slug,
        sort: row.section_sort_order ?? Number.MAX_SAFE_INTEGER,
        files: 0,
        audienceLabels: [] as string[],
      };
      entry.files += files;
      entry.sort = Math.min(
        entry.sort,
        row.section_sort_order ?? Number.MAX_SAFE_INTEGER,
      );
      const audienceLabel = row.audience_label || row.audience_slug;
      if (!entry.audienceLabels.includes(audienceLabel)) {
        entry.audienceLabels.push(audienceLabel);
      }
      map.set(row.section_slug, entry);
    });
    return Array.from(map.values()).sort(
      (a, b) => a.label.localeCompare(b.label, "de"),
    );
  }, [structure]);

  const activeSection = useMemo(
    () =>
      structure.find(
        (s) =>
          s.section_slug === sectionSlug &&
          (!activeAudience || s.audience_slug === activeAudience),
      ) ?? null,
    [structure, sectionSlug, activeAudience],
  );

  const activeAudienceLabel =
    audiences.find((a) => a.slug === activeAudience)?.label ?? null;
  const activeSectionLabel =
    activeSection?.section_label ??
    documentTypes.find((d) => d.slug === sectionSlug)?.label ??
    sectionSlug;

  /** Trefferliste erst bei Suche oder gewähltem Bereich. */
  const showResults = searching || Boolean(sectionSlug);

  const selection: DownloadCenterSelection = useMemo(
    () => ({
      audienceSlug: searching && !activeAudience ? null : activeAudience,
      sectionSlug,
      productCategorySlug: orNull(filters.product_category),
      familyOrSeriesKey: orNull(filters.family_or_series),
      systemKey: orNull(filters.system),
      documentType: orNull(filters.document_or_source_type),
      language: orNull(filters.language),
      search: searching ? debouncedQuery : null,
    }),
    [activeAudience, sectionSlug, filters, debouncedQuery, searching],
  );

  // Ergebnisliste + Facetten gemeinsam laden. Ohne Suche und ohne Bereich wird
  // nichts geladen (keine erzwungene fachliche Vorauswahl).
  useEffect(() => {
    if (!showResults) {
      setRows([]);
      setFacets([]);
      setBusy(false);
      return;
    }
    let active = true;
    setBusy(true);
    setRows([]);
    setFacets([]);
    Promise.all([
      // Obergrenze: eine sehr allgemeine Suche darf nicht mehrere Tausend
      // Einträge auf einmal laden und die Seite blockieren.
      fetchDownloadCenterRows(selection, MAX_RESULT_ROWS),
      fetchDownloadCenterFacets(selection).catch(() => [] as DownloadCenterFacet[]),
    ])
      .then(([nextRows, nextFacets]) => {
        if (!active) return;
        setRows(nextRows);
        setFacets(nextFacets);
        setError(null);
        setBusy(false);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "unknown_error");
        setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [selection, showResults]);

  const optionsByFacet = useMemo(() => {
    const map = new Map<string, DownloadCenterFacet[]>();
    facets.forEach((f) => {
      if ((f.item_count ?? 0) <= 0) return;
      const list = map.get(f.facet_key) ?? [];
      if (!list.some((existing) => existing.option_key === f.option_key)) {
        list.push(f);
      }
      map.set(f.facet_key, list);
    });
    map.forEach((list) => list.sort(sortFacets));
    return map;
  }, [facets]);

  /**
   * Kapitel der aktuellen Treffermenge — gilt in allen Ansichten (Zielgruppe,
   * Unterlagentyp, Suche, kombinierte Filter). Werte kommen aus dem Contract
   * (`display_group_*` → `document_type*` → `section_*`).
   */
  const chapters = useMemo(() => {
    const map = new Map<string, { key: string; label: string; ids: Set<string> }>();
    rows.forEach((r) => {
      const chapter = chapterOf(r);
      if (!chapter) return;
      const entry =
        map.get(chapter.key) ?? { ...chapter, ids: new Set<string>() };
      entry.ids.add(r.asset_id);
      map.set(chapter.key, entry);
    });
    const list = Array.from(map.values()).map((e) => ({
      key: e.key,
      label: e.label,
      count: e.ids.size,
    }));
    return list.length > 1
      ? list.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "de"))
      : [];
  }, [rows]);

  useEffect(() => {
    setDisplayGroup(null);
  }, [sectionSlug, activeAudience, debouncedQuery]);

  const visibleRows = useMemo(() => {
    if (!displayGroup) return rows;
    return rows.filter((r) => chapterOf(r)?.key === displayGroup);
  }, [rows, displayGroup]);

  const resultCount = useMemo(
    () => new Set(visibleRows.map((r) => r.asset_id)).size,
    [visibleRows],
  );

  /** Treffer nach Zielgruppe → Bereich → Kapitel ordnen. */
  const groupedSections = useMemo(() => {
    const bySection = new Map<
      string,
      {
        label: string;
        audienceLabel: string | null;
        introTitle: string | null;
        introBody: string | null;
        groups: Map<string, { label: string | null; items: DownloadCenterRow[] }>;
      }
    >();
    visibleRows.forEach((r) => {
      const sKey = `${r.audience_slug ?? ""}::${r.section_slug || r.section_label || "__none__"}`;
      if (!bySection.has(sKey)) {
        bySection.set(sKey, {
          label: r.section_label || "",
          audienceLabel: r.audience_label,
          introTitle: r.section_intro_title,
          introBody: r.section_intro_body,
          groups: new Map(),
        });
      }
      const section = bySection.get(sKey)!;
      // Kapitel aus dem Contract (display_group → document_type → section).
      const chapter = chapterOf(r);
      const groupLabel =
        chapter && chapter.label !== (r.section_label || "") ? chapter.label : null;

      const gKey = chapter?.key ?? "__none__";
      if (!section.groups.has(gKey)) {
        section.groups.set(gKey, { label: groupLabel, items: [] });
      }
      section.groups.get(gKey)!.items.push(r);
    });
    return Array.from(bySection, ([key, value]) => ({
      key,
      ...value,
      groups: Array.from(value.groups, ([gKey, g]) => ({ key: gKey, ...g })),
    }));
  }, [visibleRows]);

  const setFilter = (key: FacetFilterKey, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const resetFilters = () => setFilters(EMPTY_FILTERS);

  const activeFilterCount = Object.values(filters).filter((v) => v !== ALL).length;

  const chooseAudience = (slug: string | null) => {
    setAudience(slug);
    setSectionSlug(null);
    resetFilters();
  };

  const chooseSection = (slug: string | null) => {
    setSectionSlug(slug);
    resetFilters();
  };

  const renderSelect = (key: FacetFilterKey, label: string) => {
    let options = optionsByFacet.get(key) ?? [];
    // Wenn der Bereich schon die Auswahl darstellt, den identischen Wert nicht
    // zusätzlich als Filter anbieten.
    if (key === "document_or_source_type" && activeSection?.section_label) {
      const sectionLabel = activeSection.section_label.trim().toLowerCase();
      options = options.filter(
        (o) => (o.option_label || o.option_key).trim().toLowerCase() !== sectionLabel,
      );
    }
    const current = filters[key];
    if (options.length === 0 && current === ALL) return null;
    return (
      <div key={key} className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <Select value={current} onValueChange={(v) => setFilter(key, v)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder={L.label_alle} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={ALL}>{L.label_alle}</SelectItem>
            {options.map((opt) => (
              <SelectItem key={opt.option_key} value={opt.option_key}>
                {(opt.option_label || opt.option_key) + ` (${opt.item_count ?? 0})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  /** Kompakte Karte für Zielgruppen- bzw. Unterlagentyp-Einstieg. */
  const entryCard = (
    key: string,
    label: string,
    count: number,
    hint: string | null,
    onClick: () => void,
    active: boolean,
  ) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition-colors ${
        active
          ? "border-primary bg-accent/50"
          : "border-border bg-background hover:border-primary/40 hover:bg-accent/30"
      }`}
    >
      <span className="block text-sm font-medium text-foreground">{label}</span>
      <span className="mt-1 block text-xs text-muted-foreground tabular-nums">
        {num(count)} {count === 1 ? L.label_eintrag : L.label_eintraege}
        {hint ? ` · ${hint}` : ""}
      </span>
    </button>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error && structure.length === 0) {
    return <p className="text-sm text-muted-foreground">{L.error_hint}</p>;
  }

  const showOverview = !activeAudience && !sectionSlug && !searching;
  const showAudienceSections = Boolean(activeAudience) && !sectionSlug && !searching;

  const sidebarNav = (
    <aside className="space-y-6">
      <nav aria-label={L.label_zielgruppen} className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {L.label_zielgruppen}
        </p>
        <ul className="space-y-0.5">
          {audiences.map((a) => (
            <li key={a.slug}>
              <button
                type="button"
                onClick={() => chooseAudience(a.slug === activeAudience ? null : a.slug)}
                className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                  a.slug === activeAudience
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                <span className="truncate">{a.label}</span>
                <span className="shrink-0 text-xs tabular-nums opacity-70">
                  {num(a.files)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label={L.label_bereich} className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {L.label_bereich}
        </p>
        <ul className="max-h-72 space-y-0.5 overflow-y-auto pr-1">
          {(activeAudience
            ? audienceSections.map((s) => ({
                slug: s.section_slug,
                label: s.section_label || s.section_slug,
                files: s.current_file_count ?? 0,
              }))
            : documentTypes
          ).map((entry) => (
            <li key={entry.slug}>
              <button
                type="button"
                onClick={() =>
                  chooseSection(entry.slug === sectionSlug ? null : entry.slug)
                }
                className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                  entry.slug === sectionSlug
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                <span className="truncate">{entry.label}</span>
                <span className="shrink-0 text-xs tabular-nums opacity-70">
                  {num(entry.files)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-4">
        {FACET_FILTERS.filter((f) => f.primary).map((f) =>
          renderSelect(f.facetKey, L[f.labelKey]),
        )}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setMoreFiltersOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            aria-expanded={moreFiltersOpen}
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${moreFiltersOpen ? "rotate-180" : ""}`}
            />
            {L.label_weitere_filter}
          </button>
          {moreFiltersOpen &&
            FACET_FILTERS.filter((f) => !f.primary).map((f) =>
              renderSelect(f.facetKey, L[f.labelKey]),
            )}
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              {L.label_filter_zuruecksetzen}
            </Button>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="space-y-8">
      {/* 1. Suche — breit und an erster Stelle */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={L.label_suche}
          className="pl-12 h-14 text-base"
          aria-label={L.label_suche}
        />
      </div>

      {showOverview && (
        <p className="text-sm text-muted-foreground">{L.choose_audience_hint}</p>
      )}

      {/* Breadcrumb: Übersicht > Zielgruppe > Bereich > Kapitel */}
      {!showOverview && (
        <nav aria-label={L.label_uebersicht} className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => {
              setAudience(null);
              setSectionSlug(null);
              setQuery("");
              resetFilters();
            }}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
            {L.label_uebersicht}
          </button>
          {activeAudienceLabel && (
            <>
              <span className="text-muted-foreground/60">/</span>
              <button
                type="button"
                onClick={() => chooseSection(null)}
                className={`${sectionSlug ? "text-muted-foreground hover:text-foreground" : "font-medium text-foreground"}`}
              >
                {activeAudienceLabel}
              </button>
            </>
          )}
          {sectionSlug && (
            <>
              <span className="text-muted-foreground/60">/</span>
              <button
                type="button"
                onClick={() => setDisplayGroup(null)}
                className={`${displayGroup ? "text-muted-foreground hover:text-foreground" : "font-medium text-foreground"}`}
              >
                {activeSectionLabel}
              </button>
            </>
          )}
          {displayGroup && (
            <>
              <span className="text-muted-foreground/60">/</span>
              <span className="font-medium text-foreground">
                {chapters.find((c) => c.key === displayGroup)?.label ?? displayGroup}
              </span>
            </>
          )}
        </nav>
      )}

      {/* 2./3. Startzustand: beide Einstiege gleichwertig als ruhige Karten */}
      {showOverview && (
        <div className="space-y-10">
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">
              {L.label_zielgruppen}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {audiences.map((a) =>
                entryCard(a.slug, a.label, a.files, null, () => chooseAudience(a.slug), false),
              )}
            </div>
          </section>
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">
              {L.label_unterlagentypen}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {documentTypes.map((d) =>
                entryCard(
                  d.slug,
                  d.label,
                  d.files,
                  d.audienceLabels.join(", "),
                  () => {
                    setAudience(null);
                    chooseSection(d.slug);
                  },
                  false,
                ),
              )}
            </div>
          </section>
        </div>
      )}

      {/* Zielgruppe gewählt, noch kein Bereich: Bereiche dieser Zielgruppe */}
      {showAudienceSections && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">
            {L.label_bereich}
            {activeAudienceLabel ? ` — ${activeAudienceLabel}` : ""}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {audienceSections.map((s) =>
              entryCard(
                s.section_slug,
                s.section_label || s.section_slug,
                s.current_file_count ?? 0,
                null,
                () => chooseSection(s.section_slug),
                false,
              ),
            )}
          </div>
        </section>
      )}

      {/* 4. Ergebnisansicht: links kompakte Navigation, rechts Trefferliste.
          Auf Mobile ist die Filterspalte einklappbar. */}
      {showResults && (
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="lg:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileFiltersOpen((v) => !v)}
              aria-expanded={mobileFiltersOpen}
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              {L.label_filter}
              {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>
          </div>
          <div className={`${mobileFiltersOpen ? "block" : "hidden"} lg:block lg:w-64 lg:shrink-0`}>
            {sidebarNav}
          </div>


          <div className="min-w-0 flex-1 space-y-6">
            {chapters.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {L.label_kapitel}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={displayGroup ? "outline" : "default"}
                    size="sm"
                    onClick={() => setDisplayGroup(null)}
                  >
                    {L.label_alle}
                  </Button>
                  {chapters.map((c) => (
                    <Button
                      key={c.key}
                      variant={displayGroup === c.key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDisplayGroup(c.key === displayGroup ? null : c.key)}
                    >
                      <span>{c.label}</span>
                      <span className="ml-2 text-xs tabular-nums opacity-70">
                        {num(c.count)}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground" aria-busy={busy}>
              {num(resultCount)}{" "}
              {resultCount === 1 ? L.label_eintrag : L.label_eintraege}
            </p>

            {!busy && rows.length >= MAX_RESULT_ROWS && (
              <p className="text-sm text-muted-foreground">{L.limit_hint}</p>
            )}

            {!busy && groupedSections.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {error ? L.error_hint : L.empty_hint}
              </p>
            )}

            <div className="space-y-10">
              {groupedSections.map((section) => (
                <section key={section.key} className="space-y-5">
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold text-foreground">
                      {section.introTitle || section.label}
                    </h3>
                    {searching && !activeAudience && section.audienceLabel && (
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {section.audienceLabel}
                      </p>
                    )}
                    {section.introBody && !isSuppressed(section.introBody) && (
                      <p className="text-sm text-muted-foreground max-w-3xl">
                        {section.introBody}
                      </p>
                    )}
                  </div>

                  {section.groups.map((group) => (
                    <div key={group.key} className="space-y-2">
                      {group.label && (
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-foreground/80">
                          {group.label}
                        </h4>
                      )}
                      <ul className="divide-y divide-border rounded-lg border border-border bg-background">
                        {group.items.map((item) => {
                          const isOpen = OPEN_KINDS.has(item.asset_kind || "");
                          const href =
                            item.download_url || (isOpen ? item.url : null) || "";
                          const enabled =
                            item.file_available === true && Boolean(href);
                          const meta = [
                            item.family_or_series_label,
                            item.version_label,
                            item.language ? item.language.toUpperCase() : null,
                            [item.file_ext?.toUpperCase(), formatSize(item.file_size)]
                              .filter(Boolean)
                              .join(" · ") || null,
                          ]
                            .map((v) => (v && String(v).trim() ? String(v).trim() : null))
                            .filter((v): v is string => Boolean(v) && !isSuppressed(v!));
                          // Öffentliches Typ-Label: bevorzugt die Contract-Gruppe
                          // (`display_group_label`), danach Dokument-/Quellentyp.
                          const rawTypeLabel =
                            item.display_group_label ||
                            item.document_type_label ||
                            item.source_type_label;
                          const typeLabel =
                            rawTypeLabel && !isSuppressed(rawTypeLabel)
                              ? rawTypeLabel
                              : null;
                          const articleCount = countAssignedArticles(
                            item.assigned_articles_text,
                          );

                          return (
                            <li
                              key={`${item.asset_id}-${item.section_slug ?? ""}-${item.group_slug ?? ""}-${item.sort_order ?? ""}`}
                              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-medium text-foreground">
                                    {item.title || item.file_name || item.asset_id}
                                  </span>
                                  {typeLabel && (
                                    <Badge variant="secondary" className="text-[11px]">
                                      {typeLabel}
                                    </Badge>
                                  )}
                                  {item.asset_kind === "external_link" && (
                                    <Badge variant="outline" className="text-[11px]">
                                      {L.badge_external_link}
                                    </Badge>
                                  )}
                                </div>
                                {meta.length > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    {meta.join(" · ")}
                                  </p>
                                )}
                                {/* Artikelnummern nur als Zähler — der Rohtext des
                                    Contracts bleibt der Suche vorbehalten. */}
                                {articleCount > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    {L.label_zugeordnete_artikel}: {num(articleCount)}
                                  </p>
                                )}
                              </div>

                              <div className="flex shrink-0 flex-wrap items-center gap-2">
                                {enabled && previewMode(item) !== "none" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPreview(item)}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    {L.btn_view}
                                  </Button>
                                )}
                                {enabled ? (
                                  <>
                                    <Button asChild variant="ghost" size="sm">
                                      <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        {isOpen ? L.btn_open : L.btn_new_tab}
                                      </a>
                                    </Button>
                                    {item.download_url && (
                                      <Button asChild variant="outline" size="sm">
                                        <a href={item.download_url} download>
                                          <Download className="w-4 h-4 mr-2" />
                                          {L.btn_download}
                                        </a>
                                      </Button>
                                    )}
                                  </>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled
                                    aria-disabled="true"
                                  >
                                    {isOpen ? L.btn_open : L.btn_download}
                                  </Button>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Vorschau-Panel (rechts, auf Mobile bildschirmfüllend). Inhalte werden
          nur per iframe/Objekt eingebettet — kein dangerouslySetInnerHTML. */}
      <Sheet open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-4 p-0 sm:max-w-xl lg:max-w-2xl"
        >
          {preview && (
            <>
              <SheetHeader className="space-y-2 border-b border-border p-6 pb-4 text-left">
                <SheetTitle className="text-base">
                  {preview.title || preview.file_name || preview.asset_id}
                </SheetTitle>
                {previewUrl && (
                  <SheetDescription className="break-all text-xs">
                    {previewUrl}
                  </SheetDescription>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {previewUrl && (
                    <Button asChild variant="outline" size="sm">
                      <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {L.btn_new_tab}
                      </a>
                    </Button>
                  )}
                  {preview.download_url && (
                    <Button asChild variant="outline" size="sm">
                      <a href={preview.download_url} download>
                        <Download className="w-4 h-4 mr-2" />
                        {L.btn_download}
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
                    <X className="w-4 h-4 mr-2" />
                    {L.btn_close_preview}
                  </Button>
                </div>
              </SheetHeader>
              <div className="min-h-0 flex-1 px-6 pb-6">
                {previewUrl && previewMode(preview) === "image" ? (
                  <div className="flex h-full min-h-[60vh] w-full items-center justify-center overflow-auto rounded-md border border-border bg-muted">
                    <img
                      src={previewUrl}
                      alt={preview.title || preview.file_name || "Vorschau"}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : previewUrl && previewMode(preview) === "pdf" ? (
                  // PDF-Vorschau ohne `sandbox`: der eingebaute PDF-Viewer der
                  // Browser wird von einem Sandbox-Attribut blockiert und zeigt
                  // stattdessen nur ein „kaputte Datei"-Symbol.
                  <iframe
                    key={previewUrl}
                    src={previewUrl}
                    title={preview.title || preview.file_name || "Vorschau"}
                    referrerPolicy="no-referrer"
                    className="h-full min-h-[60vh] w-full rounded-md border border-border bg-muted"
                  />
                ) : previewUrl && previewMode(preview) === "iframe" ? (
                  <iframe
                    key={previewUrl}
                    src={previewUrl}
                    title={preview.title || preview.file_name || "Vorschau"}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    referrerPolicy="no-referrer"
                    className="h-full min-h-[60vh] w-full rounded-md border border-border bg-muted"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {L.preview_unavailable_hint}
                  </p>
                )}
              </div>

            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DownloadCenter;
