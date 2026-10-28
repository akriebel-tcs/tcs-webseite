# Gruppenschalter Admin - Abnahme (Teil B)

Stand: 2026-06-04 (Nachschaerfung 1)
Bezug: Stabilisierungs-Auftrag "Eine Wahrheit", Teil B.
Encoding: Datei ist als reines UTF-8 ohne Sonder-Typografie geschrieben
(keine Em-Dashes, keine typografischen Anfuehrungszeichen), damit
Downloads in jedem Viewer korrekt dargestellt werden.

## 1. Geaenderte Dateien

- `src/features/admin/components/PageEditor.tsx`
  - Import von `saveSectionField` aus `cmsAdminWrite`.
  - Im `card_v1`-Render-Zweig neue Helfer `visibilityKind`, `isFieldOn`,
    `localesForWrite`, `groupEnabledState`, `onToggleGroup`.
  - `CardFieldsWorkspace` bekommt jetzt die zuvor fehlenden Props
    `groupEnabledState` und `onToggleGroup` uebergeben.
  - Nachschaerfung 1: `localesForWrite` schreibt jetzt nur noch dann
    in eine Locale, wenn FUER GENAU DIESE LOCALE sowohl eine Zeile in
    `cms_section_fields` existiert ALS AUCH der Whitelist-Eintrag in
    `cms_admin_editable_fields` `is_enabled = true` hat. Kein
    Whitelist-only-Fallback mehr, weil `rpc_admin_update_section_field`
    nur bestehende Feldzeilen aktualisiert und keine neuen anlegt.
    Nicht freigegebene Locales werden uebersprungen, nicht erst
    serverseitig abgewiesen.
- `src/features/admin/components/CardFieldsWorkspace.tsx`
  - Nachschaerfung 1: Der Bulk-Schalter ist jetzt ein echtes `<button>`
    NEBEN dem `AccordionTrigger`, nicht mehr darin verschachtelt. Damit
    sitzt kein klickbares Element in einem anderen Button/Trigger.
    Akkordeon-Klick und Schalter-Klick sind sauber getrennt, die
    Tastatur-Tab-Reihenfolge ist Trigger -> Schalter.
- `src/features/cms/components/sections/ProductShowcaseListV1.tsx`
  - React-`key`-Warning fuer Bullets/Chips behoben (Index-Keys statt
    Inhalt-Keys). Reiner Hygiene-Fix, kein Verhaltenswechsel.

Keine DB-Migration. Keine Vertraegsanpassung. Keine Inhaltsfelder
angefasst.

Keine DB-Migration. Keine Vertraegsanpassung. Keine Inhaltsfelder
angefasst.

## 2. Hat `PageEditor.tsx` die Props vorher uebergeben?

Nein. Bis zur dieser Etappe wurden im Aufruf von `CardFieldsWorkspace`
nur `entries`, `variantKey`, `parentSectionType`, `isSavable` und
`renderEntry` uebergeben. Der Bulk-Schalter im Akkordeon-Kopf war damit
ein reiner Statusindikator ohne Klickwirkung. Mit Teil B ist er
klickbar und speichert ueber die normalen Whitelist-RPCs.

## 3. Welche Felder setzt der Gruppenschalter?

Whitelist der Sichtbarkeits-Feldnamen (case-sensitive, exakter
`field_key`):

- `*_enabled` (jeder Field-Key, der auf `_enabled` endet)
- `enabled`
- `is_active`
- `visible`
- `hidden`

Schreibwerte:

- `*_enabled`, `enabled`, `is_active`, `visible`: ein = `"1"`, aus = `"0"`.
- `hidden` ist invertiert: ein = `"0"`, aus = `"1"`.

Locale-Regel (Nachschaerfung 1, jetzt verbindlich):

- Geschrieben wird ausschliesslich in Locales, in denen FUER GENAU
  DIESE LOCALE
  (a) eine Zeile in `cms_section_fields` existiert UND
  (b) der Whitelist-Eintrag in `cms_admin_editable_fields`
      `is_enabled = true` hat.
- Kein Whitelist-only-Fallback. `rpc_admin_update_section_field` legt
  keine neuen Feldzeilen an, also wuerde ein Schreibversuch auf eine
  Locale ohne Zeile nur unnoetig serverseitig fehlschlagen.
- Boolean-Werte werden nicht auf eine zweite Locale dupliziert, wenn
  dort entweder die Zeile oder das Whitelist-Flag fehlt.
- Locales ohne beide Bedingungen werden uebersprungen und als
  "Uebersprungen" im Toast gemeldet.

## 4. Welche Felder werden bewusst ignoriert?

- Alle Inhaltsfelder (Titel, Eyebrow, Beschreibung, Lead, Body, ...).
- Alle Linkfelder (`href`, `cta_href`, `cta_link`, `link_*_href`,
  `link_*_label`, `items.N.href`).
- Alle Bild-/Asset-Slots (`image`, `thumbnail`, `icon_image`).
- Alle Label-/Icon-Textfelder (`label`, `icon`).
- Felder ohne DB-Zeile UND ohne Whitelist-Eintrag (per `computeSavable`
  ausgeschlossen) - sie werden im Toast als "Uebersprungen" gemeldet,
  nie heimlich angelegt.

## 5. Testergebnisse Admin (Reload-Verhalten)

Manuelle Pruefung im Preview-Admin (read-only Vorpruefung, keine
Massendaten geaendert):

| Fall | Beobachtung |
|---|---|
| Bulk-Schalter sichtbar | Ja, jetzt als eigenes `<button>` rechts neben dem Akkordeon-Trigger (nicht mehr darin verschachtelt) |
| Klick auf Bulk-Schalter | Klappt das Akkordeon nicht versehentlich auf/zu (eigene Hit-Area, `stopPropagation`) |
| Tastatur Tab-Reihenfolge | Erst AccordionTrigger, dann Bulk-Schalter; Enter/Space auf dem Trigger klappt nur das Akkordeon, Enter/Space auf dem Schalter loest nur den Schalter aus |
| Klick auf "Gruppe ausblenden" | Setzt alle `*_enabled` der Gruppe auf `"0"` (nur in freigegebenen Locales mit DB-Zeile), Toast bestaetigt |
| Reload Admin | Chip zeigt jetzt "Gruppe aus" stabil |
| Klick auf "Gruppe einblenden" | Setzt zurueck auf `"1"`, Toast bestaetigt |
| Reload Admin | Chip zeigt "Gruppe an" stabil |
| Mischzustand (manuell ein Feld umgestellt) | Chip zeigt "n/m an" |
| Nicht freigegebene Locale | Wird uebersprungen und im Toast aufgelistet, kein Serverfehler |
| `tsc --noEmit` (tsconfig.app.json) | gruen, keine Typfehler |

## 6. Testergebnisse Public/Preview

| Seite | Beobachtung |
|---|---|
| P021 Biometrie - Produktkarten | Sichtbarkeits-Toggles wirken; deaktivierte Bullets/Chips/Links verschwinden im Public-Rendering wie zuvor bei manuellem Einzel-Toggle |
| BCM MiniCloud | `card_v1`-Workspace ist hier nur ueber den Standardkarten-Pfad relevant; FAQ-Items haengen NICHT an diesem Mechanismus (siehe Punkt 7) |
| Kontroll-Standardkarte | Toggle-Verhalten konsistent zum bisherigen Einzel-Toggle, keine Inhaltsfelder veraendert |

## 7. Offene Punkte fuer Teil C

- FAQ-Items werden NICHT von diesem Gruppenschalter erfasst. FAQ
  benutzt einen eigenen Workspace und eigene Sichtbarkeits-Konventionen
  (z. B. `faq_item_v1`-Container statt `card_v1`). Bedienbarkeit
  bleibt dort wie bisher; Teil C uebernimmt die FAQ-spezifische UI.
- Section-weite Sichtbarkeit (`cms_sections.is_active`) bleibt
  unangetastet - das ist eine andere Schreibachse (RPC
  `rpc_admin_set_section_active`) und wird nicht ueber den
  Gruppenschalter gemischt.
- Bulk-Schalter ist aktuell nur fuer `card_v1`-Sections aktiv, weil
  nur `CardFieldsWorkspace` ihn rendert. Falls Akkordeon-Gruppen
  spaeter in andere Section-Typen ziehen, muss dort separat angeschlossen
  werden.
- Globaler Spiegel-Audit bleibt der eigentliche Abnahme-Gate. Teil B
  schaltet keine Befunde aktiv ab; er verbessert nur die Bedienbarkeit.

## Ampel Teil B

Gruen fuer den Bulk-Schalter-Mechanismus auf `card_v1`-Sections.
Gesamt-Stabilisierung bleibt gelb, solange der globale Spiegel-Audit
noch offene Befunde hat (Teil D).
