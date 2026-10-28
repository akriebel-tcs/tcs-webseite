import { Route } from "react-router-dom";
import GebaeudemanagementPage from "./pages/GebaeudemanagementPage";
import SchraenkeBehaelterPage from "./pages/SchraenkeBehaelterPage";
import DigitaleNamensanzeigePage from "./pages/DigitaleNamensanzeigePage";
import ReservierenBuchenPage from "./pages/ReservierenBuchenPage";
import DigitalSignagePage from "./pages/DigitalSignagePage";
import AlarmanlagenkopplungPage from "./pages/AlarmanlagenkopplungPage";
// Etappe B2: 2 neue Produkt-Unterseiten, gerendert ausschließlich aus dem CMS.
import CmsProductSolutionShell from "@/features/cms/components/CmsProductSolutionShell";

export const gebaeudemanagementRoutes = (
  <>
    <Route path="/gebaeudemanagement" element={<GebaeudemanagementPage />} />
    <Route path="/gebaeudemanagement/schraenke-behaelter" element={<SchraenkeBehaelterPage />} />
    <Route path="/gebaeudemanagement/digitale-namensanzeige" element={<DigitaleNamensanzeigePage />} />
    <Route path="/gebaeudemanagement/reservieren-buchen" element={<ReservierenBuchenPage />} />
    <Route path="/gebaeudemanagement/digital-signage" element={<DigitalSignagePage />} />
    {/* Etappe 14e-1: eigene Platzhalterseite für Alarmanlagenkopplung,
        damit der Menüpunkt nicht mehr auf den Domain-Root verweist. */}
    <Route path="/gebaeudemanagement/alarmanlagenkopplung" element={<AlarmanlagenkopplungPage />} />
    {/* Etappe B2 – CMS-only Produktseiten. */}
    <Route path="/gebaeudemanagement/bcm-buchungssystem" element={<CmsProductSolutionShell pageKey="gebaeudemanagement.bcm-buchungssystem" />} />
    <Route path="/gebaeudemanagement/bcm-infoboard" element={<CmsProductSolutionShell pageKey="gebaeudemanagement.bcm-infoboard" />} />
  </>
);
