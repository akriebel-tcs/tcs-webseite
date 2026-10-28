#!/usr/bin/env node
/**
 * Sync-Generator: Liest Referenz-Snapshots (scripts/sync/source-raw/i18n/{de,en})
 * und erzeugt EINE idempotente SQL-Migration:
 *
 *  - cms_pages:               INSERT ON CONFLICT DO NOTHING
 *  - cms_sections:            INSERT ON CONFLICT DO NOTHING (Reihenfolge bleibt)
 *  - cms_section_fields:      INSERT ON CONFLICT (page,section,field,locale) DO UPDATE
 *                             SET value = EXCLUDED.value      ←  spiegelt Referenztexte
 *  - cms_admin_editable_fields: INSERT ON CONFLICT DO NOTHING
 *
 * Quelle der Wahrheit: Referenzprojekt TCS-Unternehmenswebseite_Content_V1.
 * Empfänger: lokale Lovable-DB (CMS-Light).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SNAP = path.join(ROOT, "scripts/sync/source-raw/i18n");

// Erweiterte Registry: bestehende + neue Seiten
const REGISTRY = [
  // ---- bestehend ----
  ["home.start",                                       "home",                  ""],
  ["home.ueber-tcs",                                   "home",                  "ueberTcs"],
  ["gebaeudekommunikation.tuersprechanlagen",          "gebaeudekommunikation", "tuersprechanlagen"],
  ["gebaeudekommunikation.briefkastenanlagen",         "gebaeudekommunikation", "briefkastenanlagen"],
  ["gebaeudekommunikation.systemloesungen",            "gebaeudekommunikation", "systemloesungen"],
  ["gebaeudekommunikation.grossanlagen",               "gebaeudekommunikation", "grossanlagen"],
  ["gebaeudekommunikation.snipdoo-ip",                 "gebaeudekommunikation", "snipdooIp"],
  ["gebaeudekommunikation.root",                       "gebaeudekommunikation", "root"],
  ["gebaeudekommunikation.beschilderung",              "gebaeudekommunikation", "beschilderung"],
  ["zutrittskontrolle.root",                           "zutrittskontrolle",     "root"],
  ["zutrittskontrolle.tueren-tore",                    "zutrittskontrolle",     "tuerenTore"],
  ["zutrittskontrolle.mobiler-zutritt",                "zutrittskontrolle",     "mobilerZutritt"],
  ["zutrittskontrolle.fahrstuhlsteuerung",             "zutrittskontrolle",     "fahrstuhlsteuerung"],
  ["zutrittskontrolle.zufahrten-parkplaetze",          "zutrittskontrolle",     "zufahrtenParkplaetze"],
  ["zutrittskontrolle.elektronische-drueckergarnitur", "zutrittskontrolle",     "elektronischeDrueckergarnitur"],
  ["zutrittskontrolle.elektronischer-knaufzylinder",   "zutrittskontrolle",     "knaufzylinder"],
  ["zutrittskontrolle.bcm-handsender",                 "zutrittskontrolle",     "handsender"],
  ["zutrittskontrolle.funkvernetzte-offline-leser",    "zutrittskontrolle",     "funkvernetzteLeser"],
  ["zutrittskontrolle.bcm-online-leser",               "zutrittskontrolle",     "onlineLeser"],
  ["zutrittskontrolle.vorhaengeschloss",               "zutrittskontrolle",     "vorhaengeschloss"],
  ["zutrittskontrolle.biometrie",                      "zutrittskontrolle",     "biometrie"],
  ["eingangssysteme.root",                             "eingangssysteme",       "root"],
  ["eingangssysteme.design",                           "eingangssysteme",       "design"],
  ["eingangssysteme.funktionalitaet",                  "eingangssysteme",       "funktionalitaet"],
  ["eingangssysteme.material",                         "eingangssysteme",       "material"],
  ["eingangssysteme.integrationsformen",               "eingangssysteme",       "integrationsformen"],
  ["eingangssysteme.referenzen",                       "eingangssysteme",       "referenzen"],
  ["eingangssysteme.standards",                        "eingangssysteme",       "standards"],
  ["eingangssysteme.beratung",                         "eingangssysteme",       "beratung"],
  ["gebaeudemanagement.root",                          "gebaeudemanagement",    "root"],
  ["gebaeudemanagement.alarmanlagenkopplung",          "gebaeudemanagement",    "alarmanlagenkopplung"],
  ["gebaeudemanagement.digital-signage",               "gebaeudemanagement",    "digitalSignage"],
  ["gebaeudemanagement.reservieren-buchen",            "gebaeudemanagement",    "reservierenBuchen"],
  ["gebaeudemanagement.schraenke-behaelter",           "gebaeudemanagement",    "schraenkeBehaelter"],
  ["gebaeudemanagement.digitale-namensanzeige",        "gebaeudemanagement",    "digitaleNamensanzeige"],
  ["anwendungen.root",                                 "anwendungen",           "root"],
  ["anwendungen.objektloesungen",                      "anwendungen",           "uebersichten.objektloesungen"],
  ["anwendungen.bildungseinrichtungen",                "anwendungen",           "uebersichten.bildung"],
  ["anwendungen.wohnbau",                              "anwendungen",           "uebersichten.wohnen"],
  ["anwendungen.gesundheitseinrichtungen",             "anwendungen",           "uebersichten.gesundheit"],
  ["anwendungen.oeffentliche-hand",                    "anwendungen",           "uebersichten.oeffentlich"],
  ["anwendungen.einfamilienhaus",                      "anwendungen",           "wohnen.einfamilienhaus"],
  ["anwendungen.mehrfamilienhaus",                     "anwendungen",           "wohnen.mehrfamilienhaus"],
  ["anwendungen.grossanlage",                          "anwendungen",           "wohnen.grossanlage"],
  ["anwendungen.sanierung",                            "anwendungen",           "wohnen.sanierung"],
  ["anwendungen.pflege",                               "anwendungen",           "gesundheit.pflege"],
  ["anwendungen.klinik",                               "anwendungen",           "gesundheit.klinik"],
  ["anwendungen.behoerde",                             "anwendungen",           "oeffentlich.behoerde"],
  ["anwendungen.feuerwehr",                            "anwendungen",           "oeffentlich.feuerwehr"],
  ["anwendungen.schwimmbad",                           "anwendungen",           "oeffentlich.schwimmbad"],
  ["anwendungen.concierge",                            "anwendungen",           "funktionen.concierge"],
  ["anwendungen.interne-kommunikation",                "anwendungen",           "funktionen.interneKommunikation"],
  ["anwendungen.digitale-namensverwaltung",            "anwendungen",           "funktionen.digitaleNamensverwaltung"],
  ["anwendungen.feuerwehrdurchsage",                   "anwendungen",           "funktionen.feuerwehrdurchsage"],
  ["anwendungen.bidirektionale-video",                 "anwendungen",           "funktionen.bidirektionaleVideo"],
  ["anwendungen.mobile-tuerkommunikation",             "anwendungen",           "funktionen.mobileTuerkommunikation"],
  ["anwendungen.zutrittskontrolle-bcm",                "anwendungen",           "funktionen.zutrittskontrolleBCM"],
  ["anwendungen.referenzprojekte",                     "anwendungen",           "referenzen.list"],
  ["personas.bauherr",                                 "personas",              "bauherr"],
  ["personas.architekt",                               "personas",              "architekt"],
  ["personas.fachplaner",                              "personas",              "fachplaner"],
  ["personas.handwerk",                                "personas",              "handwerk"],
  ["personas.fachhandel",                              "personas",              "fachhandel"],
  ["personas.wohnungswirtschaft",                      "personas",              "wohnungswirtschaft"],
  ["service.hub",                                      "service",               "hub"],
  ["service.online-produktkatalog",                    "service",               "katalog"],
  ["service.planen-konfigurieren",                     "service",               "seiten.planenKonfigurieren"],
  ["service.downloads",                                "service",               "seiten.downloads"],
  ["service.technischer-support",                      "service",               "seiten.technischerSupport"],
  ["service.ersatzteile",                              "service",               "seiten.ersatzteile"],
  ["legal.impressum",                                  "legal",                 "seiten.impressum"],
  ["legal.datenschutz",                                "legal",                 "seiten.datenschutz"],
  ["legal.agb",                                        "legal",                 "seiten.agb"],
  ["serviceportal.login",                              "serviceportal",         "login"],
  ["serviceportal.passwort-vergessen",                 "serviceportal",         "passwortVergessen"],
  ["serviceportal.registrieren",                       "serviceportal",         "registrieren"],
  ["kontakt.root",                                     "kontakt",               ""],
  ["kontakt-bcm.root",                                 "kontakt-bcm",           ""],
  ["karriere.root",                                    "karriere",              ""],
  ["presse.root",                                      "presse",                ""],
  ["signage.root",                                     "signage",               ""],
  ["wissen.akademie",                                  "wissen",                "seiten.akademie"],
  // ---- NEU: Gebäudemanagement (BCM) ----
  ["gebaeudemanagement.bcm-infoboard",                 "gebaeudemanagement",    "bcmInfoboard"],
  ["gebaeudemanagement.bcm-buchungssystem",            "gebaeudemanagement",    "bcmBuchungssystem"],
  // ---- NEU: Zutrittskontrolle ----
  ["zutrittskontrolle.bcm-door-app",                   "zutrittskontrolle",     "bcmDoorApp"],
  ["zutrittskontrolle.gsm-gateway",                    "zutrittskontrolle",     "gsmGateway"],
  ["zutrittskontrolle.aussenstation-adx5",             "zutrittskontrolle",     "aussenstationAdx5"],
  ["zutrittskontrolle.bcm-mini-cloud",                 "zutrittskontrolle",     "bcmMiniCloud"],
  ["zutrittskontrolle.zufahrtskontrolle",              "zutrittskontrolle",     "zufahrtskontrolle"],
  ["zutrittskontrolle.digitale-briefkasten",           "zutrittskontrolle",     "digitaleBriefkasten"],
  ["zutrittskontrolle.zutrittssoftware",               "zutrittskontrolle",     "zutrittssoftware"],
  ["zutrittskontrolle.schrankschloss",                 "zutrittskontrolle",     "schrankschloss"],
  ["zutrittskontrolle.serverschrankschloss",           "zutrittskontrolle",     "serverschrankschloss"],
  // ---- NEU: mobileTkPreview ----
  ["mobile-tk-preview.root",                           "mobileTkPreview",       ""],
];

// Welche Page-Keys sind NEU (gab es vorher nicht)?
const NEW_PAGES = new Set([
  "gebaeudemanagement.bcm-infoboard",
  "gebaeudemanagement.bcm-buchungssystem",
  "zutrittskontrolle.bcm-door-app",
  "zutrittskontrolle.gsm-gateway",
  "zutrittskontrolle.aussenstation-adx5",
  "zutrittskontrolle.bcm-mini-cloud",
  "zutrittskontrolle.zufahrtskontrolle",
  "zutrittskontrolle.digitale-briefkasten",
  "zutrittskontrolle.zutrittssoftware",
  "zutrittskontrolle.schrankschloss",
  "zutrittskontrolle.serverschrankschloss",
  "mobile-tk-preview.root",
]);

// Optionale Routen für neue Seiten (nur informativ in cms_pages)
const NEW_ROUTES = {
  "gebaeudemanagement.bcm-infoboard":        "/gebaeudemanagement/bcm-infoboard",
  "gebaeudemanagement.bcm-buchungssystem":   "/gebaeudemanagement/bcm-buchungssystem",
  "zutrittskontrolle.bcm-door-app":          "/zutrittskontrolle/bcm-door-app",
  "zutrittskontrolle.gsm-gateway":           "/zutrittskontrolle/gsm-gateway",
  "zutrittskontrolle.aussenstation-adx5":    "/zutrittskontrolle/aussenstation-adx5",
  "zutrittskontrolle.bcm-mini-cloud":        "/zutrittskontrolle/bcm-mini-cloud",
  "zutrittskontrolle.zufahrtskontrolle":     "/zutrittskontrolle/zufahrtskontrolle",
  "zutrittskontrolle.digitale-briefkasten":  "/zutrittskontrolle/digitale-briefkasten",
  "zutrittskontrolle.zutrittssoftware":      "/zutrittskontrolle/zutrittssoftware",
  "zutrittskontrolle.schrankschloss":        "/zutrittskontrolle/schrankschloss",
  "zutrittskontrolle.serverschrankschloss":  "/zutrittskontrolle/serverschrankschloss",
  "mobile-tk-preview.root":                  "/mobile-tk-preview",
};

function loadJson(loc, ns) {
  const p = path.join(SNAP, loc, `${ns}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function pickBase(root, baseKey) {
  if (!baseKey) {
    const out = {};
    for (const [k, v] of Object.entries(root)) if (!k.startsWith("_")) out[k] = v;
    return out;
  }
  return baseKey.split(".").reduce((o, k) => (o == null ? o : o[k]), root);
}

function flatten(obj, prefix = "", out = {}) {
  if (obj == null) return out;
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("_")) continue;
    const np = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, np, out);
    else if (Array.isArray(v)) v.forEach((it, i) => {
      if (it && typeof it === "object") flatten(it, `${np}.${i}`, out);
      else if (it != null) out[`${np}.${i}`] = String(it);
    });
    else if (v != null) out[np] = String(v);
  }
  return out;
}

const E = (s) => (s == null ? "NULL" : `'${String(s).replace(/'/g, "''")}'`);

const out = [];
out.push("-- ============================================================");
out.push("-- CMS-Light Vollsync aus Referenzprojekt");
out.push("-- Quelle: scripts/sync/source-raw/i18n (Snapshot)");
out.push("-- Erzeugt: " + new Date().toISOString());
out.push("-- ============================================================");
out.push("BEGIN;");
out.push("");

let stats = { pages: 0, sectionsTotal: 0, fieldsTotal: 0, newPages: 0, skipped: [] };

for (const [pageKey, ns, baseKey] of REGISTRY) {
  const de = loadJson("de", ns);
  const en = loadJson("en", ns);
  if (!de) { stats.skipped.push(pageKey + " (no DE snapshot)"); continue; }
  const deBase = pickBase(de, baseKey);
  const enBase = en ? pickBase(en, baseKey) : null;
  if (!deBase || typeof deBase !== "object") { stats.skipped.push(pageKey + " (base missing in DE)"); continue; }

  const flatDe = flatten(deBase);
  const flatEn = enBase ? flatten(enBase) : {};

  // Sections gruppieren
  const sectionFields = new Map();
  const allKeys = new Set([...Object.keys(flatDe), ...Object.keys(flatEn)]);
  for (const fullKey of allKeys) {
    let sec, fld;
    const dot = fullKey.indexOf(".");
    if (dot < 0) { sec = "content"; fld = fullKey; }
    else { sec = fullKey.slice(0, dot); fld = fullKey.slice(dot + 1); }
    if (!sectionFields.has(sec)) sectionFields.set(sec, new Map());
    const inner = sectionFields.get(sec);
    if (!inner.has(fld)) inner.set(fld, {});
    const e = inner.get(fld);
    if (flatDe[fullKey] != null) e.de = flatDe[fullKey];
    if (flatEn[fullKey] != null) e.en = flatEn[fullKey];
  }
  if (sectionFields.size === 0) { stats.skipped.push(pageKey + " (no fields)"); continue; }

  // Reihenfolge nach Erstauftritt im DE-Tree
  const naturalOrder = Object.keys(deBase).filter((k) => sectionFields.has(k));
  if (sectionFields.has("content") && !naturalOrder.includes("content")) naturalOrder.unshift("content");
  const allSections = [...sectionFields.keys()].sort((a, b) => {
    const ia = naturalOrder.indexOf(a), ib = naturalOrder.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b);
  });

  out.push(`-- ── ${pageKey} (${ns}${baseKey ? "." + baseKey : ""}) — ${allSections.length} sections`);

  // cms_pages
  const isNew = NEW_PAGES.has(pageKey);
  const route = NEW_ROUTES[pageKey] || null;
  out.push(`INSERT INTO public.cms_pages (page_key, route_path, page_type, status, is_active) VALUES (` +
    `${E(pageKey)}, ${E(route)}, 'T05', 'draft', false) ON CONFLICT (page_key) DO NOTHING;`);
  if (isNew) stats.newPages++;
  stats.pages++;

  // cms_sections
  let so = 0;
  const secRows = allSections.map((sk) => {
    so += 10;
    return `  (${E(pageKey)}, ${E(sk)}, 'content', ${so}, true)`;
  });
  out.push(`INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active) VALUES`);
  out.push(secRows.join(",\n") + `\nON CONFLICT (page_key, section_key) DO NOTHING;`);
  stats.sectionsTotal += allSections.length;

  // cms_section_fields  → UPSERT (Werte aus Referenz haben Vorrang)
  const fieldRows = [];
  for (const sk of allSections) {
    const inner = sectionFields.get(sk);
    for (const fk of [...inner.keys()].sort()) {
      const v = inner.get(fk);
      if (v.de != null) fieldRows.push(`  (${E(pageKey)}, ${E(sk)}, ${E(fk)}, 'de', ${E(v.de)})`);
      if (v.en != null) fieldRows.push(`  (${E(pageKey)}, ${E(sk)}, ${E(fk)}, 'en', ${E(v.en)})`);
    }
  }
  if (fieldRows.length) {
    // PostgreSQL hat ein Limit von ca. 32k Parametern; wir batchen je 500 Zeilen.
    const BATCH = 500;
    for (let i = 0; i < fieldRows.length; i += BATCH) {
      const slice = fieldRows.slice(i, i + BATCH);
      out.push(`INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES`);
      out.push(slice.join(",\n"));
      out.push(`ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = now();`);
    }
    stats.fieldsTotal += fieldRows.length;
  }

  // Whitelist
  out.push(`INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)`);
  out.push(`SELECT page_key, section_key, field_key, locale, true FROM public.cms_section_fields`);
  out.push(` WHERE page_key = ${E(pageKey)} ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;`);
  out.push("");
}

out.push("COMMIT;");
out.push("");
out.push("-- STATS: " + JSON.stringify(stats, null, 2).replace(/\n/g, "\n-- "));

const outPath = "/tmp/cms-sync.sql";
fs.writeFileSync(outPath, out.join("\n"));
console.error("WROTE", outPath);
console.error("STATS", JSON.stringify(stats, null, 2));
