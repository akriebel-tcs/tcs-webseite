import { Route } from "react-router-dom";
import KontaktPage from "./pages/KontaktPage";
import KontaktBcmPage from "./pages/KontaktBcmPage";

export const kontaktRoutes = (
  <>
    <Route path="/kontakt" element={<KontaktPage />} />
    <Route path="/kontakt/bcm" element={<KontaktBcmPage />} />
  </>
);
