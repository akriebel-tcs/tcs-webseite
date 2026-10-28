import { Navigate, Route } from "react-router-dom";
import { personaRoutes } from "@/navigation/personaRoutes";
import BauherrenContent from "@/features/personas/bauherr/components/BauherrenContent";
import ArchitektenContent from "@/features/personas/architekt/components/ArchitektenContent";
import WohnungswirtschaftContent from "@/features/personas/wohnungswirtschaft/components/WohnungswirtschaftContent";
import FachplanerContent from "@/features/personas/fachplaner/components/FachplanerContent";
import HandwerkContent from "@/features/personas/handwerk/components/HandwerkContent";
import FachhandelContent from "@/features/personas/fachhandel/components/FachhandelContent";

/**
 * Eigene Seitenadressen für die Zielgruppen-Seiten (Etappe „Persona-Routen").
 *
 * - Jede Zielgruppe hat eine verlinkbare Adresse mit ihrer sichtbaren
 *   Bezeichnung (`/wohnungswirtschaft`, `/handwerk`, …).
 * - Die alten Adressen `/personas/<slug>` bleiben als Umleitung gültig.
 * - Inhalte kommen unverändert aus dem CMS über die bestehenden
 *   `*Content`-Bausteine; hier wird nur die Adresse eingerichtet.
 */

const personaComponents: Record<string, React.FC> = {
  bauherren: BauherrenContent,
  architekten: ArchitektenContent,
  wohnungswirtschaft: WohnungswirtschaftContent,
  fachplaner: FachplanerContent,
  handwerk: HandwerkContent,
  fachhandel: FachhandelContent,
};

export const personaFeatureRoutes = (
  <>
    {personaRoutes.map((p) => {
      const Content = personaComponents[p.id];
      if (!Content) return null;
      return <Route key={p.slug} path={`/${p.slug}`} element={<Content />} />;
    })}
    {personaRoutes.map((p) => (
      <Route
        key={`legacy-${p.legacySlug}`}
        path={`/personas/${p.legacySlug}`}
        element={<Navigate to={`/${p.slug}`} replace />}
      />
    ))}
  </>
);
