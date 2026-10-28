import { Route } from "react-router-dom";
import ImpressumPage from "./pages/ImpressumPage";
import DatenschutzPage from "./pages/DatenschutzPage";
import AgbPage from "./pages/AgbPage";
import SitemapPage from "./pages/SitemapPage";
import LegalSimplePage from "./pages/LegalSimplePage";

export const legalRoutes = (
  <>
    <Route path="/impressum" element={<ImpressumPage />} />
    <Route path="/datenschutz" element={<DatenschutzPage />} />
    <Route path="/agb" element={<AgbPage />} />
    <Route path="/sitemap" element={<SitemapPage />} />
    <Route
      path="/datenschutzhinweise-snipdoo-ip"
      element={
        <LegalSimplePage
          pageKey="legal.datenschutzSnipdoo"
          fallbackHeadline="Datenschutzhinweise snipdoo® IP"
        />
      }
    />
    <Route
      path="/garantiebedingungen"
      element={
        <LegalSimplePage pageKey="legal.garantiebedingungen" fallbackHeadline="Garantiebedingungen" />
      }
    />
    <Route
      path="/einwilligung"
      element={<LegalSimplePage pageKey="legal.einwilligung" fallbackHeadline="Einwilligung" />}
    />
    <Route
      path="/agb-einkauf"
      element={<LegalSimplePage pageKey="legal.agbEinkauf" fallbackHeadline="AGB Einkauf" />}
    />
  </>
);
