import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import { getCmsSupabaseClient } from "@/lib/cmsSupabase/client";
import {
  readNavigationNodes,
  type NavArea,
  type NavigationNodeRow,
} from "@/features/admin/api/cmsAdminNavigation";
import PageCompletionTraffic, {
  PageCompletionProvider,
  PageHoursInput,
  PageHoursTotal,
} from "@/features/legal/components/PageCompletionTraffic";
import { pickNavText } from "@/navigation/localizedNav";

/**
 * Sitemap (/sitemap) — menschenlesbare Übersicht aller Seiten.
 *
 * DB-first: Struktur kommt vollständig aus `cms_navigation_nodes`
 * (alle Bereiche, inklusive nicht öffentlich sichtbarer Knoten), Seitentitel
 * und Routen werden mit `cms_pages` (veröffentlicht + aktiv) verknüpft.
 * Dadurch erscheint jede angebundene Seite direkt in ihrer Rubrik
 * (Hauptnavigation, Servicebereich, Zielgruppen, Fußzeile, Rechtliches).
 * Nur Seiten ohne jeden Navigationsknoten stehen unter „Weitere Seiten“.
 * Kopftexte sind über CMS-Light pflegbar (`legal.sitemap` → Abschnitt `hero`).
 */

const AREAS: Array<{ area: NavArea; titleDe: string; titleEn: string }> = [
  { area: "main", titleDe: "Hauptnavigation", titleEn: "Main navigation" },
  { area: "meta", titleDe: "Servicebereich", titleEn: "Service area" },
  { area: "persona", titleDe: "Zielgruppen", titleEn: "Audiences" },
  { area: "footer", titleDe: "Fußzeile", titleEn: "Footer" },
  { area: "footer_bottom", titleDe: "Rechtliches", titleEn: "Legal" },
];

interface ExtraPage {
  page_key: string;
  route_path: string;
  title_de: string | null;
  title_en: string | null;
  title_pl: string | null;
}

/** Ein Knoten im Sitemap-Baum. */
interface TreeNode {
  key: string;
  label_de: string | null;
  label_en: string | null;
  label_pl: string | null;
  node_key: string;
  page_key: string | null;
  route_path: string | null;
  sort_order: number;
  children: TreeNode[];
}

const NodeList = ({
  nodes,
  isEn,
  locale,
  level = 0,
}: {
  nodes: TreeNode[];
  isEn: boolean;
  locale: string;
  level?: number;
}) => (
  <ul className={level === 0 ? "space-y-2" : "mt-2 space-y-1.5 border-l border-border pl-4"}>
    {nodes.map((node) => {
      const label = pickNavText(locale, {
        map: (node as { labels?: Record<string, string | null> | null }).labels,
        legacy: { de: node.label_de, en: node.label_en, pl: node.label_pl },
        fallback: node.node_key,
      });
      const href = node.route_path && node.route_path.startsWith("/") ? node.route_path : null;
      // Schriftstufen: Hauptmenüpunkt 12 pt fett, Untermenüpunkt 10 pt normal,
      // Detailseite (ab Ebene 2) 9 pt kursiv.
      const levelStyle =
        level === 0
          ? { fontSize: "12pt", fontWeight: 700 }
          : level === 1
            ? { fontSize: "10pt", fontWeight: 400 }
            : { fontSize: "9pt", fontWeight: 400, fontStyle: "italic" as const };
      const levelClass =
        level === 0
          ? "text-foreground hover:text-muted-foreground transition-colors"
          : "text-muted-foreground hover:text-foreground transition-colors";
      const trafficKey = href ?? (node.page_key ? `page:${node.page_key}` : `node:${node.node_key}`);
      return (
        <li key={node.key}>
          <span className="flex items-center gap-2">
            <PageCompletionTraffic routePath={trafficKey} pageKey={node.page_key} isEn={isEn} />
            <PageHoursInput routePath={trafficKey} pageKey={node.page_key} isEn={isEn} />
            {href ? (
              <Link to={href} className={levelClass} style={levelStyle}>
                {label}
              </Link>
            ) : (
              <span className={levelClass} style={levelStyle}>
                {label}
              </span>
            )}
          </span>
          {node.children.length > 0 && (
            <NodeList nodes={node.children} isEn={isEn} locale={locale} level={level + 1} />
          )}
        </li>
      );
    })}
  </ul>
);

const sortFn = (a: TreeNode, b: TreeNode) =>
  a.sort_order - b.sort_order ||
  (a.label_de ?? a.node_key).localeCompare(b.label_de ?? b.node_key);

function sortDeep(list: TreeNode[]) {
  list.sort(sortFn);
  list.forEach((n) => sortDeep(n.children));
}

/** Baut je Navigationsbereich einen vollständigen Baum aus allen Knoten. */
function buildAreaTrees(
  allNodes: NavigationNodeRow[],
  pageByKey: Map<string, ExtraPage>,
): Record<string, TreeNode[]> {
  const nodesById = new Map(allNodes.map((n) => [n.id, n]));
  const treeById = new Map<string, TreeNode>();

  for (const n of allNodes) {
    const page = n.page_key ? pageByKey.get(n.page_key) : undefined;
    treeById.set(n.id, {
      key: n.id,
      label_de: n.label_de ?? n.label ?? page?.title_de ?? null,
      label_en: n.label_en ?? n.label ?? page?.title_en ?? null,
      label_pl: n.label_pl ?? page?.title_pl ?? null,
      node_key: n.node_key,
      page_key: n.page_key,
      route_path: n.route_path ?? page?.route_path ?? null,
      sort_order: n.sort_order ?? 0,
      children: [],
    });
  }

  const areas: Record<string, TreeNode[]> = {};
  treeById.forEach((tn, id) => {
    const raw = nodesById.get(id)!;
    const parentId = raw.parent_id;
    if (parentId && treeById.has(parentId)) {
      treeById.get(parentId)!.children.push(tn);
    } else {
      (areas[raw.nav_area] ??= []).push(tn);
    }
  });

  Object.values(areas).forEach(sortDeep);
  return areas;
}

function collectPageKeys(nodes: TreeNode[], into: Set<string>) {
  for (const n of nodes) {
    if (n.page_key) into.add(n.page_key);
    collectPageKeys(n.children, into);
  }
}

const SitemapPage = () => {
  const { cms, loc } = useCmsI18n("legal.sitemap", "legal");
  const isEn = loc.toLowerCase().startsWith("en");

  const [pages, setPages] = useState<ExtraPage[]>([]);
  const [allNodes, setAllNodes] = useState<NavigationNodeRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sb = getCmsSupabaseClient();
        const { data } = await sb
          .from("cms_pages")
          .select("page_key, route_path, title_de, title_en, title_pl, status, is_active")
          .eq("status", "published")
          .eq("is_active", true);
        if (!alive || !Array.isArray(data)) return;
        setPages(
          (data as Array<ExtraPage & { status: string; is_active: boolean }>)
            .filter((p) => Boolean(p.route_path))
            .map((p) => ({
              page_key: p.page_key,
              route_path: p.route_path,
              title_de: p.title_de,
              title_en: p.title_en,
              title_pl: p.title_pl ?? null,
            })),
        );
      } catch {
        /* fail-soft: Sitemap zeigt dann nur die Navigationsbereiche */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const bundle = await readNavigationNodes();
      if (!alive) return;
      setAllNodes(bundle.nodes);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const pageByKey = useMemo(
    () => new Map(pages.map((p) => [p.page_key, p])),
    [pages],
  );

  const areaTrees = useMemo(
    () => buildAreaTrees(allNodes, pageByKey),
    [allNodes, pageByKey],
  );

  /** Seiten ohne jeden Navigationsknoten. */
  const orphanPages = useMemo(() => {
    const linked = new Set<string>();
    Object.values(areaTrees).forEach((t) => collectPageKeys(t, linked));
    return pages
      .filter((p) => !linked.has(p.page_key) && p.route_path !== "/sitemap")
      .sort((a, b) => a.route_path.localeCompare(b.route_path));
  }, [areaTrees, pages]);

  return (
    <PageLayout
      label={cms.text("hero", "label", loc, isEn ? "Overview" : "Orientierung")}
      headline={cms.text("hero", "headline", loc, "Sitemap")}
      intro={cms.text(
        "hero",
        "intro",
        loc,
        isEn
          ? "All pages of this website at a glance, grouped by navigation area."
          : "Alle Seiten dieser Website auf einen Blick — nach Navigationsbereichen gruppiert.",
      )}
      heroImage=""
      showHeroImage={false}
      pageKey="legal.sitemap"
    >
      <PageCompletionProvider>
        <p className="mb-8 text-xs text-muted-foreground">
          {isEn
            ? "The three boxes per page mark the completion status: red (open), yellow (in progress), green (done)."
            : "Die drei Kästchen je Seite markieren den Fertigstellungsgrad: Rot (offen), Gelb (in Arbeit), Grün (fertig)."}
        </p>
        <div className="grid gap-x-12 md:grid-cols-2">
          {AREAS.map(({ area, titleDe, titleEn }) => {
            const tree = areaTrees[area] ?? [];
            if (tree.length === 0) return null;
            return (
              <section key={area} className="mb-12">
                <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-4">
                  {isEn ? titleEn : titleDe}
                </h2>
                <NodeList nodes={tree} isEn={isEn} locale={loc} />
              </section>
            );
          })}

          {orphanPages.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-4">
                {isEn ? "Further pages" : "Weitere Seiten"}
              </h2>
              <ul className="space-y-2">
                {orphanPages.map((p) => (
                  <li key={p.page_key} className="flex items-center gap-2">
                    <PageCompletionTraffic
                      routePath={p.route_path}
                      pageKey={p.page_key}
                      isEn={isEn}
                    />
                    <PageHoursInput routePath={p.route_path} pageKey={p.page_key} isEn={isEn} />
                    <Link
                      to={p.route_path}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      style={{ fontSize: "10pt" }}
                    >
                      {(isEn ? p.title_en : p.title_de) || p.title_de || p.route_path}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <PageHoursTotal isEn={isEn} />
      </PageCompletionProvider>
    </PageLayout>
  );
};

export default SitemapPage;
