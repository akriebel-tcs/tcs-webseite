/**
 * pickEditorialNodeForPage — wählt aus mehreren Navigationsknoten, die auf
 * dieselbe Seite (`page_key`) zeigen, den redaktionell sinnvollsten aus.
 *
 * Hintergrund:
 *   Eine Seite kann mehrfach in der Navigation auftauchen — typischerweise
 *   einmal im Main-/Persona-/Meta-Baum (echter Inhaltsknoten) und zusätzlich
 *   im Footer als reines Link-Wort. Wenn jemand im Admin „P-063" eingibt,
 *   darf der Admin nicht im Footer-Link-Editor landen, nur weil aktuell ein
 *   Footer-Knoten ausgewählt ist. Footer-Knoten haben keinen Inhaltseditor —
 *   da gibt es nichts zu redigieren außer dem Label.
 *
 * Regel:
 *   1. Footer-/Footer-Bottom-Knoten werden hart deklassiert, außer es gibt
 *      keine anderen Knoten für diese Seite.
 *   2. Innerhalb der bevorzugten Gruppe gilt:
 *      - `node_type = 'page'` vor anderen Typen,
 *      - Bereichsrangfolge main → meta → home → persona,
 *      - „echte" Schlüssel vor Alias-Schlüsseln (`f.…`, `m.…`, `h.…`),
 *      - kleinste `sort_order` zuerst.
 *
 * Diese Funktion ist ausdrücklich der EINE Ort, an dem entschieden wird,
 * welcher Knoten beim Sprung über P-/B-/A-Kurz-IDs oder beim „Zielseite
 * bearbeiten"-Klick aus dem Footer-Link-Editor geöffnet wird.
 */
import type { NavigationNodeRow } from "@/features/admin/api/cmsAdminNavigation";

const EDITORIAL_AREA_PRIORITY: Record<string, number> = {
  main: 0,
  meta: 1,
  home: 2,
  persona: 3,
  footer: 9,
  footer_bottom: 9,
};

const isAliasNodeKey = (key: string | null | undefined) =>
  !!key && /^(f|m|h)\./i.test(key);

const isFooterArea = (area: string | null | undefined) =>
  area === "footer" || area === "footer_bottom";

export function pickEditorialNodeForPage(
  nodes: NavigationNodeRow[],
  pageKey: string,
): NavigationNodeRow | null {
  const candidates = nodes.filter((n) => n.page_key === pageKey);
  if (candidates.length === 0) return null;

  // Footer-Knoten nur dann zulassen, wenn es keine redaktionellen Alternativen
  // gibt. So „klebt" ein Footer-Alias keine P-Sprünge mehr fest.
  const editorial = candidates.filter((n) => !isFooterArea(n.nav_area));
  const pool = editorial.length > 0 ? editorial : candidates;

  return [...pool].sort((a, b) => {
    const pageRank = (a.node_type === "page" ? 0 : 1) - (b.node_type === "page" ? 0 : 1);
    if (pageRank !== 0) return pageRank;
    const areaRank =
      (EDITORIAL_AREA_PRIORITY[a.nav_area ?? ""] ?? 8) -
      (EDITORIAL_AREA_PRIORITY[b.nav_area ?? ""] ?? 8);
    if (areaRank !== 0) return areaRank;
    const aliasRank = Number(isAliasNodeKey(a.node_key)) - Number(isAliasNodeKey(b.node_key));
    if (aliasRank !== 0) return aliasRank;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  })[0] ?? null;
}
