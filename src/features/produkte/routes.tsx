/**
 * Produkte-Routen (Etappe nav-produkte-service-split / C).
 *
 * `/produkte`                      → Produkte-Hub (CMS)
 * `/produkte/tuerkommunikation`    → Online-Produktkatalog mit Filter-Cards
 * `/produkte/tuerkommunikation/:pdpSlug` → PDP (gleiche Komponente wie zuvor)
 * `/produkte/zutrittskontrolle`    → Skeleton (CMS, später Filter-Cards)
 * `/produkte/eingangsloesungen`    → Skeleton (CMS, später Filter-Cards)
 */
import { Route } from "react-router-dom";
import ProduktHubPage from "./pages/ProduktHubPage";
import TuerkommunikationHubPage from "./pages/TuerkommunikationHubPage";
import CategoryListPage from "./pages/CategoryListPage";
import ProductDetailPage from "@/features/service/pages/ProductDetailPage";
import MerklistePage from "./merkliste/MerklistePage";

export const produkteRoutes = (
  <>
    <Route path="/produkte" element={<ProduktHubPage />} />
    <Route path="/produkte/merkliste" element={<MerklistePage />} />
    <Route
      path="/produkte/tuerkommunikation"
      element={<TuerkommunikationHubPage />}
    />
    <Route
      path="/produkte/tuerkommunikation/:pdpSlug"
      element={<ProductDetailPage />}
    />
    <Route
      path="/produkte/zutrittskontrolle"
      element={
        <CategoryListPage
          pageKey="produkte.zutrittskontrolle"
          fallbackHeadline="Zutrittskontrolle"
          linkMap={{
            // Karten verlinken auf bestehende Content-Seiten unter /zutrittskontrolle.
            // Keine neuen Routen, keine Produktdatenbank-Anbindung.
            "category-grid.online-leser": "/zutrittskontrolle/bcm-online-leser",
            "category-grid.offline-leser": "/zutrittskontrolle/funkvernetzte-offline-leser",
            "category-grid.biometrische-leser": "/zutrittskontrolle/biometrie",
            // „Zentralen", „Software", „Zubehör" haben keine exakte Einzelseite —
            // Software trifft inhaltlich am ehesten /zutrittskontrolle/zutrittssoftware,
            // für Zentralen/Zubehör fällt der Link auf die Bereichs-Übersicht zurück.
            "category-grid.zentralen": "/zutrittskontrolle",
            "category-grid.software": "/zutrittskontrolle/zutrittssoftware",
            "category-grid.zubehoer": "/zutrittskontrolle",
          }}
          ctaLabel={{ de: "Mehr erfahren", en: "Learn more" }}
        />
      }
    />
    <Route
      path="/produkte/eingangsloesungen"
      element={
        <CategoryListPage
          pageKey="produkte.eingangsloesungen"
          fallbackHeadline="Eingangslösungen"
          linkMap={{
            "category-grid.standard-briefkaesten": "/gebaeudekommunikation/briefkastenanlagen",
            "category-grid.architektur-entry": "/entry-system",
            // Individueller Metallbau → fachlich am nächsten Material/Beratung; Beratung wie vom Auftrag vorgegeben.
            "category-grid.individueller-metallbau": "/entry-system/beratung",
            "category-grid.signage": "/gebaeudekommunikation/beschilderung",
          }}
          ctaLabel={{ de: "Mehr erfahren", en: "Learn more" }}
          externalActionMap={{
            // Standard-Briefkästen: zusätzlich externer Konfigurator (separater Lovable-Tool-Link).
            // Kein iFrame, kein Pop-up — öffnet in neuem Tab.
            "category-grid.standard-briefkaesten": {
              href: "https://tcs-box-builder.lovable.app/",
              label: { de: "Anlage konfigurieren", en: "Configure system" },
            },
          }}
        />
      }
    />
  </>
);
