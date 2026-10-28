# Übersetzungswerkzeug im CMS-Light-Admin

Stand: 2026-09-11. Bereich **Übersetzungen** in `/admin`, direkt nach
„Wahrheits-Check".

Gilt ausschließlich für die interne CMS-Light-Datenbank. Die zentrale
Produktdatenbank wird nicht berührt — weder als Sprachsteuerung noch als
Schreibziel.

## Was das Werkzeug macht

- Zeigt alle Sprachen aus der zentralen Sprachliste der Datenbank
  (`cms_locales`): Deutsch als verbindliche Quelle, Englisch und Polnisch
  aktiv, Niederländisch und Dänisch vorbereitet und ausgeschaltet.
- **Kompakte Sprachzeile** im Kopf: je Sprache zwei klar getrennte Zustände,
  beide aus `cms_locales` (keine zweite Wahrheit):
  - Haken „Im CMS bearbeitbar" = `is_active`
  - Auge „Auf der Website sichtbar" = `is_public`
  Deutsch ist Quellsprache; beide Schalter sind dort gesperrt. Eine Sprache, die
  bearbeitbar aber nicht öffentlich ist (derzeit Polnisch), bleibt im CMS
  auswählbar und erscheint nicht im öffentlichen Sprachumschalter. Geschrieben
  wird ausschließlich über `rpc_admin_set_locale_visibility` (wiederholbar,
  Protokoll in `cms_locale_visibility_audit`); „öffentlich" ist nur möglich,
  wenn „bearbeitbar" gesetzt ist. Das Ausblenden einer öffentlichen Sprache und
  das Abschalten der Bearbeitbarkeit verlangen eine Bestätigung.
  Der öffentliche Sprachumschalter der Website liest ausschließlich
  `cms_locales.is_public = true` (`src/i18n/usePublicLocales.ts`).
- **Hauptablauf in fünf sichtbaren Schritten** (oben, immer offen):
  „1 Sprache wählen", „2 Anbieter und Modell wählen", „3 Fehlende Texte prüfen",
  „4 Übersetzung starten", „5 Fortschritt". Anbieter und Modell sind bewusst
  nicht versteckt; die Voreinstellung kommt aus der Datenbank (derzeit
  Gemini 3.6 Flash für große Mengen, GPT-6 Astra als Qualitätsoption). Eine Zeile
  „Aktiv: …" nennt Anbieter, Modell-Kennung und ob ein Schlüssel hinterlegt ist.
  Die Hauptschaltfläche benennt die Sprache ausdrücklich, z. B. „Alle fehlenden
  Texte in Englisch übersetzen".
- Nach Sprach-, Anbieter- oder Modellwechsel wird eine alte Vorschau verworfen
  und muss neu berechnet werden.
- **Zwei getrennte Zählungen**, damit die Abdeckung nicht missverständlich ist:
  - Übersetzungsstand: „vorhanden", „fehlt", „muss aktualisiert werden",
    „Fehler". Die technischen Zustände (maschinell, geprüft, veraltet) stehen
    nur im Detail.
  - Vorbereitung: „noch nicht vorbereitet" — deutscher Quelltext vorhanden,
    Zielsprachenfeld intern noch nicht zur Bearbeitung aktiviert. Das ist kein
    Fehler und keine Übersetzung; diese Texte werden nicht mitgezählt und nicht
    übersetzt (derzeit 628 bei Englisch, 15.451 bei Polnisch).
    (Frühere Bezeichnung „nicht freigeschaltet" ist ersetzt.)
- **Geplant und übersetzt wird ausschließlich Fehlendes und Veraltetes.**
  Vorhandene, besonders von Hand geprüfte Texte werden nie neu übersetzt.
- Alles Weitere liegt in Akkordeons, standardmäßig geschlossen: „Abdeckung nach
  Inhaltsbereich", „Seiten und Umfang", „Texte ansehen und bearbeiten",
  „QA und Berichte", „Bisherige Läufe", „Weitere Modelleinstellungen"
  (Schlüsselstatus, eigenes Modell, Preistabelle).
- Umfang wählbar: ganze Sprache (Voreinstellung), eine Seite oder mehrere
  ausgewählte Seiten.

- **Vorschau ist Pflicht** vor jedem Start und muss vom Redakteur mit einem
  Haken bestätigt werden: fehlend/veraltet, vorhanden (unberührt), geschützt
  (von Hand geprüft), noch nicht vorbereitet, erwartete Modellaufrufe und
  Kostenhinweis (ausdrücklich Schätzung, keine Zusage).
- **Verarbeitung läuft auf dem Server.** Nach dem Start legt der Dienst eine
  Nachschau im Minutentakt in der Datenbank an. Diese holt sich jeweils einen
  offenen Lauf, arbeitet ihn in kleinen Schritten weiter und gibt ihn wieder
  frei. Ein geschlossener oder abgestürzter Browser hält die Arbeit nicht an;
  bleibt ein Schritt hängen, nimmt die nächste Nachschau den Lauf nach spätestens
  zwei Minuten wieder auf. Sind keine Läufe mehr offen, entfernt sich die
  Nachschau selbst — es gibt also keine dauerhafte Hintergrundlast. Der Browser
  fragt nur den Stand ab und bedient Pausieren, Fortsetzen und Abbrechen.
- **Eine einzige Laufanzeige**: Gesamt, erledigt, offen, Fehler, Abdeckung,
  Phase, Tempo, Restzeit, Laufzeit, Kostenschätzung. Die Restzeit erscheint nur
  bei einem aktiven gespeicherten Lauf und erst nach mindestens 25 verarbeiteten
  Texten; vorher steht dort „Wird nach den ersten Verarbeitungsschritten
  berechnet". Es gibt keine zweite Restzeitangabe.
  Ein neu geladener Browser sieht denselben Stand — keine Anzeige-Kosmetik.

- Prüfbericht (Qualität) mit CSV-Ausgabe: leere Ziele, unverändert deutsche
  Texte, fehlende Platzhalter, HTML-Abweichungen, Links, Markenbegriffe,
  auffällige Längen und nachträglich geänderte Quelltexte. Aus dem Bericht
  springt man direkt an die betroffene Textstelle.

## Feste Regeln

- Deutsch ist Quelle und wird niemals maschinell überschrieben.
- Manuell gespeicherte Zieltexte („geprüft") werden nie überschrieben;
  sie erscheinen in der Vorschau als „geschützt".
- Maschinelle Werte sind im internen Arbeitsstand sofort sichtbar, tragen aber
  immer die Kennzeichnung „maschinell" samt Anbieter, Modell und Prüfsumme des
  deutschen Textes. Ändert sich der deutsche Text, wird der maschinelle
  Zielwert automatisch „veraltet".
- Gleiche Auswahl zweimal starten erzeugt keinen zweiten Lauf: die Auswahl hat
  eine Kennung; ein offener Lauf wird fortgesetzt statt doppelt angelegt.
- Bereits übersetzte Texte werden aus dem Übersetzungsspeicher übernommen,
  statt erneut zu bezahlen.

## Grenzen und Schutz (ohne Login)

Der Arbeitsbereich läuft weiterhin ohne Anmeldung. Der Schutz liegt deshalb
vollständig auf dem Server:

- Nur Anfragen von den eigenen Ursprüngen (Produktionsadresse, projektgebundene
  Vorschau, lokale Entwicklung) werden angenommen; alles andere wird abgewiesen.
- Serverseitige Mengenbremse: 10 Starts / 5 Minuten, 90 Schritte / Minute,
  6.000 Modellaufrufe / Tag.
- Höchstens 25 Texte pro Arbeitsschritt.
- Kostendeckel je Lauf (Standard 5 €, ganze Sprache 25 €); wird er erreicht,
  hält der Lauf an statt weiterzulaufen.
- Ein Lauf über eine **ganze Sprache** ist gesperrt, solange auf dem Server
  keine Freigabe hinterlegt ist (Projekt-Geheimnis
  `CMS_TRANSLATION_GLOBAL_TOKEN`).
  **Architekturgrenze:** Der Serverdienst meldet dem Browser nur, *ob* eine
  Freigabe eingerichtet ist — der Wert wird nie ausgeliefert. Für den Start
  eines Gesamtlaufs muss die Freigabe dem Serverdienst weiterhin mitgegeben und
  dort geprüft werden. Im täglichen Ablauf gibt es deshalb **keine** Eingabe für
  Sprachkürzel oder Geheimnisse. Ist keine Freigabe eingerichtet, zeigt Schritt 4
  einen geschlossenen Bereich „Einmalige Einrichtung erforderlich" mit dem
  Hinweis, dass der CMS-Bereich derzeit keine Anmeldung hat und ein Administrator
  einmalig einen privaten Freigabecode in den Projekteinstellungen hinterlegen
  muss; die Hauptschaltfläche bleibt gesperrt (auch über die Seiten-/Alle-Auswahl
  gibt es keine Umgehung). Nur in diesem geschlossenen Bereich steht ein
  optionales Feld „Admin-Freigabecode für diese Sitzung": Der Wert geht
  ausschließlich an den geschützten Serverdienst, wird nicht gespeichert, steht
  nicht im Code, nicht im Frontend und nicht in der Datenbank. Der technische
  Geheimnis-Name steht nur in dieser Dokumentation, nicht in der Oberfläche.

- Anbieterschlüssel liegen ausschließlich als Projekt-Geheimnisse auf dem
  Server. Der Browser sieht nur „konfiguriert" / „nicht konfiguriert".
- Geschrieben wird nur über die geschützte interne Datenbankfunktion, die
  ausschließlich der Serverdienst ausführen darf.

## Anbieter und Modelle

Auswählbar sind Lovable AI (Standard, kein eigener Schlüssel nötig), Google
Gemini, Anthropic Claude und die DeepL API. Für die drei letzten muss der
jeweilige Schlüssel als Projekt-Geheimnis hinterlegt sein, sonst sind sie grau.

Die Modell-Liste steht **nur** in der Datenbank
(`cms_translation_provider_rates`) — es gibt keine zweite Liste in Oberfläche
oder Serverfunktion. Der Standard ist die Zeile mit `is_default`. Stand
2026-09-11 für Lovable AI:

| Modell | Rolle |
| --- | --- |
| `google/gemini-3.6-flash` | **Standard**, empfohlen für große Läufe |
| `openai/gpt-6-astra` | Qualitätsmodus für schwierige Fachtexte und Nachkontrolle |
| `google/gemini-3.7-flash` | Alternative |
| `google/gemini-3.1-flash-lite` | günstigste Variante |
| `google/gemini-3.1-pro-preview` | Vorschau-Modell |

Die früheren Gemini-2.5-Presets sind aus der Auswahl entfernt. Die
Einzelfeld-Übersetzung im Inhalte-Editor nutzt dieselbe Abstimmung
(Gemini 3.6 Flash, Ersatz Gemini 3.1 Flash Lite).

OpenAI-Modelle laufen über den `/v1/responses`-Weg des Gateways mit Streaming,
Google-Modelle über den Chat-Weg. Vorschau, Kostenhinweis, Start und der
laufende Auftrag benutzen immer dieselbe Modell-Kennung.

**„Anderes Modell"** öffnet ein echtes Eingabefeld. Zulässig sind nur
Kennungen der Form `anbieter/modell`; die Prüfregel kommt vom Statusabruf des
Servers, dieselbe Regel greift serverseitig (Antwort `model_id_invalid`).
Solange die Kennung nicht stimmt, sind Vorschau und Start gesperrt.

**Kosten:** Für die Gateway-Modelle ist bewusst **kein** Zeichenpreis
gepflegt (Satz 0), weil die Abrechnung über Lovable-AI-Credits nach Token
läuft. Das Werkzeug meldet dann ehrlich „Kostenschätzung nicht verfügbar"
statt einer Scheingenauigkeit; der Kostendeckel je Lauf kann dadurch nicht
greifen — es gelten die Mengenbremsen (Texte je Schritt, Schritte je Minute,
Modellaufrufe je Tag).

## Neue Sprache aufnehmen

Eine weitere Sprache wird in der Sprachliste der Datenbank angelegt bzw.
aktiviert — nicht im Code. Danach erscheint sie im Werkzeug, in der
Abdeckungsübersicht und als Zielsprache. Öffentlich sichtbar wird sie erst,
wenn sie in der Sprachliste ausdrücklich als öffentlich markiert ist.

## Automatische Vorbereitung einer Zielsprache

Damit ein Gesamtlauf wirklich alle deutschen Texte umfasst, wird jede aktive
Zielsprache automatisch vorbereitet (`rpc_internal_prepare_translation_locale`,
wiederholbar):

- Freigeschaltet werden ausschließlich die tatsächlich übersetzbaren deutschen
  Bausteinfelder (`cms_translatable_source_fields`, geprüft über
  `cms_field_is_translatable` + `cms_text_is_translatable`). Links, Kennungen,
  Symbole, Schalter und andere technische Werte bleiben ausgeschlossen.
- Seitentitel, Navigations-Beschriftungen/-Beschreibungen und
  Bild-Alternativtexte gelten für jede aktive, nicht als Quelle markierte
  Sprache als vorbereitet — sie hängen nicht mehr am Zufall einer einzelnen
  Seiten-Freigabezeile.
- Ausgelöst wird die Vorbereitung durch „Fehlende Texte prüfen“ **und**
  serverseitig beim Start (`rpc_internal_translation_prepare_and_dry_run`) sowie
  beim Aktivieren einer Sprache. Kein Browserzustand entscheidet.
- Vorhandene Zielwerte, besonders von Hand geprüfte, werden nie überschrieben.
- Die Feldfreigabe prüft die Sprache gegen die Sprachliste (`cms_locales`)
  statt gegen eine feste Liste.
- Stand nach der Umstellung (2026-09-11): PL 15.493 fehlend / 362 vorhanden /
  0 nicht vorbereitet; EN 10 offen / 0 nicht vorbereitet.
- „Technische Ausnahmen“ erscheinen in der Oberfläche nur noch, wenn wirklich
  ein Rest übrig bleibt (z. B. entfernter Baustein) — mit Erklärung, ohne
  Handarbeit an einzelnen Feldern.


## Datenbereiche (Stand 2026-09-11)

Der Arbeitsbereich rechnet mit einer gemeinsamen Gesamtmenge von **15.855**
deutschen Texten:

| Datenbereich | deutsche Texte |
| --- | --- |
| Baustein-Text | 15.278 |
| Seitentitel | 125 |
| Navigation: Beschriftung | 141 |
| Navigation: Beschreibung | 42 |
| Bild-Alternativtext | 269 |

Für Bild-Alternativtexte gilt genau eine Quelle: `cms_assets.alt_de/alt_en/alt_pl`.
Die alten Spalten `alt_text_*` werden nur noch gelesen, nie geschrieben.

Stand der Sprachen: Englisch 15.792 übersetzt (63 offen), Polnisch 362
(maschinell, nur die zwei Pilotseiten), Niederländisch und Dänisch vorbereitet
und ausgeschaltet.

Vorbereitungs-Gate: Seitentitel, Navigationstexte und Bild-Alternativtexte
gelten für automatische Läufe nur dann als vorbereitet, wenn die zugehörige Seite
in der jeweiligen Sprache bereits für die Redaktion vorbereitet ist. Deshalb
bleibt Polnisch auch in diesen Bereichen auf die Pilotseiten begrenzt. Englisch:
628 Texte sind noch nicht vorbereitet, Polnisch 15.451 (verifiziert 2026-09-11).

## Texte durchsuchen und von Hand übersetzen

Im Akkordeon „Texte ansehen und bearbeiten" liegt die Liste aller übersetzbaren
Texte: Zielsprache (aus der Sprachliste der Datenbank), Status, Seite, Suche und
Datenbereiche als Filter, 50 Einträge je Seite, deutsche Quelle neben Zieltext,
Status/Herkunft, Sprung in den Inhalte-Bereich und CSV-Ausgabe der angezeigten
Seite. Der Statusfilter steht standardmäßig auf **„Fehlt"**; weitere Auswahl:
„Muss aktualisiert werden", „Vorhanden", „Alle" sowie die technischen
Detailzustände. Von Hand gespeicherte Zieltexte gelten als „von Hand geprüft"
und werden von automatischen Läufen nie überschrieben. Texte, die für diese
Sprache noch nicht vorbereitet sind, lassen sich nicht bearbeiten.


Im Inhalte-Bereich lässt sich zusätzlich einstellen, welche Zielsprachen neben
Deutsch angezeigt werden. Die Auswahl kommt aus der Sprachliste der Datenbank;
gespeichert werden dieselben Datenbankwerte wie im Arbeitsbereich.

## Berichte

- Prüflauf als CSV (mit Spalte „Bereich").
- „Bericht drucken / als PDF": druckfertige Übersicht aus Abdeckung und Prüflauf.

## Laufanzeige (Schritt 5)

Es gibt genau eine Fortschrittsanzeige, und sie kommt ausschließlich aus dem
gespeicherten Serverlauf. Nach dem Start meldet die Oberfläche sofort „Auftrag
angenommen", zeigt Lauf-Nummer, Phase, verarbeitet/übersetzt/übersprungen/
offen/Fehler sowie die letzte Serveraktivität und aktualisiert sich alle drei
Sekunden selbst — ein zweiter Klick ist nicht nötig.

- Fortschritt = übersetzt + übersprungen + fehlgeschlagen im Verhältnis zu
  geplant. Ein Lauf mit 53 übersetzt und 4 übersprungen von 57 ist 100 % und
  gilt als abgeschlossen.
- Restzeit: bei zu wenigen Messwerten steht „Noch keine belastbare Restzeit".
  Bleibt der Server länger still, steht „Wartet auf nächsten Serverschritt;
  letzte Aktivität …" statt einer hochgerechneten Fantasiezeit.
- Nach einem Neuladen wird ein offener Lauf automatisch wiedergefunden. Ein
  erneuter Klick startet keinen zweiten Lauf, sondern meldet „Lauf läuft
  bereits" und zeigt denselben Lauf.
- Der Freigabecode bleibt für die geöffnete Arbeitssitzung wirksam („Für diese
  Sitzung freigeschaltet") und wird weder in der Datenbank noch im Browser
  gespeichert. Der Serverschutz bleibt unverändert.

## Sprachen verwalten

Oben im Arbeitsbereich liegt die kompakte Sprachliste: Name, Eigenname und Code
(z. B. Kroatisch / Hrvatski / HR), Haken „im CMS bearbeitbar" und Auge „auf der
Website sichtbar". Beide Zustände sind getrennt: eine Sprache darf intern
gepflegt und trotzdem nicht öffentlich sein. Deutsch ist Quelle und bleibt
immer beides.

„Sprache hinzufügen" bietet eine durchsuchbare Auswahl gängiger Sprachcodes und
zusätzlich die Eingabe eines geprüften eigenen Codes. Der Katalog ist nur
Auswahlhilfe — die Wahrheit steht in der Sprachtabelle der Datenbank. Neue
Sprachen entstehen bewusst inaktiv und nicht öffentlich.

## Datenmodell für beliebig viele Sprachen

Seitentitel, Navigationsbezeichnungen/-beschreibungen und Bild-Alttexte liegen
jetzt zusätzlich in eigenen Sprachtabellen (je Datensatz eine Zeile pro
Sprache). Öffentliche Seiten, der CMS-Editor und die Übersetzungsliste lesen
zuerst dort; die alten Spalten für Deutsch/Englisch/Polnisch bleiben vorerst als
Übergangs-Rückfall erhalten und werden nicht gelöscht. Fehlt eine Übersetzung,
greift die in der Sprachtabelle eingestellte Rückfallsprache, zuletzt Deutsch.
Ein Integritätsbericht meldet unbekannte Sprachen, verwaiste Übersetzungen,
fehlende Quellen und Doppeleinträge.

Speichern aus dem Admin schreibt jetzt immer in die neuen Sprachtabellen und
zusätzlich in die alten Spalten, solange diese bestehen. Das gilt für
Seitentitel, Navigationsbezeichnung, Navigationsbeschreibung und Bild-Alttext.
Die zulässigen Sprachen kommen dabei aus der Sprachtabelle, nicht mehr aus einer
festen Liste Deutsch/Englisch/Polnisch.

## Öffentlicher Sprachumschalter

In der Kopfzeile steht ein kompaktes Sprachmenü (Symbol + aktueller Code) für
Desktop und Mobil, mit Tastaturbedienung, Fokusrahmen und Beschriftung für
Screenreader. Die Auswahl kommt ausschließlich aus den öffentlich gestellten
Sprachen der Datenbank, sortiert nach der dort gepflegten Reihenfolge. Die
URL-Logik bleibt unverändert.

## Bewusst offen

- Login / Rollenmodell (eigenes Folgeprojekt). Bis dahin gilt der
  No-Login-Arbeitsbereich mit den oben genannten Serverbremsen.
- Redaktionelle PL-Freigabe („geprüft") und PL-Veröffentlichung.
