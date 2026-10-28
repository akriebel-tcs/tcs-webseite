/**
 * Etappe H — Tree-Layout mit Drag & Drop für die CMS-Navigation.
 *
 * - Zeigt pro `nav_area` einen Baum aus `cms_navigation_nodes`.
 * - DnD via @dnd-kit/sortable: Reihenfolge unter demselben Eltern.
 * - Reparenting via Indent (→) / Outdent (←) Buttons,
 *   serverseitig validiert (keine Zyklen, gleiche nav_area).
 * - Schreibpfad ausschließlich `rpc_admin_move_navigation_node`.
 * - Lesen über `rpc_admin_read_navigation_nodes`.
 *
 * Diese Etappe wirkt sich nicht auf die öffentliche Website aus —
 * die Live-Navigation liest weiterhin Code-Dateien.
 *
 * Etappe Split-1 (mechanisch):
 * Reine Wartbarkeit. Untergeordnete Komponenten + Tree-Helfer wurden
 * nach `./tree/` ausgelagert. Diese Datei orchestriert nur noch State,
 * RPC-Aufrufe und Undo/Redo. Keine Logik-Änderung.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";
import {
  readNavigationNodes,
  type NavArea,
  type NavigationNodeRow,
} from "@/features/admin/api/cmsAdminNavigation";
import { moveNavigationNode } from "@/features/admin/api/cmsAdminNavigationMove";
import { readPagesWithNav } from "@/features/admin/api/cmsAdminPages";
import {
  setNavigationNodeActive,
  setNavigationNodePublic,
} from "@/features/admin/api/cmsAdminNavigationWrite";
import { deleteNavigationNode } from "@/features/admin/api/cmsAdminPagesLifecycle";
import { formatMoveError } from "@/features/admin/lib/navigationMoveErrors";
import { Term } from "@/features/admin/components/Term";
import {
  readPageSections,
  setSectionActive,
  reorderSection,
  deleteSection,
  renameSectionKey,
  applySectionOrder,
  setSectionParent,
  type SectionRow,
} from "@/features/admin/api/cmsAdminSectionOrder";
import { logActivity } from "@/features/admin/lib/activityLog";
import { UNDO_STACK_LIMIT, type UndoEntry } from "@/features/admin/lib/undoStack";

import { NAV_AREAS } from "./tree/constants";
import { pickEditorialNodeForPage } from "@/features/admin/lib/pickEditorialNode";
import { buildTree } from "./tree/treeUtils";
import type { TreeNode } from "./tree/types";
import { SortableBranch } from "./tree/SortableBranch";

import type { ClipboardItem } from "@/features/admin/components/ClipboardBanner";
import ConfirmDeleteDialog from "@/features/admin/components/ConfirmDeleteDialog";

/**
 * Hotfix-Tranche 25 — lokale Canonical-Auswahl entfernt.
 * Jeder Sprung auf eine Seite läuft über `pickEditorialNodeForPage`,
 * damit Footer-/Footer-Bottom-Aliase nicht mehr versehentlich als
 * Editor geöffnet werden.
 */

interface NavigationTreeEditorProps {
  /** Wird aufgerufen, wenn der Anwender eine Node markiert/abwählt. */
  onSelectionChange?: (node: NavigationNodeRow | null) => void;
  /** Wenn true, wird der interne rechte Detail-Bereich nicht gerendert
   *  (z. B. wenn AdminPage einen externen Detailbereich anzeigen will). */
  hideInternalDetail?: boolean;
  /** Klick auf einen Inhaltsblock im Baum (Fokus-Modus außerhalb). */
  onSectionSelect?: (s: SectionRow) => void;
  /** Aktuell im Fokus stehender Block (für Hervorhebung). */
  selectedSectionKey?: string | null;
  /** Wird nach jeder Section-Mutation gefeuert (verschieben, ausblenden,
   *  duplizieren, löschen). Außenwelt kann z. B. PageEditor neu laden. */
  onSectionsMutated?: () => void;
  /** Klemmbrett (Etappe `cms-light-admin-clipboard-1`). */
  clipboard?: ClipboardItem | null;
  /** Block in die Zwischenablage legen (Klick auf ⧉). */
  onCopySectionToClipboard?: (s: SectionRow) => void;
  /** Aus Zwischenablage in (pageKey, parent, position) einfügen. */
  onPasteFromClipboard?: (
    targetPageKey: string,
    parentSectionKey: string | null,
    position: number,
  ) => Promise<{ ok: boolean; newSectionKey?: string }>;
  /** Externe Auswahl (z. B. aus der Live-Vorschau): Knoten-ID, auf die der
   *  Baum springen soll — Bereich umschalten, Vorfahren ausklappen, scrollen. */
  externalSelectedNodeId?: string | null;
  /** Zusätzliche Ziel-Section (B-Sprung). Wird der Nav-Knoten ausgeklappt,
   *  die Sections der Seite geladen und die Zeile in den sichtbaren Bereich
   *  gescrollt (Re-Expand/Scroll auch bei wiederholtem Sprung). */
  externalSelectedSectionKey?: string | null;
  /** Zähler, der bei JEDEM Sprung erhöht wird — erzwingt Re-Expand/Re-Scroll,
   *  auch wenn der Zielknoten bereits ausgewählt war (z. B. erneuter B-Sprung
   *  auf eine Seite, die schon offen ist). */
  externalSelectionToken?: number;
  /** Externer Reload-Impuls, damit der Baum ohne kompletten Remount neu lädt. */
  refreshToken?: number;
  /** Batch 47a: nach jedem Feld-Save im Arbeitsbereich erhöhter Zähler.
   *  Wird an `SortableBranch` → `SectionList` durchgereicht und triggert
   *  dort den Re-Read der Karten-Linkfelder, damit die graue Link-Pille
   *  im Baum immer das aktuelle Linkziel anzeigt. */
  linksRefreshToken?: number;
  /** Etappe card-link-1: optionaler Sprung-Handler von außen — wird
   *  benutzt, wenn die Karten-Pille auf eine Zielseite klickt. */
  onJumpToPage?: (pageKey: string) => void;
}

const NavigationTreeEditor = ({
  onSelectionChange,
  hideInternalDetail,
  onSectionSelect,
  selectedSectionKey,
  onSectionsMutated,
  clipboard,
  onCopySectionToClipboard,
  onPasteFromClipboard,
  externalSelectedNodeId,
  externalSelectedSectionKey,
  externalSelectionToken,
  refreshToken,
  linksRefreshToken,
  onJumpToPage,
}: NavigationTreeEditorProps = {}) => {
  const [nodes, setNodes] = useState<NavigationNodeRow[]>([]);
  const [pageNoByPageKey, setPageNoByPageKey] = useState<Map<string, number>>(new Map());
  // page_key → raw page_type code (z. B. "T03"). Wird in SortableRow als
  // graue Subline pro Seiten-Zeile angezeigt (Etappe `cms-light-seitentyp-im-baum-1`).
  const [pageTypeByPageKey, setPageTypeByPageKey] = useState<Map<string, string>>(new Map());
  // page_key → {status, is_active} aus cms_pages — wird im Baum als Badge
  // „Seite live"/„Seite offline" angezeigt und trennt damit den Seitenstatus
  // sauber vom Knotenstatus „Hauptmenü an/aus".
  const [pageStatusByPageKey, setPageStatusByPageKey] = useState<
    Map<string, { status: string; is_active: boolean }>
  >(new Map());
  // Etappe `cms-admin-card-links-visible-audit-1`:
  // route_path → Page-Lookup, damit der Section-Tree Karten-/Block-Links
  // (`href`, `cta_link`) gegen die echten CMS-Seiten auflösen kann und
  // kaputte Ziele als Warnung sichtbar werden.
  const [pagesByRoute, setPagesByRoute] = useState<
    Map<string, import("@/features/admin/api/cmsAdminCardLinks").PageLookup>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeArea, setActiveArea] = useState<NavArea>("home");
  const [sectionsByPage, setSectionsByPage] = useState<Map<string, SectionRow[]>>(new Map());
  const [loadingSections, setLoadingSections] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [redoStack, setRedoStack] = useState<UndoEntry[]>([]);
  const [pendingNodeDelete, setPendingNodeDelete] = useState<TreeNode | null>(null);
  const [pendingSectionDelete, setPendingSectionDelete] = useState<SectionRow | null>(null);

  const pushUndo = useCallback((entry: UndoEntry) => {
    setUndoStack((prev) => {
      const next = [...prev, entry];
      if (next.length > UNDO_STACK_LIMIT) next.shift();
      return next;
    });
    setRedoStack([]); // neue Aktion → Redo-Pfad verwerfen
  }, []);

  const runUndo = useCallback(async () => {
    const entry = undoStack[undoStack.length - 1];
    if (!entry) return;
    setBusy(true);
    setError(null);
    const err = await entry.undo();
    if (err) {
      toast.error(`Undo fehlgeschlagen: ${err}`);
      setError(err);
    } else {
      toast.success(`Rückgängig: ${entry.label}`);
      setUndoStack((prev) => prev.slice(0, -1));
      setRedoStack((prev) => [...prev, entry]);
      setLastAction(`Rückgängig: ${entry.label}`);
    }
    await reload();
    await Promise.all(Array.from(sectionsByPage.keys()).map((pk) => loadSections(pk, true)));
    setBusy(false);
  }, [undoStack, sectionsByPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const runRedo = useCallback(async () => {
    const entry = redoStack[redoStack.length - 1];
    if (!entry) return;
    setBusy(true);
    setError(null);
    const err = await entry.redo();
    if (err) {
      toast.error(`Redo fehlgeschlagen: ${err}`);
      setError(err);
    } else {
      toast.success(`Wiederhergestellt: ${entry.label}`);
      setRedoStack((prev) => prev.slice(0, -1));
      setUndoStack((prev) => [...prev, entry]);
      setLastAction(`Wiederhergestellt: ${entry.label}`);
    }
    await reload();
    await Promise.all(Array.from(sectionsByPage.keys()).map((pk) => loadSections(pk, true)));
    setBusy(false);
  }, [redoStack, sectionsByPage]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ──────────────────────────────────────────────────────────────────────
   * Mount-Tracker — macht sichtbar, wenn der Baum neu gemountet wird.
   *
   * Warum: Wenn die Komponente (z. B. durch ein neues `key` im Eltern oder
   * einen Routenwechsel) unmountet und sofort wieder gemountet wird, geht
   * der `expanded`-State verloren — der Baum klappt für den Nutzer
   * scheinbar „grundlos" zu. Wir zählen Mounts in `sessionStorage` und
   * zeigen Instanz-Nummer + Mount-Zeit an. Bei Mount #2 oder höher gibt es
   * zusätzlich einen Toast-Hinweis, damit der Anwender den Reset sofort
   * versteht.
   * ────────────────────────────────────────────────────────────────────── */
  const MOUNT_KEY = "cms-admin:nav-tree:mount-count";
  const mountInfoRef = useRef<{ count: number; at: string } | null>(null);
  if (mountInfoRef.current === null) {
    let prev = 0;
    try {
      prev = parseInt(sessionStorage.getItem(MOUNT_KEY) ?? "0", 10) || 0;
    } catch {
      prev = 0;
    }
    const count = prev + 1;
    try {
      sessionStorage.setItem(MOUNT_KEY, String(count));
    } catch {
      /* sessionStorage kann z. B. im Privatmodus blockiert sein */
    }
    const at = new Date().toLocaleTimeString("de-DE", { hour12: false });
    mountInfoRef.current = { count, at };
  }
  const mountInfo = mountInfoRef.current;

  useEffect(() => {
    if (mountInfo.count > 1) {
      toast.warning(
        `Navigationsbaum wurde neu geladen (Instanz #${mountInfo.count}, ${mountInfo.at}). ` +
          `Der aufgeklappte Zustand wurde dabei zurückgesetzt.`,
        { duration: 6000 },
      );
    }
    // Nur einmal beim Mount auswerten:
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tastenkürzel: Cmd/Ctrl+Z = Undo, Cmd/Ctrl+Shift+Z (oder Cmd/Ctrl+Y) = Redo.
  // Greift nicht in Eingabefeldern (input/textarea/contentEditable).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        if (undoStack.length === 0 || busy) return;
        e.preventDefault();
        void runUndo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        if (redoStack.length === 0 || busy) return;
        e.preventDefault();
        void runRedo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undoStack.length, redoStack.length, busy, runUndo, runRedo]);

  const loadSections = useCallback(async (pageKey: string, force = false) => {
    setSectionsByPage((prev) => {
      if (!force && prev.has(pageKey)) return prev;
      return prev;
    });
    setLoadingSections((prev) => {
      const next = new Set(prev);
      next.add(pageKey);
      return next;
    });
    const res = await readPageSections(pageKey);
    setSectionsByPage((prev) => {
      const next = new Map(prev);
      next.set(pageKey, res.sections);
      return next;
    });
    setLoadingSections((prev) => {
      const next = new Set(prev);
      next.delete(pageKey);
      return next;
    });
  }, []);
  // Bewusst KEIN sessionStorage-Restore: jeder Aufruf der Admin-Seite startet
  // mit eingeklapptem Baum. Aufgeklappt-Zustand bleibt nur innerhalb derselben
  // Sitzung erhalten, solange die Komponente gemountet bleibt.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  // Wenn die externe Auswahl (z. B. aus der Live-Vorschau) den Bereich wechselt,
  // dürfen wir den darauf folgenden Reset des Aufgeklappt-Zustands NICHT ausführen,
  // sonst wird die gerade gesetzte Vorfahren-Kette sofort wieder eingeklappt.
  const skipNextAreaResetRef = useRef(false);

  // Beim Wechsel des Navigationsbereichs immer mit eingeklapptem Baum starten —
  // außer der Wechsel kam von einer externen Auswahl (Vorschau-Klick).
  useEffect(() => {
    if (skipNextAreaResetRef.current) {
      skipNextAreaResetRef.current = false;
      return;
    }
    setExpanded(new Set());
  }, [activeArea]);

  // (kein Persistieren mehr — bewusst nicht in sessionStorage)


  const reload = useCallback(async () => {
    setLoading(true);
    const [navRes, pagesRes] = await Promise.all([
      readNavigationNodes(),
      readPagesWithNav(),
    ]);
    setNodes(navRes.nodes);
    const map = new Map<string, number>();
    const typeMap = new Map<string, string>();
    const statusMap = new Map<string, { status: string; is_active: boolean }>();
    const routeMap = new Map<
      string,
      import("@/features/admin/api/cmsAdminCardLinks").PageLookup
    >();
    for (const p of pagesRes.pages) {
      if (p.page_no != null) map.set(p.page_key, p.page_no);
      if (p.page_type) typeMap.set(p.page_key, p.page_type);
      statusMap.set(p.page_key, { status: p.status, is_active: !!p.is_active });
      if (p.route_path) {
        routeMap.set(p.route_path, {
          page_key: p.page_key,
          page_no: p.page_no,
          title_de: p.title_de,
          status: p.status,
          is_active: p.is_active,
        });
      }
    }
    setPageNoByPageKey(map);
    setPageTypeByPageKey(typeMap);
    setPageStatusByPageKey(statusMap);
    setPagesByRoute(routeMap);
    setError(navRes.error ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, refreshToken]);

  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  const handleSelectNode = useCallback(
    (nodeId: string | null) => {
      setSelectedId(nodeId);
      const next = nodeId ? nodes.find((n) => n.id === nodeId) ?? null : null;
      onSelectionChange?.(next);
    },
    [nodes, onSelectionChange],
  );

  /**
   * Externe Auswahl synchronisieren (z. B. wenn der Anwender im Live-Vorschau-
   * iFrame der echten Webseite einen anderen Bereich anklickt). Der Baum
   *  • wechselt den Bereichs-Reiter,
   *  • klappt alle Vorfahren bis zum Zielknoten auf,
   *  • markiert den Knoten und scrollt ihn in den sichtbaren Bereich.
   */
  // Bugfix `cms-admin-tree-no-self-jump-1`:
  // Früher liefen `nodes`, `sectionsByPage` und `loadSections` in den Deps mit.
  // Dadurch feuerte der Sprung-Effekt jedes Mal erneut, wenn der Anwender im
  // Baum einen anderen Tab/Knoten öffnete (z. B. Türsprechanlagen anklickt →
  // Sections werden nachgeladen → sectionsByPage ändert sich → Effekt re-fired →
  // setActiveArea(target.nav_area) zwingt den Tab zurück auf den Bereich des
  // ursprünglichen externalSelectedNodeId, typischerweise "home").
  //
  // Jetzt: Effekt re-fired nur, wenn sich die Sprung-Eingabe wirklich ändert
  // (externalSelectionToken / externalSelectedNodeId / externalSelectedSectionKey).
  // Ein Ref merkt sich die zuletzt verarbeitete Sprung-Signatur, damit ein
  // nachgeladener `nodes`-Array nicht versehentlich denselben Sprung wiederholt.
  const lastProcessedJumpRef = useRef<string | null>(null);
  const lastSeenTokenRef = useRef<number | null>(null);
  useEffect(() => {
    if (!externalSelectedNodeId) return;
    if (nodes.length === 0) return;
    const signature = `${externalSelectionToken ?? 0}::${externalSelectedNodeId}::${externalSelectedSectionKey ?? ""}`;
    if (lastProcessedJumpRef.current === signature) return;
    // Bugfix `cms-admin-tree-no-click-jump-1`:
    // Wenn der Anwender im Baum selbst auf einen (Unter-)Knoten klickt, fließt
    // dessen ID über `selected` zurück in `externalSelectedNodeId`. Ohne neuen
    // Sprung-Token ist das KEIN echter Sprung — der Knoten ist bereits sichtbar.
    // Trotzdem würde der Effekt sonst die Vorfahrenkette neu ausklappen und
    // `scrollIntoView({ block: "center" })` aufrufen, was die Baumansicht hörbar
    // hoch- oder runterspringen lässt. Wir überspringen den Effekt daher,
    // wenn (a) der Token sich nicht verändert hat UND (b) der Zielknoten bereits
    // der intern ausgewählte ist.
    const tokenChanged = (externalSelectionToken ?? 0) !== (lastSeenTokenRef.current ?? -1);
    const isSelfOriginated = !tokenChanged && externalSelectedNodeId === selectedId;
    lastSeenTokenRef.current = externalSelectionToken ?? 0;
    if (isSelfOriginated) {
      lastProcessedJumpRef.current = signature;
      return;
    }
    const target = nodes.find((n) => n.id === externalSelectedNodeId);
    if (!target) return;
    lastProcessedJumpRef.current = signature;
    if (target.nav_area) {
      // Wir lesen activeArea hier bewusst nicht aus den Deps, sonst würde der
      // Effect bei jedem manuellen Tab-Wechsel erneut feuern und den Bereich
      // zurücksetzen. Stattdessen setzen wir den Tab nur einmal pro Sprung.
      skipNextAreaResetRef.current = true;
      setActiveArea(target.nav_area as NavArea);
    }
    // Vorfahrenkette ermitteln und ausklappen.
    const parentChain: string[] = [];
    let cur: NavigationNodeRow | undefined = target;
    while (cur?.parent_id) {
      parentChain.push(cur.parent_id);
      cur = nodes.find((n) => n.id === cur!.parent_id);
    }
    setExpanded((prev) => {
      const next = new Set(prev);
      parentChain.forEach((id) => next.add(id));
      if (externalSelectedSectionKey && target.page_key) {
        next.add(target.id);
      }
      return next;
    });
    setSelectedId(externalSelectedNodeId);
    if (externalSelectedSectionKey && target.page_key && !sectionsByPage.has(target.page_key)) {
      void loadSections(target.page_key);
    }
    const t = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-tree-node-id="${CSS.escape(externalSelectedNodeId)}"]`,
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => window.clearTimeout(t);
    // activeArea bewusst NICHT in den Deps — sonst overridet der Effect manuelle Tab-Klicks.
    // sectionsByPage/loadSections bewusst NICHT in den Deps — sonst springt
    // der Baum nach jedem Section-Reload zurück (siehe Bugfix-Kommentar oben).
    // `nodes` MUSS in den Deps bleiben, damit der initiale Sprung auch dann
    // ausgeführt wird, wenn die Knotenliste später als der Sprung-Prop eintrifft.
    // Die `lastProcessedJumpRef`-Signatur verhindert das mehrfache Auslösen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSelectedNodeId, externalSelectedSectionKey, externalSelectionToken, nodes]);
  const parentOfSelected = useMemo(() => {
    if (!selected?.parent_id) return null;
    return nodes.find((n) => n.id === selected.parent_id) ?? null;
  }, [nodes, selected]);

  const findParentNode = (parentId: string | null): TreeNode | null => {
    if (!parentId) return null;
    const map = new Map<string, TreeNode>();
    NAV_AREAS.forEach((a) => {
      const walk = (arr: TreeNode[]) => {
        arr.forEach((n) => {
          map.set(n.id, n);
          walk(n.children);
        });
      };
      walk(tree[a]);
    });
    return map.get(parentId) ?? null;
  };

  const buildTargetPath = (navArea: NavArea, parentId: string | null): string => {
    if (!parentId) return `${navArea} / (Wurzel)`;
    const chain: string[] = [];
    let current = nodes.find((n) => n.id === parentId) ?? null;
    let guard = 0;
    while (current && guard++ < 50) {
      chain.unshift(current.label_de ?? current.label ?? current.node_key);
      current = current.parent_id ? nodes.find((n) => n.id === current!.parent_id) ?? null : null;
    }
    return `${navArea} / ${chain.join(" / ")}`;
  };

  const callMove = async (
    nodeId: string,
    newParentId: string | null,
    newSortOrder: number,
    opts: { skipUndo?: boolean } = {},
  ) => {
    setBusy(true);
    setError(null);
    setLastAction(null);
    const moving = nodes.find((n) => n.id === nodeId);
    const prevParentId = moving?.parent_id ?? null;
    const prevSortOrder = moving?.sort_order ?? 0;
    const ctx = {
      nodeLabel: moving?.label_de ?? moving?.label ?? moving?.node_key ?? "Knoten",
      nodeKey: moving?.node_key ?? nodeId,
      navArea: moving?.nav_area ?? activeArea,
      targetPath: buildTargetPath((moving?.nav_area ?? activeArea) as NavArea, newParentId),
      targetIndex: newSortOrder,
    };
    const res = await moveNavigationNode(nodeId, newParentId, newSortOrder);
    if (!res.success) {
      const msg = formatMoveError(res.error, ctx);
      setError(msg);
      toast.error(msg, { duration: 7000 });
      logActivity({
        kind: "node_move",
        status: "error",
        summary: `Verschieben fehlgeschlagen: „${ctx.nodeLabel}" → ${ctx.targetPath}`,
        nodeKey: ctx.nodeKey,
        error: msg,
      });
    } else {
      const summary = `„${ctx.nodeLabel}“ verschoben → ${ctx.targetPath} · Position ${res.new_sort_order! + 1}`;
      setLastAction(summary);
      logActivity({
        kind: "node_move",
        status: "saved",
        summary,
        nodeKey: ctx.nodeKey,
        pageKey: moving?.page_key ?? undefined,
      });
      if (!opts.skipUndo) {
        pushUndo({
          kind: "node_move",
          label: `Verschieben: „${ctx.nodeLabel}“`,
          undo: async () => {
            const r = await moveNavigationNode(nodeId, prevParentId, prevSortOrder);
            return r.success ? null : (r.error ?? "Undo fehlgeschlagen.");
          },
          redo: async () => {
            const r = await moveNavigationNode(nodeId, newParentId, newSortOrder);
            return r.success ? null : (r.error ?? "Redo fehlgeschlagen.");
          },
        });
      }
    }
    await reload();
    setBusy(false);
  };

  const handleReorder = (parentId: string | null, oldIndex: number, newIndex: number) => {
    const siblings = parentId ? findParentNode(parentId)?.children ?? [] : tree[activeArea];
    const moved = siblings[oldIndex];
    if (!moved) return;
    const newOrder = arrayMove(siblings, oldIndex, newIndex);
    const targetIdx = newOrder.findIndex((n) => n.id === moved.id);
    void callMove(moved.id, parentId, targetIdx);
  };

  const handleIndent = (node: TreeNode, prevSibling: TreeNode | null) => {
    if (!prevSibling) return;
    void callMove(node.id, prevSibling.id, prevSibling.children.length);
  };

  const handleOutdent = (node: TreeNode) => {
    if (!node.parent_id) return;
    const parent = findParentNode(node.parent_id);
    if (!parent) return;
    const grand = parent.parent_id;
    const grandSiblings = grand ? findParentNode(grand)?.children ?? [] : tree[node.nav_area];
    const parentIdx = grandSiblings.findIndex((s) => s.id === parent.id);
    void callMove(node.id, grand, parentIdx + 1);
  };

  const handleToggleActive = async (node: TreeNode) => {
    setBusy(true);
    setError(null);
    setLastAction(null);
    const next = !node.is_active;
    const prevActive = node.is_active;
    const prevPublic = node.show_in_public_nav;
    const res = await setNavigationNodeActive(node.id, next);
    const label = node.label_de ?? node.label ?? node.node_key;
    if (!res.success) {
      const msg = res.error ?? "Sichtbarkeit konnte nicht geändert werden.";
      setError(msg);
      toast.error(msg);
      logActivity({
        kind: "node_toggle_active",
        status: "error",
        summary: `Sichtbarkeit von „${label}" konnte nicht geändert werden.`,
        nodeKey: node.node_key,
        pageKey: node.page_key ?? undefined,
        error: msg,
      });
    } else {
      // Vereinheitlichte Sichtbarkeit: is_active und show_in_public_nav werden
      // immer zusammen gesetzt. Damit ist „Sichtbar" = überall sichtbar,
      // „Ausgeblendet" = überall weg (auch aus der öffentlichen Navigation).
      // Fehler beim Mirror-Call wird geloggt, blockiert aber nicht die UI.
      const pubRes = await setNavigationNodePublic(node.id, next);
      if (!pubRes.success) {
        toast.warning(
          `Sichtbarkeit gesetzt, aber öffentliche Navigation konnte nicht mitgezogen werden: ${pubRes.error ?? "unbekannter Fehler"}`,
        );
      }
      toast.success(next ? `„${label}" ist sichtbar.` : `„${label}" ist ausgeblendet.`);
      logActivity({
        kind: "node_toggle_active",
        status: "saved",
        summary: next ? `„${label}" eingeblendet.` : `„${label}" ausgeblendet.`,
        nodeKey: node.node_key,
        pageKey: node.page_key ?? undefined,
      });
      pushUndo({
        kind: "node_toggle_active",
        label: next ? `Eingeblendet: „${label}"` : `Ausgeblendet: „${label}"`,
        undo: async () => {
          const r = await setNavigationNodeActive(node.id, prevActive);
          await setNavigationNodePublic(node.id, prevPublic);
          return r.success ? null : (r.error ?? "Undo fehlgeschlagen.");
        },
        redo: async () => {
          const r = await setNavigationNodeActive(node.id, next);
          await setNavigationNodePublic(node.id, next);
          return r.success ? null : (r.error ?? "Redo fehlgeschlagen.");
        },
      });
    }
    await reload();
    setBusy(false);
  };


  const handleTogglePublic = async (node: TreeNode) => {
    setBusy(true);
    setError(null);
    setLastAction(null);
    const next = !node.show_in_public_nav;
    const res = await setNavigationNodePublic(node.id, next);
    const label = node.label_de ?? node.label ?? node.node_key;
    if (!res.success) {
      const msg = res.error ?? "Öffentliche Sichtbarkeit konnte nicht geändert werden.";
      setError(msg);
      toast.error(msg);
      logActivity({
        kind: "node_toggle_active",
        status: "error",
        summary: `Öffentliche Sichtbarkeit von „${label}" konnte nicht geändert werden.`,
        nodeKey: node.node_key,
        pageKey: node.page_key ?? undefined,
        error: msg,
      });
    } else {
      toast.success(
        next
          ? `„${label}" erscheint jetzt in der öffentlichen Navigation.`
          : `„${label}" ist aus der öffentlichen Navigation entfernt.`,
      );
      logActivity({
        kind: "node_toggle_active",
        status: "saved",
        summary: next
          ? `„${label}" in öffentliche Navigation aufgenommen.`
          : `„${label}" aus öffentlicher Navigation entfernt.`,
        nodeKey: node.node_key,
        pageKey: node.page_key ?? undefined,
      });
      const prev = node.show_in_public_nav;
      pushUndo({
        kind: "node_toggle_active",
        label: next
          ? `Öffentlich sichtbar: „${label}"`
          : `Aus öffentlicher Navigation: „${label}"`,
        undo: async () => {
          const r = await setNavigationNodePublic(node.id, prev);
          return r.success ? null : (r.error ?? "Undo fehlgeschlagen.");
        },
        redo: async () => {
          const r = await setNavigationNodePublic(node.id, next);
          return r.success ? null : (r.error ?? "Redo fehlgeschlagen.");
        },
      });
    }
    await reload();
    setBusy(false);
  };

  const handleDelete = async (node: TreeNode) => {
    const label = node.label_de ?? node.label ?? node.node_key;
    const childCount = node.children.length;
    if (childCount > 0) {
      toast.error(
        `„${label}" hat ${childCount} Unterknoten und kann nicht gelöscht werden. ` +
          `Bitte zuerst Unterknoten verschieben oder löschen.`,
      );
      return;
    }
    // Bestätigungsdialog mit Tipp-Schutz + 3-Sekunden-Sicherheitssperre.
    setPendingNodeDelete(node);
  };

  const performNodeDelete = async (node: TreeNode): Promise<string | null> => {
    const label = node.label_de ?? node.label ?? node.node_key;
    setBusy(true);
    setError(null);
    setLastAction(null);
    const res = await deleteNavigationNode(node.id);
    if (!res.success) {
      const errMsg = res.error ?? "Löschen fehlgeschlagen.";
      setError(errMsg);
      toast.error(errMsg);
      logActivity({
        kind: "node_delete",
        status: "error",
        summary: `Löschen fehlgeschlagen: „${label}"`,
        nodeKey: node.node_key,
        pageKey: node.page_key ?? undefined,
        error: errMsg,
      });
      await reload();
      setBusy(false);
      return errMsg;
    }
    toast.success(`„${label}" gelöscht.`);
    logActivity({
      kind: "node_delete",
      status: "saved",
      summary: `Knoten „${label}" gelöscht.`,
      nodeKey: node.node_key,
      pageKey: node.page_key ?? undefined,
    });
    await reload();
    setBusy(false);
    return null;
  };

  const lastUndo = undoStack[undoStack.length - 1];
  const lastRedo = redoStack[redoStack.length - 1];

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap items-center gap-2 rounded border border-border bg-muted/20 px-2 py-1.5 text-xs"
        role="toolbar"
        aria-label="Rückgängig / Wiederherstellen"
      >
        <span className="font-semibold text-muted-foreground">Schritt zurück:</span>
        <button
          type="button"
          onClick={() => void runUndo()}
          disabled={!lastUndo || busy}
          className="inline-flex h-8 items-center gap-1 rounded border px-2 disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
          title={lastUndo ? `Rückgängig: ${lastUndo.label} (Strg/Cmd+Z)` : "Nichts zum Rückgängigmachen"}
          aria-label="Rückgängig (Strg+Z)"
        >
          ↶ Rückgängig
          <span className="ml-1 rounded bg-muted px-1 font-mono text-[10px]">{undoStack.length}</span>
        </button>
        <button
          type="button"
          onClick={() => void runRedo()}
          disabled={!lastRedo || busy}
          className="inline-flex h-8 items-center gap-1 rounded border px-2 disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
          title={lastRedo ? `Wiederherstellen: ${lastRedo.label} (Strg/Cmd+Shift+Z)` : "Nichts zum Wiederherstellen"}
          aria-label="Wiederherstellen (Strg+Shift+Z)"
        >
          ↷ Wiederherstellen
          <span className="ml-1 rounded bg-muted px-1 font-mono text-[10px]">{redoStack.length}</span>
        </button>
        <span className="ml-auto truncate text-muted-foreground">
          {lastUndo
            ? <>Letzte Aktion: <strong className="font-medium text-foreground">{lastUndo.label}</strong></>
            : "Noch keine Aktion in dieser Sitzung."}
        </span>
        <span className="hidden sm:inline text-muted-foreground/70">
          (Hinweis: Löschen ist nicht rückgängig machbar.)
        </span>
      </div>
      <div
        className={
          "flex items-center justify-between gap-2 rounded border px-2 py-1 text-[11px] " +
          (mountInfo.count > 1
            ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            : "border-border bg-muted/30 text-muted-foreground")
        }
        role="status"
        aria-live="polite"
        title={
          mountInfo.count > 1
            ? "Der Navigationsbaum wurde in dieser Sitzung mehrfach gemountet. Jeder Neumount setzt den aufgeklappten Zustand zurück."
            : "Erster Mount des Navigationsbaums in dieser Sitzung."
        }
      >
        <span className="font-mono">
          Tree-Mount #{mountInfo.count} · {mountInfo.at}
        </span>
        <span>
          Aufgeklappt: <strong>{expanded.size}</strong> Knoten
          {mountInfo.count > 1 && (
            <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5">
              ⚠ Remount erkannt — Zustand zurückgesetzt
            </span>
          )}
        </span>
      </div>

      <div
        role="tablist"
        aria-label="Navigations-Bereich"
        className="-mx-1 flex gap-1 overflow-x-auto border-b px-1 [scrollbar-width:thin]"
      >
        {NAV_AREAS.map((a) => (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={activeArea === a}
            onClick={() => setActiveArea(a)}
            className={
              "shrink-0 whitespace-nowrap rounded-t px-3 py-2 text-sm border-b-2 -mb-px focus-visible:ring-2 focus-visible:ring-ring " +
              (activeArea === a
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground")
            }
          >
            {a} ({tree[a].length})
          </button>
        ))}
      </div>

      <div className={hideInternalDetail ? "" : "grid gap-4 md:grid-cols-[2fr_1fr]"}>
        <div className="min-h-[200px] rounded border bg-card/30 p-3">
          {loading && <div className="text-sm text-muted-foreground">Lade…</div>}
          {!loading && tree[activeArea].length === 0 && (
            <div className="text-sm text-muted-foreground">Keine Knoten in diesem Bereich.</div>
          )}
          {!loading && tree[activeArea].length > 0 && (
            <SortableBranch
              parentId={null}
              siblings={tree[activeArea]}
              depth={0}
              onReorder={handleReorder}
              onIndent={handleIndent}
              onOutdent={handleOutdent}
              onSelect={handleSelectNode}
              selectedId={selectedId}
              busy={busy}
              pageNoByPageKey={pageNoByPageKey}
              pageTypeByPageKey={pageTypeByPageKey}
              pageStatusByPageKey={pageStatusByPageKey}
              pagesByRoute={pagesByRoute}
              onToggleActive={(n) => void handleToggleActive(n)}
              onTogglePublic={(n) => void handleTogglePublic(n)}
              onDelete={(n) => void handleDelete(n)}
              expanded={expanded}
              onToggleExpand={(node, depth) => {
                setExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(node.id)) {
                    next.delete(node.id);
                  } else {
                    // Akkordeon-Verhalten auf JEDER Ebene: beim Aufklappen
                    // werden Geschwister auf derselben Ebene (und deren
                    // Unterbäume) geschlossen. Verhindert, dass der Baum
                    // nach oben „springt", weil weiter oben noch alte
                    // Knoten offen sind.
                    const roots = tree[activeArea];
                    const collectDescendants = (n: TreeNode, acc: Set<string>) => {
                      n.children.forEach((c) => {
                        acc.add(c.id);
                        collectDescendants(c, acc);
                      });
                    };
                    const findSiblings = (arr: TreeNode[]): TreeNode[] | null => {
                      if (arr.some((n) => n.id === node.id)) return arr;
                      for (const n of arr) {
                        const hit = findSiblings(n.children);
                        if (hit) return hit;
                      }
                      return null;
                    };
                    const siblings = depth === 0 ? roots : (findSiblings(roots) ?? []);
                    siblings.forEach((s) => {
                      if (s.id === node.id) return;
                      next.delete(s.id);
                      const desc = new Set<string>();
                      collectDescendants(s, desc);
                      desc.forEach((id) => next.delete(id));
                    });
                    next.add(node.id);
                    // Lazy-load Inhaltsblöcke der Seite
                    if (node.page_key && !sectionsByPage.has(node.page_key)) {
                      void loadSections(node.page_key);
                    }
                  }
                  return next;
                });
              }}

              sectionsByPage={sectionsByPage}
              navNodes={nodes}
              onJumpToPage={onJumpToPage}
              loadingSections={loadingSections}
              externalSelectionToken={externalSelectionToken}
              linksRefreshToken={linksRefreshToken}
              onSectionToggleActive={async (s) => {
                setBusy(true);
                const next = !s.is_active;
                const res = await setSectionActive({
                  pageKey: s.page_key,
                  sectionKey: s.section_key,
                  isActive: next,
                });
                if (!res.success) {
                  const errMsg = res.error ?? "Sichtbarkeit konnte nicht geändert werden.";
                  toast.error(errMsg);
                  logActivity({
                    kind: "section_toggle_active",
                    status: "error",
                    summary: `Sichtbarkeit von Block „${s.section_key}" konnte nicht geändert werden.`,
                    pageKey: s.page_key,
                    sectionKey: s.section_key,
                    error: errMsg,
                  });
                } else {
                  toast.success(
                    next
                      ? `Block „${s.section_key}“ ist sichtbar.`
                      : `Block „${s.section_key}“ ist ausgeblendet.`,
                  );
                  logActivity({
                    kind: "section_toggle_active",
                    status: "saved",
                    summary: next
                      ? `Block „${s.section_key}" eingeblendet.`
                      : `Block „${s.section_key}" ausgeblendet.`,
                    pageKey: s.page_key,
                    sectionKey: s.section_key,
                  });
                  const prev = s.is_active;
                  pushUndo({
                    kind: "section_toggle_active",
                    label: next
                      ? `Block eingeblendet: „${s.section_key}“`
                      : `Block ausgeblendet: „${s.section_key}“`,
                    undo: async () => {
                      const r = await setSectionActive({
                        pageKey: s.page_key,
                        sectionKey: s.section_key,
                        isActive: prev,
                      });
                      return r.success ? null : (r.error ?? "Undo fehlgeschlagen.");
                    },
                    redo: async () => {
                      const r = await setSectionActive({
                        pageKey: s.page_key,
                        sectionKey: s.section_key,
                        isActive: next,
                      });
                      return r.success ? null : (r.error ?? "Redo fehlgeschlagen.");
                    },
                  });
                  onSectionsMutated?.();
                }
                await loadSections(s.page_key, true);
                setBusy(false);
              }}
              onSectionMove={async (s, dir) => {
                setBusy(true);
                const res = await reorderSection({
                  pageKey: s.page_key,
                  sectionKey: s.section_key,
                  direction: dir,
                });
                if (!res.success) {
                  const errMsg = res.error ?? "Verschieben fehlgeschlagen.";
                  toast.error(errMsg);
                  logActivity({
                    kind: "section_reorder",
                    status: "error",
                    summary: `Verschieben fehlgeschlagen: Block „${s.section_key}" (${dir === "up" ? "hoch" : "runter"}).`,
                    pageKey: s.page_key,
                    sectionKey: s.section_key,
                    error: errMsg,
                  });
                } else if (res.noop) {
                  toast.message("Schon am Rand — nicht weiter verschiebbar.");
                  // Bewusst nicht ins Log: keine echte Änderung passiert.
                } else {
                  logActivity({
                    kind: "section_reorder",
                    status: "saved",
                    summary: `Block „${s.section_key}" verschoben (${dir === "up" ? "eine Position hoch" : "eine Position runter"}).`,
                    pageKey: s.page_key,
                    sectionKey: s.section_key,
                  });
                  const opposite = dir === "up" ? "down" : "up";
                  pushUndo({
                    kind: "section_reorder",
                    label: `Block verschoben: „${s.section_key}“ (${dir === "up" ? "hoch" : "runter"})`,
                    undo: async () => {
                      const r = await reorderSection({
                        pageKey: s.page_key,
                        sectionKey: s.section_key,
                        direction: opposite,
                      });
                      return r.success ? null : (r.error ?? "Undo fehlgeschlagen.");
                    },
                    redo: async () => {
                      const r = await reorderSection({
                        pageKey: s.page_key,
                        sectionKey: s.section_key,
                        direction: dir,
                      });
                      return r.success ? null : (r.error ?? "Redo fehlgeschlagen.");
                    },
                  });
                  onSectionsMutated?.();
                }
                await loadSections(s.page_key, true);
                setBusy(false);
              }}
              onSectionDelete={(s) => {
                // Bestätigungsdialog mit Tipp-Schutz + 3-Sekunden-Sicherheitssperre.
                setPendingSectionDelete(s);
              }}
              onSectionDuplicate={(s) => {
                // ⧉ legt den Block in die zentrale Zwischenablage. Das Einfügen
                // (inkl. automatischem _kopie-Suffix bei Konflikten) passiert
                // über die „Hier einfügen"-Slots in der Section-Liste und ruft
                // intern den rekursiven `rpc_admin_paste_section`-Pfad auf
                // (kopiert Section + Kindkarten + Felder DE/EN + Assets +
                // Whitelist vollständig).
                //
                // Der frühere flache Direktpfad über
                // `rpc_admin_duplicate_section` wurde bewusst entfernt: er
                // konnte bei Container-Blöcken (z. B. `card_grid_v1`) leere
                // Hüllen ohne Kindkarten erzeugen.
                if (onCopySectionToClipboard) {
                  onCopySectionToClipboard(s);
                  return;
                }
                toast.error(
                  "Kopieren nur im vollständigen Admin-Workspace verfügbar.",
                  {
                    description:
                      "Dieser Tree-Editor läuft gerade ohne Zwischenablage-Anbindung (z. B. Stand-alone-/Test-Ansicht). Öffne den Block-Kopier-Vorgang im normalen /admin-Workspace.",
                  },
                );
              }}
              onSectionRename={(s) => {
                // Etappe `cms-admin-rename-card-section-key-1` — erweitert
                // um Wechselteaser (teaser_2col_v1). RPC lehnt andere Typen
                // serverseitig ab.
                if (
                  s.section_type !== "card_v1" &&
                  s.section_type !== "teaser_2col_v1" &&
                  s.section_type !== "cards_v1"
                ) {
                  toast.error(
                    "Nur Standardkarten (card_v1), Wechselteaser (teaser_2col_v1) und Kartenraster (cards_v1) können umbenannt werden.",
                  );
                  return;
                }
                const typeLabel =
                  s.section_type === "teaser_2col_v1"
                    ? "Wechselteaser"
                    : s.section_type === "cards_v1"
                      ? "Kartenraster"
                      : "Karte";
                void (async () => {
                  const fixedKeyTeaserPages = [
                    "anwendungen.bildungseinrichtungen",
                    "anwendungen.interne-kommunikation",
                    "eingangssysteme.root",
                  ];
                  if (
                    s.section_type === "teaser_2col_v1" &&
                    fixedKeyTeaserPages.includes(s.page_key)
                  ) {
                    toast.error("Dieser Wechselteaser-Schlüssel ist geschützt.", {
                      description:
                        "Diese Seite rendert Wechselteaser aktuell über feste Schlüssel. Umbenennen würde den Block auf der öffentlichen Seite ausblenden.",
                    });
                    return;
                  }
                  const warning =
                    s.page_key === "anwendungen.wohnbau"
                      ? "\n\nACHTUNG: Auf der Wohnbau-Seite sind pro Karten-Schlüssel (einfamilienhaus, mehrfamilienhaus, grossanlage, sanierung) Icons und Bild-Fallbacks im Code hinterlegt. Nach dem Umbenennen greifen diese Fallbacks nicht mehr — Bild und Icon zeigen dann nur noch, was in der CMS-Datenbank steht.\n"
                      : "";
                  const input = window.prompt(
                    `Neuer technischer Schlüssel für ${typeLabel} „${s.section_key}"` +
                      "\n\nErlaubt: Kleinbuchstaben, Zahlen, Unterstrich. Muss mit einem Buchstaben beginnen. Muss auf dieser Seite eindeutig sein." +
                      "\n\nInhalte, Bilder, Reihenfolge und Sichtbarkeit bleiben erhalten — es ändert sich nur der Schlüssel." +
                      warning,
                    s.section_key,
                  );
                  if (!input) return;
                  const newKey = input.trim();
                  if (!newKey || newKey === s.section_key) return;
                  if (!/^[a-z][a-z0-9_]{1,60}$/.test(newKey)) {
                    toast.error(
                      "Ungültiger Schlüssel. Erlaubt: a–z, 0–9, Unterstrich; muss mit Buchstabe beginnen.",
                    );
                    return;
                  }
                  setBusy(true);
                  const res = await renameSectionKey({
                    pageKey: s.page_key,
                    oldSectionKey: s.section_key,
                    newSectionKey: newKey,
                  });
                  if (!res.success) {
                    const map: Record<string, string> = {
                      same_key: "Neuer Schlüssel ist identisch mit dem alten.",
                      invalid_slug_format: "Ungültiges Format. Nur Kleinbuchstaben, Zahlen, Unterstrich; mit Buchstabe beginnen.",
                      section_not_found: "Block nicht gefunden.",
                      only_card_v1_renameable: "Nur Standardkarten, Wechselteaser und Kartenraster können umbenannt werden.",
                      section_type_not_renameable: "Nur Standardkarten, Wechselteaser und Kartenraster können umbenannt werden.",
                      teaser_key_locked_fixed_renderer: "Dieser Wechselteaser-Schlüssel ist geschützt, weil die öffentliche Seite ihn aktuell fest verwendet.",
                      new_key_already_exists: "Schlüssel ist auf dieser Seite bereits vergeben.",
                    };
                    toast.error(map[res.error ?? ""] ?? res.error ?? "Umbenennen fehlgeschlagen.");
                  } else {
                    const c = res.updated_counts;
                    toast.success(
                      `Schlüssel umbenannt: „${s.section_key}" → „${newKey}"` +
                        (c
                          ? ` (Felder: ${c.fields}, Bilder: ${c.assets}, Whitelist: ${c.whitelist})`
                          : ""),
                    );
                    await loadSections(s.page_key, true);
                    onSectionsMutated?.();
                  }
                  setBusy(false);
                })();
              }}
              onSectionSelect={(s) => {
                // Auch den zugehörigen Seitenknoten als ausgewählt melden,
                // damit der externe Editor die richtige Seite lädt.
                const pageNode = pickEditorialNodeForPage(nodes, s.page_key);
                if (pageNode) handleSelectNode(pageNode.id);
                onSectionSelect?.(s);
              }}
              selectedSectionKey={selectedSectionKey ?? null}
              onSectionApplyOrder={async (pageKey, orderedKeys) => {
                setBusy(true);
                const res = await applySectionOrder({
                  pageKey,
                  orderedSectionKeys: orderedKeys,
                });
                if (!res.success) {
                  const errMsg = res.error ?? "Reihenfolge konnte nicht gespeichert werden.";
                  toast.error(errMsg);
                  logActivity({
                    kind: "section_reorder",
                    status: "error",
                    summary: `Reihenfolge speichern fehlgeschlagen (Block „${res.failedAt ?? "?"}").`,
                    pageKey,
                    sectionKey: res.failedAt,
                    error: errMsg,
                  });
                } else {
                  toast.success("Neue Reihenfolge gespeichert.");
                  logActivity({
                    kind: "section_reorder",
                    status: "saved",
                    summary: `Reihenfolge auf Seite „${pageKey}" per Drag-and-Drop neu gesetzt.`,
                    pageKey,
                  });
                  onSectionsMutated?.();
                }
                await loadSections(pageKey, true);
                setBusy(false);
              }}
              onSectionSetParent={async (pageKey, sectionKey, newParentSectionKey, position) => {
                // Sprint-0 „Eine Wahrheit": Vor dem RPC-Aufruf Vertragsrisiko prüfen.
                // Keine harte Blockade — Warnung + bewusste Confirm-Bestätigung.
                try {
                  const { evaluateStructurePlacementRisk } = await import(
                    "@/features/admin/lib/sectionContractStatus"
                  );
                  let pageSections = sectionsByPage.get(pageKey);
                  if (!pageSections) {
                    const r = await readPageSections(pageKey);
                    pageSections = r.sections;
                  }
                  const moving = pageSections.find((s) => s.section_key === sectionKey);
                  const targetParent = newParentSectionKey
                    ? pageSections.find((s) => s.section_key === newParentSectionKey)
                    : null;
                  const risk = evaluateStructurePlacementRisk({
                    movingSectionType: moving?.section_type ?? null,
                    targetParentSectionKey: newParentSectionKey,
                    targetParentSectionType: targetParent?.section_type ?? null,
                    action: "move",
                  });
                  if (risk) {
                    const ok = window.confirm(
                      `Vertragsprüfung (Sprint-0):\n\n${risk}\n\nTeil von trotzdem ändern? (Empfehlung: Abbrechen und Struktur prüfen.)`,
                    );
                    if (!ok) {
                      toast.message('Teil von abgebrochen — Strukturprüfung verlangte Bestätigung.');
                      return;
                    }
                  }
                } catch {
                  /* Vertragscheck darf den Move-Flow niemals hart blockieren. */
                }
                setBusy(true);
                const res = await setSectionParent({
                  pageKey,
                  sectionKey,
                  newParentSectionKey,
                  position,
                });
                if (!res.success) {
                  const errMsg = res.error ?? "Eltern-Block konnte nicht gesetzt werden.";
                  toast.error(errMsg);
                  logActivity({
                    kind: "section_reorder",
                    status: "error",
                    summary: `„Teil von" auf Block „${sectionKey}" fehlgeschlagen.`,
                    pageKey,
                    sectionKey,
                    error: errMsg,
                  });
                } else {
                  toast.success(
                    newParentSectionKey
                      ? `„${sectionKey}" ist jetzt Teil von „${newParentSectionKey}".`
                      : `„${sectionKey}" wieder auf oberster Ebene.`,
                  );
                  logActivity({
                    kind: "section_reorder",
                    status: "saved",
                    summary: newParentSectionKey
                      ? `Block „${sectionKey}" → Kind von „${newParentSectionKey}".`
                      : `Block „${sectionKey}" auf oberste Ebene gelöst.`,
                    pageKey,
                    sectionKey,
                  });
                  onSectionsMutated?.();
                }
                await loadSections(pageKey, true);
                setBusy(false);
              }}
              clipboard={clipboard ?? null}
              onPasteFromClipboard={
                onPasteFromClipboard
                  ? async (targetPageKey, parentSectionKey, position) => {
                      setBusy(true);
                      const r = await onPasteFromClipboard(targetPageKey, parentSectionKey, position);
                      if (r.ok) {
                        onSectionsMutated?.();
                        await loadSections(targetPageKey, true);
                      }
                      setBusy(false);
                    }
                  : undefined
              }
            />
          )}
        </div>

        {!hideInternalDetail && (
          <aside className="rounded border bg-card/30 p-3 text-sm">
            <h3 className="mb-2 font-semibold">Detail</h3>
            {!selected && (
              <p className="text-muted-foreground">Wähle einen Knoten im Baum aus.</p>
            )}
            {selected && (
              <dl className="space-y-1.5">
                <div>
                  <dt className="text-xs text-muted-foreground"><Term term="node_key" /></dt>
                  <dd className="font-mono text-xs">{selected.node_key}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground"><Term term="nav_area" /></dt>
                  <dd>{selected.nav_area}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground"><Term term="parent_id">parent</Term></dt>
                  <dd className="font-mono text-xs">
                    {parentOfSelected?.node_key ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground"><Term term="sort_order" /></dt>
                  <dd>{selected.sort_order}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground"><Term term="label_de" /></dt>
                  <dd>{selected.label_de ?? <em className="text-muted-foreground">–</em>}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground"><Term term="label_en" /></dt>
                  <dd>{selected.label_en ?? <em className="text-muted-foreground">–</em>}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground"><Term term="page_key" /></dt>
                  <dd className="font-mono text-xs">
                    {selected.page_key ?? <em className="text-muted-foreground">–</em>}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground"><Term term="route_path" /></dt>
                  <dd className="font-mono text-xs">
                    {selected.route_path ?? <em className="text-muted-foreground">–</em>}
                  </dd>
                </div>
              </dl>
            )}
          </aside>
        )}
      </div>

      {busy && (
        <div className="rounded border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Speichere Verschiebung…
        </div>
      )}
      {error && (
        <div className="rounded border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {lastAction && !error && (
        <div className="rounded border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {lastAction}
        </div>
      )}

      {pendingNodeDelete && (
        <ConfirmDeleteDialog
          open={!!pendingNodeDelete}
          title="Navigations-Knoten endgültig löschen"
          description={
            <>
              <p className="mb-2">
                <strong>
                  „{pendingNodeDelete.label_de ?? pendingNodeDelete.label ?? pendingNodeDelete.node_key}"
                </strong>{" "}
                wirklich löschen?
              </p>
              <p className="mb-1">
                Löschen lässt sich <strong>nicht</strong> über Undo rückgängig machen.
              </p>
              {pendingNodeDelete.page_key && (
                <p className="text-xs">
                  Die verknüpfte Seite wird automatisch archiviert, falls kein anderer Knoten sie noch nutzt.
                </p>
              )}
            </>
          }
          confirmToken={pendingNodeDelete.node_key}
          confirmTokenLabel={`Zur Bestätigung den Knoten-Schlüssel exakt eintippen: ${pendingNodeDelete.node_key}`}
          onConfirm={() => performNodeDelete(pendingNodeDelete)}
          onClose={() => setPendingNodeDelete(null)}
        />
      )}

      {pendingSectionDelete && (
        <ConfirmDeleteDialog
          open={!!pendingSectionDelete}
          title="Inhaltsblock endgültig löschen"
          description={(() => {
            const s = pendingSectionDelete;
            const pageSections = sectionsByPage.get(s.page_key) ?? [];
            const childCount = pageSections.filter((c) => c.parent_section_key === s.section_key).length;
            return (
              <>
                <p className="mb-2">
                  Block <strong>„{s.section_key}"</strong>{" "}
                  (Typ: {s.section_type}) wirklich löschen?
                </p>
                {childCount > 0 && (
                  <p className="mb-2 rounded border border-amber-500/40 bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                    ⚠ Vertragsprüfung (Sprint-0): Dieser Block hat <strong>{childCount}</strong>{" "}
                    Kind-Block/-Blöcke. Sie werden mitgelöscht.
                  </p>
                )}
                <p className="text-xs">
                  Alle Texte, Whitelist-Einträge und verknüpfte Bilder werden mitgelöscht
                  bzw. deaktiviert. Diese Aktion lässt sich nicht rückgängig machen.
                </p>
              </>
            );
          })()}
          confirmToken={pendingSectionDelete.section_key}
          confirmTokenLabel={`Zur Bestätigung den Block-Schlüssel exakt eintippen: ${pendingSectionDelete.section_key}`}
          onConfirm={async () => {
            const s = pendingSectionDelete;
            setBusy(true);
            const res = await deleteSection({
              pageKey: s.page_key,
              sectionKey: s.section_key,
            });
            if (!res.success) {
              const errMsg = res.error ?? "Löschen fehlgeschlagen.";
              toast.error(errMsg);
              logActivity({
                kind: "section_delete",
                status: "error",
                summary: `Löschen fehlgeschlagen: Block „${s.section_key}".`,
                pageKey: s.page_key,
                sectionKey: s.section_key,
                error: errMsg,
              });
              await loadSections(s.page_key, true);
              setBusy(false);
              return errMsg;
            }
            toast.success(
              `Block gelöscht. Felder: ${res.fields_deleted ?? 0}, ` +
                `Bilder deaktiviert: ${res.assets_deactivated ?? 0}.`,
            );
            logActivity({
              kind: "section_delete",
              status: "saved",
              summary: `Block „${s.section_key}" gelöscht (${res.fields_deleted ?? 0} Felder, ${res.assets_deactivated ?? 0} Bilder deaktiviert).`,
              pageKey: s.page_key,
              sectionKey: s.section_key,
            });
            onSectionsMutated?.();
            await loadSections(s.page_key, true);
            setBusy(false);
            return null;
          }}
          onClose={() => setPendingSectionDelete(null)}
        />
      )}
    </div>
  );
};

export default NavigationTreeEditor;
