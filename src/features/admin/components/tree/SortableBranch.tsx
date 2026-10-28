/**
 * SortableBranch — rekursive Navigations-Baum-Ebene mit DnD.
 * Mechanisch aus NavigationTreeEditor ausgelagert (Split-1).
 * Keine Logik-Änderung.
 */
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { SectionRow } from "@/features/admin/api/cmsAdminSectionOrder";
import type { ClipboardItem } from "@/features/admin/components/ClipboardBanner";
import type { NavigationNodeRow } from "@/features/admin/api/cmsAdminNavigation";
import type { PageLookup } from "@/features/admin/api/cmsAdminCardLinks";
import { SortableRow } from "./SortableRow";
import { SectionList } from "./SectionLevel";
import type { TreeNode } from "./types";
import { resolveNavNodeLink } from "@/features/admin/lib/resolveCardLink";
import { useMemo } from "react";

export interface SortableBranchProps {
  parentId: string | null;
  siblings: TreeNode[];
  depth: number;
  onReorder: (parentId: string | null, oldIndex: number, newIndex: number) => void;
  onIndent: (node: TreeNode, prevSibling: TreeNode | null) => void;
  onOutdent: (node: TreeNode) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
  busy: boolean;
  pageNoByPageKey: Map<string, number>;
  /** page_key → raw page_type code (z. B. "T03"). Optional. */
  pageTypeByPageKey?: Map<string, string>;
  /** page_key → {status, is_active} aus `cms_pages` (Seiten-Wahrheit). */
  pageStatusByPageKey?: Map<string, { status: string; is_active: boolean }>;
  onToggleActive: (node: TreeNode) => void;
  onTogglePublic: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;
  expanded: Set<string>;
  onToggleExpand: (node: TreeNode, depth: number) => void;
  sectionsByPage: Map<string, SectionRow[]>;
  loadingSections: Set<string>;
  onSectionToggleActive: (s: SectionRow) => void;
  onSectionMove: (s: SectionRow, dir: "up" | "down") => void;
  onSectionDelete: (s: SectionRow) => void;
  onSectionDuplicate: (s: SectionRow) => void;
  /** Etappe `cms-admin-rename-card-section-key-1`. */
  onSectionRename?: (s: SectionRow) => void;
  onSectionSelect: (s: SectionRow) => void;
  selectedSectionKey: string | null;
  onSectionApplyOrder: (pageKey: string, orderedKeys: string[]) => void | Promise<void>;
  onSectionSetParent: (
    pageKey: string,
    sectionKey: string,
    newParentSectionKey: string | null,
    position: number | null,
  ) => void | Promise<void>;
  /** Klemmbrett (Etappe `cms-light-admin-clipboard-1`). */
  clipboard?: ClipboardItem | null;
  /** Aus Zwischenablage einfügen. */
  onPasteFromClipboard?: (
    targetPageKey: string,
    parentSectionKey: string | null,
    position: number,
  ) => void | Promise<void>;
  /** Etappe card-link-1: alle Nav-Knoten (Legacy, optional). */
  navNodes?: NavigationNodeRow[];
  /** Etappe `cms-admin-card-links-visible-audit-1`: route_path → Page-Infos. */
  pagesByRoute?: Map<string, PageLookup>;
  /** Etappe card-link-1: Sprung auf die Zielseite einer Karte. */
  onJumpToPage?: (pageKey: string) => void;
  /** Zähler aus dem Workbench-Sprung (Re-Expand/Re-Scroll im Section-Tree). */
  externalSelectionToken?: number;
  /** Batch 47a: Zähler, der nach jedem Feld-Save erhöht wird —
   *  erzwingt das Neu-Lesen der Karten-Linkfelder in `SectionList`,
   *  damit die graue Link-Pille immer das aktuelle Linkziel zeigt. */
  linksRefreshToken?: number;
}

export const SortableBranch = ({
  parentId,
  siblings,
  depth,
  onReorder,
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
  expanded,
  onToggleExpand,
  sectionsByPage,
  loadingSections,
  onSectionToggleActive,
  onSectionMove,
  onSectionDelete,
  onSectionDuplicate,
  onSectionRename,
  onSectionSelect,
  selectedSectionKey,
  onSectionApplyOrder,
  onSectionSetParent,
  clipboard,
  onPasteFromClipboard,
  navNodes,
  pagesByRoute,
  onJumpToPage,
  externalSelectionToken,
  linksRefreshToken,
}: SortableBranchProps) => {
  // Multi-Modal-Sensoren:
  //  • PointerSensor   — Maus/Stift; 6px Distanz, damit Klicks nicht zu Drags werden.
  //  • TouchSensor     — Finger; 200ms Press + 8px Toleranz, damit Scrollen
  //                     auf dem Handy nicht versehentlich einen Drag auslöst.
  //  • KeyboardSensor  — Tab fokussiert den Drag-Griff, dann Leertaste = greifen,
  //                     Pfeile ↑/↓ verschieben, Leertaste/Enter = ablegen, ESC = abbrechen.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = siblings.map((s) => s.id);

  // pagesByKey wird einmalig je Render aus pagesByRoute abgeleitet, damit
  // resolveNavNodeLink page_key-Treffer ohne weiteren Lookup auflösen kann.
  const pagesByKey = useMemo(() => {
    const m = new Map<string, import("@/features/admin/api/cmsAdminCardLinks").PageLookup>();
    if (pagesByRoute) for (const p of pagesByRoute.values()) m.set(p.page_key, p);
    return m;
  }, [pagesByRoute]);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(parentId, oldIndex, newIndex);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1">
          {siblings.map((node, idx) => {
            const isOpen = expanded.has(node.id);
            const hasNavChildren = node.children.length > 0;
            const hasPage = !!node.page_key;
            // Footer-/Footer-Bottom-Eintraege sind nur Link-Zeilen (Label + Ziel).
            // Sie sollen NICHT als volle Seiten mit Inhaltsbloecken (Sections)
            // aufklappbar sein — der Inhalt der verlinkten Zielseite wird an
            // anderer Stelle im Baum bzw. im Arbeitsbereich gepflegt.
            const isFooterArea =
              node.nav_area === "footer" || node.nav_area === "footer_bottom";
            const treatAsLinkOnly = isFooterArea && hasPage;
            const showSections = isOpen && hasPage && !treatAsLinkOnly;
            const sections = node.page_key && !treatAsLinkOnly
              ? sectionsByPage.get(node.page_key)
              : undefined;
            const isLoadingSections = node.page_key && !treatAsLinkOnly
              ? loadingSections.has(node.page_key)
              : false;
            const navLink = pagesByRoute
              ? resolveNavNodeLink({
                  node,
                  pagesByRoute,
                  pagesByKey,
                  onJump: onJumpToPage,
                })
              : null;
            return (
              <div key={node.id}>
                <SortableRow
                  node={node}
                  depth={depth}
                  parentId={parentId}
                  siblings={siblings}
                  index={idx}
                  onIndent={onIndent}
                  onOutdent={onOutdent}
                  onSelect={onSelect}
                  selectedId={selectedId}
                  busy={busy}
                  pageNoByPageKey={pageNoByPageKey}
                  pageTypeByPageKey={pageTypeByPageKey}
                  pageStatusByPageKey={pageStatusByPageKey}
                  onToggleActive={onToggleActive}
                  onTogglePublic={onTogglePublic}
                  onDelete={onDelete}
                  isExpanded={isOpen}
                  onToggleExpand={onToggleExpand}
                  forceExpandable={hasNavChildren || (hasPage && !treatAsLinkOnly)}
                  navLink={navLink}
                />
                {/*
                  Render-Reihenfolge bewusst: erst die Sections (Inhalts-Bloecke
                  der Seite), DANACH die Navigations-Kinder (eigene Unterseiten).
                  Damit liest sich der Baum wie die echte Seite von oben nach
                  unten — Hero, Uebersicht, Karten-Block, etc. — und die
                  "Unter-Pages" sind klar als zusaetzliche eigene Seiten
                  erkennbar, nicht als Konkurrenz zu den Sections.
                */}
                {showSections && (
                  <div className="ml-6 mt-1 border-l-2 border-primary/20 pl-2">
                    <SectionList
                      pageKey={node.page_key!}
                      pageNo={pageNoByPageKey.get(node.page_key!)}
                      sections={sections}
                      loading={isLoadingSections}
                      busy={busy}
                      onToggleActive={onSectionToggleActive}
                      onMove={onSectionMove}
                      onDelete={onSectionDelete}
                      onDuplicate={onSectionDuplicate}
                      onRename={onSectionRename}
                      onSelect={onSectionSelect}
                      selectedSectionKey={selectedSectionKey}
                      onApplyOrder={onSectionApplyOrder}
                      onSetParent={onSectionSetParent}
                      clipboard={clipboard}
                      onPasteFromClipboard={onPasteFromClipboard}
                      navNodes={navNodes}
                      pagesByRoute={pagesByRoute}
                      onJumpToPage={onJumpToPage}
                      externalSelectionToken={externalSelectionToken}
                      linksRefreshToken={linksRefreshToken}
                    />
                  </div>
                )}
                {isOpen && hasNavChildren && (
                  <div className="ml-6 mt-1">
                    {showSections && (
                      <div className="mb-1 rounded border border-dashed border-muted-foreground/30 bg-muted/30 px-2 py-1 text-[10px] leading-snug text-muted-foreground">
                        <strong className="font-semibold text-foreground">Eigene Unterseiten dieser Seite</strong>
                        {" — "}stehen <em>zusaetzlich</em> zu den Bloecken oben. In der Regel werden sie von einer Karte
                        im Karten-Block (z. B. "Produkte") verlinkt. Wenn sie hier "Ausgeblendet" sind, erscheinen sie
                        nicht im Hauptmenue, sind aber ueber den Karten-Link weiterhin erreichbar.
                      </div>
                    )}
                    <SortableBranch
                      parentId={node.id}
                      siblings={node.children}
                      depth={depth + 1}
                      onReorder={onReorder}
                      onIndent={onIndent}
                      onOutdent={onOutdent}
                      onSelect={onSelect}
                      selectedId={selectedId}
                      busy={busy}
                      pageNoByPageKey={pageNoByPageKey}
                      pageTypeByPageKey={pageTypeByPageKey}
                      pageStatusByPageKey={pageStatusByPageKey}
                      onToggleActive={onToggleActive}
                      onTogglePublic={onTogglePublic}
                      onDelete={onDelete}
                      expanded={expanded}
                      onToggleExpand={onToggleExpand}
                      sectionsByPage={sectionsByPage}
                      loadingSections={loadingSections}
                      onSectionToggleActive={onSectionToggleActive}
                      onSectionMove={onSectionMove}
                      onSectionDelete={onSectionDelete}
                      onSectionDuplicate={onSectionDuplicate}
                      onSectionRename={onSectionRename}
                      onSectionSelect={onSectionSelect}
                      selectedSectionKey={selectedSectionKey}
                      onSectionApplyOrder={onSectionApplyOrder}
                      onSectionSetParent={onSectionSetParent}
                      clipboard={clipboard}
                      onPasteFromClipboard={onPasteFromClipboard}
                      navNodes={navNodes}
                      pagesByRoute={pagesByRoute}
                      onJumpToPage={onJumpToPage}
                      externalSelectionToken={externalSelectionToken}
                      linksRefreshToken={linksRefreshToken}
                    />
                  </div>
                )}
              </div>
            );
          })}

        </div>
      </SortableContext>
    </DndContext>
  );
};
