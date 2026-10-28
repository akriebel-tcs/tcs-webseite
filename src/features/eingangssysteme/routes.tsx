import { Route } from "react-router-dom";
import EntrySystemPage from "./pages/EntrySystemPage";
import EntryDesignPage from "./pages/EntryDesignPage";
import EntryFunktionalitaetPage from "./pages/EntryFunktionalitaetPage";
import EntryMaterialPage from "./pages/EntryMaterialPage";
import EntryIntegrationsformenPage from "./pages/EntryIntegrationsformenPage";
import EntryReferenzenPage from "./pages/EntryReferenzenPage";
import EntryStandardsPage from "./pages/EntryStandardsPage";
import EntryBeratungPage from "./pages/EntryBeratungPage";

export const eingangssystemeRoutes = (
  <>
    <Route path="/entry-system" element={<EntrySystemPage />} />
    <Route path="/entry-system/design" element={<EntryDesignPage />} />
    <Route path="/entry-system/funktionalitaet" element={<EntryFunktionalitaetPage />} />
    <Route path="/entry-system/material" element={<EntryMaterialPage />} />
    <Route path="/entry-system/integrationsformen" element={<EntryIntegrationsformenPage />} />
    <Route path="/entry-system/referenzen" element={<EntryReferenzenPage />} />
    <Route path="/entry-system/standards" element={<EntryStandardsPage />} />
    <Route path="/entry-system/beratung" element={<EntryBeratungPage />} />
  </>
);
