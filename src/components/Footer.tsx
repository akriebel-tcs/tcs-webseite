import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { footerNavigation, footerBottomNavigation } from "@/navigation/footerNavigation";
import logoTcsWeiss from "@/assets/logo-tcs-weiss.png";
import { useNavigationOverlay, type NavigationOverlay } from "@/navigation/useNavigationOverlay";
import {
  useNavigationTree,
  pickDbLabel,
  pickDbHref,
  type NavigationDbNode,
} from "@/navigation/useNavigationTree";
import {
  FOOTER_COLUMN_DB_KEYS,
  FOOTER_ITEM_DB_KEYS,
  FOOTER_BOTTOM_DB_KEYS,
} from "@/navigation/footerDbMap";
import { pickNavText } from "@/navigation/localizedNav";

/**
 * Etappe 1.a — Footer DB-erst mit Code-Fallback.
 *
 * - Wenn die DB für `nav_area = "footer"` mind. einen sichtbaren Knoten
 *   liefert, wird der Footer 1:1 aus der DB gerendert (Spalten = Top-Level,
 *   Items = Kinder). Routen, Labels, Reihenfolge: alles aus der DB.
 * - Sonst greift der bisherige Hybrid-Renderer aus Code + Overlay.
 *
 * Die Bottom-Bar (Legal-Links) folgt derselben Logik für `footer_bottom`.
 */

type OverlayLookup = (codeKey: string, map: Record<string, string>) =>
  | ReturnType<NavigationOverlay["get"]>
  | undefined;

function makeLookup(overlay: NavigationOverlay): OverlayLookup {
  return (codeKey, map) => {
    const dbKey = map[codeKey];
    if (!dbKey) return undefined;
    return overlay.get(dbKey);
  };
}

function pickLabel(
  entry: ReturnType<NavigationOverlay["get"]> | undefined,
  locale: string,
  fallback: string,
): string {
  if (!entry) return fallback;
  return pickNavText(locale, {
    map: entry.labels,
    legacy: { de: entry.label_de, en: entry.label_en, pl: entry.label_pl },
    fallback,
  });
}

const Footer = () => {
  const { t, i18n } = useTranslation("navigation");

  // DB-erst: vollständiger Baum.
  const { tree: footerTree, ready: footerReady } = useNavigationTree("footer");
  const { tree: bottomTree, ready: bottomReady } = useNavigationTree("footer_bottom");

  // Hybrid-Fallback (Overlay über Code-Struktur).
  const { overlay: footerOverlay } = useNavigationOverlay("footer");
  const { overlay: bottomOverlay } = useNavigationOverlay("footer_bottom");

  const lookupFooter = useMemo(() => makeLookup(footerOverlay), [footerOverlay]);
  const lookupBottom = useMemo(() => makeLookup(bottomOverlay), [bottomOverlay]);

  const useDbFooter = footerReady && footerTree.length > 0;
  const useDbBottom = bottomReady && bottomTree.length > 0;

  // ------ Spalten ------
  const visibleColumns = useMemo(() => {
    if (useDbFooter) {
      return footerTree.map((col) => ({
        key: col.node_key,
        title: pickDbLabel(col, i18n.language),
        items: col.children.map((it) => ({
          key: it.node_key,
          href: pickDbHref(it),
          label: pickDbLabel(it, i18n.language),
        })),
      }));
    }
    // Overlay enthält nur sichtbare Knoten. Ist es geladen, gilt „kein Eintrag
    // = im CMS ausgeschaltet"; nur bei leerem Overlay bleibt Code vollständig.
    const overlayLoaded = footerOverlay.size > 0;
    return footerNavigation
      .map((col) => {
        const colEntry = lookupFooter(col.key, FOOTER_COLUMN_DB_KEYS);
        const items = col.items
          .map((item) => {
            const entry = lookupFooter(item.key, FOOTER_ITEM_DB_KEYS);
            return { item, entry };
          })
          .filter(({ entry }) => (overlayLoaded ? entry !== undefined : true))
          .sort((a, b) => (a.entry?.sort_order ?? 0) - (b.entry?.sort_order ?? 0));
        return { col, colEntry, items };
      })
      .filter(
        ({ colEntry, items }) =>
          (overlayLoaded ? colEntry !== undefined : true) && items.length > 0,
      )

      .sort((a, b) => (a.colEntry?.sort_order ?? 0) - (b.colEntry?.sort_order ?? 0))
      .map(({ col, colEntry, items }) => ({
        key: col.key,
        title: pickLabel(colEntry, i18n.language, t(col.titleKey)),
        items: items.map(({ item, entry }) => ({
          key: item.key,
          href: item.path ?? "#",
          label: pickLabel(entry, i18n.language, t(item.labelKey)),
        })),
      }));
  }, [useDbFooter, footerTree, lookupFooter, footerOverlay, i18n.language, t]);

  // ------ Bottom-Bar ------
  const visibleBottom = useMemo(() => {
    if (useDbBottom) {
      return bottomTree.map((n: NavigationDbNode) => ({
        key: n.node_key,
        href: pickDbHref(n),
        label: pickDbLabel(n, i18n.language),
      }));
    }
    const overlayLoaded = bottomOverlay.size > 0;
    return footerBottomNavigation
      .map((item) => ({ item, entry: lookupBottom(item.key, FOOTER_BOTTOM_DB_KEYS) }))
      .filter(({ entry }) => (overlayLoaded ? entry !== undefined : true))

      .sort((a, b) => (a.entry?.sort_order ?? 0) - (b.entry?.sort_order ?? 0))
      .map(({ item, entry }) => ({
        key: item.key,
        href: item.path ?? "#",
        label: pickLabel(entry, i18n.language, t(item.labelKey)),
      }));
  }, [useDbBottom, bottomTree, lookupBottom, bottomOverlay, i18n.language, t]);

  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto py-16 lg:py-20">
        <nav aria-label={t("a11y.footerNavigation")} className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {visibleColumns.map((col) => (
            <div key={col.key}>
              <h4 className="text-sm font-medium mb-5 text-background/60 uppercase tracking-wide">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.items.map((it) => (
                  <li key={it.key}>
                    <Link
                      to={it.href}
                      className="text-sm text-background/40 hover:text-background transition-colors"
                    >
                      {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-background/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/" aria-label="TCS" className="shrink-0">
            <img
              src={logoTcsWeiss}
              alt="TCS"
              className="h-8 w-auto"
              loading="lazy"
            />
          </Link>
          <div className="text-xs text-background/30">
            {t("footer.bottom.copyright", { year: new Date().getFullYear() })}
          </div>
          <nav aria-label={t("a11y.legalNavigation")} className="flex gap-6 text-xs text-background/30">
            {visibleBottom.map((it) => (
              <Link
                key={it.key}
                to={it.href}
                className="hover:text-background transition-colors"
              >
                {it.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
