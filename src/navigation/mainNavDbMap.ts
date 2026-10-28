/**
 * Etappe C.3 — Mapping Code-Schlüssel → DB-`node_key`
 * für die Hauptnavigation (`nav_area = "main"`).
 *
 * Analog zu `footerDbMap.ts`. Routen + Hierarchie kommen aus
 * `mainNavigation.ts` (Code = Source of Truth). Aus dem Overlay
 * werden nur Sichtbarkeit (`is_active`), Reihenfolge (`sort_order`)
 * und Labels (`label_de` / `label_en`) übernommen.
 *
 * Neue Hauptnavigations-Einträge müssen in BEIDEN Dateien gepflegt
 * werden: in `mainNavigation.ts` (Code) und hier (DB-Mapping).
 */

export const MAIN_NAV_DB_KEYS: Record<string, string> = {
  // Top-Level
  produkte: "pr.root",
  gebaeudekommunikation: "gebaeudekommunikation",
  zutrittskontrolle: "zutrittskontrolle",
  gebaeudemanagement: "gebaeudemanagement",
  eingangssysteme: "eingangssysteme",
  // Etappe „bauten-rename": DB-Knoten wurde von `anwendungen` → `bauten` umbenannt (Route bleibt /anwendungen).
  anwendungen: "bauten",
  services: "services",

  // Produkte (Etappe nav-produkte-service-split / C)
  "produkte.tuerkommunikation": "pr.tuerkommunikation",
  "produkte.zutrittskontrolle": "pr.zutrittskontrolle",
  "produkte.eingangsloesungen": "pr.eingangsloesungen",

  // Gebäudekommunikation
  "gebaeudekommunikation.tuersprechanlagen": "gk.tuersprechanlagen",
  "gebaeudekommunikation.briefkastenanlagen": "gk.briefkastenanlagen",
  "gebaeudekommunikation.beschilderung": "gk.beschilderung",
  "gebaeudekommunikation.grossanlagen": "gk.grossanlagen",
  "gebaeudekommunikation.systemloesungen": "gk.zusatzfunktionen",
  "gebaeudekommunikation.mobile-tuerkommunikation": "gk.mobile-tuerkommunikation",
  "gebaeudekommunikation.snipdoo-ip": "gk.snipdoo-ip",

  // Zutrittskontrolle
  "zutrittskontrolle.tueren-tore": "zk.tueren-tore",
  "zutrittskontrolle.mobiler-zutritt": "zk.mobiler-zutritt",
  "zutrittskontrolle.fahrstuhl": "zk.fahrstuhl",
  "zutrittskontrolle.zufahrten": "zk.zufahrten",
  "zutrittskontrolle.systemeigenschaften-bcm": "an.zutrittskontrolle-bcm",


  // Gebäudemanagement
  "gebaeudemanagement.namensanzeige": "gm.namensanzeige",
  "gebaeudemanagement.schraenke": "gm.schraenke",
  "gebaeudemanagement.signage": "gm.signage",
  "gebaeudemanagement.reservieren": "gm.reservieren",
  "gebaeudemanagement.alarm": "gm.alarm",

  // Eingangssysteme
  "eingangssysteme.design": "es.design",
  "eingangssysteme.funktionalitaet": "es.funktionalitaet",
  "eingangssysteme.baukoerper": "es.baukoerper",
  "eingangssysteme.material": "es.material",
  "eingangssysteme.beratung": "es.beratung",
  "eingangssysteme.referenzen": "es.referenzen",
  "eingangssysteme.standards": "es.standards",

  // Anwendungen
  "anwendungen.wohnbau": "an.wohnbau",
  "anwendungen.bildung": "an.bildung",
  "anwendungen.gesundheit": "an.gesundheit",
  "anwendungen.oeffentlich": "an.oeffentlich",
  "anwendungen.referenzen": "an.referenzen",

  // Services
  "services.planen": "sv.planen",
  "services.downloads": "sv.downloads",
  "services.support": "sv.support",
  "services.ersatzteile": "sv.ersatzteile",
  "wissen.akademie": "sv.akademie",
};
