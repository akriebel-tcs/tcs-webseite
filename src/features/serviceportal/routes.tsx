import { Route } from "react-router-dom";
import ServiceportalPage from "./pages/ServiceportalPage";
import PasswortVergessenPage from "./pages/PasswortVergessenPage";
import RegistrierenPage from "./pages/RegistrierenPage";

export const serviceportalRoutes = (
  <>
    <Route path="/serviceportal" element={<ServiceportalPage />} />
    <Route path="/serviceportal/passwort-vergessen" element={<PasswortVergessenPage />} />
    <Route path="/serviceportal/registrieren" element={<RegistrierenPage />} />
  </>
);
