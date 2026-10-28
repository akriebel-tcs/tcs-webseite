import { useMemo, useState } from "react";
import { ChevronDown, Menu, X, Search, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePersona } from "@/contexts/PersonaContext";
import logoTcs from "@/assets/logo-tcs.png";
import { mainNavigation } from "@/navigation/mainNavigation";
import { MAIN_NAV_DB_KEYS } from "@/navigation/mainNavDbMap";
import {
  useNavigationOverlay,
  type NavigationOverlay,
  type NavigationOverlayEntry,
} from "@/navigation/useNavigationOverlay";
import {
  useNavigationTree,
  pickDbLabel,
  pickDbDescription,
  pickDbHref,
} from "@/navigation/useNavigationTree";
import { pickNavText } from "@/navigation/localizedNav";

/**
 * Erwartete Root-`node_key`s in der DB für `nav_area = "main"`.
 * Achtung: Code-Schlüssel `produkte` mappt auf DB-`pr.root` (siehe mainNavDbMap.ts).
 */
const EXPECTED_MAIN_DB_ROOT_KEYS: readonly string[] = [
  "pr.root",
  "gebaeudekommunikation",
  "gebaeudemanagement",
  "eingangssysteme",
  "zutrittskontrolle",
  // Batch: Umbenennung `anwendungen` → `bauten` in `cms_navigation_nodes`
  // nachgezogen. Der Altschlüssel bleibt zulässig, damit ältere DB-Stände
  // (und Remixe) nicht in den Code-Fallback kippen.
  "bauten",
  "anwendungen",
  "services",
];
const EXPECTED_MAIN_DB_ROOT_SET = new Set(EXPECTED_MAIN_DB_ROOT_KEYS);

/**
 * Pflicht-Wurzeln, die immer vorhanden sein müssen.
 */
const REQUIRED_MAIN_DB_ROOT_KEYS: readonly string[] = [
  "pr.root",
  "gebaeudekommunikation",
  "gebaeudemanagement",
  "eingangssysteme",
  "zutrittskontrolle",
  "services",
];

/**
 * Alternativ-Wurzel „Bauten": Der Knoten heißt in aktuellen DB-Ständen
 * `bauten`, in älteren `anwendungen`. Genau einer von beiden muss da sein.
 */
const BAUTEN_ROOT_ALIASES: readonly string[] = ["bauten", "anwendungen"];

/**
 * Streng: DB darf nur dann führen, wenn alle Pflicht-Wurzeln vorhanden sind,
 * keine Dubletten auftreten und kein unbekannter Root dabei ist.
 * Ein unvollständiger DB-Baum führt zum Code-Fallback, statt eine
 * beschädigte Navigation zu rendern.
 */
function hasSaneMainDbRoots(tree: Array<{ node_key: string }>): boolean {
  const keys = new Set(tree.map((n) => n.node_key));
  if (keys.size !== tree.length) return false;
  for (const k of REQUIRED_MAIN_DB_ROOT_KEYS) {
    if (!keys.has(k)) return false;
  }
  if (!BAUTEN_ROOT_ALIASES.some((k) => keys.has(k))) return false;
  for (const node of tree) {
    if (!EXPECTED_MAIN_DB_ROOT_SET.has(node.node_key)) return false;
  }
  return true;
}

/**
 * Etappe 1.a — Hauptnavigation DB-erst mit Code-Fallback.
 *
 * - Liefert die DB für `nav_area = "main"` mind. einen sichtbaren Top-Level-
 *   Knoten, baut der Renderer Top-Level + Children direkt aus der DB
 *   (Routen, Labels, Sortierung, Beschreibungen). Code wird nicht mehr
 *   konsultiert.
 * - Sonst greift der bisherige Hybrid-Pfad: Code-Struktur + Overlay-Daten.
 *   Damit bleibt die Site auch bei DB-Ausfall, Latenz oder fehlender CMS-
 *   Konfiguration sichtbar.
 *
 * Aktivzustand der Top-Level-Markierung wird URL-basiert ermittelt und ist
 * unabhängig von der Quelle (DB vs. Code) — die DB-Top-Level-`node_key`s
 * stimmen 1:1 mit den Code-Keys überein (produkte, gebaeudekommunikation,
 * zutrittskontrolle, gebaeudemanagement, eingangssysteme, anwendungen,
 * services).
 */

interface RenderItem {
  key: string;
  href: string;
  label: string;
  /** Code-Key zum Mappen auf getActiveTopLevelKey. */
  activeKey: string;
  children: RenderChild[];
}

interface RenderChild {
  key: string;
  href: string;
  label: string;
  description: string | null;
}

function lookupOverlay(
  overlay: NavigationOverlay,
  codeKey: string,
): NavigationOverlayEntry | undefined {
  const dbKey = MAIN_NAV_DB_KEYS[codeKey];
  if (!dbKey) return undefined;
  return overlay.get(dbKey);
}

function pickLabelOverlay(
  entry: NavigationOverlayEntry | undefined,
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

function getActiveTopLevelKey(pathname: string): string | null {
  const exactMap: Record<string, string> = {
    "/tuerkommunikation": "gebaeudekommunikation",
    "/tuersprechanlagen": "gebaeudekommunikation",
    "/briefkastenanlagen": "gebaeudekommunikation",
    "/grossanlagen": "gebaeudekommunikation",
    "/systemloesungen": "gebaeudekommunikation",
    "/snipdoo-ip": "gebaeudekommunikation",
    "/systemtechnik/snipdoo-ip": "gebaeudekommunikation",
    "/beschilderung": "gebaeudekommunikation",
    "/signage": "gebaeudekommunikation",
    "/anwendungen/bildungseinrichtungen": "anwendungen",
    "/bildungseinrichtungen": "anwendungen",
    "/anwendungen/objektloesungen": "anwendungen",
    "/objektloesungen": "anwendungen",
    // Detailseiten, die im Strukturbaum unter „Systemlösungen“
    // (Gebäudekommunikation) einsortiert sind. Die URL liegt unter
    // /anwendungen/*, aber der Unterstrich muss unter Gebäudekommunikation
    // erscheinen. Muss synchron zur DB-Navi (cms_navigation_nodes) bleiben.
    "/anwendungen/concierge": "gebaeudekommunikation",
    "/anwendungen/bidirektionale-video": "gebaeudekommunikation",
    "/anwendungen/digitale-namensverwaltung": "gebaeudekommunikation",
    // N-099 „Systemeigenschaften BCM“ ist im Strukturbaum unter
    // Zutrittskontrolle einsortiert → Unterstrich dort.
    "/anwendungen/zutrittskontrolle-bcm": "zutrittskontrolle",
    "/anwendungen/interne-kommunikation": "gebaeudekommunikation",

    "/planen-konfigurieren": "services",
    "/downloads": "services",
    "/technischer-support": "services",
    "/ersatzteile": "services",
    "/akademie": "services",
    "/service/online-produktkatalog": "produkte",
    // Fachlich unter Gebäudemanagement, URL liegt unter /zutrittskontrolle.
    // Muss synchron zu BREADCRUMB_OVERRIDES in src/components/AutoBreadcrumb.tsx bleiben.
    "/zutrittskontrolle/zutrittssoftware": "gebaeudemanagement",
    "/zutrittskontrolle/aussenstation-adx5": "gebaeudemanagement",
    "/zutrittskontrolle/digitale-briefkasten": "gebaeudemanagement",
    "/zutrittskontrolle/schrankschloss": "gebaeudemanagement",
    "/zutrittskontrolle/serverschrankschloss": "gebaeudemanagement",
    "/zutrittskontrolle/vorhaengeschloss": "gebaeudemanagement",
  };
  if (exactMap[pathname]) return exactMap[pathname];

  const prefixMap: Array<[string, string]> = [
    ["/produkte", "produkte"],
    ["/gebaeudekommunikation", "gebaeudekommunikation"],
    ["/zutrittskontrolle", "zutrittskontrolle"],
    ["/gebaeudemanagement", "gebaeudemanagement"],
    ["/entry-system", "eingangssysteme"],
    ["/anwendungen", "anwendungen"],
    ["/service", "services"],
  ];
  for (const [prefix, key] of prefixMap) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return key;
  }
  return null;
}

const MainNavigation = () => {
  const { t, i18n } = useTranslation("navigation");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { setActivePersona } = usePersona();
  const location = useLocation();
  const activeTopLevelKey = getActiveTopLevelKey(location.pathname);

  // DB-erst.
  const { tree, ready } = useNavigationTree("main");
  // Hybrid-Fallback.
  const { overlay } = useNavigationOverlay("main");
  const useDb = ready && hasSaneMainDbRoots(tree);

  const visibleItems: RenderItem[] = useMemo(() => {
    if (useDb) {
      // DB → Code-Key Mapping für aktive Top-Level-Markierung
      const dbToCodeKey: Record<string, string> = {
        "pr.root": "produkte",
        gebaeudekommunikation: "gebaeudekommunikation",
        gebaeudemanagement: "gebaeudemanagement",
        eingangssysteme: "eingangssysteme",
        zutrittskontrolle: "zutrittskontrolle",
        bauten: "anwendungen",
        anwendungen: "anwendungen",
        services: "services",
      };
      return tree.map((n) => ({
        key: n.node_key,
        href: pickDbHref(n),
        label: pickDbLabel(n, i18n.language),
        activeKey: dbToCodeKey[n.node_key] ?? n.node_key,
        children: n.children.map((c) => ({
          key: c.node_key,
          href: pickDbHref(c),
          label: pickDbLabel(c, i18n.language),
          description: pickDbDescription(c, i18n.language),
        })),
      }));
    }
    return mainNavigation
      .map((item) => {
        const entry = lookupOverlay(overlay, item.key);
        const children = (item.children ?? [])
          .map((child) => ({ child, entry: lookupOverlay(overlay, child.key) }))
          .filter(({ entry: e }) => e?.is_active !== false)
          .sort(
            (a, b) => (a.entry?.sort_order ?? 0) - (b.entry?.sort_order ?? 0),
          );
        return { item, entry, children };
      })
      .filter(({ entry }) => entry?.is_active !== false)
      .sort((a, b) => (a.entry?.sort_order ?? 0) - (b.entry?.sort_order ?? 0))
      .map(({ item, entry, children }) => ({
        key: item.key,
        href: item.path ?? "#",
        label: pickLabelOverlay(entry, i18n.language, t(item.labelKey)),
        activeKey: item.key,
        children: children.map(({ child, entry: childEntry }) => ({
          key: child.key,
          href: child.path ?? "#",
          label: pickLabelOverlay(childEntry, i18n.language, t(child.labelKey)),
          description: child.descriptionKey ? t(child.descriptionKey) : null,
        })),
      }));
  }, [useDb, tree, overlay, i18n.language, t]);

  return (
    <nav aria-label={t("a11y.mainNavigation")} className="bg-background border-b border-border">
      <div className="container mx-auto">
        <div className="flex items-center justify-between min-h-16 lg:min-h-[72px] py-8">
          {/* Logo - Left */}
          <Link to="/" className="flex items-center relative z-50 pr-4" onClick={() => setActivePersona(null)}>
            <img src={logoTcs} alt={t("a11y.logoHome")} className="h-16" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-0">
            {visibleItems.map((item) => {
              const isActive = activeTopLevelKey === item.activeKey;
              const ariaCurrent: "page" | "true" | undefined = isActive
                ? location.pathname === item.href
                  ? "page"
                  : "true"
                : undefined;
              return (
                <div
                  key={item.key}
                  className="relative"
                  onMouseEnter={() => setOpenMenu(item.key)}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  <Link
                    to={item.href}
                    onClick={() => setActivePersona(null)}
                    aria-current={ariaCurrent}
                    className={`flex items-center gap-1 px-4 py-2 text-sm text-foreground hover:text-muted-foreground transition-colors border-b-2 ${
                      isActive ? "font-semibold border-foreground" : "border-transparent"
                    }`}
                  >
                    {item.label}
                  </Link>

                  {openMenu === item.key && item.children.length > 0 && (
                    <div className="absolute top-full left-0 pt-0 animate-fade-in">
                      <div className="bg-background border border-border shadow-elevated min-w-[340px] py-1 mt-[1px]">
                        {item.children.map((child) => {
                          const isChildActive = child.href !== "#" && child.href === location.pathname;
                          return (
                            <Link
                              key={child.key}
                              to={child.href}
                              onClick={() => setActivePersona(null)}
                              aria-current={isChildActive ? "page" : undefined}
                              className={`block px-6 py-3.5 transition-colors group border-l-2 ${
                                isChildActive
                                  ? "bg-secondary border-foreground"
                                  : "border-transparent hover:bg-secondary hover:border-border"
                              }`}
                            >
                              <div
                                className={`text-sm text-foreground ${
                                  isChildActive ? "font-semibold" : ""
                                }`}
                              >
                                {child.label}
                              </div>
                              {child.description && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {child.description}
                                </div>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Search + Account + Mobile Toggle */}
          <div className="flex items-center gap-2 lg:order-last lg:ml-6">
            <button
              type="button"
              aria-label={t("a11y.search")}
              className="hidden lg:flex p-2 text-foreground hover:text-muted-foreground transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label={t("a11y.account")}
              className="hidden lg:flex p-2 text-foreground hover:text-muted-foreground transition-colors"
            >
              <User className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? t("a11y.menuClose") : t("a11y.menuOpen")}
              aria-expanded={mobileOpen}
              className="lg:hidden p-2 text-foreground"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-background animate-fade-in">
          <div className="container mx-auto py-6 space-y-0">
            {visibleItems.map((item) => {
              const isActive = activeTopLevelKey === item.activeKey;
              const topHref = item.href !== "#" ? item.href : null;
              return (
                <div key={item.key} className="border-b border-border last:border-0">
                  <div className="flex items-center justify-between w-full">
                    {topHref ? (
                      <Link
                        to={topHref}
                        onClick={() => {
                          setActivePersona(null);
                          setMobileOpen(false);
                        }}
                        aria-current={isActive ? (location.pathname === topHref ? "page" : "true") : undefined}
                        className={`flex-1 px-0 py-4 text-sm text-foreground ${
                          isActive ? "font-semibold" : ""
                        }`}
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span
                        className={`flex-1 px-0 py-4 text-sm text-foreground ${
                          isActive ? "font-semibold" : ""
                        }`}
                      >
                        {item.label}
                      </span>
                    )}
                    {item.children.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setOpenMenu(openMenu === item.key ? null : item.key)}
                        aria-expanded={openMenu === item.key}
                        aria-label={item.label}
                        className="px-3 py-4 text-muted-foreground"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${openMenu === item.key ? "rotate-180" : ""}`}
                        />
                      </button>
                    )}
                  </div>
                  {openMenu === item.key && item.children.length > 0 && (
                    <div className="pb-4 space-y-0">
                      {topHref && (
                        <Link
                          to={topHref}
                          onClick={() => {
                            setActivePersona(null);
                            setMobileOpen(false);
                          }}
                          aria-current={location.pathname === topHref ? "page" : undefined}
                          className="block py-2.5 text-sm font-medium text-foreground hover:text-muted-foreground transition-colors"
                        >
                          {t("common.overview")}
                        </Link>
                      )}
                      {item.children.map((child) => {
                        const isChildActive = child.href !== "#" && child.href === location.pathname;
                        return (
                          <Link
                            key={child.key}
                            to={child.href}
                            onClick={() => {
                              setActivePersona(null);
                              setMobileOpen(false);
                            }}
                            aria-current={isChildActive ? "page" : undefined}
                            className={`block py-2.5 pl-3 text-sm border-l-2 transition-colors ${
                              isChildActive
                                ? "border-foreground text-foreground font-semibold bg-secondary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};

export default MainNavigation;
