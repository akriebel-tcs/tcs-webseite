import { Navigate, Route, useParams } from "react-router-dom";
import ServicePage from "./pages/ServicePage";
import PlanenKonfigurierenPage from "./pages/PlanenKonfigurierenPage";
import DownloadsPage from "./pages/DownloadsPage";
import TechnischerSupportPage from "./pages/TechnischerSupportPage";
import ErsatzteilePage from "./pages/ErsatzteilePage";
import CmsOnlyShell from "@/features/cms/components/CmsOnlyShell";

/**
 * Etappe nav-produkte-service-split / C:
 *  - Alte Online-Produktkatalog-Routen leiten auf `/produkte/tuerkommunikation`.
 *  - Sechs neue Service-Untermenüs als schlanke CMS-Seiten.
 *  - Bestehende Service-Slugs (Planen/Downloads/Support/Ersatzteile) bleiben
 *    erreichbar, sind aber nicht mehr im Hauptmenü-Dropdown sichtbar.
 */
export const serviceRoutes = (
  <>
    <Route path="/service" element={<ServicePage />} />

    {/* Legacy-Redirects: alter Online-Produktkatalog → neue Türkommunikations-URL */}
    <Route
      path="/service/online-produktkatalog"
      element={<Navigate to="/produkte/tuerkommunikation" replace />}
    />
    <Route
      path="/service/online-produktkatalog/:pdpSlug"
      element={<LegacyPdpRedirect />}
    />

    {/* Bestehende Service-Detailseiten (Routen bleiben, Dropdown verweist nicht mehr drauf) */}
    <Route path="/planen-konfigurieren" element={<PlanenKonfigurierenPage />} />
    <Route path="/downloads" element={<DownloadsPage />} />
    <Route path="/technischer-support" element={<TechnischerSupportPage />} />
    <Route path="/ersatzteile" element={<ErsatzteilePage />} />

    {/* Neue 6er-Service-Untermenüs (CMS-Skeletons) */}
    <Route
      path="/service/installation-wartung"
      element={<CmsOnlyShell pageKey="service.installation-wartung" />}
    />
    <Route
      path="/service/beratung-schulung"
      element={<CmsOnlyShell pageKey="service.beratung-schulung" />}
    />
    <Route
      path="/service/garantie-sicherheit"
      element={<CmsOnlyShell pageKey="service.garantie-sicherheit" />}
    />
    <Route
      path="/service/konfiguratoren"
      element={<CmsOnlyShell pageKey="service.konfiguratoren" />}
    />
    <Route
      path="/service/planungshilfen"
      element={<CmsOnlyShell pageKey="service.planungshilfen" />}
    />
    <Route
      path="/service/datenblaetter-software"
      element={<CmsOnlyShell pageKey="service.datenblaetter-software" />}
    />
  </>
);

/** Mapped `/service/online-produktkatalog/:pdpSlug` → `/produkte/tuerkommunikation/:pdpSlug`. */
function LegacyPdpRedirect() {
  const { pdpSlug } = useParams<{ pdpSlug: string }>();
  return (
    <Navigate to={`/produkte/tuerkommunikation/${pdpSlug ?? ""}`} replace />
  );
}
