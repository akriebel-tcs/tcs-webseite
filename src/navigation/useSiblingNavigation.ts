/**
 * useSiblingNavigation
 * --------------------
 * Liefert Vor-/Zurück-Geschwisterseite zur aktuellen Seite, basierend auf
 * `cms_navigation_nodes` (gleicher Parent, gleiche nav_area, gleiche
 * `sort_order`-Ordnung) und `cms_pages` (Route + Aktiv-/Published-Status).
 *
 * Regeln:
 * - Aktuelle Seite wird ausgelassen.
 * - Nur Geschwister mit gültiger Route (Nav-Knoten `route_path` oder
 *   Fallback `cms_pages.route_path`).
 * - Nur Seiten mit `status='published'` und `is_active=true` (RLS sichert
 *   das auf DB-Ebene, wir filtern zusätzlich explizit).
 * - Knoten mit `is_active=false` werden über RLS ausgeschlossen.
 * - Labels: Nav-Label DE/EN, Fallback `cms_pages.title_*`.
 *
 * Bewusst NICHT auf `show_in_public_nav` gefiltert: Dieses Flag steuert die
 * Sichtbarkeit im Hauptmenü, nicht die Erreichbarkeit. Geschwister-Links am
 * Seitenende dürfen auch auf gleichrangige Unterseiten verweisen, die im
 * Menü ausgeblendet sind, solange Route + Seite live sind.
 *
 * Keine eigene RPC nötig — Lesezugriff über bestehende Public-RLS.
 */

import { useEffect, useState } from "react";

import { localeMapFromRows } from "@/navigation/localizedNav";
import {
  getCmsSupabaseClient,
  isCmsSupabaseConfigured,
} from "@/lib/cmsSupabase/client";

export interface SiblingLink {
  page_key: string;
  route_path: string;
  label_de: string;
  label_en: string;
  /** Sprachkarte aus den vertikalen Übersetzungstabellen (führend). */
  labels: Record<string, string | null>;
}

interface State {
  prev: SiblingLink | null;
  next: SiblingLink | null;
  ready: boolean;
}

const EMPTY: State = { prev: null, next: null, ready: false };

function pickLabel(
  node: { label_de: string | null; label_en: string | null },
  page: { title_de: string | null; title_en: string | null } | null,
  fallback: string,
): { de: string; en: string } {
  const de =
    (node.label_de?.trim() || page?.title_de?.trim() || fallback) ?? fallback;
  const en =
    (node.label_en?.trim() || page?.title_en?.trim() || de) ?? de;
  return { de, en };
}

export function useSiblingNavigation(pageKey: string | null | undefined): State {
  const [state, setState] = useState<State>(EMPTY);

  useEffect(() => {
    if (!pageKey || !isCmsSupabaseConfigured()) {
      setState({ prev: null, next: null, ready: true });
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = getCmsSupabaseClient();

      // 1) Aktuellen Knoten finden. Bei Mehrfach-Verlinkung (z. B. Seite
      //    in main- UND footer-Nav) wird nav_area='main' bevorzugt, damit
      //    Geschwister-Links am Seitenende immer die fachliche Hauptgruppe
      //    spiegeln und nicht zufällig eine Footer-Spalte (Unternehmen,
      //    Services etc.) als Sibling-Quelle nehmen.
      const { data: currentRows } = await supabase
        .from("cms_navigation_nodes")
        .select("id, parent_id, nav_area, sort_order, node_key")
        .eq("page_key", pageKey)
        .eq("is_active", true)
        .not("parent_id", "is", null);
      const candidates = (currentRows ?? []) as Array<{
        id: string;
        parent_id: string | null;
        nav_area: string;
        sort_order: number;
        node_key: string;
      }>;
      const current =
        candidates.find((c) => c.nav_area === "main") ?? candidates[0];
      if (!current || !current.parent_id) {
        if (!cancelled) setState({ prev: null, next: null, ready: true });
        return;
      }

      // 2) Geschwister laden (gleicher Parent, gleiche nav_area, aktiv,
      //    mit page_key — Strukturknoten ohne Seite ignorieren).
      const { data: siblingRows } = await supabase
        .from("cms_navigation_nodes")
        .select(
          "id, node_key, page_key, label_de, label_en, route_path, sort_order, cms_navigation_node_translations(locale, label)",
        )
        .eq("parent_id", current.parent_id)
        .eq("nav_area", current.nav_area)
        .eq("is_active", true)
        .not("page_key", "is", null)
        .order("sort_order", { ascending: true })
        .order("node_key", { ascending: true });
      const siblings = (siblingRows ?? []) as Array<{
        id: string;
        node_key: string;
        page_key: string;
        label_de: string | null;
        label_en: string | null;
        route_path: string | null;
        sort_order: number;
        cms_navigation_node_translations?: Array<{
          locale: string | null;
          label: string | null;
        }> | null;
      }>;
      if (siblings.length < 2) {
        if (!cancelled) setState({ prev: null, next: null, ready: true });
        return;
      }

      // 3) Seiten-Status + Route-Fallback laden.
      const pageKeys = Array.from(new Set(siblings.map((s) => s.page_key)));
      const { data: pageRows } = await supabase
        .from("cms_pages")
        .select(
          "page_key, route_path, title_de, title_en, status, is_active, cms_page_translations(locale, title)",
        )
        .in("page_key", pageKeys);
      const pageByKey = new Map<
        string,
        {
          route_path: string | null;
          title_de: string | null;
          title_en: string | null;
          titles: Record<string, string | null>;
        }
      >();
      for (const p of (pageRows ?? []) as Array<{
        page_key: string;
        route_path: string | null;
        title_de: string | null;
        title_en: string | null;
        status: string;
        is_active: boolean;
        cms_page_translations?: Array<{ locale: string | null; title: string | null }> | null;
      }>) {
        if (p.status === "published" && p.is_active) {
          pageByKey.set(p.page_key, {
            route_path: p.route_path,
            title_de: p.title_de,
            title_en: p.title_en,
            titles: localeMapFromRows(p.cms_page_translations ?? [], "title"),
          });
        }
      }

      // 4) Sequenz aufbauen: nur Geschwister mit gültiger Route + Live-Seite.
      const sequence: SiblingLink[] = [];
      const ordered = [...siblings].sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          a.node_key.localeCompare(b.node_key),
      );
      for (const s of ordered) {
        const page = pageByKey.get(s.page_key);
        if (!page) continue;
        const route = (s.route_path?.trim() || page.route_path?.trim() || "");
        if (!route || route === "#") continue;
        const { de, en } = pickLabel(s, page, s.node_key);
        // Sprachkarte: Navigationsbezeichnung hat Vorrang vor dem Seitentitel.
        const labels: Record<string, string | null> = {
          ...localeMapFromRows(page.titles ? Object.entries(page.titles).map(([locale, title]) => ({ locale, title })) : [], "title"),
          ...localeMapFromRows(s.cms_navigation_node_translations ?? [], "label"),
        };
        sequence.push({
          page_key: s.page_key,
          route_path: route,
          label_de: de,
          label_en: en,
          labels,
        });
      }

      const idx = sequence.findIndex((s) => s.page_key === pageKey);
      if (idx === -1) {
        if (!cancelled) setState({ prev: null, next: null, ready: true });
        return;
      }
      const prev = idx > 0 ? sequence[idx - 1] : null;
      const next = idx < sequence.length - 1 ? sequence[idx + 1] : null;
      if (!cancelled) setState({ prev, next, ready: true });
    })().catch(() => {
      if (!cancelled) setState({ prev: null, next: null, ready: true });
    });
    return () => {
      cancelled = true;
    };
  }, [pageKey]);

  return state;
}
