/**
 * Registry für Sections, deren Felder nicht vom generischen Standard-
 * Workspace abgedeckt sind, weil sie von einer hartkodierten Page-
 * Komponente (z. B. `AnwendungDetailPage`, `BildungseinrichtungenPage`,
 * `ReferenzprojektDetailPage`) als bespoke Struktur gelesen werden.
 *
 * Wichtig:
 *  - Diese Sections nutzen einen Standard-Section-Typ (oft `content_v1`),
 *    haben aber zusätzliche Felder, die der Standard-Workspace nicht
 *    kennt. Ohne Eintrag hier landen sie in der orangen
 *    „Altbestand-Felder“-Box und sind NICHT bearbeitbar.
 *  - Mit einem Eintrag hier:
 *      a) zeigt der Workspace eine sinnvolle Beschriftung statt der
 *         Migrations-Warnung,
 *      b) macht der Workspace die nicht-Standard-Felder als echte
 *         DE/EN-Eingabefelder (`EditableField`) bearbeitbar.
 *  - Es wird NICHT der Renderer geändert, nicht migriert, keine
 *    Section-Struktur umgebaut. Nur Admin-UX + Schreibbarkeit über die
 *    bestehende RPC + Whitelist.
 *
 * Bewusst manuell gepflegt (kein Auto-Harvest), damit die Texte für
 * Redaktion sinnvoll lesbar bleiben.
 */

export interface BespokePageSectionInfo {
  /** Kurzlabel im Abschnittskopf, z. B. „Einrichtungsdaten Kita/Schule/Wohnheim“. */
  label: string;
  /** Ergänzende Beschreibung im Abschnittskopf. */
  description: string;
  /** Überschrift für den Block mit den nicht-Standard-Feldern. */
  legacyHeading: string;
  /** Hilfetext im Block — erklärt, warum diese Felder hier stehen. */
  legacyHint: string;
}

// ───────── exakte Treffer ──────────────────────────────────────────────

const EXACT: Record<string, BespokePageSectionInfo> = {
  // P-128 Kontakt (`KontaktPage.tsx`) — Kontaktkarten Telefon/E-Mail/
  // Adresse/Support. Der Sonderrenderer liest diese Felder direkt,
  // deshalb sind sie KEIN Altbestand.
  "kontakt.root|cards": {
    label: "Kontaktkarten (Telefon · E-Mail · Adresse · Support)",
    description:
      "Titel, Wert (Nummer/Adresse) und Erreichbarkeitszeiten der vier Kontaktkarten auf der Kontaktseite.",
    legacyHeading: "Felder der Kontaktkarten",
    legacyHint:
      'Diese Felder (phone.*, email.*, address.*, support.*) werden direkt von der Kontaktseite gelesen. „value“ ist die Nummer bzw. Adresse, „hours“ die Erreichbarkeit (z. B. „Mo–Fr, 8:00–17:00 Uhr“).',
  },
  "kontakt.root|sections": {
    label: "Abschnittstexte + Hotline-Hinweis",
    description:
      'Überschriften „So erreichen Sie uns“ / „Nachricht senden“ sowie der freie Hinweistext unter den Kontaktkarten.',
    legacyHeading: "Felder dieses Abschnitts",
    legacyHint:
      "Die Felder reach.title / reach.intro / form.title / text werden direkt von der Kontaktseite gelesen.",
  },
  "kontakt.root|form": {
    label: "Formular-Beschriftungen",
    description:
      "Feldbeschriftungen und Button-Text des Kontaktformulars (Vorname, Nachname, E-Mail, Betreff, Nachricht, Senden).",
    legacyHeading: "Felder des Formulars",
    legacyHint:
      "Diese Felder werden direkt vom Kontaktformular gelesen und sind kein Altbestand.",
  },


  // P-057 Bildungseinrichtungen — bereits in Batch davor eingetragen.
  "anwendungen.bildungseinrichtungen|sections": {
    label: "Abschnittslabels",
    description:
      "Überschriften und Linktext, die in jeder Einrichtungs-Karte (Kita, Schule, Wohnheim) wiederholt werden.",
    legacyHeading: "Sonderfelder dieser Page-Komponente",
    legacyHint:
      'Diese Felder werden direkt von der Seite „Bildungseinrichtungen“ gelesen (z. B. die Überschriften „Anforderungen“, „Leistungen“ und der Broschüren-Linktext).',
  },
  "anwendungen.bildungseinrichtungen|einrichtungen": {
    label: "Einrichtungsdaten Kita/Schule/Wohnheim",
    description:
      "Inhalte der drei Einrichtungsblöcke: Label, Titel, Intro, Bild sowie Anforderungen und Leistungen je Einrichtung.",
    legacyHeading: "Sonderfelder dieser Page-Komponente",
    legacyHint:
      'Diese Felder (kita.*, schule.*, wohnheim.*) werden direkt von der Seite „Bildungseinrichtungen“ gelesen. Bitte nicht in cards_v1 überführen und nicht löschen.',
  },

  // P-059 Gesundheitseinrichtungen
  "anwendungen.gesundheitseinrichtungen|section": {
    label: "Abschnittskopf (Eyebrow · Titel · Intro · CTA)",
    description:
      "Die kleine Einleitung über der Karten-Reihe und der Linktext „Mehr erfahren →“ auf den Karten.",
    legacyHeading: "Sonderfelder dieser Page-Komponente",
    legacyHint:
      "Diese Felder werden direkt von der Seite „Gesundheitseinrichtungen“ gelesen (Karten-Reihe Pflege/Klinik).",
  },
  "anwendungen.gesundheitseinrichtungen|cards": {
    label: "Einrichtungskarten Pflege/Klinik",
    description: "Titel, Beschreibung, Icon und drei Tag-Pillen pro Karte.",
    legacyHeading: "Sonderfelder dieser Page-Komponente",
    legacyHint:
      "Diese Felder (pflege.*, klinik.*) werden direkt von der Seite „Gesundheitseinrichtungen“ gelesen.",
  },

  // P-060 Öffentliche Hand
  "anwendungen.oeffentliche-hand|section": {
    label: "Abschnittskopf (Eyebrow · Titel · Intro · CTA)",
    description:
      "Die kleine Einleitung über der Karten-Reihe und der Linktext „Mehr erfahren →“ auf den Karten.",
    legacyHeading: "Sonderfelder dieser Page-Komponente",
    legacyHint:
      "Diese Felder werden direkt von der Seite „Öffentliche Hand“ gelesen (Karten-Reihe Behörde/Feuerwehr/Schwimmbad).",
  },
  "anwendungen.oeffentliche-hand|cards": {
    label: "Einrichtungskarten Behörde/Feuerwehr/Schwimmbad",
    description: "Titel, Beschreibung, Icon und Tag-Pillen pro Karte.",
    legacyHeading: "Sonderfelder dieser Page-Komponente",
    legacyHint:
      "Diese Felder (behoerde.*, feuerwehr.*, schwimmbad.*) werden direkt von der Seite „Öffentliche Hand“ gelesen.",
  },

  // P-077 Referenzprojekte (Index)
  "anwendungen.referenzprojekte|content": {
    label: "Index-Kopf (Kicker · Titel · Untertitel · Intro · Detail-Linktext)",
    description:
      "Texte über der Projektliste sowie der Link „Details ansehen →“ auf jeder Projektkarte.",
    legacyHeading: "Sonderfelder dieser Page-Komponente",
    legacyHint:
      'Diese Felder werden direkt von der Seite „Referenzprojekte“ gelesen.',
  },
};

// ───────── AnwendungDetailPage (geteilte Komponente) ───────────────────
// Alle Anwendungs-Detailseiten unter `anwendungen.*` (nicht .root, nicht
// .referenzprojekte*, nicht .objektloesungen, nicht die drei Übersichts-
// seiten) nutzen dieselbe Komponente und lesen content/leistungen/
// systembausteine/broschure mit bespoke Feldstrukturen.

const SHARED_DETAIL_PAGES = new Set<string>([
  "anwendungen.behoerde",
  "anwendungen.bidirektionale-video",
  "anwendungen.concierge",
  "anwendungen.digitale-namensverwaltung",
  "anwendungen.einfamilienhaus",
  "anwendungen.feuerwehr",
  "anwendungen.feuerwehrdurchsage",
  "anwendungen.grossanlage",
  "anwendungen.interne-kommunikation",
  "anwendungen.klinik",
  "anwendungen.mehrfamilienhaus",
  "anwendungen.mobile-tuerkommunikation",
  "anwendungen.pflege",
  "anwendungen.sanierung",
  "anwendungen.schwimmbad",
  "anwendungen.zutrittskontrolle-bcm",
]);

const SHARED_DETAIL_SECTIONS: Record<string, BespokePageSectionInfo> = {
  content: {
    label: "Beschreibungsblock (Label · Headline · Intro · Beschreibung)",
    description:
      "Die vier Texte direkt unter dem Hero (kleine Zeile, Überschrift, Intro, Beschreibung).",
    legacyHeading: "Sonderfelder dieser Page-Komponente",
    legacyHint:
      'Diese Felder (label/headline/intro/description) werden direkt von der Anwendungs-Detailseite gelesen. Sie sind kein Altbestand.',
  },
  leistungen: {
    label: "Leistungen (Bereiche mit Listenpunkten)",
    description:
      "Pro Bereich (z. B. „Sicherheit“, „Kommunikation“) ein Titel und mehrere Listenpunkte (items.0, items.1, …).",
    legacyHeading: "Sonderfelder dieser Page-Komponente",
    legacyHint:
      'Diese Felder (<bereich>.title und <bereich>.items.N) werden direkt von der Anwendungs-Detailseite gelesen.',
  },
  systembausteine: {
    label: "Systembausteine (Label · Titel · Beschreibung · Link)",
    description:
      "Liste der TCS-Systembausteine, die zu dieser Anwendung passen (z. B. Außenstation, Leitstelle, BCM).",
    legacyHeading: "Sonderfelder dieser Page-Komponente",
    legacyHint:
      'Diese Felder (<key>.label/title/description/href) werden direkt von der Anwendungs-Detailseite gelesen.',
  },
  broschure: {
    label: "Broschüren-Link (Label · URL)",
    description: "Der Download-Link auf die PDF-Broschüre dieser Anwendung.",
    legacyHeading: "Sonderfelder dieser Page-Komponente",
    legacyHint:
      'Diese Felder (label/href) werden direkt von der Anwendungs-Detailseite gelesen.',
  },
};

// ───────── ReferenzprojektDetailPage (geteilte Komponente) ─────────────
// Alle Detail-Seiten unter `anwendungen.referenzprojekte.*` nutzen
// dieselbe Komponente.

const REFPROJ_DETAIL_SECTIONS: Record<string, BespokePageSectionInfo> = {
  hero: {
    label: "Hero-Kopfdaten (Eyebrow · Headline · Subline · Meta)",
    description:
      "Texte im Seitenkopf des Referenzprojekts inkl. Meta-Angaben (Einheiten, Jahr).",
    legacyHeading: "Sonderfelder dieser Page-Komponente",
    legacyHint:
      "Felder wie meta_units / meta_year / subline werden direkt von der Referenzprojekt-Detailseite gelesen und sind kein Altbestand.",
  },
  beschreibung: {
    label: "Projekt-Beschreibung (Intro · Fließtext)",
    description: "Einleitung und Fließtext zum Projekt.",
    legacyHeading: "Sonderfelder dieser Page-Komponente",
    legacyHint:
      "Felder intro/body werden direkt von der Referenzprojekt-Detailseite gelesen.",
  },
  highlights: {
    label: "Projekt-Highlights (Titel · Listenpunkte)",
    description: "Liste der wichtigsten Projekt-Highlights.",
    legacyHeading: "Sonderfelder dieser Page-Komponente",
    legacyHint:
      "Felder title/items werden direkt von der Referenzprojekt-Detailseite gelesen (list_v1).",
  },
  systems: {
    label: "Verbaute TCS-Systeme (Titel · Listenpunkte)",
    description: "Liste der im Projekt verbauten TCS-Systeme.",
    legacyHeading: "Sonderfelder dieser Page-Komponente",
    legacyHint:
      "Felder title/items werden direkt von der Referenzprojekt-Detailseite gelesen (list_v1).",
  },
  gallery: {
    label: "Galerie (optionaler Titel)",
    description: "Galerie-Block. Bilder kommen aus dem Asset-Workflow.",
    legacyHeading: "Sonderfelder dieser Page-Komponente",
    legacyHint:
      "Eventuelle Sondertexte werden direkt von der Referenzprojekt-Detailseite gelesen.",
  },
};

const REFPROJ_PREFIX = "anwendungen.referenzprojekte.";

// ───────── Lookup ──────────────────────────────────────────────────────

export function getBespokePageSectionInfo(
  pageKey: string,
  sectionKey: string,
): BespokePageSectionInfo | null {
  const exact = EXACT[`${pageKey}|${sectionKey}`];
  if (exact) return exact;

  if (SHARED_DETAIL_PAGES.has(pageKey)) {
    const info = SHARED_DETAIL_SECTIONS[sectionKey];
    if (info) return info;
  }

  if (pageKey.startsWith(REFPROJ_PREFIX)) {
    const info = REFPROJ_DETAIL_SECTIONS[sectionKey];
    if (info) return info;
  }

  return null;
}
