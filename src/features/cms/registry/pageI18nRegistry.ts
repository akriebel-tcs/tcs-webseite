/**
 * Registry: page_key → i18n-Zuordnung (namespace + base_key).
 * base_key = "" bedeutet: flacher Namespace, Inhalte direkt unter ns mergen.
 */

export interface CmsPageI18nMap {
  namespace: string;
  base_key: string;
}

export const CMS_PAGE_I18N_REGISTRY: Record<string, CmsPageI18nMap> = {
  // home
  "home.start":      { namespace: "home", base_key: "" }, // bereits live, flach
  "home.ueber-tcs":  { namespace: "home", base_key: "ueberTcs" },

  // gebaeudekommunikation
  "gebaeudekommunikation.tuersprechanlagen": { namespace: "gebaeudekommunikation", base_key: "tuersprechanlagen" },
  "gebaeudekommunikation.briefkastenanlagen": { namespace: "gebaeudekommunikation", base_key: "briefkastenanlagen" },
  "gebaeudekommunikation.systemloesungen":    { namespace: "gebaeudekommunikation", base_key: "systemloesungen" },
  "gebaeudekommunikation.grossanlagen":       { namespace: "gebaeudekommunikation", base_key: "grossanlagen" },
  "gebaeudekommunikation.snipdoo-ip":         { namespace: "gebaeudekommunikation", base_key: "snipdooIp" },
  "gebaeudekommunikation.root":               { namespace: "gebaeudekommunikation", base_key: "root" },
  "gebaeudekommunikation.beschilderung":      { namespace: "gebaeudekommunikation", base_key: "beschilderung" },

  // zutrittskontrolle
  "zutrittskontrolle.root":                          { namespace: "zutrittskontrolle", base_key: "root" },
  "zutrittskontrolle.tueren-tore":                   { namespace: "zutrittskontrolle", base_key: "tuerenTore" },
  "zutrittskontrolle.mobiler-zutritt":               { namespace: "zutrittskontrolle", base_key: "mobilerZutritt" },
  "zutrittskontrolle.fahrstuhlsteuerung":            { namespace: "zutrittskontrolle", base_key: "fahrstuhlsteuerung" },
  "zutrittskontrolle.zufahrten-parkplaetze":         { namespace: "zutrittskontrolle", base_key: "zufahrtenParkplaetze" },
  "zutrittskontrolle.elektronische-drueckergarnitur":{ namespace: "zutrittskontrolle", base_key: "elektronischeDrueckergarnitur" },
  "zutrittskontrolle.elektronischer-knaufzylinder":  { namespace: "zutrittskontrolle", base_key: "knaufzylinder" },
  "zutrittskontrolle.bcm-handsender":                { namespace: "zutrittskontrolle", base_key: "handsender" },
  "zutrittskontrolle.funkvernetzte-offline-leser":   { namespace: "zutrittskontrolle", base_key: "funkvernetzteLeser" },
  "zutrittskontrolle.bcm-online-leser":              { namespace: "zutrittskontrolle", base_key: "onlineLeser" },
  "zutrittskontrolle.vorhaengeschloss":              { namespace: "zutrittskontrolle", base_key: "vorhaengeschloss" },
  "zutrittskontrolle.biometrie":                     { namespace: "zutrittskontrolle", base_key: "biometrie" },

  // eingangssysteme
  "eingangssysteme.root":             { namespace: "eingangssysteme", base_key: "root" },
  "eingangssysteme.design":           { namespace: "eingangssysteme", base_key: "design" },
  "eingangssysteme.funktionalitaet":  { namespace: "eingangssysteme", base_key: "funktionalitaet" },
  "eingangssysteme.material":         { namespace: "eingangssysteme", base_key: "material" },
  "eingangssysteme.integrationsformen": { namespace: "eingangssysteme", base_key: "integrationsformen" },
  "eingangssysteme.referenzen":       { namespace: "eingangssysteme", base_key: "referenzen" },
  "eingangssysteme.standards":        { namespace: "eingangssysteme", base_key: "standards" },
  "eingangssysteme.beratung":         { namespace: "eingangssysteme", base_key: "beratung" },

  // gebaeudemanagement
  "gebaeudemanagement.root":                  { namespace: "gebaeudemanagement", base_key: "root" },
  "gebaeudemanagement.alarmanlagenkopplung":  { namespace: "gebaeudemanagement", base_key: "alarmanlagenkopplung" },
  "gebaeudemanagement.digital-signage":       { namespace: "gebaeudemanagement", base_key: "digitalSignage" },
  "gebaeudemanagement.reservieren-buchen":    { namespace: "gebaeudemanagement", base_key: "reservierenBuchen" },
  "gebaeudemanagement.schraenke-behaelter":   { namespace: "gebaeudemanagement", base_key: "schraenkeBehaelter" },
  "gebaeudemanagement.digitale-namensanzeige":{ namespace: "gebaeudemanagement", base_key: "digitaleNamensanzeige" },

  // anwendungen (verschachtelte base_keys)
  "anwendungen.root":                       { namespace: "anwendungen", base_key: "root" },
  "anwendungen.objektloesungen":            { namespace: "anwendungen", base_key: "uebersichten.objektloesungen" },
  "anwendungen.bildungseinrichtungen":      { namespace: "anwendungen", base_key: "uebersichten.bildung" },
  "anwendungen.wohnbau":                    { namespace: "anwendungen", base_key: "uebersichten.wohnen" },
  "anwendungen.gesundheitseinrichtungen":   { namespace: "anwendungen", base_key: "uebersichten.gesundheit" },
  "anwendungen.oeffentliche-hand":          { namespace: "anwendungen", base_key: "uebersichten.oeffentlich" },
  "anwendungen.einfamilienhaus":            { namespace: "anwendungen", base_key: "wohnen.einfamilienhaus" },
  "anwendungen.mehrfamilienhaus":           { namespace: "anwendungen", base_key: "wohnen.mehrfamilienhaus" },
  "anwendungen.grossanlage":                { namespace: "anwendungen", base_key: "wohnen.grossanlage" },
  "anwendungen.sanierung":                  { namespace: "anwendungen", base_key: "wohnen.sanierung" },
  "anwendungen.pflege":                     { namespace: "anwendungen", base_key: "gesundheit.pflege" },
  "anwendungen.klinik":                     { namespace: "anwendungen", base_key: "gesundheit.klinik" },
  "anwendungen.behoerde":                   { namespace: "anwendungen", base_key: "oeffentlich.behoerde" },
  "anwendungen.feuerwehr":                  { namespace: "anwendungen", base_key: "oeffentlich.feuerwehr" },
  "anwendungen.schwimmbad":                 { namespace: "anwendungen", base_key: "oeffentlich.schwimmbad" },
  "anwendungen.concierge":                  { namespace: "anwendungen", base_key: "funktionen.concierge" },
  "anwendungen.interne-kommunikation":      { namespace: "anwendungen", base_key: "funktionen.interneKommunikation" },
  "anwendungen.digitale-namensverwaltung":  { namespace: "anwendungen", base_key: "funktionen.digitaleNamensverwaltung" },
  "anwendungen.feuerwehrdurchsage":         { namespace: "anwendungen", base_key: "funktionen.feuerwehrdurchsage" },
  "anwendungen.bidirektionale-video":       { namespace: "anwendungen", base_key: "funktionen.bidirektionaleVideo" },
  "anwendungen.mobile-tuerkommunikation":   { namespace: "anwendungen", base_key: "funktionen.mobileTuerkommunikation" },
  "anwendungen.zutrittskontrolle-bcm":      { namespace: "anwendungen", base_key: "funktionen.zutrittskontrolleBCM" },
  "anwendungen.referenzprojekte":           { namespace: "anwendungen", base_key: "referenzen.list" },

  // personas
  "personas.bauherr":            { namespace: "personas", base_key: "bauherr" },
  "personas.architekt":          { namespace: "personas", base_key: "architekt" },
  "personas.fachplaner":         { namespace: "personas", base_key: "fachplaner" },
  "personas.handwerk":           { namespace: "personas", base_key: "handwerk" },
  "personas.fachhandel":         { namespace: "personas", base_key: "fachhandel" },
  "personas.wohnungswirtschaft": { namespace: "personas", base_key: "wohnungswirtschaft" },

  // service
  "service.hub":                  { namespace: "service", base_key: "hub" },
  "service.online-produktkatalog":{ namespace: "service", base_key: "katalog" },
  "service.planen-konfigurieren": { namespace: "service", base_key: "seiten.planenKonfigurieren" },
  "service.downloads":            { namespace: "service", base_key: "seiten.downloads" },
  "service.technischer-support":  { namespace: "service", base_key: "seiten.technischerSupport" },
  "service.ersatzteile":          { namespace: "service", base_key: "seiten.ersatzteile" },
  "service.installation-wartung": { namespace: "service", base_key: "seiten.installationWartung" },
  "service.beratung-schulung":    { namespace: "service", base_key: "seiten.beratungSchulung" },
  "service.garantie-sicherheit":  { namespace: "service", base_key: "seiten.garantieSicherheit" },
  "service.konfiguratoren":       { namespace: "service", base_key: "seiten.konfiguratoren" },
  "service.planungshilfen":       { namespace: "service", base_key: "seiten.planungshilfen" },
  "service.datenblaetter-software":{ namespace: "service", base_key: "seiten.datenblaetterSoftware" },

  // produkte (Etappe nav-produkte-service-split)
  "produkte.hub":              { namespace: "service", base_key: "katalog" },
  "produkte.tuerkommunikation":{ namespace: "service", base_key: "katalog" },
  "produkte.zutrittskontrolle":{ namespace: "service", base_key: "katalog" },
  "produkte.eingangsloesungen":{ namespace: "service", base_key: "katalog" },

  // legal
  "legal.impressum":   { namespace: "legal", base_key: "seiten.impressum" },
  "legal.datenschutz": { namespace: "legal", base_key: "seiten.datenschutz" },
  "legal.agb":         { namespace: "legal", base_key: "seiten.agb" },

  // serviceportal
  "serviceportal.login":              { namespace: "serviceportal", base_key: "login" },
  "serviceportal.passwort-vergessen": { namespace: "serviceportal", base_key: "passwortVergessen" },
  "serviceportal.registrieren":       { namespace: "serviceportal", base_key: "registrieren" },

  // flache Namespaces
  "kontakt.root":     { namespace: "kontakt", base_key: "" },
  "kontakt-bcm.root": { namespace: "kontakt-bcm", base_key: "" },
  "karriere.root":    { namespace: "karriere", base_key: "" },
  "presse.root":      { namespace: "presse", base_key: "" },
  "signage.root":     { namespace: "signage", base_key: "" },

  // wissen
  "wissen.akademie": { namespace: "wissen", base_key: "seiten.akademie" },

  // ── Sync 2026-05-15: neue Seiten aus TCS-Unternehmenswebseite_Content_V1 ──
  // Status in DB: draft / inactive — Renderer/Routen folgen in eigener Etappe.
  "gebaeudemanagement.bcm-infoboard":         { namespace: "gebaeudemanagement", base_key: "bcmInfoboard" },
  "gebaeudemanagement.bcm-buchungssystem":    { namespace: "gebaeudemanagement", base_key: "bcmBuchungssystem" },
  "zutrittskontrolle.bcm-door-app":           { namespace: "zutrittskontrolle", base_key: "bcmDoorApp" },
  "zutrittskontrolle.gsm-gateway":            { namespace: "zutrittskontrolle", base_key: "gsmGateway" },
  "zutrittskontrolle.aussenstation-adx5":     { namespace: "zutrittskontrolle", base_key: "aussenstationAdx5" },
  "zutrittskontrolle.bcm-mini-cloud":         { namespace: "zutrittskontrolle", base_key: "bcmMiniCloud" },
  "zutrittskontrolle.zufahrtskontrolle":      { namespace: "zutrittskontrolle", base_key: "zufahrtskontrolle" },
  "zutrittskontrolle.digitale-briefkasten":   { namespace: "zutrittskontrolle", base_key: "digitaleBriefkasten" },
  "zutrittskontrolle.zutrittssoftware":       { namespace: "zutrittskontrolle", base_key: "zutrittssoftware" },
  "zutrittskontrolle.schrankschloss":         { namespace: "zutrittskontrolle", base_key: "schrankschloss" },
  "zutrittskontrolle.serverschrankschloss":   { namespace: "zutrittskontrolle", base_key: "serverschrankschloss" },
  "mobile-tk-preview.root":                   { namespace: "mobileTkPreview", base_key: "" },
};
