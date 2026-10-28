/**
 * resolveCardLink — gemeinsame Auflösungslogik für Karten-/Block-Links
 * im CMS-Light Admin.
 *
 * Wird sowohl vom Navigations-Baum (SectionLevel → SectionRowView) als
 * auch vom Arbeitsbereich (PageEditor → CardLinkInfoBox) genutzt, damit
 * Baum und Arbeitsbereich exakt dieselbe Aussage über ein Linkziel
 * treffen. Keine zweite, widersprüchliche Logik.
 *
 * Drei Fälle:
 *  • externe URL (`http(s)://`, `mailto:`, `tel:`) → `external`
 *  • interner Pfad (`/…`) gegen `cms_pages.route_path` aufgelöst:
 *     – Treffer → `internal-found` mit page_no, Titel, Status
 *     – kein Treffer → `internal-missing`
 *  • alles andere (Anker `#…`, ungewöhnliche Werte) → `external`,
 *    aber ohne Jump
 */
import type { PageLookup } from "@/features/admin/api/cmsAdminCardLinks";
import type { NavigationNodeRow } from "@/features/admin/api/cmsAdminNavigation";
import type { SectionCardLink } from "@/features/admin/components/tree/SectionRowView";

export type CardLinkFieldKey = SectionCardLink["fieldKey"];

/**
 * routePathOf — reduziert einen internen Link auf den reinen Routenpfad,
 * indem Query-String (`?…`) und Fragment (`#…`) abgeschnitten werden.
 * `/produkte/tuerkommunikation?kategorie=aussenstationen` → `/produkte/tuerkommunikation`.
 * Einzige Wahrheit für alle Routen-Abgleiche im Admin (Link-Pillen,
 * Struktur-Karte), damit kein Pfad mit Parametern fälschlich als 404 gilt.
 */
export function routePathOf(href: string): string {
  const trimmed = href.trim();
  const cut = trimmed.search(/[?#]/);
  const path = cut >= 0 ? trimmed.slice(0, cut) : trimmed;
  // Trailing Slash normalisieren (außer Root), damit `/x/` = `/x`.
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

export function resolveCardLink(args: {
  href: string;
  fieldKey: CardLinkFieldKey;
  pagesByRoute: Map<string, PageLookup>;
  onJump?: (pageKey: string) => void;
}): SectionCardLink {
  const { href, fieldKey, pagesByRoute, onJump } = args;
  const isExternal = /^(https?:|mailto:|tel:)/i.test(href);
  if (isExternal) {
    return {
      kind: "external",
      fieldKey,
      label: href.replace(/^https?:\/\//, ""),
      pageNo: null,
      routePath: href,
    };
  }
  if (!href.startsWith("/")) {
    return {
      kind: "external",
      fieldKey,
      label: href,
      pageNo: null,
      routePath: href,
    };
  }
  // Query-String und Fragment abschneiden: `/produkte/x?kategorie=y#z`
  // ist derselbe Routenpfad wie `/produkte/x` und darf keine 404-Warnung
  // erzeugen. Unbekannte Pfade werden weiterhin gemeldet.
  const target = pagesByRoute.get(routePathOf(href));
  if (!target) {
    return {
      kind: "internal-missing",
      fieldKey,
      label: href,
      pageNo: null,
      routePath: href,
    };
  }
  const label = target.title_de ?? target.page_key.replace(/^.*\./, "");
  const status =
    target.status === "published" || target.status === "draft" || target.status === "archived"
      ? (target.status as "published" | "draft" | "archived")
      : "draft";
  return {
    kind: "internal-found",
    fieldKey,
    label,
    pageNo: target.page_no,
    routePath: href,
    status,
    isActive: target.is_active,
    onJump: onJump ? () => onJump(target.page_key) : undefined,
  };
}

/**
 * resolveNavNodeLink — baut eine `SectionCardLink`-Pille für einen Knoten
 * aus `cms_navigation_nodes`, damit Footer-/MainNav-/Persona-/Meta-Knoten
 * im Admin-Baum sichtbar machen, wohin sie zeigen.
 *
 * Reihenfolge der Auflösung:
 *  1. `node_type === 'external_link'` + `external_url` → extern
 *  2. `page_key` → Lookup in `pagesByKey`
 *  3. `route_path` → Lookup in `pagesByRoute`
 *  4. sonst: null (keine Pille)
 *
 * `pagesByKey` wird optional übergeben; falls nicht vorhanden, wird er
 * lokal aus `pagesByRoute` abgeleitet.
 */
export function resolveNavNodeLink(args: {
  node: Pick<
    NavigationNodeRow,
    "page_key" | "route_path" | "external_url" | "node_type" | "nav_area" | "parent_id"
  >;
  pagesByRoute: Map<string, PageLookup>;
  pagesByKey?: Map<string, PageLookup>;
  onJump?: (pageKey: string) => void;
}): SectionCardLink | null {
  const { node, pagesByRoute, onJump } = args;
  const pagesByKey =
    args.pagesByKey ?? new Map(Array.from(pagesByRoute.values()).map((page) => [page.page_key, page]));

  // 1) Externer Link
  if (node.node_type === "external_link" || node.external_url) {
    const url = (node.external_url ?? "").trim();
    if (!url) return null;
    return resolveCardLink({ href: url, fieldKey: "external_url", pagesByRoute, onJump });
  }

  // 2) page_key → Pille zeigen für:
  //    - Footer-/Footer-Bottom-Knoten (dort ist der Knoten nur ein Verweis-Wort),
  //    - **alle Sub-Knoten** in Main/Meta/Persona (parent_id != null), damit
  //      Redakteure sehen, wohin z. B. ein Service-Hub-Unter-Menüpunkt zeigt
  //      (Etappe „cms-admin-link-pills-sub-nav"). Top-Level-Knoten bleiben
  //      ohne Pille, weil dort Label und Seite identisch sind (Doppelung).
  if (node.page_key) {
    const isFooterLink = node.nav_area === "footer" || node.nav_area === "footer_bottom";
    const isSubNode = !!node.parent_id;
    if (!isFooterLink && !isSubNode) return null;


    const target = pagesByKey.get(node.page_key);
    if (!target) {
      return {
        kind: "internal-missing",
        fieldKey: "page_key",
        label: node.page_key,
        pageNo: null,
        routePath: node.route_path || node.page_key,
      };
    }

    const label = target.title_de ?? target.page_key.replace(/^.*\./, "");
    const status =
      target.status === "published" || target.status === "draft" || target.status === "archived"
        ? (target.status as "published" | "draft" | "archived")
        : "draft";

    return {
      kind: "internal-found",
      fieldKey: "page_key",
      label,
      pageNo: target.page_no,
      routePath: node.route_path || target.page_key,
      status,
      isActive: target.is_active,
      onJump: onJump ? () => onJump(target.page_key) : undefined,
    };
  }

  // 3) route_path → wie interner Karten-Link
  if (node.route_path) {
    return resolveCardLink({
      href: node.route_path,
      fieldKey: "route_path",
      pagesByRoute,
      onJump,
    });
  }

  return null;
}
