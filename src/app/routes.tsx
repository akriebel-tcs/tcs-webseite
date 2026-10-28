import { homeRoutes } from "@/features/home/routes";
import { kontaktRoutes } from "@/features/kontakt/routes";
import { karriereRoutes } from "@/features/karriere/routes";
import { presseRoutes } from "@/features/presse/routes";
import { wissenRoutes } from "@/features/wissen/routes";
import { signageRoutes } from "@/features/signage/routes";
import { serviceRoutes } from "@/features/service/routes";
import { produkteRoutes } from "@/features/produkte/routes";
import { serviceportalRoutes } from "@/features/serviceportal/routes";
import { gebaeudekommunikationRoutes } from "@/features/gebaeudekommunikation/routes";
import { zutrittskontrolleRoutes } from "@/features/zutrittskontrolle/routes";
import { gebaeudemanagementRoutes } from "@/features/gebaeudemanagement/routes";
import { eingangssystemeRoutes } from "@/features/eingangssysteme/routes";
import { anwendungenRoutes } from "@/features/anwendungen/routes";
import { personaFeatureRoutes } from "@/features/personas/routes";
import { legalRoutes } from "@/features/legal/routes";
import { mobileTkPreviewRoutes } from "@/features/mobile-tk-preview/routes";

export const appRoutes = (
  <>
    {homeRoutes}
    {kontaktRoutes}
    {karriereRoutes}
    {presseRoutes}
    {wissenRoutes}
    {signageRoutes}
    {serviceRoutes}
    {produkteRoutes}
    {serviceportalRoutes}
    {gebaeudekommunikationRoutes}
    {zutrittskontrolleRoutes}
    {gebaeudemanagementRoutes}
    {eingangssystemeRoutes}
    {anwendungenRoutes}
    {personaFeatureRoutes}
    {legalRoutes}
    {mobileTkPreviewRoutes}
  </>
);
