/**
 * Seitenindex und Navigation aus Storyblok — einmal je Sitzung geladen.
 *
 * Ersetzt die CMS-Light-Tabellen `cms_pages` (Routen, Titel, Status) und
 * `cms_navigation_nodes` (+ Uebersetzungen) sowie die RPCs
 * `rpc_public_read_navigation_tree`, `rpc_public_read_navigation_overlay`,
 * `rpc_public_resolve_breadcrumb`.
 *
 * Routen: `full_slug` einer Story -> `/full/slug`; Ordner-Startseiten
 * (`is_startpage`, full_slug `anwendungen/`) -> `/anwendungen`; `home` -> `/`.
 */
import { fetchStories, fetchStoryBySlug, type StoryblokStory } from "@/lib/storyblok/client";
import { localizedMap, scalarToText } from "@/lib/storyblok/flatten";

export interface PageIndexEntry {
  page_key: string;
  route_path: string;
  full_slug: string;
  page_type: string | null;
  page_no: string | null;
  name: string;
  /** Seitentitel je Sprache (de, en, ...). */
  titles: Record<string, string | null>;
  is_startpage: boolean;
}

export interface NavNode {
  id: string;
  node_key: string;
  parent_node_key: string | null;
  nav_area: string;
  page_key: string | null;
  route_path: string | null;
  external_url: string | null;
  node_type: string | null;
  sort_order: number;
  is_active: boolean;
  show_in_public_nav: boolean;
  labels: Record<string, string | null>;
  descriptions: Record<string, string | null>;
}

export function routeFromStory(story: Pick<StoryblokStory, "full_slug" | "is_startpage" | "slug">): string {
  const slug = story.full_slug.replace(/\/+$/, "");
  if (slug === "" || slug === "home") return "/";
  if (story.is_startpage) {
    const parts = slug.split("/");
    // Startseite eines Ordners: der Ordnerpfad ist die Route
    if (parts.length > 1 && parts[parts.length - 1] === story.slug && story.full_slug.endsWith("/") === false) {
      return `/${parts.slice(0, -1).join("/")}`;
    }
    return `/${slug}`;
  }
  return `/${slug}`;
}

let pagesPromise: Promise<PageIndexEntry[]> | null = null;
let navPromise: Promise<NavNode[]> | null = null;

export function resetSiteIndexCache(): void {
  pagesPromise = null;
  navPromise = null;
}

/** Alle veroeffentlichten Seiten (ohne Body), aus dem Storyblok-Ordnerbaum ausserhalb von `_archiv`/`_globals`. */
export function readPageIndex(): Promise<PageIndexEntry[]> {
  if (pagesPromise) return pagesPromise;
  pagesPromise = (async () => {
    const stories = await fetchStories<Record<string, unknown>>({
      content_type: "page",
      excluding_fields: "body",
      sort_by: "position:asc",
    });
    return stories
      .filter((s) => !s.full_slug.startsWith("_archiv/") && !s.full_slug.startsWith("_globals/"))
      .map((s) => ({
        page_key: String(s.content.page_key ?? s.full_slug),
        route_path: routeFromStory(s),
        full_slug: s.full_slug,
        page_type: scalarToText(s.content.page_type),
        page_no: scalarToText(s.content.page_no),
        name: s.name,
        titles: localizedMap(s.content, "title"),
        is_startpage: s.is_startpage,
      }));
  })().catch((e) => {
    pagesPromise = null;
    throw e;
  });
  return pagesPromise;
}

export async function findPageByRoute(pathname: string): Promise<PageIndexEntry | null> {
  const path = pathname.replace(/\/+$/, "") || "/";
  const pages = await readPageIndex();
  return pages.find((p) => p.route_path === path) ?? null;
}

export async function findPageByKey(pageKey: string): Promise<PageIndexEntry | null> {
  const pages = await readPageIndex();
  return pages.find((p) => p.page_key === pageKey) ?? null;
}

type Blok = Record<string, unknown>;

function flattenNavItems(items: unknown, area: string, parentKey: string | null, out: NavNode[]): void {
  if (!Array.isArray(items)) return;
  items.forEach((raw, i) => {
    if (typeof raw !== "object" || raw === null) return;
    const b = raw as Blok;
    const nodeKey = String(b.node_key ?? b._uid ?? "");
    const link = scalarToText(b.link);
    const nodeType = scalarToText(b.node_type);
    const isExternal = nodeType === "external_link" || (link ? /^(https?:)?\/\//.test(link) : false);
    const hidden = b.hidden === true;
    out.push({
      id: String(b._uid ?? nodeKey),
      node_key: nodeKey,
      parent_node_key: parentKey,
      nav_area: area,
      page_key: scalarToText(b.page_key) || null,
      route_path: !isExternal && link ? link : null,
      external_url: isExternal && link ? link : null,
      node_type: nodeType,
      sort_order: i,
      is_active: !hidden,
      show_in_public_nav: b.show_in_public_nav !== false,
      labels: localizedMap(b, "label"),
      descriptions: localizedMap(b, "description"),
    });
    flattenNavItems(b.children, area, nodeKey, out);
  });
}

/** Navigations-Story-Inhalt -> flache Knotenliste aller Bereiche. */
export function navNodesFromContent(content: { areas?: Blok[] } | null | undefined): NavNode[] {
  const out: NavNode[] = [];
  for (const area of content?.areas ?? []) {
    const name = String(area.area ?? "");
    flattenNavItems(area.items, name, null, out);
  }
  return out;
}

/** Alle Navigationsknoten aller Bereiche (Story `_globals/navigation`). */
export function readNavigationNodes(): Promise<NavNode[]> {
  if (navPromise) return navPromise;
  navPromise = (async () => {
    const story = await fetchStoryBySlug<{ areas?: Blok[] }>("_globals/navigation");
    return navNodesFromContent(story?.content);
  })().catch((e) => {
    navPromise = null;
    throw e;
  });
  return navPromise;
}

export async function readNavigationArea(area: string): Promise<NavNode[]> {
  const nodes = await readNavigationNodes();
  return nodes.filter((n) => n.nav_area === area && n.is_active);
}

/** Pfad von der Wurzel bis zum Knoten, der die Route traegt (bevorzugt Bereich `main`). */
export async function resolveBreadcrumb(pathname: string): Promise<NavNode[]> {
  const nodes = await readNavigationNodes();
  const path = pathname.replace(/\/+$/, "") || "/";
  const candidates = nodes.filter((n) => n.is_active && n.route_path === path);
  const target = candidates.find((n) => n.nav_area === "main") ?? candidates[0];
  if (!target) return [];
  const byKey = new Map(nodes.filter((n) => n.nav_area === target.nav_area).map((n) => [n.node_key, n]));
  const chain: NavNode[] = [];
  let cur: NavNode | undefined = target;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.node_key)) {
    seen.add(cur.node_key);
    chain.unshift(cur);
    cur = cur.parent_node_key ? byKey.get(cur.parent_node_key) : undefined;
  }
  return chain;
}
