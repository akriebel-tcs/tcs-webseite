import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { runDevManifestCheck } from "@/lib/catalog-contract";
import { PersonaContext } from "@/contexts/PersonaContext";
import MetaNavigation from "@/components/MetaNavigation";
import MainNavigation from "@/components/MainNavigation";
import Footer from "@/components/Footer";
import NotFound from "@/app/pages/NotFoundPage";
import AdminPage from "@/features/admin/pages/AdminPage";
import AdminLoginPage from "@/features/admin/pages/AdminLoginPage";

import CmsCatchAllRoute from "@/features/cms/components/CmsCatchAllRoute";
import DiagnosePage from "@/features/diagnose/DiagnosePage";
import { appRoutes } from "@/app/routes";

import ScrollToTop from "@/components/ScrollToTop";
import { useDocumentLang } from "@/shared/hooks/useDocumentLang";
import { useLocaleUrlSync } from "@/shared/hooks/useLocaleUrlSync";
import { useCmsPreviewHighlight } from "@/shared/hooks/useCmsPreviewHighlight";
import { useHashScroll } from "@/shared/hooks/useHashScroll";

const queryClient = new QueryClient();

const AppLayout = () => {
  useDocumentLang();
  // Adresse (?lang=) und aktive Sprache deckungsgleich halten.
  useLocaleUrlSync();
  const { t } = useTranslation("navigation");
  const location = useLocation();
  const [activePersona, setActivePersona] = useState<string | null>(null);
  // Listener + Sender für Admin-Live-Vorschau. Muss NACH dem activePersona-State
  // stehen, damit der Sender den aktuellen Wert mitbekommt (Provider liegt
  // weiter unten — ein interner usePersona() würde hier immer null liefern).
  useCmsPreviewHighlight(activePersona);
  // Sprungmarken (#anker) auch bei asynchron geladenen CMS-Inhalten.
  useHashScroll();
  useEffect(() => {
    runDevManifestCheck();
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ personaId?: string | null }>;
      setActivePersona(custom.detail?.personaId ?? null);
    };
    window.addEventListener("cms-preview-persona", handler as EventListener);
    return () => window.removeEventListener("cms-preview-persona", handler as EventListener);
  }, []);

  // /admin wird bewusst ohne öffentliches Website-Layout gerendert.
  // Kein Login — temporärer Redaktions-Workspace während des Aufbaus der Webseite.
  const isAdmin = location.pathname === "/admin" || location.pathname.startsWith("/admin/");

  if (isAdmin) {
    return (
      <PersonaContext.Provider value={{ activePersona, setActivePersona }}>
        <div className="min-h-screen flex flex-col bg-background">
          <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
            <Routes>
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/anmelden" element={<AdminLoginPage />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </PersonaContext.Provider>
    );
  }

  return (
    <PersonaContext.Provider value={{ activePersona, setActivePersona }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-foreground focus:text-background focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t("a11y.skipToContent")}
      </a>
      <div className="min-h-screen flex flex-col">
        <header className="bg-background sticky top-0 z-50 shadow-sm">
          <MetaNavigation activePersona={activePersona} onPersonaChange={setActivePersona} />
          <MainNavigation />
        </header>
        <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
          <Routes>
            {appRoutes}
            <Route path="/diagnose" element={<DiagnosePage />} />
            {/* Catch-all: prüft cms_pages auf den aktuellen Pfad. Trifft
                eine veröffentlichte+aktive Seite zu, wird sie aus der DB
                gerendert. Andernfalls 404. So werden im /admin angelegte
                Seiten ohne Code-Änderung sofort öffentlich erreichbar. */}
            <Route path="*" element={<CmsCatchAllRoute />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </PersonaContext.Provider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AppLayout />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
