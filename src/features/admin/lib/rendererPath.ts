/**
 * rendererPath.ts
 * ---------------
 * Read-only Helfer für die Admin-Anzeige „Technischer Renderpfad".
 *
 * Hintergrund:
 *   Fachlicher Seitentyp (T01…T19) und technischer Renderer-Pfad sind
 *   nicht dasselbe. Eine T03/T04-Standardseite kann z. B. fachlich
 *   identisch sein und trotzdem technisch über eine eigene Page-Komponente
 *   laufen statt über `GenericCmsPage`. Damit Redaktion und technische
 *   Steuerung das im /admin sehen, blenden wir neben dem T-Code einen
 *   zweiten Hinweis ein.
 *
 * Quelle: `rendererPathMap.generated.ts` — wird von
 *   `scripts/admin/build-renderer-path-map.mjs` aus dem bestehenden
 *   `page-renderer-coverage.json` + Route-Scan erzeugt. Reine Diagnose,
 *   keine zweite Wahrheit über Inhalte, Reihenfolge oder Sichtbarkeit.
 */

import {
  RENDERER_PATH_MAP,
  type RendererPath,
  type RendererPathEntry,
  type RendererStatus,
} from "./rendererPathMap.generated";

export type { RendererPath, RendererPathEntry, RendererStatus };

const RENDERER_PATH_LABELS: Record<RendererPath, string> = {
  generic_cms_page: "Standard CMS (GenericCmsPage)",
  cms_only_shell: "CMS-only Shell",
  product_solution_shell: "Produktlösungs-Shell",
  eigene_komponente_generisch:
    "Eigene Page-Komponente (rendert generisch über DB)",
  eigene_komponente_teilweise: "Eigene Page-Komponente (gemischt)",
  eigene_komponente: "Eigene Page-Komponente",
};

const STATUS_LABELS: Record<RendererStatus, string> = {
  standardisiert: "Standardisiert",
  gemischt: "Gemischt",
  sonderlogik: "Sonderlogik",
};

const STATUS_TONE: Record<
  RendererStatus,
  { bg: string; text: string; border: string }
> = {
  standardisiert: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-800",
    border: "border-emerald-500/30",
  },
  gemischt: {
    bg: "bg-amber-500/10",
    text: "text-amber-800",
    border: "border-amber-500/40",
  },
  sonderlogik: {
    bg: "bg-slate-500/10",
    text: "text-slate-700",
    border: "border-slate-500/30",
  },
};

export interface ResolvedRendererPath {
  entry: RendererPathEntry | null;
  rendererLabel: string;
  statusLabel: string;
  statusTone: { bg: string; text: string; border: string };
}

export function resolveRendererPath(
  pageKey: string | null | undefined,
): ResolvedRendererPath {
  const entry = pageKey ? RENDERER_PATH_MAP[pageKey] ?? null : null;
  if (!entry) {
    return {
      entry: null,
      rendererLabel: "Nicht klassifiziert",
      statusLabel: "—",
      statusTone: STATUS_TONE.sonderlogik,
    };
  }
  return {
    entry,
    rendererLabel: RENDERER_PATH_LABELS[entry.renderer_path],
    statusLabel: STATUS_LABELS[entry.status],
    statusTone: STATUS_TONE[entry.status],
  };
}
