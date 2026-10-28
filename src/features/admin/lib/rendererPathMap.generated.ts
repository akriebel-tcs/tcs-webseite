// AUTO-GENERATED via scripts/admin/build-renderer-path-map.mjs
// Quelle: docs/04-betrieb/audit-snapshot/page-renderer-coverage.json + src/**/routes.tsx
// Read-only Diagnose-Tabelle für die Admin-Anzeige (T-Code vs Renderer-Pfad).
// NICHT von Hand bearbeiten. Regenerieren:
//   node scripts/admin/build-renderer-path-map.mjs
//
// Stand: 2026-08-28T07:05:50.920Z

export type RendererPath =
  | "generic_cms_page"
  | "cms_only_shell"
  | "product_solution_shell"
  | "eigene_komponente_generisch"
  | "eigene_komponente_teilweise"
  | "eigene_komponente";

export type RendererStatus = "standardisiert" | "gemischt" | "sonderlogik";

export interface RendererPathEntry {
  page_key: string;
  render_class: string;
  renderer_path: RendererPath;
  status: RendererStatus;
}

export const RENDERER_PATH_MAP: Record<string, RendererPathEntry> = {
  "anwendungen.bidirektionale-video": { page_key: "anwendungen.bidirektionale-video", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "anwendungen.bildungseinrichtungen": { page_key: "anwendungen.bildungseinrichtungen", render_class: "teilweise_generisch", renderer_path: "eigene_komponente_teilweise", status: "gemischt" },
  "anwendungen.concierge": { page_key: "anwendungen.concierge", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "anwendungen.digitale-namensverwaltung": { page_key: "anwendungen.digitale-namensverwaltung", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "anwendungen.feuerwehrdurchsage": { page_key: "anwendungen.feuerwehrdurchsage", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "anwendungen.gesundheit.klinik": { page_key: "anwendungen.gesundheit.klinik", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "anwendungen.gesundheit.pflege": { page_key: "anwendungen.gesundheit.pflege", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "anwendungen.gesundheitseinrichtungen": { page_key: "anwendungen.gesundheitseinrichtungen", render_class: "teilweise_generisch", renderer_path: "eigene_komponente_teilweise", status: "gemischt" },
  "anwendungen.interne-kommunikation": { page_key: "anwendungen.interne-kommunikation", render_class: "teilweise_generisch", renderer_path: "eigene_komponente_teilweise", status: "gemischt" },
  "anwendungen.mobile-tuerkommunikation": { page_key: "anwendungen.mobile-tuerkommunikation", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "anwendungen.objektloesungen": { page_key: "anwendungen.objektloesungen", render_class: "teilweise_generisch", renderer_path: "eigene_komponente_teilweise", status: "gemischt" },
  "anwendungen.oeffentlich.behoerde": { page_key: "anwendungen.oeffentlich.behoerde", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "anwendungen.oeffentlich.feuerwehr": { page_key: "anwendungen.oeffentlich.feuerwehr", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "anwendungen.oeffentlich.schwimmbad": { page_key: "anwendungen.oeffentlich.schwimmbad", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "anwendungen.oeffentliche-hand": { page_key: "anwendungen.oeffentliche-hand", render_class: "teilweise_generisch", renderer_path: "eigene_komponente_teilweise", status: "gemischt" },
  "anwendungen.referenzen.detail": { page_key: "anwendungen.referenzen.detail", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "anwendungen.referenzprojekte": { page_key: "anwendungen.referenzprojekte", render_class: "teilweise_generisch", renderer_path: "eigene_komponente_teilweise", status: "gemischt" },
  "anwendungen.root": { page_key: "anwendungen.root", render_class: "generisch_iteration", renderer_path: "eigene_komponente_generisch", status: "standardisiert" },
  "anwendungen.wohnbau": { page_key: "anwendungen.wohnbau", render_class: "generisch_cms", renderer_path: "generic_cms_page", status: "standardisiert" },
  "anwendungen.wohnen.einfamilienhaus": { page_key: "anwendungen.wohnen.einfamilienhaus", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "anwendungen.wohnen.grossanlage": { page_key: "anwendungen.wohnen.grossanlage", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "anwendungen.wohnen.mehrfamilienhaus": { page_key: "anwendungen.wohnen.mehrfamilienhaus", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "anwendungen.wohnen.sanierung": { page_key: "anwendungen.wohnen.sanierung", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "anwendungen.zutrittskontrolle-bcm": { page_key: "anwendungen.zutrittskontrolle-bcm", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "eingangssysteme.beratung": { page_key: "eingangssysteme.beratung", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "eingangssysteme.design": { page_key: "eingangssysteme.design", render_class: "generisch_cms", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "eingangssysteme.funktionalitaet": { page_key: "eingangssysteme.funktionalitaet", render_class: "generisch_cms", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "eingangssysteme.integrationsformen": { page_key: "eingangssysteme.integrationsformen", render_class: "generisch_cms", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "eingangssysteme.material": { page_key: "eingangssysteme.material", render_class: "generisch_cms", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "eingangssysteme.referenzen": { page_key: "eingangssysteme.referenzen", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "eingangssysteme.root": { page_key: "eingangssysteme.root", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "eingangssysteme.standards": { page_key: "eingangssysteme.standards", render_class: "generisch_cms", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "foo.bar": { page_key: "foo.bar", render_class: "shell_route_inline", renderer_path: "cms_only_shell", status: "standardisiert" },
  "gebaeudekommunikation.beschilderung": { page_key: "gebaeudekommunikation.beschilderung", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "gebaeudekommunikation.briefkastenanlagen": { page_key: "gebaeudekommunikation.briefkastenanlagen", render_class: "generisch_cms", renderer_path: "generic_cms_page", status: "standardisiert" },
  "gebaeudekommunikation.grossanlagen": { page_key: "gebaeudekommunikation.grossanlagen", render_class: "generisch_cms", renderer_path: "generic_cms_page", status: "standardisiert" },
  "gebaeudekommunikation.root": { page_key: "gebaeudekommunikation.root", render_class: "generisch_iteration", renderer_path: "eigene_komponente_generisch", status: "standardisiert" },
  "gebaeudekommunikation.snipdoo-ip": { page_key: "gebaeudekommunikation.snipdoo-ip", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "gebaeudekommunikation.systemloesungen": { page_key: "gebaeudekommunikation.systemloesungen", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "gebaeudekommunikation.tuersprechanlagen": { page_key: "gebaeudekommunikation.tuersprechanlagen", render_class: "generisch_iteration", renderer_path: "eigene_komponente_generisch", status: "standardisiert" },
  "gebaeudemanagement.alarmanlagenkopplung": { page_key: "gebaeudemanagement.alarmanlagenkopplung", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "gebaeudemanagement.bcm-buchungssystem": { page_key: "gebaeudemanagement.bcm-buchungssystem", render_class: "shell_route_inline", renderer_path: "product_solution_shell", status: "standardisiert" },
  "gebaeudemanagement.bcm-infoboard": { page_key: "gebaeudemanagement.bcm-infoboard", render_class: "shell_route_inline", renderer_path: "product_solution_shell", status: "standardisiert" },
  "gebaeudemanagement.digital-signage": { page_key: "gebaeudemanagement.digital-signage", render_class: "generisch_cms", renderer_path: "generic_cms_page", status: "standardisiert" },
  "gebaeudemanagement.digitale-namensanzeige": { page_key: "gebaeudemanagement.digitale-namensanzeige", render_class: "generisch_cms", renderer_path: "generic_cms_page", status: "standardisiert" },
  "gebaeudemanagement.reservieren-buchen": { page_key: "gebaeudemanagement.reservieren-buchen", render_class: "generisch_cms", renderer_path: "generic_cms_page", status: "standardisiert" },
  "gebaeudemanagement.root": { page_key: "gebaeudemanagement.root", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "gebaeudemanagement.schraenke-behaelter": { page_key: "gebaeudemanagement.schraenke-behaelter", render_class: "generisch_cms", renderer_path: "generic_cms_page", status: "standardisiert" },
  "home.start": { page_key: "home.start", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "home.ueber-tcs": { page_key: "home.ueber-tcs", render_class: "generisch_cms", renderer_path: "generic_cms_page", status: "standardisiert" },
  "karriere.root": { page_key: "karriere.root", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "kontakt-bcm.root": { page_key: "kontakt-bcm.root", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "kontakt.root": { page_key: "kontakt.root", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "legal.agb": { page_key: "legal.agb", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "legal.datenschutz": { page_key: "legal.datenschutz", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "legal.impressum": { page_key: "legal.impressum", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "mobile-tk-preview.root": { page_key: "mobile-tk-preview.root", render_class: "shell_route_inline", renderer_path: "cms_only_shell", status: "standardisiert" },
  "presse.root": { page_key: "presse.root", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "produkte.hub": { page_key: "produkte.hub", render_class: "generisch_iteration", renderer_path: "eigene_komponente_generisch", status: "standardisiert" },
  "produkte.tuerkommunikation": { page_key: "produkte.tuerkommunikation", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "service.beratung-schulung": { page_key: "service.beratung-schulung", render_class: "shell_route_inline", renderer_path: "cms_only_shell", status: "standardisiert" },
  "service.datenblaetter-software": { page_key: "service.datenblaetter-software", render_class: "shell_route_inline", renderer_path: "cms_only_shell", status: "standardisiert" },
  "service.downloads": { page_key: "service.downloads", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "service.ersatzteile": { page_key: "service.ersatzteile", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "service.garantie-sicherheit": { page_key: "service.garantie-sicherheit", render_class: "shell_route_inline", renderer_path: "cms_only_shell", status: "standardisiert" },
  "service.hub": { page_key: "service.hub", render_class: "generisch_cms", renderer_path: "generic_cms_page", status: "standardisiert" },
  "service.installation-wartung": { page_key: "service.installation-wartung", render_class: "shell_route_inline", renderer_path: "cms_only_shell", status: "standardisiert" },
  "service.konfiguratoren": { page_key: "service.konfiguratoren", render_class: "shell_route_inline", renderer_path: "cms_only_shell", status: "standardisiert" },
  "service.planen-konfigurieren": { page_key: "service.planen-konfigurieren", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "service.planungshilfen": { page_key: "service.planungshilfen", render_class: "shell_route_inline", renderer_path: "cms_only_shell", status: "standardisiert" },
  "service.technischer-support": { page_key: "service.technischer-support", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "serviceportal.login": { page_key: "serviceportal.login", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "serviceportal.passwort-vergessen": { page_key: "serviceportal.passwort-vergessen", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "serviceportal.registrieren": { page_key: "serviceportal.registrieren", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "signage.root": { page_key: "signage.root", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "wissen.akademie": { page_key: "wissen.akademie", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "zutrittskontrolle.aussenstation-adx5": { page_key: "zutrittskontrolle.aussenstation-adx5", render_class: "shell_route_inline", renderer_path: "product_solution_shell", status: "standardisiert" },
  "zutrittskontrolle.bcm-door-app": { page_key: "zutrittskontrolle.bcm-door-app", render_class: "shell_route_inline", renderer_path: "product_solution_shell", status: "standardisiert" },
  "zutrittskontrolle.bcm-handsender": { page_key: "zutrittskontrolle.bcm-handsender", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "zutrittskontrolle.bcm-mini-cloud": { page_key: "zutrittskontrolle.bcm-mini-cloud", render_class: "shell_route_inline", renderer_path: "product_solution_shell", status: "standardisiert" },
  "zutrittskontrolle.bcm-online-leser": { page_key: "zutrittskontrolle.bcm-online-leser", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "zutrittskontrolle.biometrie": { page_key: "zutrittskontrolle.biometrie", render_class: "generisch_cms", renderer_path: "generic_cms_page", status: "standardisiert" },
  "zutrittskontrolle.digitale-briefkasten": { page_key: "zutrittskontrolle.digitale-briefkasten", render_class: "shell_route_inline", renderer_path: "product_solution_shell", status: "standardisiert" },
  "zutrittskontrolle.elektronische-drueckergarnitur": { page_key: "zutrittskontrolle.elektronische-drueckergarnitur", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "zutrittskontrolle.elektronischer-knaufzylinder": { page_key: "zutrittskontrolle.elektronischer-knaufzylinder", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "zutrittskontrolle.fahrstuhlsteuerung": { page_key: "zutrittskontrolle.fahrstuhlsteuerung", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "zutrittskontrolle.funkvernetzte-offline-leser": { page_key: "zutrittskontrolle.funkvernetzte-offline-leser", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "zutrittskontrolle.gsm-gateway": { page_key: "zutrittskontrolle.gsm-gateway", render_class: "shell_route_inline", renderer_path: "product_solution_shell", status: "standardisiert" },
  "zutrittskontrolle.mobiler-zutritt": { page_key: "zutrittskontrolle.mobiler-zutritt", render_class: "generisch_cms", renderer_path: "generic_cms_page", status: "standardisiert" },
  "zutrittskontrolle.root": { page_key: "zutrittskontrolle.root", render_class: "shell_route_inline", renderer_path: "cms_only_shell", status: "standardisiert" },
  "zutrittskontrolle.schrankschloss": { page_key: "zutrittskontrolle.schrankschloss", render_class: "shell_route_inline", renderer_path: "product_solution_shell", status: "standardisiert" },
  "zutrittskontrolle.serverschrankschloss": { page_key: "zutrittskontrolle.serverschrankschloss", render_class: "shell_route_inline", renderer_path: "product_solution_shell", status: "standardisiert" },
  "zutrittskontrolle.tueren-tore": { page_key: "zutrittskontrolle.tueren-tore", render_class: "generisch_cms", renderer_path: "generic_cms_page", status: "standardisiert" },
  "zutrittskontrolle.vorhaengeschloss": { page_key: "zutrittskontrolle.vorhaengeschloss", render_class: "hart_codiert", renderer_path: "eigene_komponente", status: "sonderlogik" },
  "zutrittskontrolle.zufahrten-parkplaetze": { page_key: "zutrittskontrolle.zufahrten-parkplaetze", render_class: "generisch_cms", renderer_path: "generic_cms_page", status: "standardisiert" },
  "zutrittskontrolle.zufahrtskontrolle": { page_key: "zutrittskontrolle.zufahrtskontrolle", render_class: "shell_route_inline", renderer_path: "product_solution_shell", status: "standardisiert" },
  "zutrittskontrolle.zutrittssoftware": { page_key: "zutrittskontrolle.zutrittssoftware", render_class: "shell_route_inline", renderer_path: "product_solution_shell", status: "standardisiert" },
};
