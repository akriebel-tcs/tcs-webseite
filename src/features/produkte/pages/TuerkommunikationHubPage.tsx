/**
 * Türkommunikation — Online-Produktkatalog (Hub).
 *
 * Datenquellen (Hybrid):
 *  - Liste der Kategorien, Slugs, Reihenfolge und passende Filter:
 *    `api_v1_navigation` aus der Produkt-DB (gesetzte Wahrheit).
 *  - Anzeigename, Beschreibung, Thumbnail pro Karte:
 *    CMS-Sections `filter-grid.<nav_slug>` (Überlagerung, optional).
 *
 * Fallback: Wenn die Produkt-DB nicht erreichbar ist, werden 0 Karten
 * gerendert (kein Crash, kein hartkodierter Fallback).
 *
 * Aufbau:
 *  1. AutoBreadcrumb (Start › Produkte › Türkommunikation).
 *  2. Headline „Produktkatalog" + kurze Subline.
 *  3. 8 Kategorie-Karten. Klick = Auswahl + Anzeige der zugehörigen
 *     Filter und Produkte unten (`CatalogMvp`).
 *  4. CatalogMvp wird ausgeblendet, solange keine Karte gewählt ist.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AutoBreadcrumb from "@/components/AutoBreadcrumb";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import CatalogMvp from "@/features/service/catalog/components/CatalogMvp";
import { pickProductLocalized } from "@/features/service/catalog/lib/productLocale";
import {
  getCatalogNavigation,
  type CatalogNavGroup,
} from "@/features/service/catalog/api/catalog";
import {
  useCmsPageContent,
  normalizeLocale,
} from "@/features/cms/hooks/useCmsPageContent";
import { CmsRenderRegistryProvider } from "@/features/cms/components/CmsRenderRegistry";
import CmsTailFaq from "@/features/cms/components/CmsTailFaq";
import CmsTailCta from "@/features/cms/components/CmsTailCta";

const PAGE_KEY = "produkte.tuerkommunikation";

const TuerkommunikationHubPage = () => {
  const { i18n, t } = useTranslation("service");
  const cms = useCmsPageContent(PAGE_KEY);
  const loc = normalizeLocale(i18n.language);
  const [searchParams, setSearchParams] = useSearchParams();

  const [navGroups, setNavGroups] = useState<CatalogNavGroup[]>([]);
  const [navError, setNavError] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    searchParams.get("kategorie"),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const groups = await getCatalogNavigation();
        if (cancelled) return;
        setNavGroups(groups);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === "object" && err !== null
              ? (err as { message?: string; details?: string; hint?: string })
                  .message ??
                JSON.stringify(err)
              : String(err);
        // eslint-disable-next-line no-console
        console.error("[catalog-nav] load failed:", err);
        setNavError(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // URL ⇄ State spiegeln (Deep-Links, Browser-Back).
  useEffect(() => {
    const urlVal = searchParams.get("kategorie");
    const current = selectedSlug ?? "";
    if (urlVal === (current || null)) return;
    const next = new URLSearchParams(searchParams);
    if (current) next.set("kategorie", current);
    else next.delete("kategorie");
    setSearchParams(next, { replace: true });
  }, [selectedSlug, searchParams, setSearchParams]);

  const selectedNav = useMemo(
    () => navGroups.find((g) => g.nav_slug === selectedSlug) ?? null,
    [navGroups, selectedSlug],
  );

  // Etappe 2 — `catalog-category-order-cms-override-1`:
  // Wenn im CMS-Light für eine Kategorie-Section (`filter-grid.<slug>`)
  // ein `sort_order` gepflegt ist, gewinnt diese Reihenfolge gegenüber
  // der Default-Sortierung aus der Produkt-DB. Sections, die im CMS
  // explizit deaktiviert (`is_active = false`) sind, kommen hier gar
  // nicht erst an, weil `useCmsPageContent` schon `is_active`-filtert.
  const cmsSortByNavSlug = useMemo(() => {
    const map = new Map<string, number>();
    for (const sec of cms.sections) {
      const prefix = "filter-grid.";
      if (sec.section_key.startsWith(prefix)) {
        map.set(sec.section_key.slice(prefix.length), sec.sort_order);
      }
    }
    return map;
  }, [cms.sections]);

  const orderedNavGroups = useMemo(() => {
    if (cmsSortByNavSlug.size === 0) return navGroups;
    return [...navGroups].sort((a, b) => {
      const sa = cmsSortByNavSlug.get(a.nav_slug);
      const sb = cmsSortByNavSlug.get(b.nav_slug);
      // Beide ohne CMS-Override → Produkt-DB-Reihenfolge beibehalten.
      if (sa === undefined && sb === undefined) return 0;
      // Mit Override gewinnt gegen ohne.
      if (sa === undefined) return 1;
      if (sb === undefined) return -1;
      return sa - sb;
    });
  }, [navGroups, cmsSortByNavSlug]);

  // Karten = nav_slug + CMS-Overlay (Label / Beschreibung / Thumbnail).
  const cards = useMemo(() => {
    return orderedNavGroups.map((g) => {
      const sectionKey = `filter-grid.${g.nav_slug}`;
      // Kategorielabel aus der Produktbasis entlang der Kette
      // angefordert → en → de (kein hartes de/en mehr).
      const labelFallback =
        pickProductLocalized(
          g as unknown as Record<string, unknown>,
          "label",
          loc,
        ) ?? "";
      return {
        slug: g.nav_slug,
        label: cms.text(sectionKey, "title", loc, labelFallback),
        description: cms.text(sectionKey, "description", loc, ""),
        thumbnail: cms.asset(sectionKey, "thumbnail", ""),
        thumbnailAlt: cms.assetAlt(sectionKey, "thumbnail", loc, labelFallback),
      };
    });
  }, [orderedNavGroups, cms, loc]);

  /**
   * Untertitel = dieselbe Kategoriebezeichnung wie auf der Karte.
   * Vorher wurde hier direkt die Produktbasis gelesen (nur `label_de`/
   * `label_en`), wodurch bei PL/NL das englische Label erschien, obwohl im
   * CMS-Light eine übersetzte Bezeichnung vorliegt.
   */
  const selectedLabel = useMemo(() => {
    if (!selectedSlug) return "";
    return cards.find((c) => c.slug === selectedSlug)?.label ?? "";
  }, [cards, selectedSlug]);


  return (
    <CmsRenderRegistryProvider>
      <AutoBreadcrumb fallbackLabel="" />
      <section className="py-12 lg:py-16 bg-background">
        <div className="container mx-auto">
          <header className="mb-8 max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-heading font-normal text-foreground mb-2">
              {t("katalog.target.headline")}
            </h1>
            <p className="text-muted-foreground">
              {selectedNav
                ? selectedLabel
                : t("katalog.target.chooseCategory")}
            </p>

          </header>

          {navError ? (
            <p className="text-sm text-destructive mb-4" role="alert">
              {navError}
            </p>
          ) : null}

          {cards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6 items-start">
              {cards.map((c) => {
                const isActive = selectedSlug === c.slug;
                const thumb = c.thumbnail || "/placeholder.svg";
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() =>
                      setSelectedSlug(isActive ? null : c.slug)
                    }
                    className={
                      "group flex h-24 lg:h-28 text-left border bg-card overflow-hidden transition-colors " +
                      (isActive
                        ? "border-foreground ring-1 ring-foreground"
                        : "border-border hover:border-accent/60 hover:bg-warm/40")
                    }
                    aria-pressed={isActive}
                  >
                    <img
                      src={thumb}
                      alt={c.thumbnailAlt}
                      loading="lazy"
                      className="self-stretch w-20 sm:w-24 lg:w-28 object-cover flex-shrink-0"
                    />
                    <span className="flex-1 min-w-0 p-3 lg:p-4 font-heading text-sm md:text-base text-foreground leading-tight group-hover:text-accent transition-colors">
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {selectedNav ? (
            <CatalogMvp
              selectedNav={selectedNav}
              onClear={() => setSelectedSlug(null)}
              cmsPageKey={PAGE_KEY}
            />
          ) : null}
        </div>
      </section>
      <CmsTailFaq pageKey={PAGE_KEY} />
      <CmsTailCta pageKey={PAGE_KEY} />
      <CmsSourceBadge
        pageKey={PAGE_KEY}
        source={cms.hasDbContent ? "db" : "fallback"}
        sectionCount={cards.length}
      />
    </CmsRenderRegistryProvider>
  );
};

export default TuerkommunikationHubPage;
