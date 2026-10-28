import { useMemo, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { personaNavigation } from "@/navigation/personaNavigation";
import { metaNavigation } from "@/navigation/metaNavigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  useNavigationOverlay,
  type NavigationOverlay,
  type NavigationOverlayEntry,
} from "@/navigation/useNavigationOverlay";
import {
  useNavigationTree,
  pickDbLabel,
  pickDbHref,
} from "@/navigation/useNavigationTree";
import { pickNavText } from "@/navigation/localizedNav";
import { personaIdFromPath, personaPath } from "@/navigation/personaRoutes";




/**
 * URL-Slug → Persona-ID aus `personaNavigation`. Persona-IDs sind plural
 * (z. B. „architekten"), die Persona-Seiten-Routen aber singular
 * (z. B. `/personas/architekt`). Damit die Meta-Persona-Leiste auch dann
 * den richtigen Button als aktiv markiert, wenn der Nutzer über eine
 * Startseiten-Karte direkt auf `/personas/<slug>` landet, mappen wir die
 * Slugs einmalig auf die zugehörige Persona-ID.
 */
function hasVisibleDbNodes(tree: Array<{ node_key: string }>): boolean {
  return tree.length > 0;
}


/**
 * Etappe 1.a — Meta- und Persona-Leiste DB-erst mit Code-Fallback.
 *
 * - Liefert die DB für `nav_area = "meta"` bzw. `"persona"` mind. einen
 *   sichtbaren Knoten, wird aus der DB gerendert (Routen, Labels, Reihenfolge).
 * - Sonst greift der bisherige Hybrid-Pfad (Code + Overlay).
 *
 * Persona-IDs werden aus dem DB-Knotenschlüssel extrahiert
 * (`persona.architekten` → `architekten`) und an die bestehende
 * PersonaContext-Logik weitergereicht.
 */

interface RenderMeta {
  key: string;
  href: string;
  label: string;
  isServiceportal: boolean;
}

interface RenderPersona {
  id: string;
  label: string;
  shortLabel: string;
  /** Eigene Seitenadresse (DB-Pfad hat Vorrang, sonst zentrales Mapping). */
  href: string;
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

function filterAndSort<T extends { key: string }>(
  items: T[],
  overlay: NavigationOverlay,
  keyFor: (item: T) => string,
): Array<{ item: T; entry: NavigationOverlayEntry | undefined }> {
  // Wichtig: Das Overlay liefert ausschließlich sichtbare Knoten (is_active +
  // show_in_public_nav). Fehlt ein Eintrag, obwohl das Overlay geladen ist,
  // heißt das „im CMS ausgeschaltet" — dann darf der Code-Fallback ihn NICHT
  // anzeigen. Nur bei komplett leerem Overlay (Fehler/CMS aus) bleibt die
  // Code-Struktur vollständig sichtbar.
  const overlayLoaded = overlay.size > 0;
  return items
    .map((item) => ({ item, entry: overlay.get(keyFor(item)) }))
    .filter(({ entry }) => (overlayLoaded ? entry !== undefined : true))
    .sort((a, b) => (a.entry?.sort_order ?? 0) - (b.entry?.sort_order ?? 0));

}

interface MetaNavigationProps {
  activePersona: string | null;
  onPersonaChange: (id: string | null) => void;
}

const MetaNavigation = ({ activePersona, onPersonaChange }: MetaNavigationProps) => {
  const { t, i18n } = useTranslation("navigation");
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { tree: metaTree, ready: metaReady } = useNavigationTree("meta");
  const { tree: personaTree, ready: personaReady } = useNavigationTree("persona");
  const { overlay: metaOverlay } = useNavigationOverlay("meta");
  const { overlay: personaOverlay } = useNavigationOverlay("persona");

  // DB ist führend, sobald der Bereich mindestens einen sichtbaren Knoten hat
  // (gleicher Vertrag wie im Footer). Zusätzliche CMS-Knoten (z. B.
  // `meta.akademie`) dürfen den DB-Pfad nicht mehr abschalten.
  const useDbMeta = metaReady && hasVisibleDbNodes(metaTree);
  const useDbPersona = personaReady && hasVisibleDbNodes(personaTree);


  const visibleMeta: RenderMeta[] = useMemo(() => {
    if (useDbMeta) {
      // Nur Top-Level (Serviceportal-Kinder werden nicht in der Bar gezeigt).
      return metaTree.map((n) => ({
        key: n.node_key,
        href: pickDbHref(n),
        label: pickDbLabel(n, i18n.language),
        isServiceportal: n.node_key === "meta.serviceportal",
      }));
    }
    return filterAndSort(metaNavigation, metaOverlay, (i) => i.key).map(
      ({ item, entry }) => ({
        key: item.key,
        href: item.path ?? "#",
        label: pickLabelOverlay(entry, i18n.language, t(item.labelKey)),
        isServiceportal: item.key === "meta.serviceportal",
      }),
    );
  }, [useDbMeta, metaTree, metaOverlay, i18n.language, t]);

  const visiblePersonas: RenderPersona[] = useMemo(() => {
    if (useDbPersona) {
      return personaTree.map((n) => {
        const id = n.node_key.startsWith("persona.")
          ? n.node_key.slice("persona.".length)
          : n.node_key;
        const label = pickDbLabel(n, i18n.language);
        const dbHref = pickDbHref(n);
        const href = dbHref && dbHref !== "#" ? dbHref : personaPath(id) ?? "";
        return { id, label, shortLabel: label, href };
      });
    }
    return filterAndSort(
      personaNavigation.map((p) => ({ ...p, key: `persona.${p.id}` })),
      personaOverlay,
      (i) => i.key,
    ).map(({ item, entry }) => ({
      id: item.id,
      label: pickLabelOverlay(entry, i18n.language, t(item.labelKey)),
      shortLabel: pickLabelOverlay(entry, i18n.language, t(item.labelShortKey)),
      href: personaPath(item.id) ?? "",
    }));
  }, [useDbPersona, personaTree, personaOverlay, i18n.language, t]);

  const handlePersonaClick = (id: string) => {
    const newPersona = activePersona === id ? null : id;
    onPersonaChange(newPersona);
    if (newPersona && location.pathname !== "/") {
      navigate("/");
    }
  };

  // Aktive Persona kann zwei Quellen haben:
  // 1) State (Klick auf Persona-Button auf der Startseite).
  // 2) URL (Direktaufruf einer Persona-Seite über die Startseiten-Karten,
  //    z. B. `/personas/architekt`). Damit ist die Darstellung identisch,
  //    egal über welchen Einstieg der Nutzer kommt.
  const activePersonaFromUrl = personaIdFromPath(location.pathname);
  const effectiveActivePersona = activePersona ?? activePersonaFromUrl;

  const activePersonaItem = effectiveActivePersona
    ? visiblePersonas.find((p) => p.id === effectiveActivePersona)
    : undefined;
  const activePersonaLongLabel = activePersonaItem ? activePersonaItem.label : "";

  return (
    <div className="border-b border-border bg-background">
      <div className="container mx-auto">
        {/* Desktop */}
        <div className="hidden lg:flex items-center justify-between py-1.5 text-xs">
          <span className="text-muted-foreground tracking-wide">{t("meta.personaPrompt")}</span>
          <nav aria-label={t("a11y.personaNavigation")} className="flex items-center gap-0.5">
            {visiblePersonas.map((p) => {
              const cls = `px-3 py-1 transition-all duration-200 ${
                effectiveActivePersona === p.id
                  ? "text-foreground font-semibold border-b-2 border-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`;
              if (!p.href) {
                return (
                  <button key={p.id} onClick={() => handlePersonaClick(p.id)} className={cls}>
                    {p.shortLabel}
                  </button>
                );
              }
              return (
                <Link
                  key={p.id}
                  to={p.href}
                  onClick={() => onPersonaChange(null)}
                  aria-current={effectiveActivePersona === p.id ? "page" : undefined}
                  className={cls}
                >
                  {p.shortLabel}
                </Link>
              );
            })}
          </nav>
          <nav aria-label={t("a11y.metaNavigation")} className="flex items-center gap-5 text-muted-foreground text-xs">
            {visibleMeta.map((item) => {
              const hasPath = item.href !== "#";
              const isExact = hasPath && location.pathname === item.href;
              const isSubPath =
                hasPath &&
                item.isServiceportal &&
                location.pathname.startsWith(item.href + "/");
              const isActive = isExact || isSubPath;
              return (
                <Link
                  key={item.key}
                  to={item.href}
                  onClick={() => onPersonaChange(null)}
                  aria-current={isExact ? "page" : isSubPath ? "true" : undefined}
                  className={`transition-colors ${
                    isActive
                      ? "text-foreground font-semibold underline underline-offset-4"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <LanguageSwitcher className="ml-2" />
          </nav>
        </div>

        {/* Mobile */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between gap-2 px-4">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex-1 flex items-center justify-between py-2.5 text-xs text-muted-foreground"
            >
              <span>
                {effectiveActivePersona
                  ? t("meta.personaActive", { persona: activePersonaLongLabel })
                  : t("meta.personaPromptShort")}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            <LanguageSwitcher />
          </div>
          {isOpen && (
            <div className="px-4 pb-3">
              <div className="grid grid-cols-2 gap-1">
                {visiblePersonas.map((p) => {
                  const cls = `text-left px-3 py-2 text-xs transition-all ${
                    effectiveActivePersona === p.id
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`;
                  if (!p.href) {
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          handlePersonaClick(p.id);
                          setIsOpen(false);
                        }}
                        className={cls}
                      >
                        {p.label}
                      </button>
                    );
                  }
                  return (
                    <Link
                      key={p.id}
                      to={p.href}
                      onClick={() => {
                        onPersonaChange(null);
                        setIsOpen(false);
                      }}
                      aria-current={effectiveActivePersona === p.id ? "page" : undefined}
                      className={cls}
                    >
                      {p.label}
                    </Link>
                  );
                })}
              </div>
              <nav
                aria-label={t("a11y.metaNavigation")}
                className="mt-3 pt-3 border-t border-border flex flex-wrap gap-x-5 gap-y-2 text-xs"
              >
                {visibleMeta.map((item) => {
                  const hasPath = item.href !== "#";
                  const isExact = hasPath && location.pathname === item.href;
                  const isSubPath =
                    hasPath &&
                    item.isServiceportal &&
                    location.pathname.startsWith(item.href + "/");
                  const isActive = isExact || isSubPath;
                  return (
                    <Link
                      key={item.key}
                      to={item.href}
                      onClick={() => {
                        onPersonaChange(null);
                        setIsOpen(false);
                      }}
                      aria-current={isExact ? "page" : isSubPath ? "true" : undefined}
                      className={`transition-colors ${
                        isActive
                          ? "text-foreground font-semibold underline underline-offset-4"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetaNavigation;
