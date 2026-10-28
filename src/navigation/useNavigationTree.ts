/**
 * Etappe 1.a — DB-erst-Navigation: vollständiger Baum aus DB.
 *
 * Lädt alle öffentlich sichtbaren Knoten eines Bereichs (main, meta,
 * footer, footer_bottom, persona) über die Public-RPC
 * `rpc_public_read_navigation_tree` und baut daraus einen Baum mit
 * Eltern-/Kindknoten. Sortiert nach `sort_order, node_key`.
 *
 * Vertrag mit den Renderern:
 * - `ready === true` heißt: Anfrage abgeschlossen (auch bei Fehler oder leer).
 * - `tree.length > 0` heißt: DB ist führend, Renderer baut aus DB.
 * - Sonst (leer, Fehler, CMS nicht konfiguriert): Renderer fällt komplett auf
 *   Code-Pfad zurück (mainNavigation/footerNavigation/metaNavigation/personaNavigation).
 *
 * Code-Fallback ist Sicherheitsnetz für Etappe 1.a. In Etappe 1.b
 * (nach Auth-Aktivierung im Admin) entfällt der Fallback und DB ist
 * alleinige Wahrheit.
 */

import { useEffect, useState } from "react";
import {
  getCmsSupabaseClient,
  isCmsSupabaseConfigured,
} from "@/lib/cmsSupabase/client";
import { pickNavText } from "@/navigation/localizedNav";
import { isStoryblokSource } from "@/lib/content/source";
import type { NavNode } from "@/lib/storyblok/siteIndex";

/** Storyblok-Knoten -> Zeilenformat der frueheren RPC. */
export function navNodeToDbNode(n: NavNode): NavigationDbNode {
  return {
    id: n.id,
    node_key: n.node_key,
    parent_node_key: n.parent_node_key,
    page_key: n.page_key,
    label_de: n.labels.de ?? null,
    label_en: n.labels.en ?? null,
    label_pl: n.labels.pl ?? null,
    description_de: n.descriptions.de ?? null,
    description_en: n.descriptions.en ?? null,
    description_pl: n.descriptions.pl ?? null,
    labels: n.labels,
    descriptions: n.descriptions,
    route_path: n.route_path,
    external_url: n.external_url,
    node_type: n.node_type,
    sort_order: n.sort_order,
    is_active: n.is_active,
    show_in_public_nav: n.show_in_public_nav,
    children: [],
  };
}

export interface NavigationDbNode {
  id: string;
  node_key: string;
  parent_node_key: string | null;
  page_key: string | null;
  label_de: string | null;
  label_en: string | null;
  label_pl: string | null;
  description_de: string | null;
  description_en: string | null;
  description_pl: string | null;
  /** Sprachkarte aus `cms_navigation_node_translations` (führend). */
  labels?: Record<string, string | null> | null;
  descriptions?: Record<string, string | null> | null;
  route_path: string | null;
  external_url: string | null;
  node_type: string | null;
  sort_order: number;
  is_active: boolean;
  show_in_public_nav: boolean;
  /** Direkte Kinder, sortiert. */
  children: NavigationDbNode[];
}

interface State {
  tree: NavigationDbNode[];
  ready: boolean;
  error: string | null;
}

const EMPTY: NavigationDbNode[] = [];

function buildTree(rows: NavigationDbNode[]): NavigationDbNode[] {
  const byKey = new Map<string, NavigationDbNode>();
  rows.forEach((r) => {
    byKey.set(r.node_key, { ...r, children: [] });
  });
  const roots: NavigationDbNode[] = [];
  byKey.forEach((node) => {
    if (node.parent_node_key && byKey.has(node.parent_node_key)) {
      byKey.get(node.parent_node_key)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortFn = (a: NavigationDbNode, b: NavigationDbNode) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
    a.node_key.localeCompare(b.node_key);
  roots.sort(sortFn);
  byKey.forEach((n) => n.children.sort(sortFn));
  return roots;
}

export function useNavigationTree(navArea: string): State {
  const [state, setState] = useState<State>({
    tree: EMPTY,
    ready: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isStoryblokSource()) {
        try {
          const { readNavigationArea } = await import("@/lib/storyblok/siteIndex");
          const nodes = (await readNavigationArea(navArea)).filter((n) => n.show_in_public_nav);
          if (cancelled) return;
          setState({ tree: buildTree(nodes.map(navNodeToDbNode)), ready: true, error: null });
        } catch (e) {
          if (cancelled) return;
          setState({ tree: EMPTY, ready: true, error: e instanceof Error ? e.message : "unknown" });
        }
        return;
      }
      if (!isCmsSupabaseConfigured()) {
        setState({ tree: EMPTY, ready: true, error: "cms_not_configured" });
        return;
      }
      let data: unknown;
      let error: { message: string } | null = null;
      try {
        const supabase = getCmsSupabaseClient();
        const res = await (supabase as unknown as {
          rpc: (
            n: string,
            p: Record<string, unknown>,
          ) => Promise<{ data: unknown; error: { message: string } | null }>;
        }).rpc("rpc_public_read_navigation_tree", { p_nav_area: navArea });
        data = res.data;
        error = res.error;
      } catch (e) {
        error = { message: e instanceof Error ? e.message : "unknown" };
      }
      if (cancelled) return;
      if (error) {
        setState({ tree: EMPTY, ready: true, error: error.message });
        return;
      }
      const rows = (Array.isArray(data) ? data : []) as NavigationDbNode[];
      setState({ tree: buildTree(rows), ready: true, error: null });
    })();
    return () => {
      cancelled = true;
    };
  }, [navArea]);

  return state;
}

/** Wählt das Label gemäß aktueller Sprache; Fallback DE → node_key. */
export function pickDbLabel(
  node: Partial<
    Pick<NavigationDbNode, "label_de" | "label_en" | "label_pl" | "labels">
  > &
    Pick<NavigationDbNode, "node_key">,
  locale: string,
): string {
  return pickNavText(locale, {
    map: node.labels,
    legacy: { de: node.label_de, en: node.label_en, pl: node.label_pl },
    fallback: node.node_key,
  });
}

/** Wählt die optionale Beschreibung gemäß aktueller Sprache. */
export function pickDbDescription(
  node: Partial<
    Pick<
      NavigationDbNode,
      "description_de" | "description_en" | "description_pl" | "descriptions"
    >
  >,
  locale: string,
): string | null {
  const value = pickNavText(locale, {
    map: node.descriptions,
    legacy: {
      de: node.description_de,
      en: node.description_en,
      pl: node.description_pl,
    },
  });
  return value.length > 0 ? value : null;
}

/** Berechnet das Link-Ziel: route_path → external_url → "#". */
export function pickDbHref(
  node: Pick<NavigationDbNode, "route_path" | "external_url">,
): string {
  const route = (node.route_path ?? "").trim();
  if (route.length > 0) return route;
  const ext = (node.external_url ?? "").trim();
  if (ext.length > 0) return ext;
  return "#";
}
