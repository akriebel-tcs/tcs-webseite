/**
 * Template-Werkstatt (Stufe 0.2) — große Admin-Ansicht.
 *
 * Öffnet ein Vollbild-Dialog (≈95vw / 95vh) mit drei Bereichen:
 *   - links: Template-Liste + Kandidaten + Kartenmuster
 *   - Mitte: Referenzseite, erwartete Struktur, optionale iframe-Vorschau
 *   - rechts: Mitglieder mit Status, Abweichungen, Sprung-Buttons
 *
 * Bewusst NICHT enthalten:
 *  - keine Template-Engine, keine Vererbung
 *  - keine Schreibwege, keine Migration
 *  - keine Public-Renderer-Änderung
 *  - keine Bildgenerierung / Screenshot-API
 *
 * iframe-Vorschau zeigt die öffentliche Route der Referenzseite auf gleichem
 * Origin — falls X-Frame/COEP das blockiert, fällt die UI auf einen
 * „Öffentliche Seite öffnen"-Hinweis zurück.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, LayoutTemplate, ArrowLeft, RefreshCw, EyeOff, Eye, Monitor, Tablet, Smartphone, X } from "lucide-react";
import {
  TEMPLATE_REGISTRY,
  matchTemplate,
  type ObservedSection,
  type TemplateMatchResult,
  type TemplateDefinition,
} from "@/features/admin/lib/templates";
import { readPagesWithNav, type CmsPageRow } from "@/features/admin/api/cmsAdminPages";
import { resolveShortId } from "@/features/admin/api/cmsAdminResolve";
import type { JumpTarget } from "@/features/admin/components/GoToShortIdBar";
import {
  loadCandidatesReport,
  type CandidatesReport,
  type CardFamily,
  type CardFamilyStatus,
} from "@/features/admin/lib/templateCandidates";
import {
  BLOCK_TEMPLATE_REGISTRY,
  loadBlockTemplateOccurrences,
  type BlockTemplateDefinition,
  type BlockTemplateOccurrencesByKey,
} from "@/features/admin/lib/blockTemplates";
import { blockTypeStyle } from "@/features/admin/lib/blockTypeStyle";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TeaserSectionPreview from "@/features/admin/components/TeaserSectionPreview";
import AdminPreviewDrawer from "@/features/admin/components/AdminPreviewDrawer";

interface Props {
  onJump: (target: JumpTarget) => void;
  /** Wenn true: ohne Dialog/Trigger inline rendern (z. B. als Toggle-Ansicht in AdminPage). */
  inline?: boolean;
}

interface SectionRow {
  page_key: string;
  section_key: string;
  section_type: string;
  sort_order: number;
}

async function loadTopSections(
  pageKeys: string[],
): Promise<Map<string, ObservedSection[]>> {
  const result = new Map<string, ObservedSection[]>();
  if (pageKeys.length === 0) return result;
  const { getCmsSupabaseClient } = await import("@/lib/cmsSupabase/client");
  const supabase = getCmsSupabaseClient();
  const { data, error } = await supabase
    .from("cms_sections")
    .select("page_key, section_key, section_type, sort_order, parent_section_id")
    .in("page_key", pageKeys)
    .is("parent_section_id", null)
    .order("sort_order", { ascending: true });
  if (error || !Array.isArray(data)) return result;
  for (const row of data as SectionRow[]) {
    const arr = result.get(row.page_key) ?? [];
    arr.push({
      sort_order: row.sort_order,
      section_key: row.section_key,
      section_type: row.section_type,
    });
    result.set(row.page_key, arr);
  }
  return result;
}

const statusTone = (status: TemplateMatchResult["status"]) => {
  switch (status) {
    case "match":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "match_variant":
      return "bg-sky-100 text-sky-800 border-sky-200";
    case "partial":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "missing":
      return "bg-destructive/10 text-destructive border-destructive/30";
  }
};

const statusLabel = (status: TemplateMatchResult["status"]) => {
  switch (status) {
    case "match":
      return "Voll passend";
    case "match_variant":
      return "Passende Variante";
    case "partial":
      return "Abweichung";
    case "missing":
      return "Nicht zugeordnet";
  }
};

const TemplateWorkshop = ({ onJump, inline = false }: Props) => {
  const [openState, setOpen] = useState(false);
  const open = inline || openState;
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState<CmsPageRow[]>([]);
  const [sectionsByPage, setSectionsByPage] = useState<Map<string, ObservedSection[]>>(
    new Map(),
  );
  const [error, setError] = useState<string | null>(null);
  const [jumping, setJumping] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>(
    TEMPLATE_REGISTRY[0]?.template_key ?? "",
  );
  const [candidates, setCandidates] = useState<CandidatesReport | null>(null);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [previewOn, setPreviewOn] = useState(true);
  const [view, setView] = useState<"pages" | "cards" | "blocks">("pages");
  const [selectedCardKey, setSelectedCardKey] = useState<string | null>(null);
  const [previewPageKey, setPreviewPageKey] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [blockOccurrences, setBlockOccurrences] = useState<BlockTemplateOccurrencesByKey>({});
  const [blockOccLoading, setBlockOccLoading] = useState(false);
  const [blockOccError, setBlockOccError] = useState<string | null>(null);
  const [selectedBlockKey, setSelectedBlockKey] = useState<string>(
    BLOCK_TEMPLATE_REGISTRY[0]?.template_key ?? "",
  );

  const selected: TemplateDefinition | undefined = useMemo(
    () => TEMPLATE_REGISTRY.find((t) => t.template_key === selectedKey),
    [selectedKey],
  );

  const loadAll = () => {
    setLoading(true);
    setError(null);
    const allPageKeys = Array.from(
      new Set(
        TEMPLATE_REGISTRY.flatMap((t) => [t.reference_page_key, ...t.member_page_keys]),
      ),
    );
    return Promise.all([readPagesWithNav(), loadTopSections(allPageKeys)])
      .then(([bundle, secs]) => {
        if (bundle.error) setError(bundle.error);
        setPages(bundle.pages);
        setSectionsByPage(secs);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  };

  const loadCandidates = () => {
    setCandidatesLoading(true);
    return loadCandidatesReport()
      .then((r) => setCandidates(r))
      .finally(() => setCandidatesLoading(false));
  };

  const loadBlockOccurrences = () => {
    setBlockOccLoading(true);
    setBlockOccError(null);
    return loadBlockTemplateOccurrences()
      .then((r) => {
        setBlockOccurrences(r.byKey);
        if (r.error) setBlockOccError(r.error);
      })
      .finally(() => setBlockOccLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    loadAll();
    loadCandidates();
    loadBlockOccurrences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pageByKey = useMemo(() => {
    const m = new Map<string, CmsPageRow>();
    for (const p of pages) m.set(p.page_key, p);
    return m;
  }, [pages]);

  const handleJumpToPage = async (pageNo: number | null, close = true) => {
    if (!pageNo) return;
    const formatted = `P-${String(pageNo).padStart(3, "0")}`;
    setJumping(formatted);
    try {
      const r = await resolveShortId({ kind: "P", value: pageNo, formatted });
      if (r.success) {
        onJump({
          page_key: r.page_key,
          section_key: null,
          node_id: null,
          field_key: null,
          label: r.page_key,
          raw: r,
        });
        if (close) setOpen(false);
      }
    } finally {
      setJumping(null);
    }
  };

  const refMeta = selected ? pageByKey.get(selected.reference_page_key) : undefined;

  const body = (
    <>
        <div className="shrink-0 border-b px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <LayoutTemplate className="h-4 w-4" />
              Template-Werkstatt
              <Badge variant="outline" className="text-[10px]">
                Stufe 0 · nur Ansicht
              </Badge>
            </h2>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => {
                  loadAll();
                  loadCandidates();
                  loadBlockOccurrences();
                }}
                disabled={loading || candidatesLoading || blockOccLoading}
              >
                <RefreshCw className="h-3 w-3" />
                Neu laden
              </Button>
              {!inline && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => setOpen(false)}
                >
                  <ArrowLeft className="h-3 w-3" />
                  Zurück zu CMS
                </Button>
              )}
            </div>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Stufe 0: Übersicht. Änderungen am Template wirken{" "}
            <strong>noch nicht automatisch</strong> auf alle Seiten — jede Seite
            wird weiterhin einzeln im CMS-Light gepflegt.
          </p>
        </div>

        {!previewPageKey && (
        <Tabs
          value={view}
          onValueChange={(v) => setView(v as "pages" | "cards" | "blocks")}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="shrink-0 border-b bg-muted/30 px-4 py-1.5">
            <TabsList className="h-8">
              <TabsTrigger value="pages" className="h-6 text-xs">
                Seiten-Templates
              </TabsTrigger>
              <TabsTrigger value="blocks" className="h-6 text-xs">
                Block-/Teaser-Templates
                {BLOCK_TEMPLATE_REGISTRY.length ? (
                  <span className="ml-1.5 rounded bg-background px-1 text-[10px]">
                    {BLOCK_TEMPLATE_REGISTRY.length}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="cards" className="h-6 text-xs">
                Karten-Templates
                {candidates?.cardFamilies?.length ? (
                  <span className="ml-1.5 rounded bg-background px-1 text-[10px]">
                    {candidates.cardFamilies.length}
                  </span>
                ) : null}
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent
            value="pages"
            className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
          >
        <div className="grid h-full min-h-0 grid-cols-12 gap-0 overflow-hidden">

          {/* LINKS: Liste */}
          <aside className="col-span-12 flex min-h-0 flex-col overflow-y-auto border-r bg-muted/20 p-3 md:col-span-3">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Templates ({TEMPLATE_REGISTRY.length})
            </h4>
            <ul className="space-y-1">
              {TEMPLATE_REGISTRY.map((t) => (
                <li key={t.template_key}>
                  <button
                    type="button"
                    onClick={() => setSelectedKey(t.template_key)}
                    className={`w-full rounded border px-2 py-1.5 text-left text-xs transition-colors ${
                      selectedKey === t.template_key
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-transparent bg-background hover:border-border hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium">{t.name}</div>
                    <code className="text-[10px] text-muted-foreground">
                      {t.template_key} · {t.member_page_keys.length} Seiten
                    </code>
                  </button>
                </li>
              ))}
            </ul>

            <h4 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Mögliche weitere Templates
            </h4>
            {candidatesLoading && (
              <p className="text-[11px] text-muted-foreground">analysiere Seiten …</p>
            )}
            {candidates?.error && (
              <p className="text-[11px] text-destructive">{candidates.error}</p>
            )}
            {candidates && !candidates.error && candidates.pageGroups.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                Keine wiederkehrenden Strukturmuster über mind. 2 Seiten gefunden.
              </p>
            )}
            <ul className="space-y-1">
              {candidates?.pageGroups.slice(0, 12).map((g) => (
                <li
                  key={g.signature}
                  className="rounded border bg-background px-2 py-1.5 text-[11px]"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium">{g.workingTitle}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        g.templateReady
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-amber-300 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {g.templateReady ? "Template-tauglich" : "noch heterogen"}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">{g.pages.length} Seiten</div>
                  <code className="block truncate text-[10px] text-muted-foreground">
                    {g.pattern}
                  </code>
                  <details className="mt-0.5">
                    <summary className="cursor-pointer text-[10px] text-muted-foreground">
                      Beispiele
                    </summary>
                    <ul className="ml-3 mt-0.5 list-disc text-[10px]">
                      {g.pages.slice(0, 6).map((p) => {
                        const pg = pageByKey.get(p.page_key);
                        const tag = pg?.page_no
                          ? `P-${String(pg.page_no).padStart(3, "0")} · `
                          : "";
                        return (
                          <li key={p.page_key} className="truncate">
                            {tag}
                            {p.page_key}
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>

            <h4 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Karten-/Blockmuster
            </h4>
            {candidates && candidates.cardPatterns.length === 0 && (
              <p className="text-[11px] text-muted-foreground">Keine Muster gefunden.</p>
            )}
            <ul className="space-y-1">
              {candidates?.cardPatterns.slice(0, 12).map((c) => (
                <li
                  key={c.pattern}
                  className="rounded border bg-background px-2 py-1.5 text-[11px]"
                >
                  <div className="font-mono text-[10px]">{c.pattern}</div>
                  <div className="text-muted-foreground">
                    {c.containerCount}× Container · {c.examplePages.length} Seiten
                  </div>
                </li>
              ))}
            </ul>
          </aside>

          {/* MITTE: Referenz + Vorschau */}
          <section className="col-span-12 flex min-h-0 flex-col overflow-y-auto border-r p-4 md:col-span-5">
            {!selected && (
              <p className="text-sm text-muted-foreground">Kein Template ausgewählt.</p>
            )}
            {selected && (
              <>
                <div className="mb-3">
                  <h3 className="text-lg font-semibold">{selected.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {selected.description}
                  </p>
                </div>

                <div className="mb-3 rounded-md border border-primary/30 bg-primary/5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          Referenzseite
                        </Badge>
                        {refMeta?.page_no != null && (
                          <code className="rounded bg-background px-1.5 py-0.5 text-[10px]">
                            P-{String(refMeta.page_no).padStart(3, "0")}
                          </code>
                        )}
                        <span className="text-sm font-medium">
                          {refMeta?.title_de ?? selected.reference_page_key}
                        </span>
                      </div>
                      <code className="mt-0.5 block text-[11px] text-muted-foreground">
                        {selected.reference_page_key}
                      </code>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleJumpToPage(refMeta?.page_no ?? null)}
                        disabled={!refMeta?.page_no || jumping !== null}
                      >
                        Im Admin öffnen
                      </Button>
                      {refMeta?.route_path && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 gap-1 px-2 text-xs"
                          onClick={() => {
                            setPreviewPageKey(selected.reference_page_key);
                            setPreviewDevice("desktop");
                          }}
                        >
                          <Eye className="h-3 w-3" />
                          Große Vorschau
                        </Button>
                      )}
                      {refMeta?.route_path && (
                        <a
                          href={refMeta.route_path}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex h-7 items-center gap-1 rounded border bg-background px-2 text-xs hover:bg-muted"
                        >
                          <ExternalLink className="h-3 w-3" />
                          öffentliche Seite
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Erlaubte Struktur (Slots)
                  </p>
                  <ol className="space-y-1">
                    {selected.slots.map((slot, idx) => (
                      <li
                        key={slot.slot}
                        className="rounded border bg-background px-2 py-1 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                            {idx + 1}
                          </code>
                          <strong>{slot.label}</strong>
                          {!slot.required && (
                            <span className="text-[10px] text-muted-foreground">
                              optional
                            </span>
                          )}
                        </div>
                        <div className="ml-7 mt-0.5 text-[11px] text-muted-foreground">
                          erlaubt:{" "}
                          {slot.options
                            .map(
                              (o) =>
                                `${o.section_key} (${o.section_types.join(" | ")})`,
                            )
                            .join("  ·  oder  ·  ")}
                        </div>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-2 rounded border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] text-sky-900">
                    Dieses Template erlaubt mehrere Section-Varianten. Layout
                    und Renderer behandeln sie als Produkt-Unterseiten-Familie.
                  </p>
                </div>

                {/* Vorschau */}
                <div className="mt-1 flex min-h-0 flex-1 flex-col">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Referenz-Vorschau
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 gap-1 px-1.5 text-[10px]"
                      onClick={() => setPreviewOn((v) => !v)}
                    >
                      {previewOn ? (
                        <>
                          <EyeOff className="h-3 w-3" /> ausblenden
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" /> einblenden
                        </>
                      )}
                    </Button>
                  </div>
                  {previewOn && refMeta?.route_path ? (
                    <div className="relative min-h-[320px] flex-1 overflow-hidden rounded border bg-background">
                      <iframe
                        title={`Vorschau ${selected.reference_page_key}`}
                        src={refMeta.route_path}
                        className="h-full w-full"
                        sandbox="allow-same-origin allow-scripts"
                      />
                    </div>
                  ) : previewOn ? (
                    <div className="flex min-h-[120px] flex-1 items-center justify-center rounded border bg-muted/30 text-xs text-muted-foreground">
                      Keine öffentliche Route hinterlegt.
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </section>

          {/* RECHTS: Mitglieder */}
          <section className="col-span-12 flex min-h-0 flex-col overflow-y-auto p-3 md:col-span-4">
            {loading && (
              <p className="text-xs text-muted-foreground">Lade Seitendaten …</p>
            )}
            {error && (
              <p className="rounded border border-destructive/40 bg-destructive/5 px-2 py-1 text-xs text-destructive">
                {error}
              </p>
            )}
            {selected && (
              <>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Mitglieder ({selected.member_page_keys.length})
                </h4>
                {(() => {
                  const counts = { match: 0, match_variant: 0, partial: 0, missing: 0, unknown: 0 };
                  for (const pk of selected.member_page_keys) {
                    const obs = sectionsByPage.get(pk);
                    if (!obs) { counts.unknown++; continue; }
                    counts[matchTemplate(selected, obs).status]++;
                  }
                  return (
                    <div className="mb-2 flex flex-wrap gap-1 text-[10px]">
                      <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-emerald-800">Voll passend: {counts.match}</span>
                      <span className="rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-sky-800">Passende Variante: {counts.match_variant}</span>
                      <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-800">Abweichung: {counts.partial}</span>
                      <span className="rounded border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-destructive">Nicht zugeordnet: {counts.missing}</span>
                      {counts.unknown > 0 && (
                        <span className="rounded border bg-muted px-1.5 py-0.5 text-muted-foreground">noch nicht geladen: {counts.unknown}</span>
                      )}
                    </div>
                  );
                })()}
                <ul className="space-y-2">
                  {selected.member_page_keys.map((pk) => {
                    const p = pageByKey.get(pk);
                    const obs = sectionsByPage.get(pk) ?? null;
                    const match = obs ? matchTemplate(selected, obs) : null;
                    const isRef = pk === selected.reference_page_key;
                    return (
                      <li
                        key={pk}
                        className="rounded-md border bg-background p-2.5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {p?.page_no != null && (
                                <code className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                                  P-{String(p.page_no).padStart(3, "0")}
                                </code>
                              )}
                              <span className="text-sm font-medium">
                                {p?.title_de ?? pk}
                              </span>
                              {isRef && (
                                <Badge variant="outline" className="text-[10px]">
                                  Referenz
                                </Badge>
                              )}
                              {match && (
                                <span
                                  className={`rounded border px-1.5 py-0.5 text-[10px] ${statusTone(match.status)}`}
                                >
                                  {statusLabel(match.status)}
                                </span>
                              )}
                            </div>
                            <code className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                              {pk}
                            </code>
                            {match && (match.variantLabel || match.langVariantLabel) && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {match.variantLabel && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {match.variantLabel}
                                  </Badge>
                                )}
                                {match.langVariantLabel && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {match.langVariantLabel}
                                  </Badge>
                                )}
                              </div>
                            )}
                            {match &&
                              (match.missingSlots.length > 0 ||
                                match.typeMismatches.length > 0 ||
                                match.extraKeys.length > 0) && (
                                <div className="mt-1 space-y-0.5 text-[11px]">
                                  {match.missingSlots.length > 0 && (
                                    <div className="text-destructive">
                                      fehlt: {match.missingSlots.join(", ")}
                                    </div>
                                  )}
                                  {match.typeMismatches.length > 0 && (
                                    <div className="text-amber-700">
                                      Typ-Abweichung:{" "}
                                      {match.typeMismatches
                                        .map(
                                          (m) =>
                                            `${m.section_key} (erwartet ${m.expected}, ist ${m.actual})`,
                                        )
                                        .join("; ")}
                                    </div>
                                  )}
                                  {match.extraKeys.length > 0 && (
                                    <div className="text-muted-foreground">
                                      zusätzlich: {match.extraKeys.join(", ")}
                                    </div>
                                  )}
                                </div>
                              )}
                          </div>
                          <div className="flex shrink-0 flex-col gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleJumpToPage(p?.page_no ?? null)}
                              disabled={!p?.page_no || jumping !== null}
                            >
                              Im Admin öffnen
                            </Button>
                            {p?.route_path && (
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 gap-1 px-2 text-xs"
                                onClick={() => {
                                  setPreviewPageKey(pk);
                                  setPreviewDevice("desktop");
                                }}
                              >
                                <Eye className="h-3 w-3" />
                                Vorschau
                              </Button>
                            )}
                            {p?.route_path && (
                              <a
                                href={p.route_path}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="inline-flex h-7 items-center justify-center gap-1 rounded border bg-background px-2 text-xs hover:bg-muted"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Public
                              </a>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {selected.excluded_notes && selected.excluded_notes.length > 0 && (
                  <div className="mt-3">
                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Bewusst ausgeschlossen ({selected.excluded_notes.length})
                    </h4>
                    <ul className="space-y-1">
                      {selected.excluded_notes.map((n) => (
                        <li
                          key={n.page_key}
                          className="rounded border border-slate-200 bg-slate-50 p-2 text-[11px]"
                        >
                          <code className="block text-[10px] text-muted-foreground">
                            {n.page_key}
                          </code>
                          <p className="mt-0.5">{n.reason}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
          </TabsContent>
          <TabsContent
            value="cards"
            className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
          >
            <CardTemplatesView
              report={candidates}
              loading={candidatesLoading}
              selectedKey={selectedCardKey}
              onSelect={setSelectedCardKey}
              onJumpToPage={(pn) => handleJumpToPage(pn)}
            />
          </TabsContent>
          <TabsContent
            value="blocks"
            className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
          >
            <BlockTemplatesView
              occurrences={blockOccurrences}
              loading={blockOccLoading}
              error={blockOccError}
              selectedKey={selectedBlockKey}
              onSelect={setSelectedBlockKey}
              onJumpToPage={(pn) => handleJumpToPage(pn)}
            />
          </TabsContent>
        </Tabs>
        )}

        {previewPageKey && (() => {
          const pp = pageByKey.get(previewPageKey);
          if (!pp?.route_path) return null;
          const widths = { desktop: 1440, tablet: 820, mobile: 390 } as const;
          const w = widths[previewDevice];
          return (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() => setPreviewPageKey(null)}
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Zurück zur Übersicht
                    </Button>
                    {pp.page_no != null && (
                      <code className="rounded bg-background px-1.5 py-0.5 text-[10px]">
                        P-{String(pp.page_no).padStart(3, "0")}
                      </code>
                    )}
                    <span className="text-sm font-semibold">{pp.title_de ?? previewPageKey}</span>
                    <Badge variant="outline" className="text-[10px]">
                      Seitenvorschau
                    </Badge>
                  </div>
                  <code className="mt-0.5 block text-[11px] text-muted-foreground">
                    {previewPageKey} · {pp.route_path}
                  </code>
                </div>
                <div className="flex items-center gap-1">
                  <div className="mr-2 flex items-center gap-0.5 rounded border bg-background p-0.5">
                    {(["desktop", "tablet", "mobile"] as const).map((d) => {
                      const Icon = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
                      const label = d === "desktop" ? "Desktop 1440" : d === "tablet" ? "Tablet 820" : "Mobile 390";
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setPreviewDevice(d)}
                          title={label}
                          className={`flex h-6 items-center gap-1 rounded px-2 text-[11px] ${
                            previewDevice === d
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <Icon className="h-3 w-3" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => handleJumpToPage(pp.page_no ?? null)}
                    disabled={!pp.page_no || jumping !== null}
                  >
                    Im Admin öffnen
                  </Button>
                  <a
                    href={pp.route_path}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex h-7 items-center gap-1 rounded border bg-background px-2 text-xs hover:bg-muted"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Neuer Tab
                  </a>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => setPreviewPageKey(null)}
                  >
                    <X className="h-3 w-3" />
                    Schließen
                  </Button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto bg-muted/30 p-4">
                <div
                  className="mx-auto overflow-hidden rounded border bg-background shadow-md"
                  style={{ width: w, maxWidth: "100%", height: "calc(100vh - 180px)" }}
                >
                  <iframe
                    key={previewPageKey + previewDevice}
                    title={`Vorschau ${previewPageKey}`}
                    src={pp.route_path}
                    className="h-full w-full"
                    sandbox="allow-same-origin allow-scripts"
                  />
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );

  // Route-Pfad der aktuell „in Vorschau" gewählten Seite — speist die Live-Vorschau rechts.
  const drawerRoute = previewPageKey ? (pageByKey.get(previewPageKey)?.route_path ?? null) : null;
  const drawerLabel = previewPageKey
    ? `Seite mit diesem Template: ${pageByKey.get(previewPageKey)?.title_de ?? previewPageKey}`
    : null;

  // Reverse-Sync: wenn der Nutzer im iframe der echten Webseite auf einen Link
  // klickt, suchen wir die passende Seite per `route_path` und aktualisieren
  // den Vorschau-Fokus, damit die Kontextzeile mitwandert.
  const handlePreviewRouteChange = (pathname: string) => {
    for (const [pk, p] of pageByKey.entries()) {
      if (p.route_path === pathname) {
        setPreviewPageKey(pk);
        return;
      }
    }
  };

  if (inline) {
    return (
      <div className="flex h-full w-full min-h-0 flex-col gap-0 overflow-hidden">
        {body}
        <AdminPreviewDrawer
          routePath={drawerRoute}
          storageKey="cms-admin.preview.sheet.templates"
          contextLabel={drawerLabel}
          onRouteChange={handlePreviewRouteChange}
        />
      </div>
    );
  }


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          title="Template-Werkstatt (Stufe 0)"
        >
          <LayoutTemplate className="h-3.5 w-3.5" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[95vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[95vw]">
        {body}
      </DialogContent>
    </Dialog>
  );
};

// ---------- Karten-/Block-Templates Ansicht (Stufe 0.4: Familien) ----------

interface CardViewProps {
  report: CandidatesReport | null;
  loading: boolean;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onJumpToPage: (pageNo: number | null | undefined) => void;
}

const FAMILY_STATUS_TONE: Record<CardFamilyStatus, string> = {
  clean: "border-emerald-300 bg-emerald-50 text-emerald-800",
  near_clean: "border-lime-300 bg-lime-50 text-lime-800",
  heterogeneous: "border-amber-300 bg-amber-50 text-amber-800",
  renderer_special: "border-slate-300 bg-slate-50 text-slate-700",
};

const FAMILY_STATUS_LABEL: Record<CardFamilyStatus, string> = {
  clean: "sauber modelliert",
  near_clean: "fast sauber",
  heterogeneous: "heterogen",
  renderer_special: "Renderer-Sonderfall",
};

function CardTemplatesView({ report, loading, selectedKey, onSelect, onJumpToPage }: CardViewProps) {
  const families = report?.cardFamilies ?? [];
  const effectiveKey = selectedKey ?? families[0]?.key ?? null;
  const selected: CardFamily | undefined = families.find((f) => f.key === effectiveKey);

  return (
    <div className="grid h-full min-h-0 grid-cols-12 gap-0 overflow-hidden">
      {/* LINKS: Familien-Liste */}
      <aside className="col-span-12 flex min-h-0 flex-col overflow-y-auto border-r bg-muted/20 p-3 md:col-span-4">
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Karten-Familien ({families.length})
        </h4>
        <p className="mb-2 text-[11px] text-muted-foreground">
          Jede Familie ist ein Arbeitstitel für gleichartig aufgebaute Karten
          (z.&nbsp;B. Vorteils-Karte, Anwendungs-Karte). Status zeigt, wie nah die
          Karten an einem echten Template stehen.
        </p>
        {loading && <p className="text-[11px] text-muted-foreground">analysiere …</p>}
        {report?.error && <p className="text-[11px] text-destructive">{report.error}</p>}
        <ul className="space-y-1">
          {families.map((t) => {
            const active = effectiveKey === t.key;
            return (
              <li key={t.key}>
                <button
                  type="button"
                  onClick={() => onSelect(t.key)}
                  className={`w-full rounded border px-2 py-1.5 text-left text-xs transition-colors ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-transparent bg-background hover:border-border hover:bg-muted"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="truncate font-medium">{t.workingTitle}</span>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] ${FAMILY_STATUS_TONE[t.status]}`}
                    >
                      {FAMILY_STATUS_LABEL[t.status]}
                    </Badge>
                  </div>
                  <code className="block truncate text-[10px] text-muted-foreground">
                    {t.key}
                  </code>
                  <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                    <span>{t.cardCount} Karten</span>
                    <span>· {t.pageCount} Seiten</span>
                    {t.hasImage && <span>· 🖼</span>}
                    {t.hasIcon && <span>· ★</span>}
                    {t.hasLink && <span>· 🔗</span>}
                    {t.hasCta && <span>· CTA</span>}
                  </div>
                  <code className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                    in: {t.parentTypes.join(", ")}
                  </code>
                </button>
              </li>
            );
          })}
          {!loading && families.length === 0 && (
            <li className="text-[11px] text-muted-foreground">Keine Karten gefunden.</li>
          )}
        </ul>
      </aside>

      {/* MITTE: Detail / Feldschema */}
      <section className="col-span-12 flex min-h-0 flex-col overflow-y-auto border-r p-4 md:col-span-4">
        {!selected && (
          <p className="text-sm text-muted-foreground">Keine Karten-Familie ausgewählt.</p>
        )}
        {selected && (
          <>
            <div className="mb-2">
              <h3 className="text-base font-semibold">{selected.workingTitle}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{selected.description}</p>
              <code className="mt-1 block text-[11px] text-muted-foreground">
                Familien-Key (Arbeitstitel): {selected.key}
              </code>
            </div>

            <div className="mb-3 flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-[10px]">
                {selected.cardCount} Karten
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {selected.pageCount} Seiten
              </Badge>
              {selected.hasImage && (
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Bild</Badge>
              )}
              {selected.hasIcon && (
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Icon</Badge>
              )}
              {selected.hasLink && (
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Link</Badge>
              )}
              {selected.hasCta && (
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">CTA</Badge>
              )}
              <Badge
                variant="outline"
                className={`text-[10px] ${FAMILY_STATUS_TONE[selected.status]}`}
              >
                {FAMILY_STATUS_LABEL[selected.status]}
              </Badge>
            </div>

            {selected.example && (
              <div className="mb-3 rounded border border-primary/30 bg-primary/5 p-2 text-[11px]">
                <div className="font-semibold">Beispiel-Karte</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  {selected.example.page_no != null && (
                    <code className="rounded bg-background px-1 py-0.5 text-[10px]">
                      P-{String(selected.example.page_no).padStart(3, "0")}
                    </code>
                  )}
                  {selected.example.container_section_no != null && (
                    <code className="rounded bg-background px-1 py-0.5 text-[10px]">
                      B-{String(selected.example.container_section_no).padStart(3, "0")}
                    </code>
                  )}
                  <span>{selected.example.page_title ?? selected.example.page_key}</span>
                </div>
                <code className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                  {selected.example.page_key} · {selected.example.container_section_key} ›{" "}
                  {selected.example.child_section_key}
                </code>
              </div>
            )}

            <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              Feldschema (Roh-Felder, über alle Karten)
            </p>
            <ul className="mb-3 space-y-0.5">
              {selected.fieldInventory.map((f) => {
                const pct = Math.round(f.coverage * 100);
                const dominant = pct >= 80;
                const isSynonym = selected.synonymHints.some((h) => h.startsWith(`${f.field_key}:`));
                const isLegacy = selected.legacyHints.some((h) => h.startsWith(`${f.field_key} →`));
                return (
                  <li
                    key={f.field_key}
                    className="flex items-center justify-between rounded border bg-background px-2 py-1 text-xs"
                  >
                    <code
                      className={`font-mono text-[11px] ${
                        isSynonym ? "text-amber-700" : isLegacy ? "text-slate-500" : ""
                      }`}
                      title={isLegacy ? "Altbestand-Feld — wird als Fallback gelesen" : undefined}
                    >
                      {f.field_key}
                      {isSynonym ? " ⚠" : isLegacy ? " (Altbestand)" : ""}
                    </code>
                    <span
                      className={`text-[10px] ${
                        dominant
                          ? "text-emerald-700"
                          : pct < 30
                            ? "text-amber-700"
                            : "text-muted-foreground"
                      }`}
                    >
                      {f.usage}× · {pct}%
                    </span>
                  </li>
                );
              })}
              {selected.fieldInventory.length === 0 && (
                <li className="text-[11px] text-muted-foreground">Keine Felder gepflegt.</li>
              )}
            </ul>

            {selected.synonymHints.length > 0 && (
              <div className="mb-2 rounded border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-900">
                <strong className="block">Synonyme / heterogene Feldnamen</strong>
                <ul className="ml-3 mt-0.5 list-disc">
                  {selected.synonymHints.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            {(selected.key === "benefit_card_v1" || selected.key === "usecase_card_v1") && (
              <div className="mb-2 rounded border border-sky-300 bg-sky-50 p-2 text-[11px] text-sky-900">
                <strong className="block">Layout-Defaults (Container)</strong>
                <p className="mt-0.5">
                  Gleiches Feldschema, aber unterschiedliche Layout-Defaults je Container.
                  Die Spaltenzahl folgt dem <code>section_key</code> des Containers, nicht
                  der Kartenanzahl. Quelle: <code>src/features/cms/lib/cardGrid.ts</code>.
                </p>
                <ul className="ml-3 mt-1 list-disc">
                  {selected.key === "benefit_card_v1" ? (
                    <li>
                      Container <code>benefits</code> / <code>vorteile</code> (auch
                      <code>benefit*</code> / <code>vorteil*</code>): Desktop 3 · Tablet 2 · Mobile 1
                    </li>
                  ) : (
                    <li>
                      Container <code>useCases</code> / <code>anwendungen</code> /
                      <code>einsatz*</code> / <code>branche*</code>: Desktop 4 · Tablet 2 · Mobile 1
                    </li>
                  )}
                </ul>
              </div>
            )}

            {selected.legacyHints.length > 0 && (
              <div className="mb-2 rounded border border-slate-300 bg-slate-50 p-2 text-[11px] text-slate-700">
                <strong className="block">Altbestand-Felder (kanonisch vorbereitet)</strong>
                <p className="mt-0.5">
                  Diese Felder existieren noch parallel zum kanonischen Feld. Der
                  öffentliche Renderer liest zuerst das kanonische Feld und fällt
                  nur zurück, wenn es leer ist.
                </p>
                <ul className="ml-3 mt-1 list-disc">
                  {selected.legacyHints.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      {/* RECHTS: Vorkommen */}
      <section className="col-span-12 flex min-h-0 flex-col overflow-y-auto p-3 md:col-span-4">
        {selected && (
          <>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Vorkommen ({selected.occurrences.length}
              {selected.cardCount > selected.occurrences.length ? ` von ${selected.cardCount}` : ""})
            </h4>
            <ul className="space-y-2">
              {selected.occurrences.map((o, idx) => {
                const refKeys = selected.example
                  ? new Set(selected.example.raw_fields)
                  : new Set<string>();
                const missingVsExample = selected.example
                  ? selected.example.raw_fields.filter((k) => !o.raw_fields.includes(k))
                  : [];
                const extraVsExample = selected.example
                  ? o.raw_fields.filter((k) => !refKeys.has(k))
                  : [];
                return (
                  <li
                    key={`${o.page_key}-${o.child_section_key}-${idx}`}
                    className="rounded-md border bg-background p-2.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {o.page_no != null && (
                            <code className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                              P-{String(o.page_no).padStart(3, "0")}
                            </code>
                          )}
                          {o.container_section_no != null && (
                            <code className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                              B-{String(o.container_section_no).padStart(3, "0")}
                            </code>
                          )}
                          <span className="text-sm font-medium">
                            {o.page_title ?? o.page_key}
                          </span>
                          {!o.is_clean && (
                            <Badge
                              variant="outline"
                              className="border-amber-300 bg-amber-50 text-[10px] text-amber-800"
                            >
                              Abweichung
                            </Badge>
                          )}
                        </div>
                        <code className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                          {o.page_key} · {o.container_section_key} › {o.child_section_key}
                        </code>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {o.has_image ? "🖼 " : ""}
                          {o.has_icon ? "★ " : ""}
                          {o.has_link ? "🔗 " : ""}
                          {o.has_cta ? "CTA " : ""}
                          <span className="ml-1">in {o.container_type}</span>
                        </div>
                        {(missingVsExample.length > 0 || extraVsExample.length > 0) && (
                          <div className="mt-1 space-y-0.5 text-[10px]">
                            {missingVsExample.length > 0 && (
                              <div className="text-amber-700">
                                fehlt vs. Beispiel: {missingVsExample.join(", ")}
                              </div>
                            )}
                            {extraVsExample.length > 0 && (
                              <div className="text-muted-foreground">
                                zusätzlich: {extraVsExample.join(", ")}
                              </div>
                            )}
                          </div>
                        )}
                        {o.synonyms.length > 0 && (
                          <div className="mt-0.5 text-[10px] text-amber-700">
                            Synonyme: {o.synonyms.join(", ")}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => onJumpToPage(o.page_no)}
                          disabled={!o.page_no}
                        >
                          Im Admin öffnen
                        </Button>
                        {o.page_route && (
                          <a
                            href={o.page_route}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex h-7 items-center justify-center gap-1 rounded border bg-background px-2 text-xs hover:bg-muted"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Public
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

// ---------- Block-/Teaser-Templates Ansicht (Stufe 0, read-only) ----------

interface BlockViewProps {
  occurrences: BlockTemplateOccurrencesByKey;
  loading: boolean;
  error: string | null;
  selectedKey: string;
  onSelect: (key: string) => void;
  onJumpToPage: (pageNo: number | null | undefined) => void;
}

function BlockTemplatesView({
  occurrences,
  loading,
  error,
  selectedKey,
  onSelect,
  onJumpToPage,
}: BlockViewProps) {
  const families = BLOCK_TEMPLATE_REGISTRY;
  const effectiveKey = selectedKey || families[0]?.template_key || "";
  const selected: BlockTemplateDefinition | undefined = families.find(
    (f) => f.template_key === effectiveKey,
  );
  const style = selected ? blockTypeStyle(selected.template_key) : null;
  const occs = selected ? occurrences[selected.template_key] ?? [] : [];
  // Pro Tab-Auswahl merken, welches Vorkommen aktuell vorgeschaut wird.
  // Key: `${page_key}|${section_key}`; null = keine Vorschau offen.
  const [previewOccKey, setPreviewOccKey] = useState<string | null>(null);
  const [previewLocale, setPreviewLocale] = useState<"de" | "en">("de");
  // Beim Wechsel des Templates die offene Vorschau schließen.
  useEffect(() => {
    setPreviewOccKey(null);
  }, [effectiveKey]);

  return (
    <div className="grid h-full min-h-0 grid-cols-12 gap-0 overflow-hidden">
      {/* LINKS: Liste */}
      <aside className="col-span-12 flex min-h-0 flex-col overflow-y-auto border-r bg-muted/20 p-3 md:col-span-3">
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Block-/Teaser-Templates ({families.length})
        </h4>
        <p className="mb-2 text-[11px] text-muted-foreground">
          Einzel-Section-Typen, die als wiederverwendbares Muster im Admin geführt werden.
          Read-only · keine Vererbung · keine Public-Wirkung.
        </p>
        <ul className="space-y-1">
          {families.map((t) => {
            const active = effectiveKey === t.template_key;
            const s = blockTypeStyle(t.template_key);
            const count = (occurrences[t.template_key] ?? []).length;
            return (
              <li key={t.template_key}>
                <button
                  type="button"
                  onClick={() => onSelect(t.template_key)}
                  className={`w-full rounded border-l-4 border border-l-purple-500 px-2 py-1.5 text-left text-xs transition-colors ${s.borderClass} ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-transparent bg-background hover:border-border hover:bg-muted"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="truncate font-medium">{t.name}</span>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${s.badgeClass}`}>
                      {s.label}
                    </span>
                  </div>
                  <code className="block truncate text-[10px] text-muted-foreground">
                    {t.template_key}
                  </code>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {count} Vorkommen
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* MITTE: Detail / Feldschema + Layout */}
      <section className="col-span-12 flex min-h-0 flex-col overflow-y-auto border-r p-4 md:col-span-5">
        {!selected && (
          <p className="text-sm text-muted-foreground">Kein Block-Template ausgewählt.</p>
        )}
        {selected && (
          <>
            <div className="mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold">{selected.name}</h3>
                {style && (
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${style.badgeClass}`}>
                    {style.label}
                  </span>
                )}
                <Badge variant="outline" className="text-[10px]">
                  Stufe 0 · read-only
                </Badge>
              </div>
              <code className="mt-0.5 block text-[11px] text-muted-foreground">
                {selected.template_key}
              </code>
              <p className="mt-1 text-xs text-muted-foreground">{selected.description}</p>
            </div>

            <div className="mb-3">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                Feldschema (cms_section_fields)
              </p>
              <ul className="space-y-1">
                {selected.fields.map((f) => (
                  <li
                    key={f.field_key}
                    className="rounded border bg-background px-2 py-1 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                        {f.field_key}
                      </code>
                      {f.required ? (
                        <span className="text-[10px] text-destructive">Pflicht</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">optional</span>
                      )}
                    </div>
                    <div className="ml-2 mt-0.5 text-[11px] text-muted-foreground">
                      {f.description}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-3">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                Asset-Slots (cms_assets)
              </p>
              <ul className="space-y-1">
                {selected.asset_slots.map((a) => (
                  <li
                    key={a.slot}
                    className="rounded border bg-background px-2 py-1 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-muted px-1 py-0.5 text-[10px]">{a.slot}</code>
                      {a.required ? (
                        <span className="text-[10px] text-destructive">Pflicht</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">optional</span>
                      )}
                    </div>
                    <div className="ml-2 mt-0.5 text-[11px] text-muted-foreground">
                      {a.description}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-3">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                Layout-Konvention (Code, kein Template-Setting)
              </p>
              <ul className="list-disc space-y-0.5 pl-5 text-[11px] text-muted-foreground">
                {selected.layout_notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>

            <p className="rounded border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] text-sky-900">
              Hinweis: Zentrale Template-Einstellungen (Bildverhältnis, Bewegung)
              kommen heute bewusst aus der Renderer-Komponente, nicht aus einer
              Template-Konfiguration. Künftige Stufen könnten das auslagern.
            </p>
          </>
        )}
      </section>

      {/* RECHTS: Vorkommen */}
      <section className="col-span-12 flex min-h-0 flex-col overflow-y-auto p-3 md:col-span-4">
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Vorkommen ({occs.length})
        </h4>
        {loading && (
          <p className="text-[11px] text-muted-foreground">Lade Vorkommen …</p>
        )}
        {error && (
          <p className="rounded border border-destructive/40 bg-destructive/5 px-2 py-1 text-xs text-destructive">
            {error}
          </p>
        )}
        {!loading && occs.length === 0 && (
          <p className="text-[11px] text-muted-foreground">
            Noch keine aktiven Sections mit diesem Typ gefunden.
          </p>
        )}
        <ul className="space-y-2">
          {occs.map((o) => {
            const pageTag = o.page_no != null ? `P-${String(o.page_no).padStart(3, "0")}` : null;
            const secTag = o.section_no != null ? `B-${String(o.section_no).padStart(3, "0")}` : null;
            const occKey = `${o.page_key}|${o.section_key}`;
            const isPreviewOpen = previewOccKey === occKey;
            return (
              <li
                key={occKey}
                className="rounded-md border bg-background p-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {pageTag && (
                        <code className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                          {pageTag}
                        </code>
                      )}
                      <span className="text-sm font-medium">
                        {o.page_title ?? o.page_key}
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-emerald-100 text-emerald-800 text-[10px]"
                      >
                        sauber modelliert
                      </Badge>
                    </div>
                    <code className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                      {o.page_key}
                    </code>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {secTag && (
                        <code className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                          {secTag}
                        </code>
                      )}
                      <code className="text-[10px] text-muted-foreground">
                        section_key: {o.section_key}
                      </code>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => onJumpToPage(o.page_no)}
                      disabled={!o.page_no}
                    >
                      Im Admin öffnen
                    </Button>
                    <Button
                      size="sm"
                      variant={isPreviewOpen ? "secondary" : "default"}
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() =>
                        setPreviewOccKey(isPreviewOpen ? null : occKey)
                      }
                      title={
                        isPreviewOpen
                          ? "Vorschau schließen"
                          : "Diesen Wechselteaser direkt anzeigen"
                      }
                    >
                      {isPreviewOpen ? (
                        <>
                          <EyeOff className="h-3 w-3" />
                          Vorschau schließen
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" />
                          Vorschau
                        </>
                      )}
                    </Button>
                    {o.page_route && (
                      <a
                        href={o.page_route}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex h-7 items-center justify-center gap-1 rounded border bg-background px-2 text-xs hover:bg-muted"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Public
                      </a>
                    )}
                  </div>
                </div>
                {isPreviewOpen && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Einzel-Vorschau (isoliert, read-only)
                      </span>
                      <div className="flex items-center gap-0.5 rounded border bg-background p-0.5">
                        {(["de", "en"] as const).map((l) => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => setPreviewLocale(l)}
                            className={`h-5 rounded px-1.5 text-[10px] uppercase ${
                              previewLocale === l
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <TeaserSectionPreview
                      pageKey={o.page_key}
                      sectionKey={o.section_key}
                      locale={previewLocale}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export default TemplateWorkshop;
