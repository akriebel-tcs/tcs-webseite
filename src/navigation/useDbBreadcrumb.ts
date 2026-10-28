/**
 * Etappe `cms-navigation-tree-as-breadcrumb-source-1`.
 *
 * Liest die fachliche Breadcrumb-Kette für eine Route aus
 * `cms_navigation_nodes` über die read-only RPC
 * `rpc_public_resolve_breadcrumb`. Damit ist der Admin-Baum die
 * führende Quelle für Seitenhierarchie/Breadcrumbs.
 *
 * Vertrag:
 * - `ready === true`: Anfrage abgeschlossen.
 * - `crumbs.length > 0`: DB lieferte eine Kette, Renderer nutzt sie.
 * - sonst: AutoBreadcrumb fällt auf bestehende Overrides / URL-Logik
 *   zurück.
 *
 * `show_in_public_nav` ist hier bewusst kein Filter — Hauptmenü-
 * Sichtbarkeit und Breadcrumb-Verwendung sind zwei verschiedene Dinge.
 */

import { useEffect, useState } from "react";
import {
  getCmsSupabaseClient,
  isCmsSupabaseConfigured,
} from "@/lib/cmsSupabase/client";
import { pickNavText } from "@/navigation/localizedNav";
import { isStoryblokSource } from "@/lib/content/source";

export interface DbBreadcrumbCrumb {
  node_key: string;
  page_key: string | null;
  label_de: string | null;
  label_en: string | null;
  label_pl: string | null;
  /** Sprachkarte aus `cms_navigation_node_translations` (führend). */
  labels?: Record<string, string | null> | null;
  route_path: string | null;
}

interface State {
  crumbs: DbBreadcrumbCrumb[];
  ready: boolean;
  error: string | null;
}

const EMPTY: DbBreadcrumbCrumb[] = [];

export function useDbBreadcrumb(pathname: string): State {
  const [state, setState] = useState<State>({
    crumbs: EMPTY,
    ready: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pathname || pathname === "/") {
        setState({ crumbs: EMPTY, ready: true, error: null });
        return;
      }
      if (isStoryblokSource()) {
        try {
          const { resolveBreadcrumb } = await import("@/lib/storyblok/siteIndex");
          const chain = await resolveBreadcrumb(pathname);
          if (cancelled) return;
          setState({
            crumbs: chain.map((n) => ({
              node_key: n.node_key,
              page_key: n.page_key,
              label_de: n.labels.de ?? null,
              label_en: n.labels.en ?? null,
              label_pl: n.labels.pl ?? null,
              labels: n.labels,
              route_path: n.route_path,
            })),
            ready: true,
            error: null,
          });
        } catch (e) {
          if (cancelled) return;
          setState({ crumbs: EMPTY, ready: true, error: e instanceof Error ? e.message : "unknown" });
        }
        return;
      }
      if (!isCmsSupabaseConfigured()) {
        setState({ crumbs: EMPTY, ready: true, error: null });
        return;
      }
      try {
        const supabase = getCmsSupabaseClient();
        const res = await (supabase as unknown as {
          rpc: (
            n: string,
            p: Record<string, unknown>,
          ) => Promise<{ data: unknown; error: { message: string } | null }>;
        }).rpc("rpc_public_resolve_breadcrumb", { p_route_path: pathname });
        if (cancelled) return;
        if (res.error) {
          setState({ crumbs: EMPTY, ready: true, error: res.error.message });
          return;
        }
        const rows = Array.isArray(res.data)
          ? (res.data as DbBreadcrumbCrumb[])
          : [];
        setState({ crumbs: rows, ready: true, error: null });
      } catch (e) {
        if (cancelled) return;
        setState({
          crumbs: EMPTY,
          ready: true,
          error: e instanceof Error ? e.message : "unknown",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return state;
}

export function pickDbCrumbLabel(
  c: Partial<Pick<DbBreadcrumbCrumb, "label_de" | "label_en" | "label_pl" | "labels">> &
    Pick<DbBreadcrumbCrumb, "node_key">,
  locale: string,
): string {
  return pickNavText(locale, {
    map: c.labels,
    legacy: { de: c.label_de, en: c.label_en, pl: c.label_pl },
    fallback: c.node_key,
  });
}
