import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useDbBreadcrumb, pickDbCrumbLabel } from "@/navigation/useDbBreadcrumb";
import { shouldHideBreadcrumb } from "@/navigation/breadcrumbVisibility";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Format a slug as a human-readable fallback (e.g. "snipdoo-ip" → "Snipdoo Ip").
 * Used when no i18n key exists for a segment.
 */
const formatSegment = (seg: string): string =>
  seg
    .split("-")
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join(" ");

/**
 * Top-Level-Routen, die fachlich dem Service-Bereich zugeordnet sind,
 * obwohl ihr Pfad nicht unter `/service/...` liegt. Für diese Routen wird
 * ein virtueller Bereichsknoten „Service" (Link auf `/service`) vor das
 * letzte Segment eingefügt, damit die Breadcrumb-Logik den Bereich klar
 * abbildet (Etappe 19c-service-nav-final).
 */
const SERVICE_AREA_FLAT_ROUTES = new Set<string>([
  "/downloads",
  "/planen-konfigurieren",
  "/technischer-support",
  "/akademie",
  "/ersatzteile",
]);

/**
 * Produktdetailseiten, die fachlich unter „Türen und Tore"
 * (/zutrittskontrolle/tueren-tore) eingeordnet sind, obwohl ihre URL
 * flach unter /zutrittskontrolle/... liegt. Für diese Routen wird ein
 * virtueller Zwischenknoten „Türen & Tore" eingefügt.
 */
const TUEREN_TORE_PRODUCT_ROUTES = new Set<string>([
  "/zutrittskontrolle/elektronische-drueckergarnitur",
  "/zutrittskontrolle/elektronischer-knaufzylinder",
  "/zutrittskontrolle/funkvernetzte-offline-leser",
  "/zutrittskontrolle/bcm-online-leser",
  "/zutrittskontrolle/bcm-handsender",
]);

/**
 * Routen, deren Breadcrumb-Elternpfad von der URL abweicht.
 * Jeder Eintrag definiert die Eltern-Crumbs (ohne Home, ohne letztes
 * Segment), die statt der URL-Segmente verwendet werden.
 */
const BREADCRUMB_OVERRIDES: Record<string, Array<{ labelKey: string; href: string }>> = {
  "/zutrittskontrolle/vorhaengeschloss": [
    { labelKey: "breadcrumb.segments.gebaeudemanagement", href: "/gebaeudemanagement" },
    { labelKey: "breadcrumb.segments.schraenke-behaelter", href: "/gebaeudemanagement/schraenke-behaelter" },
  ],
  // Etappe cms-navigation-breadcrumb-hierarchy-zk-product-pages-1:
  // CMS-Produktlösungsseiten unter /zutrittskontrolle/..., deren fachlicher
  // Parent eindeutig aus den verlinkenden Karten (cms_section_fields.href)
  // hervorgeht. Quelle: card_* auf zutrittskontrolle.tueren-tore /
  // zufahrten-parkplaetze sowie products__* auf
  // gebaeudemanagement.digitale-namensanzeige / schraenke-behaelter.
  // bcm-door-app und zutrittssoftware bleiben bewusst ausgenommen
  // (keine eindeutige Karten-Quelle bzw. fachlich uneindeutig).
  "/zutrittskontrolle/bcm-mini-cloud": [
    { labelKey: "breadcrumb.segments.zutrittskontrolle", href: "/zutrittskontrolle" },
    { labelKey: "breadcrumb.segments.tueren-tore", href: "/zutrittskontrolle/tueren-tore" },
  ],
  "/zutrittskontrolle/gsm-gateway": [
    { labelKey: "breadcrumb.segments.zutrittskontrolle", href: "/zutrittskontrolle" },
    { labelKey: "breadcrumb.segments.zufahrten-parkplaetze", href: "/zutrittskontrolle/zufahrten-parkplaetze" },
  ],
  "/zutrittskontrolle/zufahrtskontrolle": [
    { labelKey: "breadcrumb.segments.zutrittskontrolle", href: "/zutrittskontrolle" },
    { labelKey: "breadcrumb.segments.zufahrten-parkplaetze", href: "/zutrittskontrolle/zufahrten-parkplaetze" },
  ],
  "/zutrittskontrolle/aussenstation-adx5": [
    { labelKey: "breadcrumb.segments.gebaeudemanagement", href: "/gebaeudemanagement" },
    { labelKey: "breadcrumb.segments.digitale-namensanzeige", href: "/gebaeudemanagement/digitale-namensanzeige" },
  ],
  "/zutrittskontrolle/digitale-briefkasten": [
    { labelKey: "breadcrumb.segments.gebaeudemanagement", href: "/gebaeudemanagement" },
    { labelKey: "breadcrumb.segments.digitale-namensanzeige", href: "/gebaeudemanagement/digitale-namensanzeige" },
  ],
  "/zutrittskontrolle/schrankschloss": [
    { labelKey: "breadcrumb.segments.gebaeudemanagement", href: "/gebaeudemanagement" },
    { labelKey: "breadcrumb.segments.schraenke-behaelter", href: "/gebaeudemanagement/schraenke-behaelter" },
  ],
  "/zutrittskontrolle/serverschrankschloss": [
    { labelKey: "breadcrumb.segments.gebaeudemanagement", href: "/gebaeudemanagement" },
    { labelKey: "breadcrumb.segments.schraenke-behaelter", href: "/gebaeudemanagement/schraenke-behaelter" },
  ],
  // Zutrittssoftware/Verwaltungssoftware ist fachlich Unterseite von
  // „Digitale Namensanzeige" (Gebäudemanagement). DB-Breadcrumb greift
  // primär; dieser Override ist URL-Fallback, falls die RPC keinen
  // Treffer liefert.
  "/zutrittskontrolle/zutrittssoftware": [
    { labelKey: "breadcrumb.segments.gebaeudemanagement", href: "/gebaeudemanagement" },
    { labelKey: "breadcrumb.segments.digitale-namensanzeige", href: "/gebaeudemanagement/digitale-namensanzeige" },
  ],
  // Anwendungen → Wohnbau
  "/anwendungen/einfamilienhaus": [
    { labelKey: "breadcrumb.segments.anwendungen", href: "/anwendungen" },
    { labelKey: "breadcrumb.segments.wohnbau", href: "/anwendungen/wohnbau" },
  ],
  "/anwendungen/mehrfamilienhaus": [
    { labelKey: "breadcrumb.segments.anwendungen", href: "/anwendungen" },
    { labelKey: "breadcrumb.segments.wohnbau", href: "/anwendungen/wohnbau" },
  ],
  "/anwendungen/grossanlage": [
    { labelKey: "breadcrumb.segments.anwendungen", href: "/anwendungen" },
    { labelKey: "breadcrumb.segments.wohnbau", href: "/anwendungen/wohnbau" },
  ],
  "/anwendungen/sanierung": [
    { labelKey: "breadcrumb.segments.anwendungen", href: "/anwendungen" },
    { labelKey: "breadcrumb.segments.wohnbau", href: "/anwendungen/wohnbau" },
  ],
  "/anwendungen/concierge": [
    { labelKey: "breadcrumb.segments.anwendungen", href: "/anwendungen" },
    { labelKey: "breadcrumb.segments.wohnbau", href: "/anwendungen/wohnbau" },
  ],
  // Anwendungen → Gesundheit
  "/anwendungen/pflege": [
    { labelKey: "breadcrumb.segments.anwendungen", href: "/anwendungen" },
    { labelKey: "breadcrumb.segments.gesundheitseinrichtungen", href: "/anwendungen/gesundheitseinrichtungen" },
  ],
  "/anwendungen/klinik": [
    { labelKey: "breadcrumb.segments.anwendungen", href: "/anwendungen" },
    { labelKey: "breadcrumb.segments.gesundheitseinrichtungen", href: "/anwendungen/gesundheitseinrichtungen" },
  ],
  // Anwendungen → Öffentliche Hand
  "/anwendungen/behoerde": [
    { labelKey: "breadcrumb.segments.anwendungen", href: "/anwendungen" },
    { labelKey: "breadcrumb.segments.oeffentliche-hand", href: "/anwendungen/oeffentliche-hand" },
  ],
  "/anwendungen/feuerwehr": [
    { labelKey: "breadcrumb.segments.anwendungen", href: "/anwendungen" },
    { labelKey: "breadcrumb.segments.oeffentliche-hand", href: "/anwendungen/oeffentliche-hand" },
  ],
  "/anwendungen/schwimmbad": [
    { labelKey: "breadcrumb.segments.anwendungen", href: "/anwendungen" },
    { labelKey: "breadcrumb.segments.oeffentliche-hand", href: "/anwendungen/oeffentliche-hand" },
  ],
};

/**
 * Build breadcrumbs from a pathname using the current i18n language.
 * Falls back to the provided fallbackLabel or a formatted segment if no
 * translation exists.
 */
export function buildBreadcrumbs(pathname: string, fallbackLabel?: string): BreadcrumbItem[] {
  const t = i18n.getFixedT(null, "navigation");
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: BreadcrumbItem[] = [{ label: t("breadcrumb.home"), href: "/" }];

  // Override: komplette Elternstruktur für Sonderrouten
  if (BREADCRUMB_OVERRIDES[pathname]) {
    const overrideParents = BREADCRUMB_OVERRIDES[pathname];
    overrideParents.forEach(({ labelKey, href }) => {
      crumbs.push({ label: t(labelKey), href });
    });
    const lastSeg = segments[segments.length - 1];
    const lastKey = `breadcrumb.segments.${lastSeg}`;
    const lastTranslated = t(lastKey);
    crumbs.push({
      label: lastTranslated !== lastKey ? lastTranslated : fallbackLabel || formatSegment(lastSeg),
    });
    return crumbs;
  }

  // Service-Bereichsknoten für flache Top-Level-Routen, die fachlich
  // unter „Service" gehören. Wird vor dem letzten Segment eingefügt.
  if (SERVICE_AREA_FLAT_ROUTES.has(pathname)) {
    crumbs.push({ label: t("breadcrumb.segments.service"), href: "/service" });
  }

  let path = "";
  segments.forEach((seg, i) => {
    path += `/${seg}`;
    const isLast = i === segments.length - 1;
    const key = `breadcrumb.segments.${seg}`;
    const translated = t(key);
    const label =
      translated && translated !== key
        ? translated
        : fallbackLabel || formatSegment(seg);
    crumbs.push({
      label,
      href: isLast ? undefined : path,
    });

    if (
      TUEREN_TORE_PRODUCT_ROUTES.has(pathname) &&
      seg === "zutrittskontrolle" &&
      !isLast
    ) {
      crumbs.push({
        label: t("breadcrumb.segments.tueren-tore"),
        href: "/zutrittskontrolle/tueren-tore",
      });
    }
  });

  return crumbs;
}

const AutoBreadcrumb = ({ fallbackLabel }: { fallbackLabel?: string }) => {
  const { pathname } = useLocation();
  // useTranslation triggers a re-render on language change, so the
  // breadcrumb labels stay in sync with the active language.
  const { t, i18n: i18nInst } = useTranslation("navigation");

  // Etappe cms-navigation-tree-as-breadcrumb-source-1:
  // 1) DB-Breadcrumb aus cms_navigation_nodes (führend, wenn vorhanden)
  // 2) bestehende Overrides als Fallback
  // 3) URL-Fallback
  const db = useDbBreadcrumb(pathname);
  const fallbackCrumbs = buildBreadcrumbs(pathname, fallbackLabel);

  // Zentrale Ausschlussliste (z. B. Persona-Seiten): kein Breadcrumb,
  // weil der aktive Kontext bereits über die Meta-/Persona-Navigation
  // oben sichtbar ist. Check NACH allen Hooks, damit die Hook-Reihenfolge
  // stabil bleibt.
  if (shouldHideBreadcrumb(pathname)) {
    return null;
  }

  let crumbs: BreadcrumbItem[];
  if (db.ready && db.crumbs.length > 0) {
    const locale = i18nInst.language || "de";
    crumbs = [{ label: t("breadcrumb.home"), href: "/" }];
    db.crumbs.forEach((c, idx) => {
      const isLast = idx === db.crumbs.length - 1;
      crumbs.push({
        label: pickDbCrumbLabel(c, locale),
        href: isLast ? undefined : c.route_path ?? undefined,
      });
    });
  } else {
    crumbs = fallbackCrumbs;
  }

  return (
    <nav aria-label={t("a11y.breadcrumb")} className="bg-background border-b border-border">
      <div className="container mx-auto py-3">
        <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {crumbs.map((crumb, i) => (
            <li key={i} className="inline-flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3 h-3" />}
              {crumb.href && i < crumbs.length - 1 ? (
                <Link to={crumb.href} className="hover:text-foreground transition-colors">{crumb.label}</Link>
              ) : (
                <span className="text-foreground">{crumb.label}</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
};

export default AutoBreadcrumb;
