/**
 * Tree-Typen, mechanisch aus NavigationTreeEditor ausgelagert (Split-1).
 * Keine Logik-Änderung — reine Typ-Definitionen.
 */
import type { NavigationNodeRow } from "@/features/admin/api/cmsAdminNavigation";
import type { SectionRow } from "@/features/admin/api/cmsAdminSectionOrder";

export interface TreeNode extends NavigationNodeRow {
  children: TreeNode[];
}

export type SectionTreeNode = SectionRow & { children: SectionTreeNode[] };
