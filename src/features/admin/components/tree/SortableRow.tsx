/**
 * SortableRow — eine ziehbare Zeile im Navigationsbaum.
 * Mechanisch aus NavigationTreeEditor ausgelagert (Split-1).
 * Keine Logik-Änderung.
 */
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ShortIdBadge from "@/features/admin/components/ShortIdBadge";
import CardLinkPill from "./CardLinkPill";
import type { SectionCardLink } from "./SectionRowView";
import type { TreeNode } from "./types";
import { resolveSeitentyp } from "@/features/admin/lib/pageTypeMatrix";

export interface SortableRowProps {
  node: TreeNode;
  depth: number;
  parentId: string | null;
  siblings: TreeNode[];
  index: number;
  onIndent: (node: TreeNode, prevSibling: TreeNode | null) => void;
  onOutdent: (node: TreeNode) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
  busy: boolean;
  pageNoByPageKey: Map<string, number>;
  /** page_key → raw page_type code (z. B. "T03"). Optional. */
  pageTypeByPageKey?: Map<string, string>;
  /**
   * page_key → {status, is_active} aus `cms_pages`. Read-only.
   * Trennt im Baum die **Seite** (live/offline) sauber von der
   * **Navigations-Zeile** (Hauptmenü/Footer an/aus). Ohne diese Trennung
   * sieht eine Seite, die nur nicht im Hauptmenü steht, aus wie eine
   * komplett ausgeschaltete Seite (Batch 5b — Navigations-Bug).
   */
  pageStatusByPageKey?: Map<string, { status: string; is_active: boolean }>;
  onToggleActive: (node: TreeNode) => void;
  /** Etappe 1b — eigener Schalter für `show_in_public_nav`. */
  onTogglePublic: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;
  isExpanded: boolean;
  onToggleExpand: (node: TreeNode, depth: number) => void;
  /** Knoten ist aufklappbar, auch wenn er keine Navigations-Kinder hat
   *  (z. B. Seite mit Inhaltsblöcken). */
  forceExpandable?: boolean;
  /**
   * Optionale, aufgelöste Verlinkung dieses Navigations-Knotens
   * (Etappe `cms-admin-link-pills-all-nav-areas-1`). Wenn gesetzt,
   * wird unter der Zeile die gleiche Link-Pille gerendert wie bei
   * Inhalts-Blöcken — read-only.
   */
  navLink?: SectionCardLink | null;
}

export const SortableRow = ({
  node,
  depth,
  parentId,
  siblings,
  index,
  onIndent,
  onOutdent,
  onSelect,
  selectedId,
  busy,
  pageNoByPageKey,
  pageTypeByPageKey,
  pageStatusByPageKey,
  onToggleActive,
  onTogglePublic,
  onDelete,
  isExpanded,
  onToggleExpand,
  forceExpandable,
  navLink,
}: SortableRowProps) => {
  const hasChildren = node.children.length > 0 || !!forceExpandable;
  const pageNo = node.page_key ? pageNoByPageKey.get(node.page_key) : undefined;
  const pageTypeCode = node.page_key ? pageTypeByPageKey?.get(node.page_key) : undefined;
  const seitentyp = pageTypeCode ? resolveSeitentyp(pageTypeCode) : null;
  const pageStatus = node.page_key ? pageStatusByPageKey?.get(node.page_key) : undefined;
  const pageIsLive =
    !!pageStatus && pageStatus.is_active && pageStatus.status === "published";
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });
  const prevSibling = index > 0 ? siblings[index - 1] : null;
  const canIndent = !!prevSibling;
  const canOutdent = !!parentId;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  // Tastatur-Bedienung am Label-Button:
  //  • → expandiert (oder springt nichts, wenn schon offen),
  //  • ← klappt zu (oder ausrücken, wenn schon zu — nur wenn möglich),
  //  • Enter/Space wählt aus (Standard-Browser-Verhalten),
  //  • + / - alternativ für Aufklappen/Zuklappen.
  const handleLabelKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "+") {
      if (hasChildren && !isExpanded) {
        e.preventDefault();
        onToggleExpand(node, depth);
      }
    } else if (e.key === "ArrowLeft" || e.key === "-") {
      if (hasChildren && isExpanded) {
        e.preventDefault();
        onToggleExpand(node, depth);
      }
    }
  };

  // Touch-Mindestgröße: alle Aktions-Buttons mind. 32px hoch (Apple HIG/WCAG 2.5.5).
  const tapBtn =
    "inline-flex h-8 min-w-[32px] items-center justify-center rounded border px-2 text-xs " +
    "active:scale-95 transition disabled:opacity-30";

  return (
    <>
    <div
      ref={setNodeRef}
      style={style}
      data-tree-node-id={node.id}
      className={
        "group flex flex-wrap items-center gap-1.5 rounded border bg-card px-2 py-1.5 text-sm " +
        (selectedId === node.id ? "border-foreground" : "border-border")
      }
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={selectedId === node.id}
      aria-level={depth + 1}
    >
      <button
        type="button"
        className="cursor-grab touch-none select-none rounded px-2 py-1 text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        {...attributes}
        {...listeners}
        aria-label={`Knoten „${node.label_de ?? node.label ?? node.node_key}" verschieben (Leertaste greifen, Pfeile bewegen, Leertaste/Enter ablegen, ESC abbrechen)`}
        title="Ziehen oder per Tastatur (Space + Pfeile) zum Neuordnen"
      >
        ⋮⋮
      </button>
      <div style={{ width: depth * 16 }} aria-hidden="true" />
      <button
        type="button"
        onClick={() => hasChildren && onToggleExpand(node, depth)}
        disabled={!hasChildren}
        className={
          "shrink-0 inline-flex h-8 w-8 items-center justify-center text-base select-none " +
          (hasChildren ? "text-foreground hover:bg-muted rounded focus-visible:ring-2 focus-visible:ring-ring" : "text-transparent")
        }
        aria-label={isExpanded ? "Zuklappen" : "Aufklappen"}
        aria-expanded={hasChildren ? isExpanded : undefined}
        title={hasChildren ? (isExpanded ? "Zuklappen" : "Aufklappen") : ""}
      >
        {hasChildren ? (isExpanded ? "▾" : "▸") : "·"}
      </button>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        onKeyDown={handleLabelKeyDown}
        className="flex min-w-0 flex-1 basis-[180px] flex-col items-start text-left rounded px-1 py-0.5 focus-visible:ring-2 focus-visible:ring-ring"
        title={node.node_key}
      >
        <div className="flex w-full min-w-0 items-center gap-1.5">
          <ShortIdBadge kind="N" value={node.node_no} hint={`Knoten ${node.node_key}`} />
          {pageNo != null && (
            <ShortIdBadge kind="P" value={pageNo} hint={node.page_key ?? undefined} />
          )}
          <span className="truncate font-medium text-foreground">
            {node.label_de ?? node.label ?? "(ohne Beschriftung)"}
          </span>
          {node.page_key && pageStatus && (
            <span
              className={
                "shrink-0 rounded px-1 text-[10px] " +
                (pageIsLive
                  ? "bg-emerald-500/10 text-emerald-700"
                  : "bg-amber-500/10 text-amber-700")
              }
              title={
                pageIsLive
                  ? `Seite ist live: status=${pageStatus.status}, aktiv. Über die Route direkt erreichbar — unabhängig vom Hauptmenü.`
                  : `Seite ist offline: status=${pageStatus.status}, is_active=${pageStatus.is_active}. Auch über Direkt-Route nicht erreichbar.`
              }
            >
              {pageIsLive ? "Seite live" : "Seite offline"}
            </span>
          )}
          {!node.is_active && (
            <span
              className="shrink-0 rounded bg-muted px-1 text-[10px] text-muted-foreground"
              title={
                node.nav_area === "main"
                  ? 'Knoten im Hauptmenü ist ausgeschaltet. Die Seite selbst bleibt live (siehe „Seite live"-Badge), wenn dort grün.'
                  : node.nav_area === "footer" || node.nav_area === "footer_bottom"
                    ? "Knoten im Footer ist ausgeschaltet. Andere Nav-Bereiche oder Direkt-Routen können die Seite weiter zeigen."
                    : `Knoten im Bereich „${node.nav_area}" ist ausgeschaltet.`
              }
            >
              {node.nav_area === "main"
                ? "Hauptmenü aus"
                : node.nav_area === "footer" || node.nav_area === "footer_bottom"
                  ? "Footer aus"
                  : "Nav aus"}
            </span>
          )}
          {node.node_type !== "page" && (
            <span className="shrink-0 rounded bg-muted px-1 text-[10px] text-muted-foreground">
              {node.node_type}
            </span>
          )}
        </div>
        <span className="block w-full truncate font-mono text-[10px] text-muted-foreground">
          {node.node_key}
        </span>
        {!node.is_active && node.nav_area === "main" && pageIsLive && (
          <span className="block w-full text-[10px] italic text-muted-foreground/80">
            Seite ist live und erreichbar — erscheint nur nicht im Hauptmenü oben. Aufruf über Karten-Verlinkung oder Direkt-Route.
          </span>
        )}

        {seitentyp && (
          <span
            className="block w-full truncate text-[10px] text-muted-foreground"
            title={`Seitentyp ${seitentyp.label} (Code ${pageTypeCode}) · ${seitentyp.description}`}
          >
            {seitentyp.label} · <code className="font-mono">{pageTypeCode}</code>
          </span>
        )}
      </button>
      <button
        type="button"
        disabled={!canOutdent || busy}
        onClick={() => onOutdent(node)}
        className={tapBtn}
        title="Ausrücken (eine Ebene hoch)"
        aria-label="Ausrücken"
      >
        ←
      </button>
      <button
        type="button"
        disabled={!canIndent || busy}
        onClick={() => onIndent(node, prevSibling)}
        className={tapBtn}
        title="Einrücken (Kind des Vorgängers)"
        aria-label="Einrücken"
      >
        →
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onToggleActive(node)}
        className={
          tapBtn + " gap-1 " + (node.is_active ? "" : "bg-amber-500/10 border-amber-500/40 text-amber-700")
        }
        title={
          (node.nav_area === "main"
            ? "Hauptmenü-Knoten: "
            : node.nav_area === "footer" || node.nav_area === "footer_bottom"
              ? "Footer-Knoten: "
              : `Nav-Bereich „${node.nav_area}": `) +
          (node.is_active
            ? "An. Klicken: in diesem Nav-Bereich ausschalten. Die Seite bleibt live und über ihre Route erreichbar (Direkt-Link, andere Nav-Bereiche, Karten-Verlinkungen)."
            : "Aus. Klicken: in diesem Nav-Bereich einschalten. Die Seite selbst (status/is_active in cms_pages) wird dadurch NICHT verändert.")
        }
        aria-label={node.is_active ? "Nav-Knoten ausschalten" : "Nav-Knoten einschalten"}
      >
        {node.is_active
          ? node.nav_area === "main"
            ? "👁 Im Hauptmenü"
            : node.nav_area === "footer" || node.nav_area === "footer_bottom"
              ? "👁 Im Footer"
              : "👁 Nav an"
          : node.nav_area === "main"
            ? "🚫 Hauptmenü aus"
            : node.nav_area === "footer" || node.nav_area === "footer_bottom"
              ? "🚫 Footer aus"
              : "🚫 Nav aus"}
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={() => onDelete(node)}
        className={tapBtn + " border-destructive/40 text-destructive hover:bg-destructive/10"}
        title="Knoten löschen (mit Rückfrage)"
        aria-label="Löschen"
      >
        🗑
      </button>
    </div>
    {navLink && (
      <CardLinkPill
        link={navLink}
        className={`mt-0.5 ml-9`}
      />
    )}
    </>
  );
};

export default SortableRow;
