# Batch 53 — Redaktionsprompt entbremst

Stand: 2026-06-05 · Scope: nur Doku-/Regeltexte. Kein Code, keine DB,
keine Inhalte, keine Navigation.

## Ziel

Die vier führenden Startdokumente formulieren eindeutig, dass die
Redaktion innerhalb des bestehenden CMS-Light-Baukastens **frei** arbeitet.
„Stoppen"-Formulierungen, die so wirken konnten, als würde die Redaktion
selbst ausgebremst, sind ersetzt durch:

> „Wenn der Wunsch außerhalb des bestehenden CMS-Light-Baukastens liegt,
> bitte kurz erklären, welches technische Systemelement fehlt, und
> einen sauberen Folgeauftrag vorschlagen."

Damit ist klar: Nicht die Redaktion wird angehalten, sondern **Lovable
improvisiert nicht**, wenn ein Baukasten-Baustein fehlt.

## Geänderte Dokumente

1. `.lovable/always-follow.md`
   - CMS-Freeze-Block: „Stoppen und Rückfrage stellen" → „Lovable
     improvisiert nicht … fehlendes Systemelement benennen + Folgeauftrag
     vorschlagen". Aufzählung erweitert um „Änderung der technischen
     Routing-/Navigationsarchitektur" (statt diffuser „neue technische
     Architektur").
   - § 9 No-Login: Satz „keine Umschaltung der öffentlichen Navigation
     auf `cms_navigation_nodes` ohne eigene Etappe" präzisiert.
     Redaktionelle Navigationsarbeit über bestehende
     `cms_navigation_nodes` ist erlaubt; nicht erlaubt ohne
     Technikauftrag ist eine Änderung der **technischen Routing-/
     Navigationsarchitektur** oder ein flächiger Systemwechsel.
   - § 10 Admin-Zielbild: „Navigation … sobald freigegeben" →
     „Navigation … für redaktionelle Pflege innerhalb des bestehenden
     CMS-Light-Modells freigegeben".
   - § 14 „Wenn unsicher": Formulierung entbremst (kein „erst nach
     Freigabe weiterbauen" mehr, sondern Folgeauftrag vorschlagen).

2. `docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`
   - Prompt-Schablone Abschnitt 2 / Arbeitsregel neu formuliert:
     „frei im bestehenden Baukasten", explizite Aufzählung der erlaubten
     Aktionen, technische Rückfrage **nur**, wenn ein neuer
     Baukasten-Baustein fehlt — dann fehlendes Systemelement erklären
     und Folgeauftrag vorschlagen.
   - Abschnitt 5 (neue Seiten): „stoppen, Rückfrage, kein Workaround"
     → „kein Workaround, fehlendes Systemelement erklären, Folgeauftrag
     vorschlagen".
   - Abschnitt 7 umbenannt: „Eskalationspfad — wann fehlt ein
     Baukasten-Baustein?" mit demselben Sprachbild. Liste um
     „Änderung der technischen Routing-/Navigationsarchitektur"
     ergänzt.

3. `docs/current-status.md`
   - Freeze-Erklärung: „Gestoppt und rückgefragt wird nur …" →
     Lovable improvisiert nicht / Systemelement erklären /
     Folgeauftrag vorschlagen. Routing-/Navigationsarchitektur als
     präziser Auslöser ergänzt.

4. `docs/ai-start-prompt.md`
   - Goldene Regel 8 (CMS-Freeze): redaktionell erlaubte
     Navigationspflege explizit aufgezählt; „Stoppen und Rückfrage" →
     „nicht improvisieren — Systemelement benennen + Folgeauftrag
     vorschlagen". Routing-/Navigationsarchitektur als Auslöser
     präzisiert.

## Was war noch zu hart?

| Stelle | War | Jetzt |
| --- | --- | --- |
| always-follow.md § CMS-Freeze | „Stoppen und Rückfrage stellen ist nur Pflicht …" | „Lovable improvisiert nicht (kurz innehalten, erklären, Folgeauftrag vorschlagen)" |
| always-follow.md § 9 | „keine Umschaltung der öffentlichen Navigation auf `cms_navigation_nodes` ohne eigene Etappe" | Redaktionelle Knoten-Arbeit erlaubt; nur Routing-/Navigationsarchitektur-Wechsel braucht Technikauftrag |
| always-follow.md § 10 | „Navigation … sobald freigegeben" | „Navigation … für redaktionelle Pflege freigegeben" |
| always-follow.md § 14 | „stoppen … erst nach Freigabe weiterbauen" | „nicht improvisieren — fehlendes Systemelement benennen, Folgeauftrag vorschlagen" |
| Dachdokument Prompt-Schablone | „Stoppen und Rückfrage stellen — nicht improvisieren …" | „Technische Rückfrage stellen — nicht improvisieren — nur dann, wenn ein neuer Baukasten-Baustein fehlt" + Folgeauftrag |
| Dachdokument § 5 | „stoppen, Rückfrage, kein Workaround" | „kein Workaround, Systemelement erklären, Folgeauftrag vorschlagen" |
| Dachdokument § 7 | „Eskalationspfad — wann stoppen?" | „Eskalationspfad — wann fehlt ein Baukasten-Baustein?" |
| current-status.md | „Gestoppt und rückgefragt wird nur, wenn …" | „Lovable improvisiert nicht … Folgeauftrag vorschlagen — Redaktion wird nicht ausgebremst" |
| ai-start-prompt.md Regel 8 | „Stoppen und Rückfrage nur, wenn …" | „nicht improvisieren — Systemelement benennen, Folgeauftrag vorschlagen" |

## Jetzt eindeutig dokumentiert

- **Redaktionsfreiheit im Baukasten**: Seiten/Unterseiten anlegen,
  Navigation bearbeiten (Knoten anlegen/verschieben/ausblenden,
  Sortierung, `nav_area`, „Hauptmenü aus"), Karten ergänzen/sortieren/
  löschen, Bausteine sortieren, Bilder/Links/Texte/FAQ/CTA/Chips/
  Bulletpoints pflegen, bestehende Seitentypen / Section-Typen /
  Kartenmodelle wiederverwenden — alles ohne Sondergenehmigung,
  spiegel-treu, idempotent, über `rpc_admin_*`.
- **Technikrückfrage**: nur wenn ein neuer Baukasten-Baustein fehlt
  (neuer Seitentyp, neuer Section-Typ, neue Renderer-Sonderlogik,
  DB-Migration außerhalb normaler CMS-Datenpflege, Produkt-DB,
  Login/Auth, Änderung der technischen Routing-/Navigationsarchitektur,
  flächige Veröffentlichungswellen). In diesem Fall: kurz erklären,
  was fehlt, Folgeauftrag vorschlagen — die Redaktion selbst arbeitet
  weiter.

## Scope-Bestätigung

- Keine Codeänderung.
- Keine DB-Migration.
- Keine Inhaltsänderung.
- Keine Navigationsänderung.
- Nur Doku-/Regeltexte geglättet.

## Folgeauftrag

Keiner. Die Dokumentation ist mit Batch 52 + 53 konsistent: gleicher
Wortlaut in `.lovable/always-follow.md`, Dachdokument, `current-status.md`
und `ai-start-prompt.md`.
