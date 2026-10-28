/**
 * Etappe C.1 — Navigations-Overlay (Hybrid).
 *
 * Lädt für einen Navigationsbereich (z. B. "footer", "main", "meta") die im
 * Admin gepflegten Werte (Sichtbarkeit, Reihenfolge, Labels) aus der DB
 * und stellt sie als Map<node_key, NavigationOverlayEntry> bereit.
 *
 * Renderer (Footer, MetaNavigation, MainNavigation) nutzen die Code-Struktur
 * (Routen/Hierarchie) als Quelle der Wahrheit und überlagern sie mit den
 * Overlay-Werten. Bei Fehler/Latenz greift automatisch der Code-Fallback —
 * die Site bleibt sichtbar, nur ohne Admin-Spiegelung.
 */

import { useEffect, useState } from "react";
import {
  getCmsSupabaseClient,
  isCmsSupabaseConfigured,
} from "@/lib/cmsSupabase/client";

export type NavigationOverlayEntry = {
  node_key: string;
  parent_node_key: string | null;
  is_active: boolean;
  sort_order: number;
  label_de: string | null;
  label_en: string | null;
  label_pl: string | null;
  /** Sprachkarte aus `cms_navigation_node_translations` (führend). */
  labels?: Record<string, string | null> | null;
  show_in_public_nav: boolean;
};

export type NavigationOverlay = Map<string, NavigationOverlayEntry>;

type State = {
  overlay: NavigationOverlay;
  ready: boolean;
  error: string | null;
};

const EMPTY: NavigationOverlay = new Map();

export function useNavigationOverlay(navArea: string): State {
  const [state, setState] = useState<State>({
    overlay: EMPTY,
    ready: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isCmsSupabaseConfigured()) {
        setState({ overlay: EMPTY, ready: true, error: "cms_not_configured" });
        return;
      }
      let data: unknown;
      let error: { message: string } | null = null;
      try {
        const supabase = getCmsSupabaseClient();
        const res = await (supabase as unknown as {
          rpc: (n: string, p: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
        }).rpc("rpc_public_read_navigation_overlay", { p_nav_area: navArea });
        data = res.data;
        error = res.error;
      } catch (e) {
        error = { message: e instanceof Error ? e.message : "unknown" };
      }
      if (cancelled) return;
      if (error) {
        // Fallback: leeres Overlay → Renderer fällt auf reine Code-Struktur zurück.
        setState({ overlay: EMPTY, ready: true, error: error.message });
        return;
      }
      const rows = (Array.isArray(data) ? data : []) as NavigationOverlayEntry[];
      const map: NavigationOverlay = new Map();
      for (const row of rows) {
        if (row && typeof row.node_key === "string") {
          map.set(row.node_key, row);
        }
      }
      setState({ overlay: map, ready: true, error: null });
    })();
    return () => {
      cancelled = true;
    };
  }, [navArea]);

  return state;
}
