import { Navigate, Route } from "react-router-dom";
import TuerenTorePage from "./pages/TuerenTorePage";
import MobilerZutrittPage from "./pages/MobilerZutrittPage";
import FahrstuhlsteuerungPage from "./pages/FahrstuhlsteuerungPage";
import ZufahrtenParkplaetzePage from "./pages/ZufahrtenParkplaetzePage";
import ElektronischeDrueckergarniturPage from "./pages/ElektronischeDrueckergarniturPage";
import ElektronischerKnaufzylinderPage from "./pages/ElektronischerKnaufzylinderPage";
import BcmHandsenderPage from "./pages/BcmHandsenderPage";
import FunkvernetzteOfflineLeserPage from "./pages/FunkvernetzteOfflineLeserPage";
import BcmOnlineLeserPage from "./pages/BcmOnlineLeserPage";
import VorhaengeschlossPage from "./pages/VorhaengeschlossPage";
import BiometriePage from "./pages/BiometriePage";
// Etappe B2: 9 neue Produkt-Unterseiten, gerendert ausschließlich aus dem CMS.
import CmsProductSolutionShell from "@/features/cms/components/CmsProductSolutionShell";
// Etappe zutrittskontrolle-root-cmsonly-1: Root-Seite läuft jetzt vollständig
// DB-first über CmsOnlyShell, damit Reihenfolge/Sichtbarkeit aus dem Admin
// 1:1 durchschlagen (Spiegel-Regel).
import CmsOnlyShell from "@/features/cms/components/CmsOnlyShell";

export const zutrittskontrolleRoutes = (
  <>
    <Route path="/zutrittskontrolle" element={<CmsOnlyShell pageKey="zutrittskontrolle.root" />} />
    <Route path="/zutrittskontrolle/tueren-tore" element={<TuerenTorePage />} />
    <Route path="/zutrittskontrolle/mobiler-zutritt" element={<MobilerZutrittPage />} />
    <Route path="/zutrittskontrolle/fahrstuhlsteuerung" element={<FahrstuhlsteuerungPage />} />
    <Route path="/zutrittskontrolle/zufahrten-parkplaetze" element={<ZufahrtenParkplaetzePage />} />
    <Route path="/zutrittskontrolle/elektronische-drueckergarnitur" element={<ElektronischeDrueckergarniturPage />} />
    <Route path="/zutrittskontrolle/elektronischer-knaufzylinder" element={<ElektronischerKnaufzylinderPage />} />
    <Route path="/zutrittskontrolle/bcm-handsender" element={<BcmHandsenderPage />} />
    <Route path="/zutrittskontrolle/funkvernetzte-offline-leser" element={<FunkvernetzteOfflineLeserPage />} />
    <Route path="/zutrittskontrolle/bcm-online-leser" element={<BcmOnlineLeserPage />} />
    <Route path="/zutrittskontrolle/vorhaengeschloss" element={<VorhaengeschlossPage />} />
    <Route path="/zutrittskontrolle/biometrie" element={<BiometriePage />} />
    {/* Etappe B2 – CMS-only Produktseiten (Inhalt vollständig im Admin pflegbar). */}
    <Route path="/zutrittskontrolle/aussenstation-adx5" element={<CmsProductSolutionShell pageKey="zutrittskontrolle.aussenstation-adx5" />} />
    <Route path="/zutrittskontrolle/bcm-door-app" element={<CmsProductSolutionShell pageKey="zutrittskontrolle.bcm-door-app" />} />
    <Route path="/zutrittskontrolle/bcm-mini-cloud" element={<CmsProductSolutionShell pageKey="zutrittskontrolle.bcm-mini-cloud" />} />
    <Route path="/zutrittskontrolle/digitale-briefkasten" element={<CmsProductSolutionShell pageKey="zutrittskontrolle.digitale-briefkasten" />} />
    <Route path="/zutrittskontrolle/gsm-gateway" element={<CmsProductSolutionShell pageKey="zutrittskontrolle.gsm-gateway" />} />
    <Route path="/zutrittskontrolle/schrankschloss" element={<CmsProductSolutionShell pageKey="zutrittskontrolle.schrankschloss" />} />
    <Route path="/zutrittskontrolle/serverschrankschloss" element={<CmsProductSolutionShell pageKey="zutrittskontrolle.serverschrankschloss" />} />
    <Route path="/zutrittskontrolle/zufahrtskontrolle" element={<CmsProductSolutionShell pageKey="zutrittskontrolle.zufahrtskontrolle" />} />
    <Route path="/zutrittskontrolle/zutrittssoftware" element={<CmsProductSolutionShell pageKey="zutrittskontrolle.zutrittssoftware" />} />
    {/* Legacy-Slug-Aliase aus Content_V1 — leiten dauerhaft auf die kanonischen CMS-Slugs um.
        Nur Weiterleitungen, keine eigenen Seiten, damit externe Bestandslinks erreichbar bleiben. */}
    <Route path="/zutrittskontrolle/bcm-minicloud" element={<Navigate to="/zutrittskontrolle/bcm-mini-cloud" replace />} />
    <Route path="/zutrittskontrolle/bcm-doorapp" element={<Navigate to="/zutrittskontrolle/bcm-door-app" replace />} />
    <Route path="/zutrittskontrolle/digitale-briefkastenanlage" element={<Navigate to="/zutrittskontrolle/digitale-briefkasten" replace />} />
    <Route path="/zutrittskontrolle/elektronisches-schrankschloss" element={<Navigate to="/zutrittskontrolle/schrankschloss" replace />} />
    <Route path="/zutrittskontrolle/elektronisches-serverschrankschloss" element={<Navigate to="/zutrittskontrolle/serverschrankschloss" replace />} />
  </>
);
