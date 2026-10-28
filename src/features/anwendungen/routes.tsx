import { Navigate, Route } from "react-router-dom";
import GenericCmsPage from "@/features/cms/components/GenericCmsPage";
import AnwendungenPage from "./pages/AnwendungenPage";
import ObjektloesungenPage from "./pages/ObjektloesungenPage";
import BildungseinrichtungenPage from "./pages/BildungseinrichtungenPage";
import KindertagesstaettenPage from "./pages/KindertagesstaettenPage";
import SchulePage from "./pages/SchulePage";
import WohnheimPage from "./pages/WohnheimPage";
import MehrfamilienhausPage from "./pages/MehrfamilienhausPage";
import GrossanlagePage from "./pages/GrossanlagePage";
import SanierungPage from "./pages/SanierungPage";
import PflegePage from "./pages/PflegePage";
import KlinikPage from "./pages/KlinikPage";
import BehoerdePage from "./pages/BehoerdePage";
import FeuerwehrPage from "./pages/FeuerwehrPage";
import SchwimmbadPage from "./pages/SchwimmbadPage";
import ConciergePage from "./pages/ConciergePage";
import InterneKommunikationPage from "./pages/InterneKommunikationPage";
import DigitaleNamensverwaltungPage from "./pages/DigitaleNamensverwaltungPage";
import FeuerwehrdurchsagePage from "./pages/FeuerwehrdurchsagePage";
import BidirektionaleVideoPage from "./pages/BidirektionaleVideoPage";

import ZutrittskontrolleBCMPage from "./pages/ZutrittskontrolleBCMPage";
import WohnbauPage from "./pages/WohnbauPage";
import GesundheitseinrichtungenPage from "./pages/GesundheitseinrichtungenPage";
import OeffentlicheHandPage from "./pages/OeffentlicheHandPage";
import ReferenzprojektePage from "./pages/ReferenzprojektePage";
import ReferenzprojektDetailPage from "./pages/ReferenzprojektDetailPage";

export const anwendungenRoutes = (
  <>
    <Route path="/anwendungen" element={<AnwendungenPage />} />
    <Route path="/anwendungen/objektloesungen" element={<ObjektloesungenPage />} />
    {/* Legacy-Fallback (Etappe 14e-7): bisheriger Top-Level-Slug bleibt erreichbar, nicht aktiv verlinken. */}
    <Route path="/objektloesungen" element={<ObjektloesungenPage />} />
    <Route path="/anwendungen/bildungseinrichtungen" element={<BildungseinrichtungenPage />} />
    {/* Legacy-Fallback (Etappe 14e-6): bisheriger Top-Level-Slug bleibt erreichbar, nicht aktiv verlinken. */}
    <Route path="/bildungseinrichtungen" element={<BildungseinrichtungenPage />} />
    <Route path="/anwendungen/kindertagesstaetten" element={<KindertagesstaettenPage />} />
    <Route path="/anwendungen/schule" element={<SchulePage />} />
    <Route path="/anwendungen/wohnheim" element={<WohnheimPage />} />
    {/* T0 (04.09.2026): P-061 läuft vollständig DB-first über den generischen
        Renderer. URL und Navigationsknoten (`an.wohnbau.efh`) bleiben unverändert. */}
    <Route path="/anwendungen/einfamilienhaus" element={<GenericCmsPage pageKey="anwendungen.einfamilienhaus" />} />
    <Route path="/anwendungen/mehrfamilienhaus" element={<MehrfamilienhausPage />} />
    <Route path="/anwendungen/grossanlage" element={<GrossanlagePage />} />
    <Route path="/anwendungen/sanierung" element={<SanierungPage />} />
    <Route path="/anwendungen/pflege" element={<PflegePage />} />
    <Route path="/anwendungen/klinik" element={<KlinikPage />} />
    <Route path="/anwendungen/behoerde" element={<BehoerdePage />} />
    <Route path="/anwendungen/feuerwehr" element={<FeuerwehrPage />} />
    <Route path="/anwendungen/schwimmbad" element={<SchwimmbadPage />} />
    <Route path="/anwendungen/concierge" element={<ConciergePage />} />
    <Route path="/anwendungen/interne-kommunikation" element={<InterneKommunikationPage />} />
    <Route path="/anwendungen/digitale-namensverwaltung" element={<DigitaleNamensverwaltungPage />} />
    {/* Aktive Route (Redaktion 2026-08-13): Seite heißt „Bewohnerinformation im Sonderfall"
        und hängt unter Gebäudekommunikation / Systemlösungen. */}
    <Route path="/gebaeudekommunikation/systemloesungen/bewohnerinformation-im-sonderfall" element={<FeuerwehrdurchsagePage />} />
    {/* Legacy-Fallback: alte URL bleibt erreichbar, damit Bestandslinks nicht brechen. Nicht aktiv verlinken. */}
    <Route path="/anwendungen/feuerwehrdurchsage" element={<FeuerwehrdurchsagePage />} />
    <Route path="/anwendungen/bidirektionale-video" element={<BidirektionaleVideoPage />} />
    {/* Führende Seite ist N-133 / P-236 (`mobile-tk-preview.root`) unter
        /gebaeudekommunikation/mobile-tuerkommunikation. Die alte URL bleibt als
        dauerhafte Weiterleitung erhalten, damit Bestandslinks nicht brechen. */}
    <Route
      path="/anwendungen/mobile-tuerkommunikation"
      element={<Navigate to="/gebaeudekommunikation/mobile-tuerkommunikation" replace />}
    />
    <Route path="/anwendungen/zutrittskontrolle-bcm" element={<ZutrittskontrolleBCMPage />} />
    <Route path="/anwendungen/wohnbau" element={<WohnbauPage />} />
    <Route path="/anwendungen/gesundheitseinrichtungen" element={<GesundheitseinrichtungenPage />} />
    <Route path="/anwendungen/oeffentliche-hand" element={<OeffentlicheHandPage />} />
    <Route path="/anwendungen/referenzprojekte" element={<ReferenzprojektePage />} />
    <Route path="/anwendungen/referenzprojekte/:slug" element={<ReferenzprojektDetailPage />} />
  </>
);
