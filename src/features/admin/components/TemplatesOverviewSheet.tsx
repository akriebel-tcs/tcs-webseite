/**
 * Stufe-0 Template-Übersicht im /admin.
 *
 * Reine Anzeige: listet pro Template-Gruppe die Mitglieder-Seiten, ihren
 * Status, die Public-Route sowie einen Vergleich mit der Referenz-Struktur.
 *
 * Bewusst nicht enthalten:
 *   - keine Template-Engine / Vererbung
 *   - keine globale Layout-/Style-Bearbeitung
 *   - keine Schreib-RPCs (read-only)
 *   - keine Public-Renderer-Änderung
 *   - keine neue Migration
 */

import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, LayoutTemplate } from "lucide-react";
import {
  TEMPLATE_REGISTRY,
  compareToReference,
  type ObservedSection,
  type TemplateMatchResult,
} from "@/features/admin/lib/templates";
import { readPagesWithNav, type CmsPageRow } from "@/features/admin/api/cmsAdminPages";
import { resolveShortId } from "@/features/admin/api/cmsAdminResolve";
import type { JumpTarget } from "@/features/admin/components/GoToShortIdBar";

interface Props {
  /** Wird aus AdminPage durchgereicht, damit „Im Admin öffnen" zur Seite springt. */
  onJump: (target: JumpTarget) => void;
}

interface PageMeta {
  page_no: number | null;
  page_key: string;
  title_de: string | null;
  route_path: string | null;
  status: string;
  is_active: boolean;
  /** Top-Level-Sections (parent_section_id IS NULL), sortiert nach sort_order. */
  topSections: ObservedSection[] | null;
  /** True, wenn die Seite gar nicht in cms_pages gefunden wurde. */
  notFound: boolean;
}

interface SectionRow {
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
  for (const row of data as Array<SectionRow & { page_key: string }>) {
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

const TemplatesOverviewSheet = ({ onJump }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState<CmsPageRow[]>([]);
  const [sectionsByPage, setSectionsByPage] = useState<Map<string, ObservedSection[]>>(
    new Map(),
  );
  const [error, setError] = useState<string | null>(null);
  const [jumping, setJumping] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const allPageKeys = Array.from(
      new Set(
        TEMPLATE_REGISTRY.flatMap((t) => [t.reference_page_key, ...t.member_page_keys]),
      ),
    );
    Promise.all([readPagesWithNav(), loadTopSections(allPageKeys)])
      .then(([bundle, secs]) => {
        if (cancelled) return;
        if (bundle.error) setError(bundle.error);
        setPages(bundle.pages);
        setSectionsByPage(secs);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const pageByKey = useMemo(() => {
    const m = new Map<string, CmsPageRow>();
    for (const p of pages) m.set(p.page_key, p);
    return m;
  }, [pages]);

  const buildMeta = (pageKey: string): PageMeta => {
    const p = pageByKey.get(pageKey);
    if (!p) {
      return {
        page_no: null,
        page_key: pageKey,
        title_de: null,
        route_path: null,
        status: "?",
        is_active: false,
        topSections: sectionsByPage.get(pageKey) ?? null,
        notFound: true,
      };
    }
    return {
      page_no: p.page_no,
      page_key: p.page_key,
      title_de: p.title_de,
      route_path: p.route_path,
      status: p.status,
      is_active: p.is_active,
      topSections: sectionsByPage.get(pageKey) ?? [],
      notFound: false,
    };
  };

  const handleJumpToPage = async (pageNo: number | null) => {
    if (!pageNo) return;
    setJumping(`P-${pageNo}`);
    try {
      const r = await resolveShortId({
        kind: "P",
        value: pageNo,
        formatted: `P-${String(pageNo).padStart(3, "0")}`,
      });
      if (r.success) {
        onJump({
          page_key: r.page_key,
          section_key: null,
          node_id: null,
          field_key: null,
          label: r.page_key,
          raw: r,
        });
        setOpen(false);
      }
    } finally {
      setJumping(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          title="Template-Übersicht (Stufe 0)"
        >
          <LayoutTemplate className="h-3.5 w-3.5" />
          Templates
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Template-Übersicht</SheetTitle>
          <SheetDescription>
            Stufe 0: reine Übersicht. Template-Änderungen wirken{" "}
            <strong>noch nicht automatisch</strong> auf alle Seiten — jede Seite
            wird heute weiterhin einzeln im CMS-Light gepflegt.
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <p className="mt-4 text-sm text-muted-foreground">Lade Seitendaten …</p>
        )}
        {error && (
          <p className="mt-4 rounded border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            Fehler beim Laden: {error}
          </p>
        )}

        <div className="mt-4 space-y-6">
          {TEMPLATE_REGISTRY.map((tpl) => {
            const refMeta = buildMeta(tpl.reference_page_key);
            return (
              <section
                key={tpl.template_key}
                className="rounded-lg border bg-card p-4 shadow-sm"
              >
                <header className="mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold">{tpl.name}</h3>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {tpl.template_key}
                    </code>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{tpl.description}</p>
                </header>

                {/* Referenz */}
                <div className="mb-4 rounded-md border border-primary/30 bg-primary/5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          Referenzseite
                        </Badge>
                        {refMeta.page_no !== null && (
                          <code className="rounded bg-background px-1.5 py-0.5 text-[10px]">
                            P-{String(refMeta.page_no).padStart(3, "0")}
                          </code>
                        )}
                        <span className="text-sm font-medium">
                          {refMeta.title_de ?? tpl.reference_page_key}
                        </span>
                      </div>
                      <code className="mt-1 block text-[11px] text-muted-foreground">
                        {tpl.reference_page_key}
                      </code>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleJumpToPage(refMeta.page_no)}
                        disabled={refMeta.notFound || jumping !== null}
                      >
                        Referenzseite öffnen
                      </Button>
                      {refMeta.route_path && (
                        <a
                          href={refMeta.route_path}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex h-7 items-center gap-1 rounded border bg-background px-2 text-xs hover:bg-muted"
                          title="Öffentliche Seite in neuem Tab öffnen"
                        >
                          <ExternalLink className="h-3 w-3" />
                          öffentliche Seite
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Erwartete Struktur */}
                  <div className="mt-3">
                    <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      Erwartete Struktur (Top-Level-Sections)
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {tpl.reference_sections.map((s) => (
                        <li
                          key={s.section_key}
                          className="rounded border bg-background px-1.5 py-0.5 text-[11px]"
                        >
                          {s.sort_order} · <strong>{s.section_key}</strong> ({s.section_type})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Mitglieder */}
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Mitglieder ({tpl.member_page_keys.length})
                  </p>
                  <ul className="space-y-2">
                    {tpl.member_page_keys.map((pk) => {
                      const meta = buildMeta(pk);
                      const isRef = pk === tpl.reference_page_key;
                      const match = meta.topSections
                        ? compareToReference(tpl.reference_sections, meta.topSections, tpl)
                        : null;
                      return (
                        <li
                          key={pk}
                          className="rounded-md border bg-background p-2.5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {meta.page_no !== null && (
                                  <code className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                                    P-{String(meta.page_no).padStart(3, "0")}
                                  </code>
                                )}
                                <span className="text-sm font-medium">
                                  {meta.title_de ?? pk}
                                </span>
                                {isRef && (
                                  <Badge variant="outline" className="text-[10px]">
                                    Referenz
                                  </Badge>
                                )}
                                {meta.notFound ? (
                                  <Badge
                                    variant="outline"
                                    className="border-destructive/30 bg-destructive/10 text-[10px] text-destructive"
                                  >
                                    nicht gefunden
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                    title={`status=${meta.status} · is_active=${meta.is_active}`}
                                  >
                                    {meta.status}
                                    {meta.is_active ? " · aktiv" : " · inaktiv"}
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
                              <code className="mt-1 block truncate text-[11px] text-muted-foreground">
                                {pk}
                              </code>
                              {match && (match.missingKeys.length > 0 ||
                                match.typeMismatches.length > 0 ||
                                match.extraKeys.length > 0) && (
                                <div className="mt-1.5 space-y-0.5 text-[11px]">
                                  {match.missingKeys.length > 0 && (
                                    <div className="text-destructive">
                                      fehlt: {match.missingKeys.join(", ")}
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
                                      zusätzlich vorhanden: {match.extraKeys.join(", ")}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex shrink-0 gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleJumpToPage(meta.page_no)}
                                disabled={meta.notFound || jumping !== null}
                                title="Seite im Admin öffnen"
                              >
                                Im Admin öffnen
                              </Button>
                              {meta.route_path && (
                                <a
                                  href={meta.route_path}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="inline-flex h-7 items-center gap-1 rounded border bg-background px-2 text-xs hover:bg-muted"
                                  title="Öffentliche Seite in neuem Tab öffnen"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            );
          })}
        </div>

        <p className="mt-6 text-[11px] text-muted-foreground">
          Stufe 0 · Templates sind Code+Konvention. Spätere Stufen (gemeinsamer
          Renderer, DB-Spalte <code>template_key</code>, automatisches
          Skeleton) sind in <code>docs/01-strategie/templates.md</code>{" "}
          beschrieben und noch nicht aktiv.
        </p>
      </SheetContent>
    </Sheet>
  );
};

export default TemplatesOverviewSheet;
