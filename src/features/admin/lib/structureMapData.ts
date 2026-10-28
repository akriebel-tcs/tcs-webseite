/**
 * Daten-Loader für die Strukturkarte V3 (read-only Sitemap-Sicht).
 *
 * Lädt ausschließlich lesend aus bestehenden Quellen:
 *   - `cms_pages` (über `readPagesWithNav`)
 *   - `cms_navigation_nodes` (über `readNavigationNodes`)
 *   - `cms_section_fields` (direkt, anon-RLS, nur Linkfelder)
 *
 * V3 zusätzlich:
 *   - Pro Seite wird berechnet, ob sie Navigationsknoten hat
 *     (`navPageKeys`), ob sie nur über einen eingehenden internen Link
 *     erreichbar ist (`onlyLinkPageKeys`) oder gar nicht
 *     (`unreachablePageKeys`).
 *   - `incomingLinksByPage` mappt jedes Ziel auf die Quelle(n).
 *   - `multiNavPageKeys` listet Seiten, die in mehreren Nav-Knoten hängen.
 *
 * Keine Schreibzugriffe, keine neuen RPCs, keine Migration.
 */
import { readPagesWithNav, type CmsPageRow } from "@/features/admin/api/cmsAdminPages";
import {
  readNavigationNodes,
  type NavigationNodeRow,
  type NavArea,
} from "@/features/admin/api/cmsAdminNavigation";
import { getCmsSupabaseClient } from "@/lib/cmsSupabase/client";
import { routePathOf } from "@/features/admin/lib/resolveCardLink";

/** Felder, deren Inhalt als Linkziel interpretiert wird. */
export const LINK_FIELD_KEYS = ["href", "cta_link", "cta_href"] as const;
export type LinkFieldKey = (typeof LINK_FIELD_KEYS)[number];

export type LinkKind = "internal-found" | "internal-missing" | "external" | "anchor";

export interface CardLinkEdge {
  page_key: string;
  section_key: string;
  field_key: LinkFieldKey;
  href: string;
  kind: LinkKind;
  /** Ziel-page_key, wenn intern aufgelöst. */
  target_page_key: string | null;
}

export interface StructureMapBundle {
  pages: CmsPageRow[];
  pagesByKey: Map<string, CmsPageRow>;
  pagesByRoute: Map<string, CmsPageRow>;
  nodes: NavigationNodeRow[];
  edges: CardLinkEdge[];
  /** Seiten mit mindestens einem aktiven Navigationsknoten. */
  navPageKeys: Set<string>;
  /** Seiten mit mehreren aktiven Navigationsknoten. */
  multiNavPageKeys: Set<string>;
  /** Seiten ohne Nav-Knoten, aber mit eingehendem internen Link. */
  onlyLinkPageKeys: Set<string>;
  /** Seiten ohne Nav-Knoten und ohne eingehenden internen Link. */
  unreachablePageKeys: Set<string>;
  /** Eingehende interne Link-Kanten pro Ziel-page_key. */
  incomingLinksByPage: Map<string, CardLinkEdge[]>;
  errors: string[];
}

async function readAllLinkFields(): Promise<
  Array<{ page_key: string; section_key: string; field_key: string; value: string | null; locale: string }>
> {
  try {
    const sb = getCmsSupabaseClient();
    const { data, error } = await sb
      .from("cms_section_fields")
      .select("page_key, section_key, field_key, value, locale")
      .in("field_key", LINK_FIELD_KEYS as unknown as string[])
      .in("locale", ["de", "en"]);
    if (error || !Array.isArray(data)) return [];
    return data as Array<{
      page_key: string;
      section_key: string;
      field_key: string;
      value: string | null;
      locale: string;
    }>;
  } catch {
    return [];
  }
}

function classifyHref(
  href: string,
  pagesByRoute: Map<string, CmsPageRow>,
): { kind: LinkKind; target_page_key: string | null } {
  const trimmed = href.trim();
  if (!trimmed) return { kind: "external", target_page_key: null };
  if (trimmed.startsWith("#")) return { kind: "anchor", target_page_key: null };
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) {
    return { kind: "external", target_page_key: null };
  }
  if (trimmed.startsWith("/")) {
    // Query/Fragment ignorieren (siehe `routePathOf`).
    const target = pagesByRoute.get(routePathOf(trimmed));
    if (target) return { kind: "internal-found", target_page_key: target.page_key };
    return { kind: "internal-missing", target_page_key: null };
  }
  return { kind: "external", target_page_key: null };
}

export async function loadStructureMap(): Promise<StructureMapBundle> {
  const errors: string[] = [];
  const [pagesRes, navRes, linkRows] = await Promise.all([
    readPagesWithNav(),
    readNavigationNodes(),
    readAllLinkFields(),
  ]);
  if (pagesRes.error) errors.push(`Seiten: ${pagesRes.error}`);
  if (navRes.error) errors.push(`Navigation: ${navRes.error}`);

  const pages = pagesRes.pages;
  const pagesByKey = new Map<string, CmsPageRow>();
  const pagesByRoute = new Map<string, CmsPageRow>();
  for (const p of pages) {
    pagesByKey.set(p.page_key, p);
    if (p.route_path) pagesByRoute.set(p.route_path, p);
  }

  const nodes = navRes.nodes;

  // Seiten mit aktiven Navigationsknoten + Mehrfach-Zuordnung.
  const navCountByPage = new Map<string, number>();
  for (const n of nodes) {
    if (!n.is_active) continue;
    if (!n.page_key) continue;
    navCountByPage.set(n.page_key, (navCountByPage.get(n.page_key) ?? 0) + 1);
  }
  const navPageKeys = new Set(navCountByPage.keys());
  const multiNavPageKeys = new Set(
    Array.from(navCountByPage.entries())
      .filter(([, c]) => c > 1)
      .map(([k]) => k),
  );

  // DE bevorzugt, EN Fallback — pro (page,section,field).
  const sorted = [...linkRows].sort((a, b) => (a.locale === "de" ? -1 : 1));
  const seen = new Map<string, CardLinkEdge>();
  for (const row of sorted) {
    if (!LINK_FIELD_KEYS.includes(row.field_key as LinkFieldKey)) continue;
    const key = `${row.page_key}::${row.section_key}::${row.field_key}`;
    if (seen.has(key)) continue;
    const href = (row.value ?? "").trim();
    if (!href) continue;
    const { kind, target_page_key } = classifyHref(href, pagesByRoute);
    seen.set(key, {
      page_key: row.page_key,
      section_key: row.section_key,
      field_key: row.field_key as LinkFieldKey,
      href,
      kind,
      target_page_key,
    });
  }
  const edges = Array.from(seen.values());

  // Eingehende interne Links pro Zielseite.
  const incomingLinksByPage = new Map<string, CardLinkEdge[]>();
  for (const e of edges) {
    if (e.kind !== "internal-found" || !e.target_page_key) continue;
    const arr = incomingLinksByPage.get(e.target_page_key) ?? [];
    arr.push(e);
    incomingLinksByPage.set(e.target_page_key, arr);
  }

  // Restseiten klassifizieren.
  const onlyLinkPageKeys = new Set<string>();
  const unreachablePageKeys = new Set<string>();
  for (const p of pages) {
    if (navPageKeys.has(p.page_key)) continue;
    if ((incomingLinksByPage.get(p.page_key)?.length ?? 0) > 0) {
      onlyLinkPageKeys.add(p.page_key);
    } else {
      unreachablePageKeys.add(p.page_key);
    }
  }

  return {
    pages,
    pagesByKey,
    pagesByRoute,
    nodes,
    edges,
    navPageKeys,
    multiNavPageKeys,
    onlyLinkPageKeys,
    unreachablePageKeys,
    incomingLinksByPage,
    errors,
  };
}

export const NAV_AREA_ORDER: NavArea[] = [
  "home",
  "main",
  "meta",
  "persona",
  "footer",
  "footer_bottom",
];

export const NAV_AREA_LABEL: Record<NavArea, string> = {
  home: "Home",
  main: "Main",
  meta: "Meta",
  persona: "Persona",
  footer: "Footer",
  footer_bottom: "Footer Bottom",
};

export const NAV_AREA_COLOR: Record<NavArea, string> = {
  home: "#0f172a",
  main: "#2563eb",
  meta: "#7c3aed",
  persona: "#a855f7",
  footer: "#475569",
  footer_bottom: "#94a3b8",
};
