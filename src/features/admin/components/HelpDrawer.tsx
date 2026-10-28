/**
 * HelpDrawer — Hilfe & Legende als Schublade vom linken Rand.
 *
 * Etappe `cms-light-admin-help-drawer-1`:
 * Vom linken Bildschirmrand kommende, einklappbare Hilfe für Redakteure.
 * Erklärt in einfacher Sprache, was die Icons, Farben und Pfeile bedeuten,
 * wie typische Arbeitsabläufe gehen (Block kopieren, Seite duplizieren),
 * und bietet eine Suche im Glossar.
 *
 * Bewusst KEIN modaler Backdrop — der Editor dahinter bleibt sichtbar und
 * benutzbar. Schmaler Streifen ganz links als immer sichtbarer Öffner.
 */
import { ChevronLeft, ChevronRight, HelpCircle, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { blockTypeStyle } from "@/features/admin/lib/blockTypeStyle";
import { GLOSSARY } from "@/features/admin/lib/glossary";

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {title}
    </h3>
    <div className="space-y-1.5 text-sm leading-snug">{children}</div>
  </section>
);

const Row: React.FC<{ symbol: React.ReactNode; label: string; children: React.ReactNode }> = ({
  symbol,
  label,
  children,
}) => (
  <div className="grid grid-cols-[2.25rem_minmax(6rem,8rem)_1fr] items-start gap-2 rounded border bg-card/40 px-2 py-1.5">
    <span className="flex h-6 w-9 items-center justify-center rounded bg-muted font-mono text-sm">
      {symbol}
    </span>
    <strong className="text-xs">{label}</strong>
    <span className="text-xs text-muted-foreground">{children}</span>
  </div>
);

const ColorRow: React.FC<{
  className: string;
  label: string;
  children: React.ReactNode;
}> = ({ className, label, children }) => (
  <div className="grid grid-cols-[2.25rem_minmax(6rem,8rem)_1fr] items-start gap-2 rounded border bg-card/40 px-2 py-1.5">
    <span className={"h-6 w-9 rounded " + className} />
    <strong className="text-xs">{label}</strong>
    <span className="text-xs text-muted-foreground">{children}</span>
  </div>
);

const HelpDrawer: React.FC<Props> = ({ open, onOpenChange }) => {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const glossaryHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    const entries = Object.entries(GLOSSARY);
    if (!q) return entries.slice(0, 10);
    return entries.filter(([key, entry]) => {
      return (
        key.includes(q) ||
        entry.term.toLowerCase().includes(q) ||
        entry.short.toLowerCase().includes(q) ||
        (entry.long ?? "").toLowerCase().includes(q)
      );
    });
  }, [query]);

  return (
    <>
      {/* Immer sichtbarer Streifen am linken Rand. */}
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        title={open ? "Hilfe schließen" : "Hilfe & Legende öffnen (Schublade von links)"}
        aria-label={open ? "Hilfe schließen" : "Hilfe öffnen"}
        className="fixed left-0 top-1/2 z-50 flex h-40 w-7 -translate-y-1/2 flex-col items-center justify-between rounded-r-md border border-l-0 bg-secondary py-2 text-secondary-foreground shadow-lg transition-colors hover:bg-secondary/80"
      >
        {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="flex flex-col items-center gap-1">
          <HelpCircle className="h-4 w-4" />
          <span
            className="select-none text-[10px] font-semibold uppercase tracking-wider"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Hilfe
          </span>
        </span>
        {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      <aside
        aria-hidden={!open}
        className={
          "fixed left-0 top-0 z-40 flex h-screen w-[24rem] max-w-[90vw] flex-col border-r bg-background shadow-2xl transition-transform duration-300 ease-out " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        <header className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
          <div>
            <h2 className="text-sm font-semibold">Hilfe &amp; Legende</h2>
            <p className="text-[11px] text-muted-foreground">
              Was bedeuten die Symbole, Farben und Pfeile? Wie geht ein bestimmter Ablauf?
              Mit <kbd className="rounded border bg-background px-1 font-mono">Esc</kbd> schließen.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Hilfe schließen"
            title="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4">
          <Section title="Grundprinzip CMS-Light (Sollregeln, Stand 2026-09-15)">
            <div className="rounded border bg-card/40 p-2 text-xs leading-relaxed text-muted-foreground">
              <p>
                <strong className="text-foreground">DB-first / Eine Wahrheit (Ziel, keine Gesamtgarantie).</strong>{" "}
                Redaktionelle Inhalte (Texte, Bilder, Karten, Reihenfolge, Sichtbarkeit,
                Navigation) sollen in der Datenbank liegen und hier im Admin gepflegt werden.
                Der Code soll nur Layout und Komponenten liefern — nicht die Inhalte.
                Noch bestehende statische Inhalte werden schrittweise zugeordnet.
              </p>
              <p className="mt-1.5">
                <strong className="text-foreground">Spiegelregel (Sollregel, keine Garantie):</strong>{" "}
                Was du im Admin änderst (Inhalt, Sortierung, „aus/ein"), <em>soll</em> öffentlich
                genauso erscheinen. Bitte nach dem Speichern die Vorschau
                <strong className="text-foreground"> aktualisieren</strong> und mit dem Admin-Wert
                vergleichen. Weicht etwas ab: Kurz-ID und erwarteten Wert melden — nicht im Code
                nachbessern.
              </p>
              <p className="mt-1.5">
                <strong className="text-foreground">Änderungen am Aufbau:</strong> Bestehende
                Inhalte und Karten dürfen jederzeit gepflegt werden. Neue Seiten, neue Block-Typen,
                neue Layouts oder Struktur-Umbauten laufen über den{" "}
                <strong className="text-foreground">Redaktionsprompt</strong> (siehe unten „Wann
                Redaktionsprompt?"). Verbindlich ist das Dachdokument
                <code className="mx-1 rounded border bg-background px-1 text-[11px]">
                  docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md
                </code>
                (Abschnitt 2 und 11).
              </p>
            </div>
          </Section>


          <Section title="Bausteine im Überblick">
            <Row symbol="🌐" label="Seite (Page)">
              Eine ganze Webseite mit eigener Adresse (z. B. „Eingangssysteme").
              Kurz-ID <strong>P-…</strong>. Enthält mehrere Blöcke in fester Reihenfolge.
            </Row>
            <Row symbol="≣" label="Navigationsknoten">
              Ein Menüeintrag — im Hauptmenü, Footer, Meta oder Persona-Bereich.
              Kurz-ID <strong>N-…</strong>. Zeigt auf eine Seite, ist aber selbst keine Seite.
            </Row>
            <Row symbol="▭" label="Block (Section)">
              Ein Inhaltsabschnitt einer Seite (Hero, Intro, Karten-Scroller, FAQ, CTA …).
              Kurz-ID <strong>B-…</strong>. Reihenfolge und „aus/ein" sollen sich öffentlich
              abbilden — nach dem Speichern in der Vorschau aktualisieren und prüfen.

            </Row>
            <Row symbol="🗃" label="Feld">
              Ein einzelner Inhaltswert in einem Block (z. B. Eyebrow, Headline, Beschreibung,
              Linkziel). Nur Felder, die in der Whitelist stehen, sind hier bearbeitbar.
            </Row>
            <Row symbol="🖼" label="Asset (Bild/Datei)">
              Bild oder Datei, einem Block-Slot zugeordnet (z. B. Hero-Bild).
              Kurz-ID <strong>A-…</strong>.
            </Row>
            <Row symbol="🃏" label="Karte (card_v1)">
              Ein einzelnes Element innerhalb eines Karten-Blocks (Scroller, Raster, Wechselteaser).
              Karten sind selbst Blöcke (B-…) — als Kinder ihres Eltern-Blocks.
              Hier pflegst du Bild, Eyebrow, Headline, Text und Linkziel der Karte.
            </Row>
          </Section>

          <Section title={`„Hauptmenü aus" — was heißt das?`}>
            <div className="rounded border bg-card/40 p-2 text-xs leading-relaxed text-muted-foreground">
              <p>
                Wenn an einem Navigationsknoten <strong className="text-foreground">„Hauptmenü aus"</strong>
                steht, bedeutet das <strong>nicht</strong>, dass die Seite offline ist.
              </p>
              <ul className="mt-1.5 list-disc pl-4">
                <li>Die Seite kann <strong>live und erreichbar</strong> sein.</li>
                <li>Sie erscheint nur nicht oben im Hauptmenü.</li>
                <li>
                  Erreichbar bleibt sie über Karten, Footer, Direkt-Link oder andere
                  Navigationsbereiche.
                </li>
              </ul>
              <p className="mt-1.5">
                Wenn eine Seite wirklich nicht mehr öffentlich sichtbar sein soll, muss
                zusätzlich die <strong className="text-foreground">Seite selbst</strong>
                ausgeblendet oder archiviert werden — nicht nur der Menüeintrag.
              </p>
            </div>
          </Section>

          <Section title="Wann Redaktionsprompt?">
            <div className="rounded border bg-card/40 p-2 text-xs leading-relaxed text-muted-foreground">
              <p>
                Folgendes geht hier <strong className="text-foreground">direkt im Admin</strong>:
              </p>
              <ul className="mt-1 list-disc pl-4">
                <li>Texte, Eyebrow, Headlines, Beschreibungen, Bildunterschriften ändern</li>
                <li>Bilder austauschen, Alt-Texte pflegen</li>
                <li>Karten anlegen, sortieren, ausblenden, verlinken</li>
                <li>FAQ-Einträge und CTA-Texte pflegen</li>
                <li>Reihenfolge und Sichtbarkeit bestehender Blöcke ändern</li>
                <li>Navigation umsortieren, ausblenden, neue Knoten zu bestehenden Seiten</li>
                <li>
                  Sprachen pflegen — aber nur die, die am jeweiligen Feld tatsächlich
                  freigeschaltet sind (steht am Feld selbst; nicht jede Sprache ist überall
                  bearbeitbar)
                </li>

              </ul>
              <p className="mt-2">
                Für folgendes <strong className="text-foreground">bitte den Redaktionsprompt</strong>
                an Lovable nutzen — nicht improvisieren:
              </p>
              <ul className="mt-1 list-disc pl-4">
                <li>Neue Seite oder neue Unterseite anlegen</li>
                <li>Neuer Block-Typ / Section-Typ, neues Layout</li>
                <li>Struktur-Umbau (neue Felder, neue Karten-Familie, Renderer-Sonderfälle)</li>
                <li>Unklare Wünsche, bei denen Inhalt und Struktur sich vermischen</li>
              </ul>
              <p className="mt-2">
                Schablone und Regeln stehen im Dachdokument{" "}
                <code className="rounded border bg-background px-1 text-[11px]">
                  docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md
                </code>{" "}
                (Abschnitt 2).
              </p>
            </div>
          </Section>

          <Section title="Symbole im Navigations-Baum (linke Spalte)">

            <Row symbol="⋮⋮" label="Greifen & Ziehen">
              Anfasser am Zeilenanfang. Mit Maus ziehen oder per Tastatur
              (<kbd className="rounded border bg-background px-1 font-mono">Leertaste</kbd> greifen,
              Pfeile bewegen, erneut <kbd className="rounded border bg-background px-1 font-mono">Leertaste</kbd> ablegen).
            </Row>
            <Row symbol="▸ ▾" label="Aufklappen / Zuklappen">
              Zeigt oder versteckt die Unter-Einträge einer Seite (Blöcke) bzw. eines Knotens (Kind-Knoten).
            </Row>
            <Row symbol="←" label="Ausrücken">
              Hebt einen Eintrag eine Ebene hoch (wird kein Kind mehr vom Vorgänger).
              <em> Achtet nicht</em> auf das Ein-/Ausklappen der Spalten — dafür sind die seitlichen Streifen zuständig.
            </Row>
            <Row symbol="→" label="Einrücken">
              Macht den Eintrag zum Kind des darüber liegenden Eintrags (eine Ebene tiefer).
            </Row>
            <Row symbol="↑ ↓" label="Hoch / Runter">
              Verschiebt einen Block oder Menüeintrag eine Position nach oben bzw. unten.
              Die Reihenfolge soll öffentlich genauso erscheinen — Vorschau aktualisieren
              und vergleichen.

            </Row>
            <Row symbol="👁" label="Ausblenden (aktiv)">
              <strong>Zeile schalten:</strong> ein klickbares „Auge" in einer Baum-Zeile blendet diesen
              Eintrag auf der Website aus (er bleibt in der Datenbank). Ist er bereits versteckt,
              steht hier 🚫 und ein Klick blendet ihn wieder ein. <em>Öffnet keine Vorschau.</em>
            </Row>
            <Row symbol="🚫" label="Wieder einblenden">
              Zeigt einen ausgeblendeten Eintrag wieder auf der Website an.
            </Row>
            <Row symbol="🗑" label="Löschen">
              Direkt aus der Zeile: löscht diesen Menüeintrag oder Block (Rückfrage erscheint).
              Bei Seiten wird zunächst auf „archiviert" gesetzt; ein zweiter Klick (✕) löscht endgültig.
            </Row>
            <Row symbol="⋯" label="Weitere Aktionen">
              Drei-Punkte-Menü an einem Block: „In Zwischenablage kopieren",
              „Ausblenden / Einblenden", „Löschen…".
            </Row>
          </Section>

          <Section title="Symbole in der Seiten-Werkzeugleiste (oben)">
            <Row symbol="⧉" label="Seite duplizieren">
              Kopiert die Seite mit Texten, Blöcken samt Unterkarten und Bildzuordnungen
              (geprüfte Strukturkopie). Das Aussehen der Kopie danach bitte selbst in der
              Vorschau prüfen — eine allgemeine Sichtabnahme für jede Seite gibt es nicht.

            </Row>
            <Row symbol="＋" label="Knoten anlegen">
              Neuer Menüeintrag (z. B. um eine duplizierte Seite ins Menü zu hängen).
              Wird zunächst inaktiv angelegt.
            </Row>
            <Row symbol="📦" label="Seite archivieren">
              Stellt die Seite auf „archiviert" — verschwindet von der Website, bleibt in der Datenbank.
            </Row>
            <Row symbol="↩" label="Seite wiederherstellen">
              Holt eine archivierte Seite zurück (Status wird auf „Entwurf" gesetzt).
            </Row>
            <Row symbol="✕" label="Endgültig löschen">
              Entfernt eine archivierte Seite unwiderruflich. Nur möglich, wenn kein Menüeintrag mehr darauf zeigt.
            </Row>
          </Section>

          <Section title="Spalten ein- und ausklappen">
            <p className="text-xs text-muted-foreground">
              Der Editor hat drei Bereiche: <strong>Baum</strong> links, <strong>Arbeitsbereich</strong> in der Mitte,
              <strong> Live-Vorschau</strong> als Schublade rechts. Eingeklappte Spalten erscheinen als
              schmaler Streifen am Rand mit Beschriftung — Klick öffnet sie wieder.
            </p>
            <Row symbol="◀" label="Baum einklappen">
              Pfeil im Kopf der linken Spalte. Klappt den Baum zu einem schmalen Streifen ein.
              Wieder öffnen: Streifen anklicken.
            </Row>
            <Row symbol="⇔" label="Arbeitsbereich klappen">
              Pfeil im Kopf der mittleren Spalte. Macht die Arbeitsfläche schmaler oder breiter.
            </Row>
            <Row symbol="▶" label="Live-Vorschau öffnen">
              Senkrechter Streifen am <strong>rechten</strong> Bildschirmrand mit Beschriftung „Live-Vorschau".
              Klick öffnet die Schublade über etwa die halbe Breite. Schließen per
              <kbd className="rounded border bg-background px-1 font-mono">Esc</kbd> oder ✕.
            </Row>
          </Section>


          <Section title="Kurz-IDs im Baum (N, P, B, A)">
            <p className="text-xs text-muted-foreground">
              Jede Zeile im Baum trägt eine kleine, farbige Kurz-ID. Sie ist die schnellste Art,
              auf einen Eintrag zu zeigen („bitte B-203 anpassen"). Klick kopiert die ID.
            </p>
            <div className="grid grid-cols-[3.5rem_minmax(5rem,7rem)_1fr] items-start gap-2 rounded border bg-card/40 px-2 py-1.5">
              <span className="inline-flex h-6 items-center justify-center rounded border border-blue-500/20 bg-blue-500/10 font-mono text-xs font-semibold text-blue-700">
                N-009
              </span>
              <strong className="text-xs">Navigation</strong>
              <span className="text-xs text-muted-foreground">
                Ein <strong>Menüeintrag</strong> (Knoten in der Hauptnavigation, Footer, Personas …).
                Verweist auf eine Seite, ist aber nicht die Seite selbst. Blaue Fläche = „das ist ein Link im Menü".
              </span>
            </div>
            <div className="grid grid-cols-[3.5rem_minmax(5rem,7rem)_1fr] items-start gap-2 rounded border bg-card/40 px-2 py-1.5">
              <span className="inline-flex h-6 items-center justify-center rounded border border-primary/20 bg-primary/10 font-mono text-xs font-semibold text-primary">
                P-079
              </span>
              <strong className="text-xs">Page (Seite)</strong>
              <span className="text-xs text-muted-foreground">
                Eine <strong>ganze Seite</strong> der Website (z. B. „Eingangssysteme"). Enthält mehrere Blöcke.
                Dunkler Ton = Hauptobjekt, mit dem die meisten Aktionen verbunden sind.
              </span>
            </div>
            <div className="grid grid-cols-[3.5rem_minmax(5rem,7rem)_1fr] items-start gap-2 rounded border bg-card/40 px-2 py-1.5">
              <span className="inline-flex h-6 items-center justify-center rounded border border-amber-500/20 bg-amber-500/10 font-mono text-xs font-semibold text-amber-800">
                B-325
              </span>
              <strong className="text-xs">Block</strong>
              <span className="text-xs text-muted-foreground">
                Ein <strong>Inhaltsblock</strong> innerhalb einer Seite (Hero, Vorteile, CTA …).
                Ocker = „liegt auf einer Seite drauf". Die Farbe links daneben (Streifen) zeigt zusätzlich den Block-Typ.
              </span>
            </div>
            <div className="grid grid-cols-[3.5rem_minmax(5rem,7rem)_1fr] items-start gap-2 rounded border bg-card/40 px-2 py-1.5">
              <span className="inline-flex h-6 items-center justify-center rounded border border-emerald-500/20 bg-emerald-500/10 font-mono text-xs font-semibold text-emerald-700">
                A-404
              </span>
              <strong className="text-xs">Asset (Bild/Datei)</strong>
              <span className="text-xs text-muted-foreground">
                Ein <strong>Bild oder Dokument</strong>, das einem Block zugeordnet ist
                (z. B. Hero-Bild eines Blocks). Hellgrün = Medien-Element.
              </span>
            </div>
          </Section>

          <Section title="Block-Farben im Baum (Typ-Erkennung)">
            <p className="text-xs text-muted-foreground">
              Jeder Block hat links einen farbigen Streifen, der den <strong>Block-Typ</strong> zeigt.
              So sieht man auf einen Blick, ob es ein Hero, ein Inhalt, ein Call-to-Action oder eine
              Karten-Sammlung ist — ohne den Block öffnen zu müssen.
            </p>
            {[
              "hero",
              "content",
              "feature",
              "benefits",
              "card_v1",
              "products",
              "cta",
              "content_block_v1",
              "stats_v1",
              "rich",
            ].map((key) => {
              const s = blockTypeStyle(key);
              return (
                <div
                  key={key}
                  className={
                    "grid grid-cols-[3.5rem_minmax(5rem,7rem)_1fr] items-start gap-2 rounded border-l-4 border border-border bg-card/40 px-2 py-1.5 " +
                    s.borderClass
                  }
                >
                  <span
                    className={
                      "inline-flex h-6 items-center justify-center rounded px-1.5 font-mono text-[10px] font-semibold " +
                      s.badgeClass
                    }
                  >
                    {s.label}
                  </span>
                  <strong className="text-xs">{key}</strong>
                  <span className="text-xs text-muted-foreground">{s.description}</span>
                </div>
              );
            })}
            <p className="text-[11px] text-muted-foreground">
              Hinweis: „Inhalt" wurde von Grau auf <strong>Lime-Grün</strong> umgestellt, damit es nicht
              wie ausgegraut/inaktiv wirkt. Inaktive Einträge erkennt man weiterhin am gedimmten Text
              und am Status-Punkt am Zeilenanfang.
            </p>
          </Section>


          <Section title="Typische Abläufe">
            <div className="rounded border bg-card/40 p-2 text-xs leading-relaxed">
              <strong className="block text-sm">Bestehenden Inhalt ändern</strong>
              <ol className="mt-1 list-decimal pl-4 text-muted-foreground">
                <li>Seite im Baum öffnen, gewünschten Block markieren.</li>
                <li>Im Arbeitsbereich rechts das Feld auswählen und Text/Bild ändern.</li>
                <li>
                  Speichern. Danach in der Vorschau rechts auf „Aktualisieren" tippen und den
                  angezeigten Wert mit dem Admin-Wert vergleichen. Weicht er ab: Kurz-ID und
                  erwarteten Wert melden.
                </li>

                <li>Wenn ein Feld nicht editierbar ist: es steht (noch) nicht in der Whitelist — bitte Rückfrage, nicht umgehen.</li>
              </ol>
            </div>
            <div className="rounded border bg-card/40 p-2 text-xs leading-relaxed">
              <strong className="block text-sm">Karte verlinken</strong>
              <ol className="mt-1 list-decimal pl-4 text-muted-foreground">
                <li>Karten-Block (Scroller oder Raster) öffnen, gewünschte Karte auswählen.</li>
                <li>Im Feld „Linkziel" die Ziel-Seite/Route eintragen.</li>
                <li>Speichern, Vorschau aktualisieren und prüfen, ob der Klick auf die richtige Seite führt.</li>
                <li>Bei interner Verlinkung: Route muss zu einer existierenden Seite passen — sonst Rückfrage.</li>
              </ol>
            </div>
            <div className="rounded border bg-card/40 p-2 text-xs leading-relaxed">
              <strong className="block text-sm">Neue Unterseite — nur über Prompt</strong>
              <p className="mt-1 text-muted-foreground">
                Neue Seiten oder Unterseiten werden <strong>nicht</strong> hier improvisiert.
                Bitte den Redaktionsprompt an Lovable verwenden — damit Seitentyp, Bausteine,
                Navigation, Breadcrumb und Pflicht-Blöcke (FAQ/CTA) sauber angelegt werden.
              </p>
            </div>
            <div className="rounded border bg-card/40 p-2 text-xs leading-relaxed">
              <strong className="block text-sm">Keine Strukturänderung improvisieren</strong>
              <p className="mt-1 text-muted-foreground">
                Wenn ein Wunsch neue Felder, einen neuen Block-Typ, ein neues Layout oder
                Renderer-Sonderlogik braucht: <strong>stoppen und Redaktionsprompt verwenden.</strong>
                So bleibt die „Eine Wahrheit" stabil.
              </p>
            </div>
            <div className="rounded border bg-card/40 p-2 text-xs leading-relaxed">
              <strong className="block text-sm">Block von A nach B kopieren</strong>

              <ol className="mt-1 list-decimal pl-4 text-muted-foreground">
                <li>Im Baum links Quellseite öffnen, Block markieren.</li>
                <li>Beim Block auf „In Zwischenablage" klicken — oben erscheint ein Banner.</li>
                <li>Im Baum zur Zielseite wechseln und „Hier einfügen" klicken.</li>
                <li>
                  Falls der Name schon vergeben ist, wird automatisch
                  „_kopie" angehängt.
                </li>
              </ol>
            </div>
            <div className="rounded border bg-card/40 p-2 text-xs leading-relaxed">
              <strong className="block text-sm">Seite duplizieren</strong>
              <ol className="mt-1 list-decimal pl-4 text-muted-foreground">
                <li>Seite im Baum auswählen.</li>
                <li>Oben rechts in der Aktionsleiste auf „⧉ Seite duplizieren" klicken.</li>
                <li>Neue Adresse vergeben, bestätigen.</li>
                <li>Optional: gleich einen Menüeintrag für die Kopie anlegen.</li>
              </ol>
            </div>
            <div className="rounded border bg-card/40 p-2 text-xs leading-relaxed">
              <strong className="block text-sm">Vorschau nutzen</strong>
              <p className="mt-1 text-muted-foreground">
                Streifen am rechten Bildschirmrand klicken → Schublade öffnet sich über die halbe
                Breite. Nach Änderungen im Admin im Vorschau-Kopf auf „Aktualisieren" tippen,
                damit die Seite neu geladen wird. Schließen per Esc oder X.
              </p>
            </div>
          </Section>

          <Section title="Glossar durchsuchen">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="z. B. Eyebrow, Slug, nav_area …"
                className="w-full rounded border bg-background py-1.5 pl-8 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <ul className="space-y-1.5">
              {glossaryHits.length === 0 && (
                <li className="text-xs text-muted-foreground">
                  Keine passenden Begriffe gefunden.
                </li>
              )}
              {glossaryHits.map(([key, entry]) => (
                <li key={key} className="rounded border bg-card/40 px-2 py-1.5">
                  <strong className="block text-xs">{entry.term}</strong>
                  <span className="text-[11px] text-muted-foreground">
                    {entry.long ?? entry.short}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </aside>
    </>
  );
};

export default HelpDrawer;
