import { Route } from "react-router-dom";
import AkademiePage from "./pages/AkademiePage";

export const wissenRoutes = (
  <>
    <Route path="/akademie" element={<AkademiePage />} />
  </>
);
