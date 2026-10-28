import { Route } from "react-router-dom";
import SignagePage from "./pages/SignagePage";
import BeschilderungPage from "./pages/BeschilderungPage";

export const signageRoutes = (
  <>
    {/* Legacy/Fallback (Etappe 14e-2c): bisherige Signage-Einstiegsroute bleibt erhalten. */}
    <Route path="/signage" element={<SignagePage />} />
    {/* Aktive Route (Etappe 14e-2c): Beschilderung & Wayfinding fachlich unter Gebäudekommunikation. */}
    <Route path="/gebaeudekommunikation/beschilderung" element={<BeschilderungPage />} />
    {/* Legacy-Fallback (Etappe 14e-2c): bisherige flache URL bleibt erhalten. */}
    <Route path="/beschilderung" element={<BeschilderungPage />} />
  </>
);
