/**
 * Tree-Hilfsfunktionen, mechanisch aus NavigationTreeEditor ausgelagert
 * (Split-1). Keine Logik-Änderung.
 */
import type { NavArea, NavigationNodeRow } from "@/features/admin/api/cmsAdminNavigation";
import type { SectionRow } from "@/features/admin/api/cmsAdminSectionOrder";
import { NAV_AREAS } from "./constants";
import type { SectionTreeNode, TreeNode } from "./types";

export function buildTree(nodes: NavigationNodeRow[]): Record<NavArea, TreeNode[]> {
  const byArea: Record<NavArea, TreeNode[]> = {
    home: [],
    main: [],
    meta: [],
    footer: [],
    footer_bottom: [],
    persona: [],
  };
  const map = new Map<string, TreeNode>();
  nodes.forEach((n) => map.set(n.id, { ...n, children: [] }));
  nodes.forEach((n) => {
    const node = map.get(n.id)!;
    if (n.parent_id && map.has(n.parent_id)) {
      map.get(n.parent_id)!.children.push(node);
    } else {
      byArea[n.nav_area].push(node);
    }
  });
  const sortRec = (arr: TreeNode[]) => {
    arr.sort((a, b) => a.sort_order - b.sort_order || a.node_key.localeCompare(b.node_key));
    arr.forEach((c) => sortRec(c.children));
  };
  NAV_AREAS.forEach((a) => sortRec(byArea[a]));
  return byArea;
}

export function buildSectionTree(sections: SectionRow[]): SectionTreeNode[] {
  const map = new Map<string, SectionTreeNode>();
  sections.forEach((s) => map.set(s.id, { ...s, children: [] }));
  const roots: SectionTreeNode[] = [];
  sections.forEach((s) => {
    const node = map.get(s.id)!;
    if (s.parent_section_id && map.has(s.parent_section_id)) {
      map.get(s.parent_section_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (arr: SectionTreeNode[]) => {
    arr.sort((a, b) => a.sort_order - b.sort_order || a.section_key.localeCompare(b.section_key));
    arr.forEach((c) => sortRec(c.children));
  };
  sortRec(roots);
  return roots;
}

/** Sammelt alle Nachfahren-IDs eines Knotens (inkl. ihn selbst), damit der
 *  „Teil von"-Selector keine zyklischen Eltern-Wahlen anbietet. */
export function collectDescendantIds(node: SectionTreeNode, into: Set<string>): void {
  into.add(node.id);
  for (const c of node.children) collectDescendantIds(c, into);
}
