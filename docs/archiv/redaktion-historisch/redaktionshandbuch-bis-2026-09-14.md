<!-- ARCHIVKOPIE -->

> **Historische Fassung — kein Ist-Zustand.**
> Ursprungspfad: `docs/03-redaktion/redaktionshandbuch.md`
> Stand dieser Fassung: 2026-05-17 (geprüft nach Batch 28)
> Archiviert am: 2026-09-14 (Etappe 1, Doku-Nachtrag)
> Aktiver Nachfolger: docs/03-redaktion/redaktionshandbuch.md (jetzt kurzer Wegweiser) + Dachdokument Abschnitt 11
>
> Diese Fassung ist **keine aktuelle Betriebs-, Sprach- oder
> Freigabezusage** und **kein aktueller Prüfwert**. Genannte Sollwerte,
> Audit-Zahlen, Sprachregeln und Abschlussregeln sind Historie.
> Relative Verweise wurden auf die Archivtiefe umgestellt; Basis der
> Originalpfade ist `docs/03-redaktion/redaktionshandbuch.md`.

---

# Redaktionshandbuch CMS-Light

> Für das interne Redaktionsteam der TCS-Webseite.
> Stand: 2026-05-17 (geprüft nach Batch 28 — fachlich weiterhin gültig).
>
> **Für Prompts an Lovable:** ausschließlich die Schablone im Dachdokument
> verwenden: [`redaktions-uebergabe-und-prompt-regeln.md`](../../03-redaktion/redaktions-uebergabe-und-prompt-regeln.md),
> Abschnitt 2. Bei Konflikt gilt das Dachdokument.

---

## 1. Worum geht es?

Im `/admin` pflegt ihr **Inhalte** der TCS-Webseite:

- Texte (Überschriften, Subline, Fließtext, Buttontexte) auf Deutsch und Englisch
- Bilder austauschen, Alt-Text setzen
- Reihenfolge von Blöcken
- Sichtbarkeit von Blöcken
- Seiten als Entwurf duplizieren
- Navigations-Beschriftungen

> **Grundsatz:** Es gibt keine grundsätzlich ausgeschlossenen
> Änderungswünsche. Entscheidend ist, **auf welcher Ebene** eine Änderung
> umgesetzt wird. Der Admin ist die Ebene für **redaktionelle Arbeit an
> bestehenden Inhalten** — nicht mehr und nicht weniger.

---

## 2. Die vier Änderungsebenen

### Änderungsebene 1: Admin / CMS-Light

Tägliche redaktionelle Pflege:

- Texte und Buttontexte ändern (sofern Feld vorhanden)
- DE/EN-Felder pflegen
- vorhandene Bilder austauschen, Alt-Texte pflegen
- Reihenfolge vorhandener Blöcke ändern (sofern Drag & Drop angeboten)
- Sichtbarkeit vorhandener Blöcke ein-/ausschalten
- Navigations-Beschriftungen ändern (sofern freigegeben)
- bestehende Seiteninhalte pflegen
- Seite als Entwurf duplizieren (sofern Funktion vorhanden)

→ **Macht das Redaktionsteam selbst.**

### Änderungsebene 2: Lovable / Prompt / Code

Technische, strukturelle oder gestalterische Änderungen:

- neue Templates, neue Layouts, Layoutgrößen ändern
- Bildgrößen / Bildverhalten ändern
- neue Seitentypen, neue Inhaltsblöcke, neue Bildplätze
- neue technische Felder, neue Buttons an neuer Stelle
- neue Logik, neue Konfigurator-Anbindungen
- neue Produktkatalog-Funktionen
- größere Navigationsstrukturen ändern
- CI-/Designänderungen
- ganze Seiten umbauen oder entfernen

Diese Änderungen sind **ausdrücklich möglich**. Sie werden nicht im
Redaktionsadmin gemacht, sondern über Lovable / Prompt / Code — damit sie
kontrolliert umgesetzt, geprüft und dokumentiert werden.

→ **Wird über Lovable-Prompts umgesetzt** durch die für den Bereich
verantwortliche Person aus Marketing/Redaktion. Bei Bedarf technischer
Gegencheck.

### Änderungsebene 3: Produktdatenbank / Produktkatalog

Produktdaten:

- Artikelnummern, Produktbezeichnungen
- technische Daten, Preise (falls vorhanden)
- **Produktbilder im Katalog / auf Produktdetailseiten**
- Produktkategorien
- Filterlogik, PDP-Daten

Redaktionelle **Website-Bilder** (Hero, Intro, Persona-Karten,
Content-Sektionen) gehören dagegen ins CMS-Light (Ebene 1) und werden im
Admin gepflegt.

→ **Eigener Produkt-/Katalogprozess.** Nicht im CMS-Light pflegen.

### Änderungsebene 4: Strategie / CI / Grundkonzept

Grundlegende Entscheidungen:

- CI komplett ändern
- Website-Struktur grundsätzlich ändern
- Hauptnavigation neu denken
- anderes Designsystem einführen
- Seitenkonzept neu aufbauen
- Produktbereich neu strukturieren

→ **Fachlich entscheiden**, danach technisch über Ebene 2 umsetzen.

---

## 3. Drei Arbeitsprinzipien

1. **Admin ist der Standardweg für bestehende redaktionelle Inhalte.**
   Lovable-Prompts sind für Struktur, Funktion, Layout, Datenmodell und
   größere Bulk-Anpassungen vorgesehen — nicht für die tägliche Pflege
   einzelner Texte und Bilder.
2. **Technische Schlüssel nicht erfinden.** Felder wie `page_key`,
   `section_key`, `field_key` werden vom System verwaltet. Nicht raten,
   nicht umbenennen. Wenn ein Feld grau ist: Änderungswunsch melden.
3. **Nach dem Speichern in der Vorschau prüfen.** Bei veröffentlichten,
   aktiven und verlinkten Seiten erscheint die Änderung danach öffentlich;
   bei Entwürfen, deaktivierten Blöcken oder nicht verlinkten Seiten nur
   im Admin / in der Vorschau. Wenn eine erwartete öffentliche Änderung
   nicht erscheint: melden, nicht doppelt speichern.

---

## 4. Begriffe in einfacher Sprache

| Begriff | Bedeutung |
|---|---|
| **Seite** | Eine URL der Website, z. B. `/anwendungen/pflege`. In der DB: ein Eintrag in `cms_pages` mit einem `page_key`. |
| **Template** | Bauplan einer Seite (Welche Blocktypen sind erlaubt?). Wird über Ebene 2 geändert. |
| **Navigationsknoten** | Ein Eintrag im Menü. Kann auf eine Seite zeigen oder reine Struktur sein. |
| **Bereich / Section / Block** | Ein abgegrenzter Inhaltsblock auf einer Seite (Hero, Intro, Persona-Karte …). |
| **Feld** | Ein einzelnes änderbares Element in einem Block (z. B. Headline). Immer DE und EN. |
| **Asset / Bild** | Hochgeladene Bilddatei plus Alt-Text, verknüpft mit Seite + Block. |
| **Fokuspunkt** | Optionaler Bildausschnitt-Anker für beschnittene Darstellungen. |
| **Draft / Entwurf** | Seite ist angelegt, aber nicht öffentlich. |
| **Published / Veröffentlicht** | Seite ist live und in der öffentlichen Navigation sichtbar (sofern verlinkt). |
| **Whitelist (Freigabe)** | Liste der Felder, die im Admin geändert werden können. Was nicht freigegeben ist, ist eine Ebene-2-Änderung. |

### Kurz-IDs in der Oberfläche

| Präfix | Bedeutung |
|---|---|
| **N-…** | Navigationsknoten |
| **P-…** | Page (Seite) |
| **B-…** | Block / Section |
| **A-…** | Asset (Bild) |

Bei Problemen bitte die Kurz-ID mit melden.

---

## 5. Standard-Workflows im Admin (Ebene 1)

### 5.1 Text ändern

1. `/admin` öffnen
2. Im Strukturbaum die Seite auswählen
3. Im Detail-Panel den Block (Section) wählen
4. Feld auswählen, DE oder EN ändern
5. **Speichern**
6. Öffentliche Vorschau prüfen

> Grau / nur lesbar = Feld ist (noch) nicht in der Freigabe-Liste. Bitte als
> Änderungswunsch melden — nicht technisch erzwingen.

### 5.2 Englische Übersetzung

- DE-Text ändern, dann separat EN pflegen.
- Es gibt einen **Übersetzungsvorschlag-Button** (DE → EN). Vorschlag prüfen,
  ggf. anpassen, dann manuell speichern.
- Funktion läuft im internen Prototyp ohne Login — nur intern nutzen.

### 5.3 Bild austauschen

1. Seite und Block wählen
2. Beim vorhandenen Bild-Slot auf **Hochladen** klicken
3. Datei wählen — wird in den Storage hochgeladen
4. Alt-Text DE und EN prüfen / ergänzen
5. Vorschau prüfen

> Das alte Bild wird nicht gelöscht, sondern nur deaktiviert — für Rollback.

> **Neue Bild-Slots** sind eine Ebene-2-Änderung (Template-Erweiterung). Der
> Knopf „+ Bild-Slot hinzufügen" ist im Admin bewusst nicht sichtbar. Bei
> Bedarf Änderungswunsch melden.

### 5.4 Reihenfolge von Blöcken ändern

- Per Drag & Drop im Strukturbaum verschieben
- Nur innerhalb derselben Seite
- Vorschau prüfen

### 5.5 Seite duplizieren

1. Vorlagen-Seite auswählen
2. **Duplizieren**
3. Neuen `page_key` und `route_path` eingeben
4. Kopie ist automatisch **Entwurf**
5. Inhalte ersetzen
6. Veröffentlichung als Änderungswunsch an die technische Steuerung

### 5.6 Seite archivieren / wiederherstellen

- **Archivieren**: Seite verschwindet öffentlich, bleibt im Admin und in der DB.
- **Wiederherstellen**: macht eine archivierte Seite wieder verfügbar.
- **Endgültig löschen**: nur möglich, wenn kein Navigationsknoten mehr darauf
  zeigt. Als Änderungswunsch behandeln.

### 5.7 Navigations-Label ändern

- Knoten im Baum auswählen
- DE/EN-Label im Detail-Panel ändern, speichern

> Knoten zwischen Hierarchien verschieben oder neue Hauptkategorien anlegen:
> Ebene 2, als Änderungswunsch.

---

## 6. Was im Admin nicht direkt gemacht wird

Folgende Punkte sind selbstverständlich änderbar, **nicht** aber als normale
Redaktionsarbeit. Sie werden als Änderungswunsch aufgenommen und über
Ebene 2 / 3 / 4 umgesetzt:

- Produktdaten, Katalog, PDP, Produktbilder (Ebene 3)
- Code, Templates, Layoutlogik, Bildverhalten (Ebene 2)
- neue Seitentypen, neue Inhaltsblöcke, neue Bildplätze, neue Felder (Ebene 2)
- CI-/Designänderungen (Ebene 2 oder 4)
- größere Navigationsstrukturänderungen (Ebene 2)
- erstmalige Veröffentlichung neuer Seitenarten (Ebene 2)
- ganze Seiten umbauen oder entfernen (Ebene 2)

→ Kurz beschreiben (Was / Warum / Wie / bis wann) und an die technische
Steuerung weitergeben.

---

## 7. Was tun, wenn etwas nicht geht?

| Symptom | Wahrscheinliche Ursache | Was tun |
|---|---|---|
| Feld ist nur lesbar | Nicht in der Freigabe-Liste | Änderungswunsch, Kurz-ID nennen |
| Speichern bringt eine Fehlermeldung | RPC hat Whitelist-Check abgelehnt | Wortlaut notieren (`field_not_allowed`, `section_not_found`), melden |
| Bild lädt nicht hoch | Storage-Problem oder Schlüssel passt nicht | Browser-Konsole + Kurz-ID melden |
| `asset_not_valid_for_edit` | Asset gehört zu nicht mehr existierender Page/Section | Melden, Asset wird ggf. weich gelöscht |
| Seite erscheint nicht öffentlich | Status noch `draft` oder kein Nav-Knoten zeigt darauf | Status prüfen, dann Nav-Knoten prüfen |
| Seite im Baum, aber nicht im Menü | Knoten inaktiv oder `show_in_public_nav` aus | Im Knoten-Detail prüfen |
| Übersetzung wirkt komisch | Auto-Vorschlag wurde ungeprüft übernommen | Manuell korrigieren |
| Versehentlich etwas geändert | Kein Auto-Undo | Sofort melden, **nicht** weiter speichern |

---

## 8. Wie ein guter Änderungswunsch aussieht

Kurz, präzise, mit Beispiel oder Screenshot:

1. **Was** soll geändert werden? (Seite / Block / Bereich)
2. **Warum**? (fachlicher Grund, Wirkung)
3. **Wie**? (gewünschtes Ergebnis, ggf. Skizze)
4. **Bis wann**? (falls relevant)

Die technische Steuerung übersetzt das in einen Prompt / Migrations- /
Code-Auftrag und meldet das Ergebnis zurück.

---

## 9. Wie das System mit Prompts umgeht

Lovable wird mit festen Projektregeln aus `.lovable/always-follow.md` und
den verlinkten Strategie-Dokumenten (z. B. `01-strategie/`,
`02-architektur/`) gesteuert. Prompts, die gegen diese Regeln verstoßen
würden — z. B. Produktdaten verändern, Inhalte im Code festschreiben,
öffentliche Navigation ohne Auftrag umbauen —, sollen gestoppt und
gemeldet werden. Die Projektregeln reduzieren das Risiko, ersetzen aber
keine fachliche Prüfung.

Nach der Übergabe können die für ihren Bereich verantwortlichen Personen
aus Marketing/Redaktion Lovable-Prompts selbst formulieren und auslösen.
Wer promptet, verantwortet Scope, Sprachen (DE/EN), Ausschlüsse, die
Ausführung der Checks und die Dokumentation. Vorlage und Standard-
Leseliste: [`../04-betrieb/prompts-vs-admin.md`](../../04-betrieb/prompts-vs-admin.md).
Ein technischer Gegencheck kann bei Bedarf eingeholt werden, ist aber
nicht dauerhafte zentrale Ausführungsstelle.

---

## 10. Aktueller Stand (für euer Verständnis)

- **`/admin` läuft aktuell bewusst ohne Login** im internen Workspace.
  Vor einem echten produktiven Betrieb muss der Admin abgesichert oder
  deaktiviert werden.
- **Die öffentliche Website** liest weit überwiegend aus dem CMS-Light.
  Wenige dokumentierte Ausnahmen sind technische Hub-, Produkt- oder
  Containerseiten ohne eigene redaktionelle CMS-Texte.
- **Inhalts-Übernahme aus der bisherigen Content-Webseite** (Marketing-ZIP)
  ist abgeschlossen: 94 Seiten, 8.288 Felder, Diff = 0 gegen Snapshot.
- **Bilder aus der Remix-/Vorgängerseite** wurden in den Storage übernommen
  und mit den Slots verbunden. Desktop-Varianten sind flächendeckend da,
  Mobile/Tablet teilweise lückenhaft (Fallback greift).
- **Produktdatenbank** ist separat und wird **nicht** vom CMS-Light berührt.
  Produktbilder im Katalog / auf PDPs gehören dorthin; redaktionelle
  Website-Bilder werden im Admin gepflegt.
- **Bucket `cms-assets`** ist im Prototyp offen — wird vor produktivem
  Betrieb gehärtet.

---

## 11. Checkliste vor täglicher Arbeit

- [ ] Admin erreichbar (`/admin`)?
- [ ] Strukturbaum lädt?
- [ ] Beispielseite öffnet sich?
- [ ] Speichern eines Test-Textes funktioniert?
- [ ] Bild-Upload funktioniert?
- [ ] Vorschau zeigt die Änderung?

Wenn ein Punkt **nein**: Vorgang dokumentieren (Schritt, Fehlermeldung,
Screenshot) und Folgeschritt entscheiden — wiederholen, Prompt-Auftrag
formulieren oder technischen Gegencheck einholen.

---

## Verwandte Dokumente

- [Dachdokument: Redaktions-Übergabe & Prompt-Regeln (führend)](../../03-redaktion/redaktions-uebergabe-und-prompt-regeln.md)
- [Kurzanleitung zum Ausdrucken](../../03-redaktion/kurzanleitung.md)
- [Checkliste Redaktion](../../03-redaktion/checkliste-redaktion.md)
- [QA nach Redaktionsrunde](../../03-redaktion/qa-nach-redaktionsrunde.md)
- [Prompt oder Admin?](../../04-betrieb/prompts-vs-admin.md)
- [Aktueller Stand](../../current-status.md)
