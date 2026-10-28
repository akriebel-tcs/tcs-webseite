/**
 * Glossar für das Admin-UI.
 *
 * Ziel: Fachbegriffe werden im UI beim ersten Auftreten automatisch
 * kurz erklärt (Klammer-Hinweis + Tooltip). Mitarbeiter ohne
 * Vorwissen verstehen die Oberfläche, gleichzeitig Lerneffekt.
 *
 * Pflege-Regel: kurz, alltagsnah, ohne weitere Buzzwords.
 * Wenn ein Begriff im Code mehrfach vorkommt, hier nur EIN Eintrag.
 */

export interface GlossaryEntry {
  /** Anzeigename, wie er im UI steht (case-sensitive Match nicht nötig). */
  term: string;
  /** Sehr kurze Erklärung — passt in eine Klammer. */
  short: string;
  /** Längere Erklärung für Tooltip / Glossar-Liste. */
  long?: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  eyebrow: {
    term: "Eyebrow",
    short: "kleine Zeile über der Überschrift",
    long: "Kurzer Text oberhalb einer Hauptüberschrift, oft als Kategorie oder Thema. Englisch wörtlich „Augenbraue“.",
  },
  headline: {
    term: "Headline",
    short: "Hauptüberschrift eines Blocks",
    long: "Die zentrale Überschrift, die den Block oder die Karte überschreibt. In Karten-Blöcken (card_v1) z. B. der Produktname.",
  },
  beschreibung: {
    term: "Beschreibung",
    short: "Fließtext unter Eyebrow und Headline",
    long: "Erklärender Text, der die Karte/den Block ausführt. In Karten-Blöcken steht hier der Produktbeschreibungstext.",
  },
  card_v1: {
    term: "Karte (card_v1)",
    short: "ein Eintrag in einem Scroller- oder Akkordeon-Block",
    long: "Ein einzelnes Element innerhalb einer Eltern-Gruppe — z. B. eine Außenstation im Block „Außenstationen“. Karten haben Eyebrow, Headline, Beschreibung und ein Bild. Sie lassen sich kopieren, sortieren, deaktivieren und neu anlegen.",
  },
  subline: {
    term: "Subline",
    short: "Unterzeile zur Überschrift",
    long: "Kurzer erklärender Text direkt unter einer Überschrift.",
  },
  slug: {
    term: "Slug",
    short: "der lesbare URL-Teil",
    long: "Der hintere, lesbare Teil einer Webadresse, z. B. „ueber-uns“ in /de/ueber-uns.",
  },
  nav_area: {
    term: "nav_area",
    short: "Navigationsbereich, z. B. Hauptmenü oder Footer",
    long: "Trennt die Navigation in Bereiche: main = Hauptmenü, meta = oben rechts, footer = Spaltenmenü unten, footer_bottom = unterste Zeile.",
  },
  parent_id: {
    term: "parent_id",
    short: "Verweis auf den übergeordneten Knoten",
    long: "Macht aus der Liste einen Baum: Ein Eintrag zeigt mit parent_id auf seinen Eltern-Eintrag.",
  },
  sort_order: {
    term: "sort_order",
    short: "Reihenfolge unter gleichen Geschwistern",
    long: "Zahl, die die Position innerhalb derselben Ebene festlegt. Kleinere Zahl = weiter vorn.",
  },
  node_key: {
    term: "node_key",
    short: "interner Schlüssel eines Eintrags",
    long: "Stabiler technischer Name eines Navigations­knotens, ändert sich nie und wird im Code referenziert.",
  },
  page_key: {
    term: "page_key",
    short: "interner Schlüssel einer Seite",
    long: "Stabiler technischer Name einer Seite, verbindet Datenbank-Eintrag und Code.",
  },
  route_path: {
    term: "route_path",
    short: "Adresspfad der Seite",
    long: "Der Pfad-Teil der URL, z. B. /de/leistungen.",
  },
  label_de: {
    term: "label_de",
    short: "deutsche Beschriftung",
    long: "Sichtbarer Text auf Deutsch (z. B. der Menü-Eintrag, wie ihn Besucher lesen).",
  },
  label_en: {
    term: "label_en",
    short: "englische Beschriftung",
    long: "Sichtbarer Text auf Englisch.",
  },
  page_type: {
    term: "page_type",
    short: "Art der Seite",
    long: "Kategorie der Seite, z. B. Standardseite, Übersicht, Detailseite. Steuert ggf. Layout-Vorgaben.",
  },
  rpc: {
    term: "RPC",
    short: "Datenbank-Funktion mit klar erlaubten Aktionen",
    long: "Remote Procedure Call — eine vorab definierte Funktion in der Datenbank. Nur sie darf schreiben, das Frontend ruft sie auf.",
  },
  rls: {
    term: "RLS",
    short: "Datenbank-Zugriffsregeln pro Zeile",
    long: "Row Level Security — Regeln, wer welche Datenzeilen sehen oder ändern darf.",
  },
  draft: {
    term: "Draft",
    short: "Entwurf, noch nicht öffentlich",
    long: "Status einer Seite: nur im Admin sichtbar, erscheint nicht auf der öffentlichen Website.",
  },
  drift: {
    term: "Drift",
    short: "Abweichung zwischen Code und Datenbank",
    long: "Wenn Code-Stand und Datenbank-Stand nicht mehr übereinstimmen, sprechen wir von „Drift“.",
  },
  cms: {
    term: "CMS",
    short: "Redaktionssystem zum Pflegen der Inhalte",
    long: "Content-Management-System — Oberfläche, in der Redakteure Inhalte ändern, ohne Code anzufassen.",
  },
  dnd: {
    term: "Drag & Drop",
    short: "Ziehen und Ablegen mit der Maus",
    long: "Einträge mit gedrückter Maustaste an eine neue Position ziehen. „DnD“ ist die englische Abkürzung dafür.",
  },
  tree: {
    term: "Tree",
    short: "Baum-Darstellung mit Eltern und Kindern",
    long: "Hierarchische Darstellung: jeder Eintrag kann untergeordnete Einträge haben — wie Ordner und Unterordner.",
  },
  hero: {
    term: "Hero",
    short: "großer Aufmacher-Bereich oben auf der Seite",
    long: "Der oberste, prominent gestaltete Bereich einer Seite mit Hauptüberschrift, kurzem Einleitungstext und meist einem Bild.",
  },
  answer_first: {
    term: "Answer-First",
    short: "kurze Antwort gleich zu Beginn",
    long: "Inhaltsmuster: direkt nach dem Hero eine knappe, klare Antwort auf die Hauptfrage der Seite — bevor Details folgen.",
  },
  intro: {
    term: "Intro",
    short: "einleitender Textabschnitt",
    long: "Kurzer Fließtext, der das Thema der Seite einführt und zum weiteren Inhalt überleitet.",
  },
  header: {
    term: "Header",
    short: "Kopfbereich einer Seite",
    long: "Der obere Bereich der Website mit Logo, Hauptmenü und Meta-Links — sichtbar auf jeder Seite.",
  },
  main: {
    term: "Main",
    short: "Hauptinhalt der Seite",
    long: "Der zentrale Inhaltsbereich zwischen Header und Footer — hier steht das, was die Seite eigentlich zeigt.",
  },
  footer: {
    term: "Footer",
    short: "Fußbereich einer Seite",
    long: "Der untere Bereich der Website mit Spaltenmenü, Rechtshinweisen und Copyright — sichtbar auf jeder Seite.",
  },
  section_key: {
    term: "section_key",
    short: "interner Schlüssel eines Seitenabschnitts",
    long: "Stabiler technischer Name eines Abschnitts (z. B. „hero“, „intro“) — verbindet Datenbank-Eintrag und Code.",
  },
  field_key: {
    term: "field_key",
    short: "interner Schlüssel eines Inhaltsfeldes",
    long: "Stabiler technischer Name eines einzelnen Feldes innerhalb eines Abschnitts (z. B. „headline“, „text“).",
  },
  locale: {
    term: "locale",
    short: "Sprache des Inhalts",
    long: "Sprachkennung wie „de“ oder „en“ — bestimmt, in welcher Sprache ein Inhaltswert vorliegt.",
  },
  status: {
    term: "status",
    short: "Veröffentlichungs-Status (z. B. draft / published)",
    long: "Gibt an, ob eine Seite Entwurf, geprüft oder veröffentlicht ist. „draft“ = noch nicht öffentlich.",
  },
  is_active: {
    term: "is_active",
    short: "ein/aus-Schalter",
    long: "true = sichtbar/aktiv, false = ausgeblendet. Wird hier nur angezeigt, nicht verändert.",
  },
  page_registry: {
    term: "PAGE_REGISTRY",
    short: "Seitenverzeichnis im Code",
    long: "Liste aller Seiten, die im Code-Stand existieren — die „Wahrheit“, mit der die Datenbank abgeglichen wird.",
  },
  cms_pages: {
    term: "cms_pages",
    short: "Datenbank-Tabelle aller Seiten",
    long: "Tabelle in der Datenbank, in der alle Seiten-Datensätze (page_key, route_path, page_type, status) liegen.",
  },
  cms_navigation_nodes: {
    term: "cms_navigation_nodes",
    short: "Datenbank-Tabelle der Navigationseinträge",
    long: "Tabelle in der Datenbank, in der alle Menüpunkte mit Hierarchie und Beschriftung liegen.",
  },
  workbench: {
    term: "Workbench",
    short: "Arbeitsfläche mit mehreren Bereichen",
    long: "Englisch für „Werkbank“ — eine Oberfläche, in der links die Auswahl und rechts die Details liegen.",
  },
  readonly: {
    term: "Nur Leseansicht",
    short: "Nichts kann hier geändert werden",
    long: "Diese Ansicht zeigt Daten nur an. Speichern, Verschieben oder Löschen ist hier bewusst nicht möglich.",
  },
  editable: {
    term: "Bearbeiten möglich",
    short: "Hier kannst du Werte ändern und speichern",
    long: "Änderungen werden über eine eng begrenzte Datenbank-Funktion gespeichert — andere Felder bleiben unangetastet.",
  },
  page_instanz: {
    term: "Page-Instanz",
    short: "konkreter Seiten-Datensatz in der Datenbank",
    long: "Eine „Instanz“ einer Seite ist ihr Eintrag in der DB-Tabelle cms_pages — Gegenstück zum Code-Eintrag in PAGE_REGISTRY.",
  },
  cms_pilot: {
    term: "CMS-Pilot",
    short: "erste Pilotseite zum Testen des Redaktionssystems",
    long: "Eine einzelne, eng begrenzte Seite, an der die Bearbeitung über das CMS erprobt wird, bevor weitere Seiten folgen.",
  },
  block: {
    term: "Block",
    short: "Seitenblock — ein eigenständiger Inhaltsabschnitt einer Seite",
    long: "Ein Seitenblock („Block“) ist ein eigenständiger Abschnitt einer Seite — z. B. Hero, Intro, ein Scroller mit Karten oder ein Akkordeon. Mehrere Blöcke ergeben in fester Reihenfolge die Seite. Technisch heißt ein Block in Datenbank und Code „Section“ (cms_sections). Im Admin-UI sprechen wir bewusst nur von „Block“, damit es für Redakteure verständlich bleibt.",
  },
  section: {
    term: "Section",
    short: "technische Bezeichnung für einen Block",
    long: "„Section“ ist der englische Code-Begriff für einen Seitenblock (Tabelle cms_sections). Im Admin-UI verwenden wir stattdessen das deutsche Wort „Block“. Beide meinen dasselbe.",
  },
  slot: {
    term: "Slot",
    short: "fester Platz für ein Bild oder einen Inhalt",
    long: "Eine vordefinierte Stelle in einem Block, die genau ein Element aufnimmt — z. B. „Hero-Bild“ oder „Bild des Blocks Türkommunikation“.",
  },
  cta: {
    term: "CTA",
    short: "Handlungsaufforderung (Button oder Link)",
    long: "Call-to-Action — der Text auf einem Button oder Link, der zu einer Aktion einlädt, z. B. „Mehr erfahren“ oder „Kontakt aufnehmen“.",
  },
  persona: {
    term: "Persona",
    short: "Zielgruppen-Rolle (z. B. Architekt, Bauherr)",
    long: "Eine Besucher-Rolle, für die eigene Inhalte gepflegt werden können. TCS unterscheidet aktuell sechs Personas (Bauherren, Architekten, Wohnungswirtschaft, Fachplaner, Handwerk, Fachhandel).",
  },
};

export function getGlossary(key: string): GlossaryEntry | undefined {
  return GLOSSARY[key.toLowerCase()];
}
