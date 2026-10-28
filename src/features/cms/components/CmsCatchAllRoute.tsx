/**
 * CmsCatchAllRoute — Generische Route für CMS-Seiten ohne fest codierte
 * Route in `App.tsx` / `appRoutes`.
 *
 * Ablauf:
 *   1. Liest `location.pathname` (z. B. `/service/neuer-katalog`).
 *   2. Fragt `cms_pages` nach einer Seite mit passendem `route_path`.
 *      Dank RLS sind nur `status='published'` + `is_active=true` sichtbar.
 *   3. Trifft eine Seite zu → wird über `CmsOnlyShell` gerendert
 *      (Hero + Sections kommen 1:1 aus der DB, Spiegel-Regel).
 *   4. Trifft keine Seite zu → `NotFoundPage` (404).
 *
 * Damit gilt: Eine neue Seite, die im /admin angelegt, aktiviert und
 * veröffentlicht wird, ist sofort unter ihrem `route_path` öffentlich
 * erreichbar — ohne Code-Änderung, ohne neuen Prompt.
 *
 * Hinweis: Diese Route wird in `App.tsx` als LETZTE Route eingehängt,
 * damit sie nur greift, wenn keine der fest codierten Routen passt.
 */
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CmsOnlyShell from "@/features/cms/components/CmsOnlyShell";
import NotFoundPage from "@/app/pages/NotFoundPage";

type Result =
  | { state: "loading" }
  | { state: "found"; pageKey: string }
  | { state: "not_found" };

const CmsCatchAllRoute = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [result, setResult] = useState<Result>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    setResult({ state: "loading" });

    (async () => {
      try {
        const mod = await import("@/lib/cmsSupabase/client");
        if (!mod.isCmsSupabaseConfigured()) {
          if (!cancelled) setResult({ state: "not_found" });
          return;
        }
        const sb = mod.getCmsSupabaseClient();

        // Normalisierung: trailing slash wegnehmen (außer Root).
        const path = location.pathname.replace(/\/+$/, "") || "/";

        const { data, error } = await sb
          .from("cms_pages")
          .select("page_key, route_path, status, is_active")
          .eq("route_path", path)
          .eq("status", "published")
          .eq("is_active", true)
          .maybeSingle();

        if (cancelled) return;
        if (error || !data) {
          setResult({ state: "not_found" });
          return;
        }
        setResult({ state: "found", pageKey: data.page_key });
      } catch {
        if (!cancelled) setResult({ state: "not_found" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (result.state === "loading") {
    // Dezenter Lade-Zustand — keine Layout-Verschiebung.
    return (
      <div
        aria-busy="true"
        aria-live="polite"
        className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground"
      >
        {t("common:ui.loadingPage")}
      </div>
    );
  }

  if (result.state === "not_found") {
    return <NotFoundPage />;
  }

  return <CmsOnlyShell pageKey={result.pageKey} />;
};

export default CmsCatchAllRoute;
