# Batch 52 — Redaktionsfreiheit in den Regeldokumenten klargestellt

Stand: 2026-06-05 · Scope: nur Doku/Regeltexte. **Keine** Code-, DB-,
Inhalts- oder Navigationsänderung.

---

## 1. Anlass

Mehrere führende Regeldokumente waren so formuliert, dass „CMS-Freeze"
als „Redaktion darf keine Strukturen mehr ändern und keine neuen Seiten
mehr anlegen" gelesen werden konnte. Tatsächlich gilt:

> **Kein unkontrollierter Umbau. Kontrollierte redaktionelle Arbeit
> innerhalb des bestehenden CMS-Light-Baukastens ist erlaubt.**

Dieser Batch zieht diese Lesart in allen fünf führenden Dokumenten nach.

---

## 2. Geänderte Dokumente

| Datei | Was wurde geändert |
|---|---|
| `docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md` | Prompt-Schablone (Abschnitt 2) — „Arbeitsregel"-Block: positive Erlaubnis-Liste ergänzt, Stopp-Liste präzisiert (Baukasten-Grenze statt nur „Section-Typ/Auth"). |
| `.lovable/always-follow.md` | CMS-Freeze-Block (oben) komplett neu formuliert: explizite Liste der erlaubten redaktionellen Arbeiten + explizite Stopp-Liste „außerhalb des Baukastens". Abschnitt 9 (No-Login-Prototyp): „keine flächige Veröffentlichung" präzisiert zu „einzelne Seiten ok, flächige Massen-Umschaltung nicht". |
| `docs/current-status.md` | Freeze-Erläuterung um die positive Erlaubnis-Liste und die Stopp-Liste ergänzt. |
| `docs/README.md` | „Goldene Regeln" — Public-Schutz-Punkt entschärft (nur Produktdatenbank, nicht mehr „öffentliche Website" pauschal); CMS-Freeze-Punkt komplett neu formuliert. |
| `docs/ai-start-prompt.md` | Goldene Regel 8 (CMS-Freeze) neu formuliert: erlaubte redaktionelle Arbeiten + Stopp-Liste. |

Keine weiteren Dateien.

---

## 3. Wo stand noch eine zu harte Freeze-/Stop-Regel?

- **`docs/README.md`**, „Goldene Regeln": *„CMS-Freeze: Keine neue
  Migration / Renderer-Änderung / neuer Section-Typ ohne expliziten neuen
  Auftrag"* — las sich, als wäre auch eine neue redaktionelle Seite ein
  „neuer Auftrag", obwohl normale Seiten- und Navigationspflege das eben
  nicht ist. → ersetzt.
- **`docs/ai-start-prompt.md`**, Regel 8: dieselbe Verkürzung. → ersetzt.
- **`docs/current-status.md`**, Freeze-Absatz: war zwar korrekt
  („keine unkontrollierten Umbauwellen, nicht Stillstand"), nannte aber
  nicht konkret, was Redaktion darf. → erweitert.
- **`.lovable/always-follow.md`**, CMS-Freeze-Block: nannte fünf
  Bedingungen für „Weiterarbeit" und las sich wie eine technische
  Pflichtenliste auch für reine Redaktionsarbeit. → in zwei Listen
  geteilt (Redaktionsfreiheit / echte Stopp-Auslöser).
- **`.lovable/always-follow.md`**, Abschnitt 9: *„keine flächige
  Veröffentlichung / Status-Umschaltung per Admin"* wurde als „Redaktion
  darf keine Seite veröffentlichen" missverstanden. → präzisiert auf
  „flächige Massen-Umschaltung braucht einen eigenen Auftrag".
- **`docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`**,
  Prompt-Schablone Arbeitsregel: Stopp-Liste war auf vier Punkte
  beschränkt (Section-Typ, Renderer, Produkt-DB, Login). Jetzt deckt sie
  die volle Baukasten-Grenze ab.

---

## 4. Ist jetzt klar, dass Redaktion frei im bestehenden Baukasten arbeiten darf?

**Ja.** Alle fünf führenden Dokumente listen jetzt expliziert auf:

- Seiten / Unterseiten anlegen
- Navigation anpassen (Knoten, Sortierung, Sichtbarkeit, Parent/Child,
  `nav_area`, „Hauptmenü aus")
- Karten ergänzen, entfernen, sortieren, sichtbar/unsichtbar schalten
- Bausteine sortieren, sichtbar/unsichtbar schalten, bestehende
  Section-Typen wiederverwenden
- Bilder tauschen, Alt-Texte und Fokuspunkte pflegen
- Links setzen / entfernen / aktivieren / deaktivieren
- Texte/Sublines/Bulletpoints/Chips/FAQ/CTA pflegen (DE+EN)
- Bestehende Kartenmodelle (`card_v1`) und Container (`cards_v1`,
  `product_scroller_v1`, `teaser_2col_v1`) verwenden

Das Dachdokument (Abschnitt 3 + Schablone), das Always-Follow
(CMS-Freeze-Block) und der Kurzstatus sagen es jetzt mit demselben
Wortlaut.

---

## 5. Ist klar, wann gestoppt und ein technischer Folgeauftrag vorgeschlagen werden muss?

**Ja.** Stopp-/Eskalationspflicht greift, wenn der Wunsch außerhalb des
Baukastens liegt:

- neuer Seitentyp / neuer T-Code
- neuer Section-Typ
- neue Renderer-Sonderlogik
- DB-Migration außerhalb normaler CMS-Datenpflege (Schema, neue Tabelle,
  neue Spalte, neue RPC, RLS-Änderung)
- Produkt-DB / Produktkatalog / PDP
- Login / Auth / Rollenmodell
- neue technische Architektur, neue Renderer, Routing-Mechanik außerhalb
  redaktioneller DB-Pflege
- flächige Massen-Veröffentlichungswellen ohne expliziten Auftrag

Diese Liste steht jetzt wortgleich in `.lovable/always-follow.md` (oben),
im Dachdokument (Prompt-Schablone + Abschnitt 7 Eskalationspfad), im
`current-status.md`, in `README.md` und in `ai-start-prompt.md`.

---

## 6. Was bewusst NICHT angefasst wurde

- Kein Code geändert.
- Keine DB-Migration.
- Keine Inhalte / keine Felder / keine Sections / keine Navigationsknoten
  geändert.
- Keine Audit-Skripte angepasst.
- Frühere Detailregeln (Schreibwege, Migrationen idempotent,
  Default-Übersetzungsregel, Doku-Pflicht nach jeder Tranche,
  Doku-Hierarchie usw.) wurden inhaltlich nicht verschoben — nur der
  oberste Freeze-Block wurde umformuliert.

---

## 7. Geänderte Dateien (zusammengefasst)

- `docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`
- `.lovable/always-follow.md`
- `docs/current-status.md`
- `docs/README.md`
- `docs/ai-start-prompt.md`
- `docs/04-betrieb/audit-snapshot/batch52-redaktionsfreiheit-dokuklaerung.md`
  (dieser Bericht)
