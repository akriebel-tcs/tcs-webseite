/**
 * Wahrheits-Check — Admin-Ansicht (read-only).
 *
 * Eine Zeile pro Section (page_key · section_key) als schmales Akkordeon.
 * Status der Zeile = schlimmster Einzelstatus aller Felder dieser Section.
 * Aufklappen zeigt jedes Feld einzeln mit den vier Quellen
 * (DB · Whitelist · Renderer · UI-Code-Fallback).
 *
 * Read-only. Keine Schreibwege. Keine Berührung von Produktdatenbank,
 * Navigation, Routen oder i18n.
 */
import { useEffect, useMemo, useState } from "react";

import {
  loadTruthReport,
  NAV_FALLBACK_KEY,
  NAV_FALLBACK_LABEL,
  TRUTH_OBJECT_STATUS_META,
  TRUTH_SEVERITY_META,
  TRUTH_STATUS_META,
  type ObjectGroupAggregate,
  type ObjectGroupStatus,
  type TruthRecord,
  type TruthReport,
  type TruthObjectAggregate,
  type TruthObjectKind,
  type TruthObjectStatus,
  type TruthSeverity,
  type TruthStatus,
} from "@/features/admin/lib/truthSources";

const STATUS_BADGE: Record<TruthStatus, string> = {
  one_truth: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  page_component_read: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",

  editable_empty: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  not_yet_configured: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  missing_whitelist: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  section_inactive: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  renderer_orphan: "bg-destructive/15 text-destructive border-destructive/30",
  ui_fallback: "bg-destructive/15 text-destructive border-destructive/30",
  db_dupes: "bg-destructive/15 text-destructive border-destructive/30",
  unknown_section_type: "bg-destructive/15 text-destructive border-destructive/30",
  section_missing: "bg-destructive/15 text-destructive border-destructive/30",
};

const OBJECT_BADGE: Record<TruthObjectStatus, string> = {
  green: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  yellow: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  red: "bg-destructive/15 text-destructive border-destructive/30",
};

const SEVERITY_FILTERS: ReadonlyArray<{
  key: TruthSeverity;
  label: string;
  cls: string;
  title: string;
}> = [
  {
    key: "critical",
    label: "Kritisch / Launch-Blocker",
    cls: "bg-destructive/10 text-destructive border-destructive/30",
    title:
      "Public zeigt falsch oder rendert nicht obwohl Admin sichtbar sagt, Dubletten, aktiver Baustein ohne Renderpfad. Nur diese Klasse blockiert die Abnahme.",
  },
  {
    key: "restschuld",
    label: "Restschuld",
    cls: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    title:
      "Optionaler Slot ohne Anbindung, Sonderrenderer mit registrierter Ausnahme. Kein Live-Fehler, aufzuräumen.",
  },
  {
    key: "warning",
    label: "Warnungen",
    cls: "bg-muted text-muted-foreground border-border",
    title:
      "Whitelist fehlt, Section ausgeblendet, Feld optional leer, Fallback aktiv. Hinweis, kein Blocker.",
  },
  {
    key: "green",
    label: "Grün",
    cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    title: "Eine Wahrheit — DB, Admin, Renderer und Public stimmen überein.",
  },
] as const;

type LevelKey = TruthSeverity;

function Dot({ on, title }: { on: boolean; title: string }) {
  return (
    <span
      title={title}
      aria-label={title}
      className={
        "inline-block h-2 w-2 shrink-0 rounded-full " +
        (on ? "bg-emerald-500" : "bg-destructive/70")
      }
    />
  );
}

function FieldRow({ rec }: { rec: TruthRecord }) {
  const meta = TRUTH_STATUS_META[rec.status];
  // DB-Quelle korrekt je nach Slot-Art: Text = cms_section_fields, Bild = cms_assets.
  const dbCount = rec.is_text_slot ? rec.text_nonempty_locales : rec.db_active_count;
  const dbLabel = rec.is_text_slot ? "DB (Text)" : "DB (Bild)";
  const dbTitle = rec.is_text_slot
    ? `Text aus cms_section_fields — ${rec.text_nonempty_locales} Locale(s) mit Inhalt`
    : `Bilder aus cms_assets — ${rec.db_active_count} aktiv / ${rec.db_inactive_count} inaktiv`;
  return (
    <div className="grid grid-cols-[160px_1fr_auto] gap-3 border-t border-border/60 px-3 py-2 text-xs">
      <div className="font-mono text-[11px] text-foreground">{rec.field_key}</div>
      <div className="space-y-1 text-muted-foreground">
        <div className="flex items-center gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1" title={dbTitle}>
            <Dot on={rec.has_content} title={dbTitle} /> {dbLabel}
            <span className="opacity-70">({dbCount})</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Dot on={rec.whitelist_enabled} title="Whitelist-Eintrag (Admin darf pflegen)" />
            Whitelist
          </span>
          <span className="inline-flex items-center gap-1">
            <Dot on={rec.renderer_reads} title="Renderer liest diesen Slot" /> Renderer
          </span>
          <span className="inline-flex items-center gap-1">
            <Dot on={!rec.ui_fallback} title="Kein bekannter Code-Fallback" /> Code
          </span>
        </div>
        <div className="text-[11px] leading-snug">{meta.explain}</div>
      </div>
      <span
        className={"shrink-0 self-start rounded border px-2 py-0.5 text-[10px] " + STATUS_BADGE[rec.status]}
      >
        {meta.label}
      </span>
    </div>
  );
}

const GROUP_BADGE: Record<ObjectGroupStatus, string> = {
  green: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  yellow: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  red: "bg-destructive/15 text-destructive border-destructive/30",
  inactive: "bg-muted text-muted-foreground border-border",
};

const GROUP_DOT: Record<ObjectGroupStatus, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-destructive",
  inactive: "bg-muted-foreground/40",
};

const GROUP_LABEL: Record<ObjectGroupStatus, string> = {
  green: "Grün",
  yellow: "Gelb",
  red: "Rot",
  inactive: "Aus (optional)",
};

function GroupRow({ group }: { group: ObjectGroupAggregate }) {
  return (
    <div className="grid grid-cols-[16px_minmax(0,1fr)_auto] items-start gap-2 border-t border-border/60 px-3 py-2 text-xs">
      <span aria-hidden className={"mt-1 inline-block h-2 w-2 rounded-full " + GROUP_DOT[group.status]} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{group.label}</span>
          {!group.required && (
            <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
              optional
            </span>
          )}
        </div>
        <div className="text-[11px] leading-snug text-muted-foreground">{group.reason}</div>
        {group.hint && (
          <div className="text-[10px] italic text-muted-foreground/70">{group.hint}</div>
        )}
      </div>
      <span className={"shrink-0 rounded border px-2 py-0.5 text-[10px] " + GROUP_BADGE[group.status]}>
        {GROUP_LABEL[group.status]}
      </span>
    </div>
  );
}

function PagePathRow({ pp }: { pp: TruthObjectAggregate["page_path"] }) {
  return (
    <div className="grid grid-cols-[16px_minmax(0,1fr)_auto] items-start gap-2 border-t border-border/60 bg-muted/30 px-3 py-2 text-xs">
      <span aria-hidden className={"mt-1 inline-block h-2 w-2 rounded-full " + GROUP_DOT[pp.status]} />
      <div className="min-w-0">
        <div className="font-medium text-foreground">Page-Pfad</div>
        <div className="text-[11px] leading-snug text-muted-foreground">{pp.reason}</div>
      </div>
      <span className={"shrink-0 rounded border px-2 py-0.5 text-[10px] " + GROUP_BADGE[pp.status]}>
        {GROUP_LABEL[pp.status]}
      </span>
    </div>
  );
}

function SectionRow({
  agg,
  open,
  onToggle,
  showAllSlots,
}: {
  agg: TruthObjectAggregate;
  open: boolean;
  onToggle: () => void;
  showAllSlots: boolean;
}) {
  const meta = TRUTH_OBJECT_STATUS_META[agg.status];
  const visibleGroups = showAllSlots ? agg.groups : agg.groups.filter((g) => g.status !== "inactive");
  const hiddenCount = agg.groups.length - visibleGroups.length;
  const [diagOpen, setDiagOpen] = useState(false);
  const sevMeta = TRUTH_SEVERITY_META[agg.severity];
  const SEV_BADGE: Record<TruthSeverity, string> = {
    critical: "bg-destructive/15 text-destructive border-destructive/30",
    restschuld: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    warning: "bg-muted text-muted-foreground border-border",
    green: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  };
  const SEV_LABEL: Record<TruthSeverity, string> = {
    critical: "Kritisch",
    restschuld: "Restschuld",
    warning: "Warnung",
    green: "Grün",
  };
  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={onToggle}
        className="grid w-full grid-cols-[20px_minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2 text-left text-xs hover:bg-muted/40"
      >
        <span
          aria-hidden
          className={"text-muted-foreground transition-transform " + (open ? "rotate-90" : "")}
        >
          ▶
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">
            {agg.label} <span className="text-muted-foreground">·</span> {agg.page_title ?? agg.page_key}
          </span>
          <span className="block truncate font-mono text-[10px] text-muted-foreground">
            {agg.page_key} · {agg.section_key} · {agg.section_type_normalized ?? agg.section_type_raw ?? "—"}
            {!agg.section_is_active && <span className="ml-1 text-amber-700">· inaktiv</span>}
          </span>
          <span className="block truncate text-[10px] text-muted-foreground">{agg.status_reason}</span>
        </span>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {visibleGroups.length} Baustein{visibleGroups.length === 1 ? "" : "e"}
          {hiddenCount > 0 && <span className="ml-1 opacity-60">(+{hiddenCount} aus)</span>}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <span
            className={"rounded border px-2 py-0.5 text-[10px] font-medium " + SEV_BADGE[agg.severity]}
            title={sevMeta.explain}
          >
            {SEV_LABEL[agg.severity]}
          </span>
          <span
            className={"rounded border px-1.5 py-0 text-[9px] opacity-70 " + OBJECT_BADGE[agg.status]}
            title={"Alter Objektstatus (DB/Renderer-Ampel): " + meta.label}
          >
            {meta.label}
          </span>
        </span>
      </button>
      {open && (
        <div className="bg-muted/10 pb-1">
          <PagePathRow pp={agg.page_path} />
          {visibleGroups.map((g) => (
            <GroupRow key={g.key} group={g} />
          ))}
          {hiddenCount > 0 && !showAllSlots && (
            <div className="border-t border-border/60 px-3 py-1.5 text-[10px] text-muted-foreground">
              {hiddenCount} optionale, derzeit nicht aktivierte Baustein{hiddenCount === 1 ? "" : "e"} ausgeblendet — global per Schalter „Alle Slots zeigen" einblenden.
            </div>
          )}
          {/* Diagnose (alte Rohfeld-Sicht) */}
          <div className="border-t border-border/60 px-3 py-1.5 text-[10px]">
            <button
              type="button"
              onClick={() => setDiagOpen((v) => !v)}
              className="text-muted-foreground underline-offset-2 hover:underline"
            >
              {diagOpen ? "Diagnose ausblenden" : `Diagnose: alle ${agg.records.length} Rohfelder zeigen`}
            </button>
          </div>
          {diagOpen && (
            <div className="bg-muted/20">
              {agg.records.map((r) => (
                <FieldRow key={`${r.section_key}|${r.field_key}`} rec={r} />
              ))}
              {agg.extra_records.length > 0 && (
                <div className="border-t border-border/60 px-3 py-1.5 text-[10px] italic text-muted-foreground">
                  Felder ohne Vertragsgruppe (Diagnose-Restbestand): {agg.extra_records.map((r) => r.field_key).join(", ")}
                </div>
              )}
            </div>
          )}
          {agg.page_route && (
            <div className="border-t border-border/60 px-3 py-2 text-[10px]">
              <a
                href={agg.page_route}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                Seite öffnen: {agg.page_route} ↗
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SlotValidationView() {
  const [report, setReport] = useState<TruthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default: Launch-Blocker + Restschuld zeigen — die für die Abnahme
  // relevanten Klassen. Warnungen + Grün sind optional zuschaltbar.
  const [activeLevels, setActiveLevels] = useState<Set<LevelKey>>(
    () => new Set<LevelKey>(["critical", "restschuld"]),
  );
  const [activeBereich, setActiveBereich] = useState<string | "all">("all");
  const [activeBaustein, setActiveBaustein] = useState<TruthObjectKind | "all">("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [explainOpen, setExplainOpen] = useState(false);
  const [showAllSlots, setShowAllSlots] = useState(false);

  const reload = () => {
    setLoading(true);
    setError(null);
    loadTruthReport()
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    reload();
  }, []);

  const bausteinCounts = useMemo<Array<{ key: TruthObjectKind; count: number; label: string }>>(() => {
    if (!report) return [];
    const labels: Record<TruthObjectKind, string> = {
      cta: "CTA",
      faq: "FAQ",
      card: "Karte",
      cards_grid: "Kartenraster",
      cards_scroller: "Kartenscroller",
      feature_grid: "Icon-Raster",
      teaser: "Wechselteaser",
      stats: "Kennzahlen",
      tabs: "Tabs",
      rich: "Freitext",
      downloads: "Downloads",
      contact: "Kontakt",
      content: "Inhalt",
      hero: "Hero",
    };
    const m = new Map<TruthObjectKind, number>();
    for (const s of report.objectAggregates) {
      const k = s.kind;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .map(([key, count]) => ({ key, count, label: labels[key] }))
      .sort((a, b) => b.count - a.count);
  }, [report]);

  const filtered = useMemo<TruthObjectAggregate[]>(() => {
    if (!report) return [];
    const q = search.trim().toLowerCase();
    return report.objectAggregates.filter((s) => {
      if (!activeLevels.has(s.severity)) return false;
      if (activeBereich !== "all") {
        const navKey = report.pageToNav[s.page_key] ?? NAV_FALLBACK_KEY;
        if (navKey !== activeBereich) return false;
      }
      if (activeBaustein !== "all" && s.kind !== activeBaustein) return false;
      if (q) {
        const hay = `${s.kind} ${s.page_key} ${s.page_title ?? ""} ${s.section_key} ${
          s.section_type_raw ?? ""
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [report, activeLevels, activeBereich, activeBaustein, search]);

  const toggleLevel = (k: LevelKey) =>
    setActiveLevels((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* Kopfzeile: KPIs + Erklärung + Reload */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded border bg-muted/20 px-3 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Wahrheits-Check</span>
          {report && (
            <>
              <span
                className="rounded border bg-destructive/15 px-2 py-0.5 text-destructive"
                title={TRUTH_SEVERITY_META.critical.explain}
              >
                {report.objectTotals.bySeverity.critical} Kritisch
              </span>
              <span
                className="rounded border bg-amber-500/15 px-2 py-0.5 text-amber-700"
                title={TRUTH_SEVERITY_META.restschuld.explain}
              >
                {report.objectTotals.bySeverity.restschuld} Restschuld
              </span>
              <span
                className="rounded border bg-muted px-2 py-0.5 text-muted-foreground"
                title={TRUTH_SEVERITY_META.warning.explain}
              >
                {report.objectTotals.bySeverity.warning} Warnungen
              </span>
              <span
                className="rounded border bg-emerald-500/15 px-2 py-0.5 text-emerald-700"
                title={TRUTH_SEVERITY_META.green.explain}
              >
                {report.objectTotals.bySeverity.green} Grün
              </span>
              <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground">
                {report.objectTotals.total} Objekte · {report.totals.pages} Seiten
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <label className="inline-flex cursor-pointer items-center gap-1 rounded border bg-background px-2 py-0.5 text-muted-foreground hover:bg-muted">
            <input
              type="checkbox"
              checked={showAllSlots}
              onChange={(e) => setShowAllSlots(e.target.checked)}
              className="h-3 w-3"
            />
            Alle Slots zeigen
          </label>
          <button
            type="button"
            onClick={() => setExplainOpen((v) => !v)}
            className="rounded border bg-background px-2 py-0.5 text-muted-foreground hover:bg-muted"
          >
            {explainOpen ? "Was prüfen wir? ✕" : "Was prüfen wir? ⓘ"}
          </button>
          <button
            type="button"
            onClick={reload}
            className="rounded border bg-background px-2 py-0.5 hover:bg-muted"
          >
            Neu laden
          </button>
        </div>
      </div>

      {explainOpen && (
        <div className="rounded border bg-muted/30 p-3 text-[11px] text-muted-foreground">
          <p>
            <strong>Schwereklassen:</strong> nur <strong>Kritisch</strong> blockiert die Abnahme
            (Public zeigt falsch oder rendert nicht, obwohl Admin sichtbar sagt; Dubletten; aktiver
            Baustein ohne Renderpfad). <strong>Restschuld</strong> = optionaler Slot nicht angebunden
            oder Sonderrenderer mit registrierter Ausnahme — aufzuräumen, kein Live-Fehler.
            <strong> Warnungen</strong> = Whitelist fehlt, Section ausgeblendet, Feld optional leer,
            Code-Fallback. <strong>Grün</strong> = eine Wahrheit.
          </p>
          <ul className="mt-1 grid gap-1 sm:grid-cols-2">
            <li>
              <strong>DB</strong>: Inhalt liegt in <code className="rounded bg-muted px-1">cms_assets</code> /{" "}
              <code className="rounded bg-muted px-1">cms_section_fields</code>
            </li>
            <li>
              <strong>Whitelist</strong>: Admin darf pflegen (
              <code className="rounded bg-muted px-1">cms_admin_editable_fields</code>)
            </li>
            <li>
              <strong>Renderer</strong>: Website-Komponente liest genau diesen field_key
            </li>
            <li>
              <strong>Code</strong>: kein Legacy-Pfad, der das Objekt aushebelt oder doppelt rendert
            </li>
          </ul>
          <p className="mt-2">Beim Aufklappen siehst du weiterhin die Felddetails als Diagnose darunter.</p>
        </div>
      )}

      {/* Fortschritt je Navigationsbereich (einklappbar, klickbar als Filter) */}
      {report && report.navProgress.length > 0 && (
        <details className="group rounded border bg-background">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-muted/30">
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className="text-muted-foreground transition-transform group-open:rotate-90"
              >
                ▶
              </span>
              <span className="font-semibold">Fortschritt je Navigationsbereich</span>
              <span className="text-[11px] text-muted-foreground">
                (Klick auf eine Zeile = Filter)
              </span>
            </span>
            <span className="text-[11px] text-muted-foreground">
               Gesamt:{" "}
              <strong className="text-foreground">
                 {report.objectTotals.byStatus.green} / {report.objectTotals.total}
              </strong>
            </span>
          </summary>
          <ul className="border-t p-2 text-xs">
            {report.navProgress.map((p) => {
              const okPct = p.percent;
              const warnPct = p.total > 0 ? Math.round((p.warn / p.total) * 100) : 0;
              const errPct = Math.max(0, 100 - okPct - warnPct);
              const isActive = activeBereich === p.key;
              return (
                <li key={p.key}>
                  <button
                    type="button"
                    onClick={() => setActiveBereich(isActive ? "all" : p.key)}
                    className={
                      "block w-full rounded border px-2 py-1 text-left transition hover:bg-muted/50 " +
                      (isActive ? "border-foreground bg-muted/40" : "border-border")
                    }
                  >
                    <div className="flex items-baseline justify-between gap-2 text-[11px]">
                      <span className="font-medium">{p.label}</span>
                      <span className="text-muted-foreground">
                        <strong className="text-foreground">{p.percent}%</strong>{" "}
                        <span className="opacity-70">
                          ({p.one_truth}/{p.total})
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 flex h-1 w-full overflow-hidden rounded bg-muted">
                      <span className="block h-full bg-emerald-500" style={{ width: `${okPct}%` }} />
                      <span className="block h-full bg-amber-500" style={{ width: `${warnPct}%` }} />
                      <span
                        className="block h-full bg-destructive/70"
                        style={{ width: `${errPct}%` }}
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      {/* Filter (kompakt, eine Zeile pro Filtergruppe) */}
      <div className="space-y-1.5 text-[11px]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground">Schwere:</span>
          <button
            type="button"
            onClick={() => setActiveLevels(new Set<LevelKey>(["critical", "restschuld", "warning", "green"]))}
            className="rounded border px-2 py-0.5 bg-background hover:bg-muted"
            title="Alle Schwereklassen einblenden"
          >
            Alles
          </button>
          {SEVERITY_FILTERS.map((l) => {
            const active = activeLevels.has(l.key);
            const count = report?.objectTotals.bySeverity[l.key] ?? 0;
            return (
              <button
                key={l.key}
                type="button"
                onClick={() => toggleLevel(l.key)}
                title={l.title}
                className={
                  "rounded border px-2 py-0.5 " +
                  (active ? l.cls : "border-muted bg-background text-muted-foreground hover:bg-muted")
                }
              >
                {l.label} <span className="ml-1 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>


        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground" title="Wo lebt diese Seite in der Navigation?">
            Bereich:
          </span>
          <button
            type="button"
            onClick={() => setActiveBereich("all")}
            className={
              "rounded border px-2 py-0.5 " +
              (activeBereich === "all"
                ? "bg-foreground text-background"
                : "bg-background hover:bg-muted")
            }
          >
            Alle
          </button>
          {report?.navBereiche.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => setActiveBereich(b.key)}
              title={b.key === NAV_FALLBACK_KEY ? NAV_FALLBACK_LABEL : b.key}
              className={
                "rounded border px-2 py-0.5 " +
                (activeBereich === b.key
                  ? "bg-foreground text-background"
                  : "bg-background hover:bg-muted")
              }
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="text-muted-foreground"
            title="Objekt-Typ"
          >
            Objekt:
          </span>
          <button
            type="button"
            onClick={() => setActiveBaustein("all")}
            className={
              "rounded border px-2 py-0.5 " +
              (activeBaustein === "all"
                ? "bg-foreground text-background"
                : "bg-background hover:bg-muted")
            }
          >
            Alle
          </button>
          {bausteinCounts.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => setActiveBaustein(b.key)}
              className={
                "rounded border px-2 py-0.5 text-[10px] " +
                (activeBaustein === b.key
                  ? "bg-foreground text-background"
                  : "bg-background hover:bg-muted")
              }
            >
              {b.label} <span className="ml-1 opacity-70">{b.count}</span>
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder="Suche: CTA, FAQ, Karte, page_key, section_key, Seitentitel …"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xl rounded border bg-background px-2 py-1 text-xs"
        />
      </div>

      {loading && <div className="text-sm text-muted-foreground">Lade Wahrheits-Check …</div>}
      {error && (
        <div className="rounded border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">
          Fehler beim Laden: {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded border bg-muted/40 p-3 text-sm text-muted-foreground">
          Keine Sections in dieser Auswahl. Filter erweitern oder „Eine Wahrheit" zuschalten.
        </div>
      )}

      {/* Akkordeon-Liste */}
      <div className="flex-1 overflow-auto rounded border bg-background">
        {filtered.map((agg) => {
          const id = `${agg.page_key}|${agg.section_key}`;
          return (
            <SectionRow
              key={id}
              agg={agg}
              open={openId === id}
              onToggle={() => setOpenId(openId === id ? null : id)}
              showAllSlots={showAllSlots}
            />
          );
        })}
      </div>

      <div className="text-[10px] text-muted-foreground">
        Read-only. Quellen: <code className="rounded bg-muted px-1">cms_assets</code>,{" "}
        <code className="rounded bg-muted px-1">cms_sections</code>,{" "}
        <code className="rounded bg-muted px-1">cms_admin_editable_fields</code>,{" "}
        <code className="rounded bg-muted px-1">cms_navigation_nodes</code>,{" "}
        <code className="rounded bg-muted px-1">rendererSlotMap.ts</code>. Keine Schreibwege, keine
        Migrationen.
      </div>
    </div>
  );
}
