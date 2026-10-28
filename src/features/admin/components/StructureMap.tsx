/**
 * Strukturkarte V3 — read-only Sitemap der Website-Struktur.
 *
 * Korrekturen gegenüber V2:
 *   - Home wird korrekt über den Navigationsknoten (`page_key=home.start`)
 *     aufgelöst und niemals als „Weitere Seite" einsortiert.
 *   - Statt einer freien Mindmap wird ein deterministisches Sitemap-Layout
 *     gerechnet: oben Persona + Meta als horizontale Leisten, mittig Home
 *     und MainNav-Baum, unten Footer und Footer Bottom; rechts zwei
 *     separate Spalten „Nur über Karten/CTA erreichbar" und
 *     „Nicht erreichbar / prüfen".
 *   - Cluster werden anhand ihrer Inhalte gemessen und überlappungsfrei
 *     gestapelt — Reset-Layout ist reproduzierbar lesbar.
 *   - Statistik-Leiste oben: Seiten gesamt / in Nav / nur über Links /
 *     nicht erreichbar / 404 Links / Mehrfach-Nav.
 *
 * Keine Migration, keine RPCs, keine Public-/Renderer-Änderung.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Map as MapIcon,
  RefreshCw,
  X,
  Search,
  ExternalLink,
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
  ZoomOut,
  Locate,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import {
  loadStructureMap,
  type StructureMapBundle,
  type CardLinkEdge,
} from "@/features/admin/lib/structureMapData";
import { resolveShortId } from "@/features/admin/api/cmsAdminResolve";
import type { JumpTarget } from "@/features/admin/components/GoToShortIdBar";
import type { NavigationNodeRow, NavArea } from "@/features/admin/api/cmsAdminNavigation";
import type { CmsPageRow } from "@/features/admin/api/cmsAdminPages";
import { TEMPLATE_REGISTRY } from "@/features/admin/lib/templates";
import AdminPreviewDrawer from "@/features/admin/components/AdminPreviewDrawer";

interface Props {
  onJump: (target: JumpTarget) => void;
  /** Wenn true: ohne Dialog/Trigger inline rendern (z. B. als Toggle-Ansicht in AdminPage). */
  inline?: boolean;
}

// --- Layout-Konstanten ---
const NODE_W = 240;
const NODE_H = 54;
const NODE_VGAP = 10;
const NODE_HGAP = 16;
const INDENT = 26;
const CLUSTER_PAD = 22;
const CLUSTER_HEADER_H = 30;
const CLUSTER_VGAP = 50;
const COLUMN_GAP = 80;

type ClusterKey =
  | "persona"
  | "meta"
  | "home"
  | "main"
  | "footer"
  | "footer_bottom"
  | "only_links"
  | "unreachable";

const CLUSTER_LABEL: Record<ClusterKey, string> = {
  persona: "Persona",
  meta: "Meta",
  home: "Startseite",
  main: "Hauptnavigation",
  footer: "Footer",
  footer_bottom: "Footer Bottom",
  only_links: "Nur über Karten/CTA erreichbar",
  unreachable: "Nicht erreichbar / prüfen",
};

const CLUSTER_COLOR: Record<ClusterKey, string> = {
  persona: "#a855f7",
  meta: "#7c3aed",
  home: "#0f172a",
  main: "#2563eb",
  footer: "#475569",
  footer_bottom: "#94a3b8",
  only_links: "#b45309",
  unreachable: "#dc2626",
};

type ClusterDir = "row" | "tree";
const CLUSTER_DIR: Record<ClusterKey, ClusterDir> = {
  persona: "row",
  meta: "row",
  home: "row",
  main: "tree",
  footer: "tree",
  footer_bottom: "row",
  only_links: "tree",
  unreachable: "tree",
};

const TEMPLATE_COLOR_PRODUKT = "#0ea5a4";

interface PlacedNode {
  id: string;
  kind: "home" | "nav" | "page";
  cluster: ClusterKey;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sublabel: string;
  pageKey: string | null;
  pageNo: number | null;
  nodeNo: number | null;
  parentNodeId: string | null;
  templateKey: string | null;
  raw: NavigationNodeRow | CmsPageRow | null;
}

interface ClusterBox {
  key: ClusterKey;
  label: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface HierarchyEdgeLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  fromId: string;
  toId: string;
}

interface PlacedLinkEdge {
  edge: CardLinkEdge;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  fromId: string;
  toId: string | null;
}

type Selection =
  | { kind: "node"; node: PlacedNode }
  | { kind: "edge"; placed: PlacedLinkEdge }
  | null;

type Device = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<Device, number> = {
  desktop: 1440,
  tablet: 820,
  mobile: 390,
};

const POS_STORAGE_KEY = "tcs.admin.structureMap.positions.v3";

function navAreaToCluster(a: NavArea): ClusterKey | null {
  switch (a) {
    case "home":
      return null;
    case "main":
      return "main";
    case "persona":
      return "persona";
    case "meta":
      return "meta";
    case "footer":
      return "footer";
    case "footer_bottom":
      return "footer_bottom";
    default:
      return null;
  }
}

function buildTemplateLookup(): Map<string, string> {
  const m = new Map<string, string>();
  for (const t of TEMPLATE_REGISTRY) {
    for (const pk of t.member_page_keys) m.set(pk, t.template_key);
  }
  return m;
}

// --------------------------------------------------------------------------
// Layout-Builder pro Cluster: erzeugt PlacedNodes relativ zum Cluster-Origin
// (0,0 = links oben unter dem Header), und liefert benötigte Breite/Höhe.
// --------------------------------------------------------------------------
interface ClusterContent {
  nodes: PlacedNode[];
  width: number;
  height: number;
}

function layoutTreeCluster(
  cluster: ClusterKey,
  rawNodes: NavigationNodeRow[],
  pagesByKey: Map<string, CmsPageRow>,
  templateByPageKey: Map<string, string>,
): ClusterContent {
  const childrenByParent = new Map<string | null, NavigationNodeRow[]>();
  const validIds = new Set(rawNodes.map((n) => n.id));
  for (const n of rawNodes) {
    const parent = n.parent_id && validIds.has(n.parent_id) ? n.parent_id : null;
    if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
    childrenByParent.get(parent)!.push(n);
  }
  for (const arr of childrenByParent.values()) {
    arr.sort((a, b) => a.sort_order - b.sort_order);
  }

  const nodes: PlacedNode[] = [];
  let cursorY = 0;
  let maxDepth = 0;

  const walk = (parentId: string | null, depth: number) => {
    const kids = childrenByParent.get(parentId) ?? [];
    for (const n of kids) {
      maxDepth = Math.max(maxDepth, depth);
      const page = n.page_key ? pagesByKey.get(n.page_key) ?? null : null;
      nodes.push({
        id: n.id,
        kind: "nav",
        cluster,
        x: depth * INDENT,
        y: cursorY,
        w: NODE_W,
        h: NODE_H,
        label: n.label_de ?? n.label ?? n.node_key,
        sublabel: n.page_key ?? n.route_path ?? n.external_url ?? n.node_key,
        pageKey: n.page_key,
        pageNo: page?.page_no ?? null,
        nodeNo: n.node_no,
        parentNodeId: n.parent_id && validIds.has(n.parent_id) ? n.parent_id : null,
        templateKey: n.page_key ? templateByPageKey.get(n.page_key) ?? null : null,
        raw: n,
      });
      cursorY += NODE_H + NODE_VGAP;
      walk(n.id, depth + 1);
    }
  };
  walk(null, 0);

  const width = NODE_W + maxDepth * INDENT;
  const height = Math.max(NODE_H, cursorY - NODE_VGAP);
  return { nodes, width, height };
}

function layoutRowCluster(
  cluster: ClusterKey,
  rawNodes: NavigationNodeRow[],
  pagesByKey: Map<string, CmsPageRow>,
  templateByPageKey: Map<string, string>,
  maxRowWidth: number,
): ClusterContent {
  const sorted = [...rawNodes].sort((a, b) => a.sort_order - b.sort_order);
  const nodes: PlacedNode[] = [];
  let cx = 0;
  let cy = 0;
  let rowMaxX = 0;
  for (const n of sorted) {
    if (cx > 0 && cx + NODE_W > maxRowWidth) {
      cx = 0;
      cy += NODE_H + NODE_VGAP;
    }
    const page = n.page_key ? pagesByKey.get(n.page_key) ?? null : null;
    nodes.push({
      id: n.id,
      kind: "nav",
      cluster,
      x: cx,
      y: cy,
      w: NODE_W,
      h: NODE_H,
      label: n.label_de ?? n.label ?? n.node_key,
      sublabel: n.page_key ?? n.route_path ?? n.external_url ?? n.node_key,
      pageKey: n.page_key,
      pageNo: page?.page_no ?? null,
      nodeNo: n.node_no,
      parentNodeId: null, // row-Layout ignoriert Hierarchie für x/y
      templateKey: n.page_key ? templateByPageKey.get(n.page_key) ?? null : null,
      raw: n,
    });
    cx += NODE_W + NODE_HGAP;
    rowMaxX = Math.max(rowMaxX, cx - NODE_HGAP);
  }
  const width = Math.max(NODE_W, rowMaxX);
  const height = Math.max(NODE_H, cy + NODE_H);
  return { nodes, width, height };
}

function layoutPagesColumn(
  cluster: ClusterKey,
  pages: CmsPageRow[],
  templateByPageKey: Map<string, string>,
): ClusterContent {
  const sorted = [...pages].sort((a, b) => (a.page_no ?? 0) - (b.page_no ?? 0));
  const nodes: PlacedNode[] = [];
  let cy = 0;
  for (const p of sorted) {
    nodes.push({
      id: `page::${p.page_key}`,
      kind: "page",
      cluster,
      x: 0,
      y: cy,
      w: NODE_W,
      h: NODE_H,
      label: p.title_de ?? p.page_key,
      sublabel: p.route_path ?? p.page_key,
      pageKey: p.page_key,
      pageNo: p.page_no,
      nodeNo: null,
      parentNodeId: null,
      templateKey: templateByPageKey.get(p.page_key) ?? null,
      raw: p,
    });
    cy += NODE_H + NODE_VGAP;
  }
  return {
    nodes,
    width: NODE_W,
    height: Math.max(NODE_H, cy - NODE_VGAP),
  };
}

const StructureMap = ({ onJump, inline = false }: Props) => {
  const [openState, setOpen] = useState(false);
  const open = inline || openState;
  const [loading, setLoading] = useState(false);
  const [bundle, setBundle] = useState<StructureMapBundle | null>(null);
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Selection>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [previewPageKey, setPreviewPageKey] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [filters, setFilters] = useState({
    hierarchy: true,
    cardLinks: true,
    persona: true,
    meta: true,
    main: true,
    footer: true,
    footer_bottom: true,
    only_links: true,
    unreachable: true,
    onlyProdukt: false,
  });

  // Pan/Zoom
  const [tx, setTx] = useState(60);
  const [ty, setTy] = useState(60);
  const [scale, setScale] = useState(0.6);
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  // Lokale Knoten-Offsets (rein visuell, in localStorage gemerkt).
  const [positions, setPositions] = useState<Record<string, { dx: number; dy: number }>>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(POS_STORAGE_KEY) : null;
      return raw ? (JSON.parse(raw) as Record<string, { dx: number; dy: number }>) : {};
    } catch {
      return {};
    }
  });
  const nodeDragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    baseDx: number;
    baseDy: number;
  } | null>(null);

  const persistPositions = useCallback((next: Record<string, { dx: number; dy: number }>) => {
    setPositions(next);
    try {
      localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const resetPositions = useCallback(() => {
    persistPositions({});
  }, [persistPositions]);

  const templateByPageKey = useMemo(() => buildTemplateLookup(), []);

  const load = useCallback(() => {
    setLoading(true);
    return loadStructureMap()
      .then((b) => setBundle(b))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (open && !bundle && !loading) {
      void load();
    }
  }, [open, bundle, loading, load]);

  // ---- Layout berechnen ----
  const layout = useMemo(() => {
    if (!bundle) {
      return {
        nodes: [] as PlacedNode[],
        clusters: [] as ClusterBox[],
        hierarchyEdges: [] as HierarchyEdgeLine[],
        linkEdges: [] as PlacedLinkEdge[],
        width: 2200,
        height: 1400,
        nodesById: new Map<string, PlacedNode>(),
      };
    }

    // Nav-Knoten gruppieren (ohne home).
    const navByCluster = new Map<ClusterKey, NavigationNodeRow[]>();
    let homeNavNode: NavigationNodeRow | null = null;
    for (const n of bundle.nodes) {
      if (!n.is_active) continue;
      if (n.nav_area === "home") {
        homeNavNode = n;
        continue;
      }
      const c = navAreaToCluster(n.nav_area as NavArea);
      if (!c) continue;
      if (!navByCluster.has(c)) navByCluster.set(c, []);
      navByCluster.get(c)!.push(n);
    }

    // Home-Seite über Nav-Knoten auflösen (page_key=home.start), Fallback Route '/'.
    const homePage =
      (homeNavNode?.page_key ? bundle.pagesByKey.get(homeNavNode.page_key) : null) ??
      bundle.pagesByRoute.get("/") ??
      null;

    // Cluster-Inhalte vorbauen (jeweils Origin 0,0).
    const homeRow = homeNavNode
      ? layoutRowCluster(
          "home",
          [homeNavNode],
          bundle.pagesByKey,
          templateByPageKey,
          NODE_W,
        )
      : {
          nodes: homePage
            ? [
                {
                  id: "home::root",
                  kind: "home" as const,
                  cluster: "home" as ClusterKey,
                  x: 0,
                  y: 0,
                  w: NODE_W,
                  h: NODE_H,
                  label: homePage.title_de ?? "Startseite",
                  sublabel: homePage.route_path ?? homePage.page_key,
                  pageKey: homePage.page_key,
                  pageNo: homePage.page_no,
                  nodeNo: null,
                  parentNodeId: null,
                  templateKey: templateByPageKey.get(homePage.page_key) ?? null,
                  raw: homePage,
                },
              ]
            : [],
          width: NODE_W,
          height: NODE_H,
        };
    // Markiere Home-Knoten als kind="home" für Styling.
    for (const hn of homeRow.nodes) {
      hn.kind = "home";
      hn.cluster = "home";
    }

    const personaContent = layoutRowCluster(
      "persona",
      navByCluster.get("persona") ?? [],
      bundle.pagesByKey,
      templateByPageKey,
      1800,
    );
    const metaContent = layoutRowCluster(
      "meta",
      navByCluster.get("meta") ?? [],
      bundle.pagesByKey,
      templateByPageKey,
      1800,
    );
    const mainContent = layoutTreeCluster(
      "main",
      navByCluster.get("main") ?? [],
      bundle.pagesByKey,
      templateByPageKey,
    );
    const footerContent = layoutTreeCluster(
      "footer",
      navByCluster.get("footer") ?? [],
      bundle.pagesByKey,
      templateByPageKey,
    );
    const footerBottomContent = layoutRowCluster(
      "footer_bottom",
      navByCluster.get("footer_bottom") ?? [],
      bundle.pagesByKey,
      templateByPageKey,
      1800,
    );

    // Rest-Spalten aus Klassifizierung im Bundle.
    const onlyLinkPages = bundle.pages.filter((p) => bundle.onlyLinkPageKeys.has(p.page_key));
    const unreachablePages = bundle.pages.filter((p) =>
      bundle.unreachablePageKeys.has(p.page_key),
    );
    const onlyLinksContent = layoutPagesColumn("only_links", onlyLinkPages, templateByPageKey);
    const unreachableContent = layoutPagesColumn(
      "unreachable",
      unreachablePages,
      templateByPageKey,
    );

    // --- Cluster in 2 Spalten platzieren ---
    // Spalte A (links): Persona, Meta, Home, Main, Footer, Footer Bottom
    // Spalte B (rechts): Only-Links, Unreachable
    const colA: ClusterKey[] = ["persona", "meta", "home", "main", "footer", "footer_bottom"];
    const contents: Record<ClusterKey, ClusterContent> = {
      persona: personaContent,
      meta: metaContent,
      home: homeRow,
      main: mainContent,
      footer: footerContent,
      footer_bottom: footerBottomContent,
      only_links: onlyLinksContent,
      unreachable: unreachableContent,
    };

    // Sichtbarkeit per Filter.
    const visible: Record<ClusterKey, boolean> = {
      persona: filters.persona,
      meta: filters.meta,
      home: true,
      main: filters.main,
      footer: filters.footer,
      footer_bottom: filters.footer_bottom,
      only_links: filters.only_links,
      unreachable: filters.unreachable,
    };

    const clusterBoxes: ClusterBox[] = [];
    const placedNodes: PlacedNode[] = [];
    const nodesById = new Map<string, PlacedNode>();

    // Spaltenbreite A: max aus enthaltenen Clustern.
    let colAWidth = NODE_W;
    for (const k of colA) {
      if (!visible[k]) continue;
      colAWidth = Math.max(colAWidth, contents[k].width);
    }

    // Spalte A vertikal stapeln.
    let cursorY = 0;
    const colAX = 0;
    for (const k of colA) {
      if (!visible[k]) continue;
      const c = contents[k];
      const boxW = c.width + 2 * CLUSTER_PAD;
      const boxH = c.height + CLUSTER_HEADER_H + 2 * CLUSTER_PAD;
      clusterBoxes.push({
        key: k,
        label: CLUSTER_LABEL[k],
        color: CLUSTER_COLOR[k],
        x: colAX,
        y: cursorY,
        w: Math.max(boxW, colAWidth + 2 * CLUSTER_PAD),
        h: boxH,
      });
      // Knoten in absolute Koordinaten überführen.
      for (const n of c.nodes) {
        const node: PlacedNode = {
          ...n,
          x: colAX + CLUSTER_PAD + n.x,
          y: cursorY + CLUSTER_HEADER_H + CLUSTER_PAD + n.y,
        };
        placedNodes.push(node);
        nodesById.set(node.id, node);
      }
      cursorY += boxH + CLUSTER_VGAP;
    }
    const colAHeight = cursorY > 0 ? cursorY - CLUSTER_VGAP : 0;

    // Spalte B platzieren.
    const colBX = colAX + Math.max(colAWidth + 2 * CLUSTER_PAD, NODE_W) + COLUMN_GAP;
    let cursorBY = 0;
    const colBClusters: ClusterKey[] = ["only_links", "unreachable"];
    for (const k of colBClusters) {
      if (!visible[k]) continue;
      const c = contents[k];
      const boxW = c.width + 2 * CLUSTER_PAD;
      const boxH = c.height + CLUSTER_HEADER_H + 2 * CLUSTER_PAD;
      clusterBoxes.push({
        key: k,
        label: CLUSTER_LABEL[k],
        color: CLUSTER_COLOR[k],
        x: colBX,
        y: cursorBY,
        w: boxW,
        h: boxH,
      });
      for (const n of c.nodes) {
        const node: PlacedNode = {
          ...n,
          x: colBX + CLUSTER_PAD + n.x,
          y: cursorBY + CLUSTER_HEADER_H + CLUSTER_PAD + n.y,
        };
        placedNodes.push(node);
        nodesById.set(node.id, node);
      }
      cursorBY += boxH + CLUSTER_VGAP;
    }
    const colBHeight = cursorBY > 0 ? cursorBY - CLUSTER_VGAP : 0;

    // Lokale Drag-Offsets anwenden.
    for (const n of placedNodes) {
      const off = positions[n.id];
      if (off) {
        n.x += off.dx;
        n.y += off.dy;
      }
    }

    // Template-only Filter (Home immer sichtbar).
    const finalNodes = filters.onlyProdukt
      ? placedNodes.filter((n) => n.kind === "home" || n.templateKey === "produkt_sub_v1")
      : placedNodes;
    const finalNodeIds = new Set(finalNodes.map((n) => n.id));

    // Hierarchie-Edges: nur Parent → Child innerhalb eines Tree-Clusters.
    const hierarchyEdges: HierarchyEdgeLine[] = [];
    for (const n of finalNodes) {
      if (!n.parentNodeId) continue;
      if (!finalNodeIds.has(n.parentNodeId)) continue;
      if (CLUSTER_DIR[n.cluster] !== "tree") continue;
      const p = nodesById.get(n.parentNodeId);
      if (!p) continue;
      hierarchyEdges.push({
        id: `${p.id}->${n.id}`,
        x1: p.x + 14,
        y1: p.y + p.h,
        x2: n.x + 14,
        y2: n.y + n.h / 2,
        fromId: p.id,
        toId: n.id,
      });
    }

    // Link-Edges (Karten/CTA).
    const linkEdges: PlacedLinkEdge[] = [];
    if (filters.cardLinks) {
      const firstByPage = new Map<string, PlacedNode>();
      for (const n of finalNodes) {
        if (n.pageKey && !firstByPage.has(n.pageKey)) firstByPage.set(n.pageKey, n);
      }
      for (const e of bundle.edges) {
        const from = firstByPage.get(e.page_key);
        if (!from) continue;
        const to = e.target_page_key ? firstByPage.get(e.target_page_key) ?? null : null;
        if (e.kind === "internal-found" && !to) continue;
        if (e.kind === "anchor") continue; // Anker bewusst ausblenden (innerhalb derselben Seite)
        const x1 = from.x + from.w;
        const y1 = from.y + from.h / 2;
        let x2: number;
        let y2: number;
        if (to) {
          x2 = to.x;
          y2 = to.y + to.h / 2;
        } else {
          x2 = from.x + from.w + 80;
          y2 = from.y + from.h / 2;
        }
        linkEdges.push({ edge: e, x1, y1, x2, y2, fromId: from.id, toId: to?.id ?? null });
      }
    }

    const width = colBX + 600;
    const height = Math.max(colAHeight, colBHeight) + 200;

    return {
      nodes: finalNodes,
      clusters: clusterBoxes,
      hierarchyEdges,
      linkEdges,
      width,
      height,
      nodesById,
    };
  }, [bundle, positions, filters, templateByPageKey]);

  // Suche
  const matchedIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const ids = new Set<string>();
    for (const n of layout.nodes) {
      const hay = [
        n.label,
        n.sublabel,
        n.pageKey ?? "",
        n.pageNo ? `p-${String(n.pageNo).padStart(3, "0")}` : "",
        n.nodeNo ? `n-${String(n.nodeNo).padStart(3, "0")}` : "",
      ]
        .join(" ")
        .toLowerCase();
      if (hay.includes(q)) ids.add(n.id);
    }
    return ids;
  }, [search, layout.nodes]);

  // Hervorhebungsmenge bei Hover/Klick auf Knoten.
  const highlightedIds = useMemo(() => {
    const activeId =
      hoverId ?? (selection?.kind === "node" ? selection.node.id : null) ?? null;
    if (!activeId) return null;
    const ids = new Set<string>([activeId]);
    for (const e of layout.hierarchyEdges) {
      if (e.fromId === activeId) ids.add(e.toId);
      if (e.toId === activeId) ids.add(e.fromId);
    }
    for (const e of layout.linkEdges) {
      if (e.fromId === activeId && e.toId) ids.add(e.toId);
      if (e.toId === activeId) ids.add(e.fromId);
    }
    return ids;
  }, [hoverId, selection, layout]);

  // Pan
  const onSurfaceMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-node]") || target.closest("[data-edge]")) return;
    dragRef.current = { x: e.clientX, y: e.clientY, tx, ty };
  };
  const onSurfaceMouseMove = (e: React.MouseEvent) => {
    if (nodeDragRef.current) {
      const { id, startX, startY, baseDx, baseDy } = nodeDragRef.current;
      const dx = baseDx + (e.clientX - startX) / scale;
      const dy = baseDy + (e.clientY - startY) / scale;
      setPositions((prev) => ({ ...prev, [id]: { dx, dy } }));
      return;
    }
    if (!dragRef.current) return;
    setTx(dragRef.current.tx + (e.clientX - dragRef.current.x));
    setTy(dragRef.current.ty + (e.clientY - dragRef.current.y));
  };
  const onSurfaceMouseUp = () => {
    if (nodeDragRef.current) {
      try {
        localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(positions));
      } catch {
        /* ignore */
      }
      nodeDragRef.current = null;
    }
    dragRef.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    if (!surfaceRef.current) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const next = Math.min(2.5, Math.max(0.2, scale * delta));
    setTx(mx - (mx - tx) * (next / scale));
    setTy(my - (my - ty) * (next / scale));
    setScale(next);
  };

  const resetView = () => {
    setTx(60);
    setTy(60);
    setScale(0.6);
  };

  const handleJumpToPage = async (pageNo: number | null) => {
    if (!pageNo) return;
    const formatted = `P-${String(pageNo).padStart(3, "0")}`;
    const r = await resolveShortId({ kind: "P", value: pageNo, formatted });
    if (r.success) {
      onJump({
        page_key: (r as { page_key: string }).page_key,
        section_key: null,
        node_id: null,
        field_key: null,
        label: (r as { page_key: string }).page_key,
        raw: r,
      });
      setOpen(false);
    }
  };

  const handleJumpToNode = async (nodeNo: number | null) => {
    if (!nodeNo) return;
    const formatted = `N-${String(nodeNo).padStart(3, "0")}`;
    const r = await resolveShortId({ kind: "N", value: nodeNo, formatted });
    if (r.success) {
      onJump({
        page_key: (r as { page_key: string | null }).page_key,
        section_key: null,
        node_id: (r as { id: string }).id,
        field_key: null,
        label: (r as { node_key: string }).node_key,
        raw: r,
      });
      setOpen(false);
    }
  };

  const stats = useMemo(() => {
    if (!bundle) {
      return {
        pages: 0,
        inNav: 0,
        onlyLinks: 0,
        unreachable: 0,
        multiNav: 0,
        internalLinks: 0,
        missing: 0,
        external: 0,
      };
    }
    return {
      pages: bundle.pages.length,
      inNav: bundle.navPageKeys.size,
      onlyLinks: bundle.onlyLinkPageKeys.size,
      unreachable: bundle.unreachablePageKeys.size,
      multiNav: bundle.multiNavPageKeys.size,
      internalLinks: bundle.edges.filter((e) => e.kind === "internal-found").length,
      missing: bundle.edges.filter((e) => e.kind === "internal-missing").length,
      external: bundle.edges.filter((e) => e.kind === "external").length,
    };
  }, [bundle]);

  const inPreview = !!previewPageKey;
  const previewRoute = previewPageKey
    ? bundle?.pagesByKey.get(previewPageKey)?.route_path ?? null
    : null;

  const body = (
    <>
        <div className="shrink-0 border-b px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <MapIcon className="h-4 w-4" />
              Strukturkarte
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-50 text-amber-800"
              >
                Stufe 0 · nur Ansicht · Sitemap V3
              </Badge>
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={load}
                disabled={loading}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Neu laden
              </Button>
              {!inline && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => setOpen(false)}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Zurück zu CMS
                </Button>
              )}
            </div>
          </div>
        </div>

        {!inPreview && bundle && (
          <div className="flex shrink-0 flex-wrap items-center gap-3 border-b bg-muted/20 px-4 py-1.5 text-[11px]">
            <Stat label="Seiten" value={stats.pages} />
            <Stat label="in Navigation" value={stats.inNav} accent="#2563eb" />
            <Stat label="nur über Links" value={stats.onlyLinks} accent="#b45309" />
            <Stat
              label="nicht erreichbar"
              value={stats.unreachable}
              accent="#dc2626"
            />
            <Stat label="mehrfach in Nav" value={stats.multiNav} accent="#7c3aed" />
            <span className="h-3 w-px bg-border" />
            <Stat label="interne Links" value={stats.internalLinks} accent="#0ea5a4" />
            <Stat label="404" value={stats.missing} accent="#ef4444" />
            <Stat label="extern" value={stats.external} accent="#94a3b8" />
          </div>
        )}

        {!inPreview && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-2 text-xs">
            <div className="relative flex items-center">
              <Search className="absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Suche (P-…, N-…, Label, page_key, Route)"
                className="h-7 w-72 pl-7 text-xs"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  ["hierarchy", "Hierarchie"],
                  ["cardLinks", "Karten-/CTA-Links"],
                  ["persona", "Persona"],
                  ["meta", "Meta"],
                  ["main", "Main"],
                  ["footer", "Footer"],
                  ["footer_bottom", "Footer Bottom"],
                  ["only_links", "Nur über Links"],
                  ["unreachable", "Nicht erreichbar"],
                  ["onlyProdukt", "Nur TPL Produkt"],
                ] as const
              ).map(([k, label]) => (
                <label
                  key={k}
                  className={`cursor-pointer rounded border px-2 py-1 ${
                    filters[k]
                      ? "border-foreground/40 bg-background"
                      : "border-transparent bg-muted text-muted-foreground"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mr-1"
                    checked={filters[k]}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, [k]: e.target.checked }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={resetPositions}
                title="Manuell verschobene Knoten zurück auf Standardposition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Layout zurücksetzen
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => setScale((s) => Math.max(0.2, s * 0.9))}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="w-12 text-center font-mono text-[11px] text-muted-foreground">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => setScale((s) => Math.min(2.5, s * 1.1))}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm" className="h-7 px-2" onClick={resetView}>
                <Locate className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          {inPreview ? (
            <PreviewPane
              route={previewRoute}
              pageKey={previewPageKey}
              device={device}
              setDevice={setDevice}
              onBack={() => setPreviewPageKey(null)}
              onClose={() => setOpen(false)}
            />
          ) : (
            <>
              <div
                ref={surfaceRef}
                className="relative flex-1 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100"
                onMouseDown={onSurfaceMouseDown}
                onMouseMove={onSurfaceMouseMove}
                onMouseUp={onSurfaceMouseUp}
                onMouseLeave={onSurfaceMouseUp}
                onWheel={onWheel}
                style={{ cursor: dragRef.current ? "grabbing" : "grab" }}
              >
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    Lade Strukturkarte …
                  </div>
                )}
                {bundle?.errors.length ? (
                  <div className="absolute left-2 top-2 z-10 max-w-md rounded border border-destructive/40 bg-destructive/5 px-2 py-1 text-[11px] text-destructive">
                    {bundle.errors.join(" · ")}
                  </div>
                ) : null}

                <div
                  className="absolute origin-top-left"
                  style={{
                    transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                    width: layout.width,
                    height: layout.height,
                  }}
                >
                  {/* Cluster-Hintergründe */}
                  {layout.clusters.map((c) => (
                    <div
                      key={c.key}
                      className="absolute rounded-2xl"
                      style={{
                        left: c.x,
                        top: c.y,
                        width: c.w,
                        height: c.h,
                        background: `${c.color}0d`,
                        border: `1.5px dashed ${c.color}55`,
                      }}
                    >
                      <div
                        className="absolute left-3 top-2 rounded px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          color: c.color,
                          background: `${c.color}1a`,
                        }}
                      >
                        {c.label}
                      </div>
                    </div>
                  ))}

                  {/* SVG Edges */}
                  <svg
                    className="pointer-events-none absolute left-0 top-0"
                    width={layout.width}
                    height={layout.height}
                    style={{ overflow: "visible" }}
                  >
                    {filters.hierarchy &&
                      layout.hierarchyEdges.map((e) => {
                        const active =
                          highlightedIds &&
                          (highlightedIds.has(e.fromId) || highlightedIds.has(e.toId));
                        const dimmed = highlightedIds && !active;
                        const dx = (e.x2 - e.x1) / 2;
                        const path = `M ${e.x1} ${e.y1} C ${e.x1 + dx} ${e.y1}, ${e.x2 - dx} ${e.y2}, ${e.x2} ${e.y2}`;
                        return (
                          <path
                            key={e.id}
                            d={path}
                            stroke="#94a3b8"
                            strokeWidth={active ? 2 : 1.1}
                            fill="none"
                            opacity={dimmed ? 0.12 : 0.55}
                          />
                        );
                      })}

                    {filters.cardLinks &&
                      layout.linkEdges.map((p, idx) => {
                        const stroke =
                          p.edge.kind === "internal-missing"
                            ? "#ef4444"
                            : p.edge.kind === "external"
                            ? "#94a3b8"
                            : TEMPLATE_COLOR_PRODUKT;
                        const dash =
                          p.edge.kind === "external" ? "5 4" : "6 5";
                        const cx = (p.x1 + p.x2) / 2;
                        const path = `M ${p.x1} ${p.y1} C ${cx} ${p.y1}, ${cx} ${p.y2}, ${p.x2} ${p.y2}`;
                        const isSelected =
                          selection?.kind === "edge" &&
                          selection.placed.edge.page_key === p.edge.page_key &&
                          selection.placed.edge.section_key === p.edge.section_key &&
                          selection.placed.edge.field_key === p.edge.field_key;
                        const isHighlighted =
                          !!highlightedIds &&
                          (highlightedIds.has(p.fromId) ||
                            (p.toId ? highlightedIds.has(p.toId) : false));
                        const active = isSelected || isHighlighted;
                        const dimmed = highlightedIds && !active;
                        // Standard: Linklinien dezent; aktiv: stark.
                        const baseOpacity = highlightedIds ? (active ? 0.95 : 0.08) : 0.22;
                        return (
                          <g key={idx}>
                            <path
                              d={path}
                              stroke={stroke}
                              strokeWidth={active ? 2.4 : 1}
                              strokeDasharray={dash}
                              fill="none"
                              opacity={dimmed ? 0.08 : baseOpacity}
                            />
                            <path
                              data-edge
                              d={path}
                              stroke="transparent"
                              strokeWidth={14}
                              fill="none"
                              className="pointer-events-auto cursor-pointer"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setSelection({ kind: "edge", placed: p });
                              }}
                            />
                          </g>
                        );
                      })}
                  </svg>

                  {/* Knoten */}
                  {layout.nodes.map((n) => {
                    const isMatched = matchedIds ? matchedIds.has(n.id) : true;
                    const searchDim = matchedIds && !isMatched;
                    const hlDim = highlightedIds && !highlightedIds.has(n.id);
                    const isDimmed = searchDim || hlDim;
                    const isHome = n.kind === "home";
                    const clusterColor = CLUSTER_COLOR[n.cluster] ?? "#475569";
                    const isSelected =
                      selection?.kind === "node" && selection.node.id === n.id;
                    const isProdukt = n.templateKey === "produkt_sub_v1";
                    const isUnreachable = n.cluster === "unreachable";
                    const multiNav =
                      n.pageKey && bundle?.multiNavPageKeys.has(n.pageKey);
                    return (
                      <div
                        key={n.id}
                        data-node
                        className="absolute select-none rounded-md bg-white px-2 py-1 text-[11px] shadow-sm transition-opacity"
                        style={{
                          left: n.x,
                          top: n.y,
                          width: n.w,
                          height: n.h,
                          borderLeft: `4px solid ${clusterColor}`,
                          border: isSelected
                            ? `2px solid ${clusterColor}`
                            : `1px solid ${clusterColor}55`,
                          borderLeftWidth: 4,
                          opacity: isDimmed ? 0.3 : 1,
                          boxShadow: isSelected
                            ? `0 0 0 2px ${clusterColor}33`
                            : undefined,
                          cursor:
                            nodeDragRef.current?.id === n.id ? "grabbing" : "grab",
                          zIndex:
                            isSelected || highlightedIds?.has(n.id) ? 5 : 2,
                          background: isHome
                            ? "#f8fafc"
                            : isUnreachable
                            ? "#fef2f2"
                            : "white",
                        }}
                        onMouseEnter={() => setHoverId(n.id)}
                        onMouseLeave={() =>
                          setHoverId((cur) => (cur === n.id ? null : cur))
                        }
                        onMouseDown={(ev) => {
                          ev.stopPropagation();
                          const off = positions[n.id] ?? { dx: 0, dy: 0 };
                          nodeDragRef.current = {
                            id: n.id,
                            startX: ev.clientX,
                            startY: ev.clientY,
                            baseDx: off.dx,
                            baseDy: off.dy,
                          };
                        }}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setSelection({ kind: "node", node: n });
                        }}
                      >
                        <div className="flex items-center gap-1">
                          {n.nodeNo != null && (
                            <span className="rounded bg-slate-100 px-1 font-mono text-[10px] text-slate-600">
                              N-{String(n.nodeNo).padStart(3, "0")}
                            </span>
                          )}
                          {n.pageNo != null && (
                            <span
                              className="rounded px-1 font-mono text-[10px]"
                              style={{
                                background: `${clusterColor}1a`,
                                color: clusterColor,
                              }}
                            >
                              P-{String(n.pageNo).padStart(3, "0")}
                            </span>
                          )}
                          <span className="truncate font-medium" title={n.label}>
                            {n.label}
                          </span>
                          {isUnreachable && (
                            <AlertTriangle
                              className="ml-auto h-3 w-3 shrink-0 text-destructive"
                            />
                          )}
                          {isProdukt && (
                            <span
                              className="ml-auto shrink-0 rounded px-1 font-mono text-[9px] font-semibold"
                              style={{
                                background: `${TEMPLATE_COLOR_PRODUKT}1a`,
                                color: TEMPLATE_COLOR_PRODUKT,
                                border: `1px solid ${TEMPLATE_COLOR_PRODUKT}55`,
                              }}
                              title="Template: produkt_sub_v1"
                            >
                              TPL Produkt
                            </span>
                          )}
                          {multiNav && (
                            <span
                              className="shrink-0 rounded px-1 font-mono text-[9px] font-semibold"
                              style={{
                                background: "#7c3aed1a",
                                color: "#7c3aed",
                              }}
                              title="Diese Seite hängt in mehreren Nav-Knoten"
                            >
                              ×{" "}
                              {Array.from(bundle?.nodes ?? []).filter(
                                (x) => x.is_active && x.page_key === n.pageKey,
                              ).length || ""}
                            </span>
                          )}
                        </div>
                        <div
                          className="truncate font-mono text-[10px] text-muted-foreground"
                          title={n.sublabel}
                        >
                          {n.sublabel}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailpanel rechts */}
              <DetailPanel
                selection={selection}
                bundle={bundle}
                onClose={() => setSelection(null)}
                onJumpToPage={handleJumpToPage}
                onJumpToNode={handleJumpToNode}
                onPreviewPage={(k) => setPreviewPageKey(k)}
              />
            </>
          )}
        </div>
    </>
  );

  // Route-Pfad der aktuell ausgewählten Seite — speist die Live-Vorschau.
  const selectedPreviewRoute = (() => {
    if (!bundle) return null;
    if (selection?.kind === "node" && selection.node.pageKey) {
      return bundle.pagesByKey.get(selection.node.pageKey)?.route_path ?? null;
    }
    if (selection?.kind === "edge") {
      return bundle.pagesByKey.get(selection.placed.edge.page_key)?.route_path ?? null;
    }
    return null;
  })();
  const selectedPreviewLabel = (() => {
    if (selection?.kind === "node") return `Seite: ${selection.node.label}`;
    if (selection?.kind === "edge") return `Verbindung von ${selection.placed.edge.page_key}`;
    return null;
  })();

  // Reverse-Sync: Wenn der Nutzer im iframe der echten Webseite navigiert,
  // suchen wir die passende Seite (`route_path` → `page_key`) und markieren
  // den ersten Knoten, der diese Seite repräsentiert.
  const handlePreviewRouteChange = (pathname: string) => {
    if (!bundle) return;
    let matchedPageKey: string | null = null;
    for (const [pk, p] of bundle.pagesByKey.entries()) {
      if (p.route_path === pathname) {
        matchedPageKey = pk;
        break;
      }
    }
    if (!matchedPageKey) return;
    const node = layout.nodes.find((n) => n.pageKey === matchedPageKey);
    if (node) setSelection({ kind: "node", node });
  };

  if (inline) {
    return (
      <div className="flex h-full w-full min-h-0 flex-col gap-0 overflow-hidden">
        {body}
        <AdminPreviewDrawer
          routePath={selectedPreviewRoute}
          highlightSectionKey={selection?.kind === "edge" ? selection.placed.edge.section_key : null}
          storageKey="cms-admin.preview.sheet.structure"
          contextLabel={selectedPreviewLabel}
          onRouteChange={handlePreviewRouteChange}
        />
      </div>
    );
  }


  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setSelection(null);
          setPreviewPageKey(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          title="Strukturkarte"
        >
          <MapIcon className="h-3.5 w-3.5" />
          Strukturkarte
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[95vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[95vw]">
        {body}
      </DialogContent>
    </Dialog>
  );
};

// ===========================================================================
// Detailpanel
// ===========================================================================
interface DetailPanelProps {
  selection: Selection;
  bundle: StructureMapBundle | null;
  onClose: () => void;
  onJumpToPage: (pageNo: number | null) => void;
  onJumpToNode: (nodeNo: number | null) => void;
  onPreviewPage: (pageKey: string) => void;
}

function DetailPanel({
  selection,
  bundle,
  onClose,
  onJumpToPage,
  onJumpToNode,
  onPreviewPage,
}: DetailPanelProps) {
  if (!selection) {
    return (
      <aside className="hidden w-80 shrink-0 overflow-y-auto border-l bg-muted/20 p-3 text-xs text-muted-foreground md:block">
        <p className="mb-2 font-medium text-foreground">Detailansicht</p>
        <p>
          Klick auf einen Knoten oder eine Verbindungslinie für Details. Hover hebt
          Verbindungen hervor. Pan mit Maus, Zoom mit Mausrad. Knoten lassen sich per
          Drag lokal verschieben (kein DB-Schreibzugriff, im Browser gespeichert).
        </p>
        <div className="mt-4 space-y-1.5">
          <p className="font-medium text-foreground">Bereiche</p>
          <Legend swatch="#a855f7" label="Persona" />
          <Legend swatch="#7c3aed" label="Meta" />
          <Legend swatch="#0f172a" label="Startseite" />
          <Legend swatch="#2563eb" label="Hauptnavigation" />
          <Legend swatch="#475569" label="Footer" />
          <Legend swatch="#94a3b8" label="Footer Bottom" />
          <Legend swatch="#b45309" label="Nur über Karten/CTA erreichbar" />
          <Legend swatch="#dc2626" label="Nicht erreichbar / prüfen" />
          <p className="mt-2 font-medium text-foreground">Templates</p>
          <Legend swatch="#0ea5a4" label="TPL Produkt · produkt_sub_v1" />
          <p className="mt-2 font-medium text-foreground">Verbindungen</p>
          <Legend swatch="#94a3b8" label="Hierarchie · Parent → Child" line />
          <Legend swatch="#0ea5a4" label="Karten-/CTA-Link (intern)" line dashed />
          <Legend swatch="#ef4444" label="Fehlendes Ziel · 404" line dashed />
          <Legend swatch="#94a3b8" label="Extern" line dashed />
        </div>
        <p className="mt-4 text-[10px] text-muted-foreground">
          Keine Migration, keine DB-Schreibzugriffe, keine Änderung der öffentlichen
          Website.
        </p>
      </aside>
    );
  }

  return (
    <aside className="w-80 shrink-0 overflow-y-auto border-l bg-white p-3 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold text-foreground">
          {selection.kind === "node" ? "Knoten" : "Verbindung"}
        </p>
        <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {selection.kind === "node" ? (
        <NodeDetails
          node={selection.node}
          bundle={bundle}
          onJumpToPage={onJumpToPage}
          onJumpToNode={onJumpToNode}
          onPreviewPage={onPreviewPage}
        />
      ) : (
        <EdgeDetails placed={selection.placed} bundle={bundle} onJumpToPage={onJumpToPage} />
      )}
    </aside>
  );
}

function NodeDetails({
  node,
  bundle,
  onJumpToPage,
  onJumpToNode,
  onPreviewPage,
}: {
  node: PlacedNode;
  bundle: StructureMapBundle | null;
  onJumpToPage: (pageNo: number | null) => void;
  onJumpToNode: (nodeNo: number | null) => void;
  onPreviewPage: (pageKey: string) => void;
}) {
  const isNav = node.kind === "nav" || node.kind === "home";
  const navRow = isNav && node.raw && "nav_area" in node.raw ? (node.raw as NavigationNodeRow) : null;
  const pageRow =
    node.pageKey && bundle?.pagesByKey.get(node.pageKey)
      ? bundle.pagesByKey.get(node.pageKey)!
      : node.kind === "page"
      ? (node.raw as CmsPageRow)
      : null;

  const incoming =
    node.pageKey && bundle ? bundle.incomingLinksByPage.get(node.pageKey) ?? [] : [];
  const allNavForPage =
    node.pageKey && bundle
      ? bundle.nodes.filter((n) => n.is_active && n.page_key === node.pageKey)
      : [];

  const route = pageRow?.route_path ?? navRow?.route_path ?? null;

  return (
    <div className="space-y-2">
      <div>
        <div className="text-sm font-medium">{node.label}</div>
        <div className="font-mono text-[10px] text-muted-foreground">{node.sublabel}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {node.templateKey === "produkt_sub_v1" && (
            <Badge
              variant="outline"
              className="border-teal-400/50 bg-teal-50 text-teal-800"
            >
              TPL Produkt · produkt_sub_v1
            </Badge>
          )}
          {node.cluster === "unreachable" && (
            <Badge variant="outline" className="border-destructive/50 bg-destructive/10 text-destructive">
              Nicht erreichbar
            </Badge>
          )}
          {node.cluster === "only_links" && (
            <Badge variant="outline" className="border-amber-400/50 bg-amber-50 text-amber-900">
              Nur über Karten/CTA erreichbar
            </Badge>
          )}
        </div>
      </div>

      {node.cluster === "unreachable" && (
        <div className="rounded border border-destructive/40 bg-destructive/5 p-2 text-[11px] text-destructive">
          Keine Navigation und kein eingehender interner Link gefunden.
        </div>
      )}

      <dl className="space-y-1 rounded border bg-muted/30 p-2">
        {node.pageNo != null && (
          <Row k="P-Nr." v={`P-${String(node.pageNo).padStart(3, "0")}`} mono />
        )}
        {node.nodeNo != null && (
          <Row k="N-Nr." v={`N-${String(node.nodeNo).padStart(3, "0")}`} mono />
        )}
        {node.pageKey && <Row k="page_key" v={node.pageKey} mono />}
        {navRow && <Row k="nav_area" v={navRow.nav_area} />}
        {navRow && <Row k="node_type" v={navRow.node_type ?? "page"} />}
        {route && <Row k="route" v={route} mono />}
        {pageRow && (
          <Row
            k="Status"
            v={`${pageRow.status} · ${pageRow.is_active ? "aktiv" : "inaktiv"}`}
          />
        )}
        {navRow && (
          <Row
            k="aktiv / public"
            v={`${navRow.is_active ? "ja" : "nein"} · ${
              navRow.show_in_public_nav ? "public" : "nur Admin"
            }`}
          />
        )}
        {allNavForPage.length > 1 && (
          <Row
            k="Nav-Knoten"
            v={allNavForPage
              .map((x) => `N-${String(x.node_no ?? 0).padStart(3, "0")} (${x.nav_area})`)
              .join(", ")}
            mono
          />
        )}
      </dl>

      {incoming.length > 0 && (
        <div className="rounded border bg-muted/20 p-2">
          <p className="mb-1 font-semibold text-[11px]">
            Eingehende Karten-/CTA-Links ({incoming.length})
          </p>
          <ul className="space-y-1">
            {incoming.slice(0, 12).map((e, i) => (
              <li key={i} className="font-mono text-[10px] text-muted-foreground">
                {e.page_key} · {e.section_key} · {e.field_key}
              </li>
            ))}
            {incoming.length > 12 && (
              <li className="text-[10px] text-muted-foreground">
                … +{incoming.length - 12} weitere
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {node.pageNo != null && (
          <Button
            size="sm"
            variant="default"
            className="h-7 px-2 text-xs"
            onClick={() => onJumpToPage(node.pageNo)}
          >
            Im Admin öffnen
          </Button>
        )}
        {isNav && node.nodeNo != null && node.pageNo == null && (
          <Button
            size="sm"
            variant="default"
            className="h-7 px-2 text-xs"
            onClick={() => onJumpToNode(node.nodeNo)}
          >
            Knoten im Admin öffnen
          </Button>
        )}
        {node.pageKey && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => onPreviewPage(node.pageKey!)}
          >
            Vorschau
          </Button>
        )}
        {route && (
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" asChild>
            <a href={route} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3 w-3" />
              Public
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function EdgeDetails({
  placed,
  bundle,
  onJumpToPage,
}: {
  placed: PlacedLinkEdge;
  bundle: StructureMapBundle | null;
  onJumpToPage: (pageNo: number | null) => void;
}) {
  const { edge } = placed;
  const sourcePage = bundle?.pagesByKey.get(edge.page_key);
  const targetPage = edge.target_page_key
    ? bundle?.pagesByKey.get(edge.target_page_key)
    : null;
  const statusLabel: Record<string, string> = {
    "internal-found": "internal · gefunden",
    "internal-missing": "internal · fehlend (404)",
    external: "extern",
    anchor: "Anker (#)",
  };
  return (
    <div className="space-y-2">
      <Badge
        variant="outline"
        className={
          edge.kind === "internal-missing"
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : edge.kind === "external"
            ? "border-slate-300 bg-slate-100 text-slate-700"
            : "border-emerald-300 bg-emerald-50 text-emerald-800"
        }
      >
        {statusLabel[edge.kind]}
      </Badge>

      <dl className="space-y-1 rounded border bg-muted/30 p-2">
        <Row k="Quelle page_key" v={edge.page_key} mono />
        <Row k="section_key" v={edge.section_key} mono />
        <Row k="field_key" v={edge.field_key} mono />
        <Row k="href (roh)" v={edge.href} mono />
        {targetPage && <Row k="Ziel page_key" v={targetPage.page_key} mono />}
        {targetPage?.route_path && <Row k="Ziel route" v={targetPage.route_path} mono />}
      </dl>

      <div className="flex flex-wrap gap-1.5">
        {sourcePage && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => onJumpToPage(sourcePage.page_no)}
          >
            Quelle im Admin
          </Button>
        )}
        {targetPage && (
          <Button
            size="sm"
            variant="default"
            className="h-7 px-2 text-xs"
            onClick={() => onJumpToPage(targetPage.page_no)}
          >
            Ziel im Admin öffnen
          </Button>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// Vorschau
// ===========================================================================
function PreviewPane({
  route,
  pageKey,
  device,
  setDevice,
  onBack,
  onClose,
}: {
  route: string | null;
  pageKey: string | null;
  device: Device;
  setDevice: (d: Device) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const width = DEVICE_WIDTH[device];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2 text-xs">
        <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Zurück zur Karte
        </Button>
        <span className="font-mono text-[11px] text-muted-foreground">{pageKey}</span>
        <span className="text-muted-foreground">·</span>
        <span className="font-mono text-[11px]">{route ?? "(keine Route)"}</span>
        <div className="ml-auto flex items-center gap-1">
          <DeviceButton
            active={device === "desktop"}
            onClick={() => setDevice("desktop")}
            icon={<Monitor className="h-3.5 w-3.5" />}
            label="1440"
          />
          <DeviceButton
            active={device === "tablet"}
            onClick={() => setDevice("tablet")}
            icon={<Tablet className="h-3.5 w-3.5" />}
            label="820"
          />
          <DeviceButton
            active={device === "mobile"}
            onClick={() => setDevice("mobile")}
            icon={<Smartphone className="h-3.5 w-3.5" />}
            label="390"
          />
          {route && (
            <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" asChild>
              <a href={route} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3 w-3" />
                Neuer Tab
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
            Schließen
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto bg-slate-100 p-4">
        {route ? (
          <iframe
            key={`${route}-${device}`}
            src={route}
            title={`Vorschau ${pageKey}`}
            className="border bg-white shadow"
            style={{ width, height: "100%", minHeight: 600 }}
          />
        ) : (
          <div className="m-auto text-sm text-muted-foreground">
            Keine öffentliche Route hinterlegt.
          </div>
        )}
      </div>
    </div>
  );
}

function DeviceButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      className="h-7 gap-1 px-2 text-xs"
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );
}

// ===========================================================================
// Hilfsbausteine
// ===========================================================================
function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="w-24 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
        {k}
      </dt>
      <dd
        className={`min-w-0 flex-1 truncate ${mono ? "font-mono text-[11px]" : "text-[11px]"}`}
        title={v}
      >
        {v}
      </dd>
    </div>
  );
}

function Legend({
  swatch,
  label,
  line,
  dashed,
}: {
  swatch: string;
  label: string;
  line?: boolean;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {line ? (
        <span
          className="inline-block h-0.5 w-6"
          style={{
            background: dashed
              ? `repeating-linear-gradient(90deg, ${swatch} 0 3px, transparent 3px 6px)`
              : swatch,
          }}
        />
      ) : (
        <span className="inline-block h-3 w-3 rounded" style={{ background: swatch }} />
      )}
      <span>{label}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span
        className="font-mono font-semibold tabular-nums"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

export default StructureMap;
