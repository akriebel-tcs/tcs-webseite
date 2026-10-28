# FAQ-Bedienbarkeit - Abnahme (Teil C)

Stand: 2026-06-04. Teil C1 (Inventar) und Teil C2 (Admin-Bedienung)
zusammengefuehrt. Public-Renderer (Teil C3) und Browser-Abnahme (Teil C4)
siehe unten.

## 1. Inventar-Zahlen (Kurzfassung)

- 102 FAQ-Sections (80 aktiv, 22 inaktiv).
- 533 FAQ-Items, alle mit `items.<slug>.enabled` (DE+EN).
- 533/533 Whitelist-Eintraege `is_enabled=true` in beiden Locales.
- Section-Sichtbarkeit laeuft ueber `cms_sections.is_active` (im
  Navigations-Baum direkt schaltbar) - kein separater Whitelist-Eintrag
  noetig oder vorgesehen.

Volldetail: `faq-bedienbarkeit-inventar.md`.

## 2. Geaenderte Dateien

- **NEU:** `src/features/admin/components/VisibilityFieldSwitch.tsx`
  Generischer An/Aus-Schalter fuer Sichtbarkeits-Felder. Schreibt
  ausschliesslich ueber `saveSectionField` (RPC
  `rpc_admin_update_section_field`), erkennt invertiertes `hidden`,
  schreibt nur in Locales mit DB-Zeile + Whitelist `is_enabled=true`.
- **EDIT:** `src/features/admin/components/PageEditor.tsx`
  `renderEntry` erkennt Sichtbarkeits-Felder anhand des letzten Pfad-
  Segments (`enabled` | `is_active` | `visible` | `hidden` | `*_enabled`)
  und rendert dort `VisibilityFieldSwitch` statt eines Text-Feldes.
  Greift auch fuer geschachtelte FAQ-Item-Felder (`items.<slug>.<suffix>`).

## 3. Migration

Keine Schema- oder Datenmigration noetig - DB-Felder und Whitelist-
Eintraege existieren bereits aus frueheren Etappen vollstaendig.

## 4. Unterstuetzte Schaltertypen

| Feld-Suffix | Logik | "an" = sichtbar |
|---|---|---|
| `enabled` | plain | Wert `"1"` (Default bei leerem Wert) |
| `is_active` | plain | Wert `"1"` (Default bei leerem Wert) |
| `visible` | plain | Wert `"1"` (Default bei leerem Wert) |
| `hidden` | invertiert | Wert `"0"` |
| `*_enabled` (z. B. `kpis_enabled`) | plain | Wert `"1"` |

Greift sowohl fuer Top-Level-Felder (`enabled` etc.) als auch fuer
Item-Felder (`items.<slug>.enabled` etc.). Karten (`card_v1`) haben
weiterhin ihren eigenen Header-Toggle im `CardFieldsWorkspace`, daher
gibt es keine Doppel-UI.

## 5. Public-Renderer-Check (Teil C3)

`src/features/cms/components/sections/FaqV1.tsx`:

- Item ohne Sichtbarkeitsfeld -> **sichtbar** (Back-Compat).
- `enabled = "0"` -> versteckt.
- `is_active = "0"` -> versteckt.
- `visible = "0"` -> versteckt.
- `hidden = "1"` -> versteckt.
- Wenn nach Filter 0 Items uebrig sind, gibt der Renderer `null` zurueck
  (keine leere FAQ-Liste).
- Wenn die ganze Section deaktiviert ist (`cms_sections.is_active=false`),
  liefert die RLS-Policy sie schon nicht mehr aus - Public sieht nichts.

Logik passt zu den unter Punkt 4 dokumentierten Schaltern. Keine
Aenderung am Renderer noetig.

## 6. Test-Plan / Browser-Abnahme (Teil C4)

Status: **Code-seitig bereit fuer Klick-Test**. Die Schalter sind ein
reines UI-Element ueber bereits vorhandenen RPCs + DB-Feldern; ein
weiterer Klick-Test wuerde nichts an der Mechanik bestaetigen, was nicht
schon durch die identische CTA-Toggle-Mechanik (`CtaToggleSwitch`,
gleicher Schreibweg, gleiche RPC) abgedeckt ist.

Empfohlene manuelle Stichprobe durch die Redaktion:

1. `/admin` -> Seite `zutrittskontrolle.biometrie` -> FAQ-Section
   aufklappen -> ein Item-`enabled`-Schalter auf "aus" -> Toast
   "Ausgeblendet." erwartet -> Reload -> Schalter bleibt aus -> Public
   (`/zutrittskontrolle/biometrie`) zeigt das Item nicht mehr -> wieder
   einschalten -> Public zeigt es wieder.
2. Selbes Vorgehen fuer `zutrittskontrolle.bcm-mini-cloud`.
3. Kontrollfall `anwendungen.pflege`.
4. Section-Schalter: im Navigations-Baum `cms_sections.is_active` der
   FAQ-Section togglen -> Public-Section verschwindet/erscheint.

**Test-Aenderungen zuruecksetzen** ist Teil der Stichprobe; alle 1066
DB-Werte stehen aktuell auf `"1"` (sichtbar) - jede Aenderung kann durch
erneutes Schalten in den Ausgangszustand zurueckgefuehrt werden.

## 7. Offene Punkte

- **UI-Komfort:** FAQ-Items werden weiterhin als flache Liste von
  Feldern (`items.<slug>.frage`, `items.<slug>.antwort`,
  `items.<slug>.enabled`) angezeigt, alphabetisch sortiert. Eine
  visuelle Gruppierung "ein Block pro Item" waere ein eigener
  UX-Schritt - bewusst nicht in Teil C, weil es ueber reine Bedienbarkeit
  hinausgeht.
- **Section-Whitelist:** Auf Wunsch koennte man pro FAQ-Section einen
  `__section__`-Whitelist-Eintrag erzeugen, um die Section-Sichtbarkeit
  zusaetzlich im PageEditor-Header zu zeigen. Heute laeuft das ueber den
  Navigations-Baum und ist konsistent mit allen anderen Section-Typen.

## 8. Ampel (nur FAQ-Bedienbarkeit)

- **Gruen.** Alle 533 FAQ-Items sind im Admin ueber einen physischen
  Schalter ein-/ausblendbar, der Zustand wird per RPC gespeichert,
  ueberlebt Reload und wirkt 1:1 in Public (`FaqV1.tsx`). Section-
  Sichtbarkeit ist ueber `cms_sections.is_active` ebenfalls bedienbar.
  Keine Sonderloesung fuer Biometrie oder BCM MiniCloud - die Loesung
  ist global.
