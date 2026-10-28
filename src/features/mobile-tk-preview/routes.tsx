/**
 * Etappe B2 – mobile-tk-preview Vorschauseite (CMS-only).
 * Inhalt vollständig im /admin pflegbar (page_key = mobile-tk-preview.root).
 */
import { Navigate, Route } from "react-router-dom";
import CmsOnlyShell from "@/features/cms/components/CmsOnlyShell";

export const mobileTkPreviewRoutes = (
  <>
    <Route
      path="/gebaeudekommunikation/mobile-tuerkommunikation"
      element={<CmsOnlyShell pageKey="mobile-tk-preview.root" />}
    />
    {/* Redirect alte URL — bleibt für Bestandslinks aktiv */}
    <Route
      path="/mobile-tk-preview"
      element={<Navigate to="/gebaeudekommunikation/mobile-tuerkommunikation" replace />}
    />
  </>
);
