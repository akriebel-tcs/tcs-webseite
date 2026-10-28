import { Route } from "react-router-dom";
import TuerkommunikationPage from "./pages/TuerkommunikationPage";
import TuersprechanlagenPage from "./pages/TuersprechanlagenPage";
import BriefkastenanlagenPage from "./pages/BriefkastenanlagenPage";
import GrossanlagenPage from "./pages/GrossanlagenPage";
import SystemloesungenPage from "./pages/SystemloesungenPage";
import SnipdooIpPage from "./pages/SnipdooIpPage";

export const gebaeudekommunikationRoutes = (
  <>
    {/* Aktive Root-Route (Etappe 14d-4): saubere URL für Hauptbereich Gebäudekommunikation. */}
    <Route path="/gebaeudekommunikation" element={<TuerkommunikationPage />} />
    {/* Legacy-Fallback (Etappe 14d-4): bisherige Root-URL bleibt erhalten, damit Bestandslinks nicht brechen. */}
    <Route path="/tuerkommunikation" element={<TuerkommunikationPage />} />
    {/* Aktive Unterseiten-Routen (Etappe 14d-5): fachlich unter /gebaeudekommunikation. */}
    <Route path="/gebaeudekommunikation/tuersprechanlagen" element={<TuersprechanlagenPage />} />
    <Route path="/gebaeudekommunikation/briefkastenanlagen" element={<BriefkastenanlagenPage />} />
    <Route path="/gebaeudekommunikation/grossanlagen" element={<GrossanlagenPage />} />
    <Route path="/gebaeudekommunikation/systemloesungen" element={<SystemloesungenPage />} />
    {/* Legacy-Fallback (Etappe 14d-5): bisherige flache URLs bleiben erhalten, damit Bestandslinks nicht brechen. */}
    <Route path="/tuersprechanlagen" element={<TuersprechanlagenPage />} />
    <Route path="/briefkastenanlagen" element={<BriefkastenanlagenPage />} />
    <Route path="/grossanlagen" element={<GrossanlagenPage />} />
    <Route path="/systemloesungen" element={<SystemloesungenPage />} />
    {/* Aktive URL für snipdoo IP (Etappe 14d-3): fachlich unter Gebäudekommunikation. */}
    <Route path="/gebaeudekommunikation/snipdoo-ip" element={<SnipdooIpPage />} />
    {/* Fallback aus Etappe 14d-2: bleibt erhalten, damit Bestandslinks nicht brechen. */}
    <Route path="/snipdoo-ip" element={<SnipdooIpPage />} />
    {/* Legacy-Fallback: alte URL bleibt erhalten, damit Bestandslinks nicht brechen. */}
    <Route path="/systemtechnik/snipdoo-ip" element={<SnipdooIpPage />} />
  </>
);
