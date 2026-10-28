# Wahrheits-Check (Admin-Tab)

**Zweck.** Ein zentraler Tab im `/admin`, der für jedes **Objekt** des
Baustein-Katalogs zeigt: „Ist dieses Objekt auf der Website wirklich
**eine Wahrheit aus dem CMS**?"

Bewertet werden **Bausteine** (= fachliche Gruppen von Feldern), nicht
mehr einzelne Rohfelder. Beispiel CTA → genau 7 Bausteine:
Kopf · Inhalt · Primärbutton · Sekundärbutton (opt.) ·
Kontakt-Telefon (opt.) · Kontakt-E-Mail (opt.) · Hintergrund.
Der Vertragskatalog liegt in `src/features/admin/lib/objectContracts.ts`.

## Wie die Ampel rechnet

Jedes Objekt hat:
1. eine **Page-Pfad-Zeile** mit drei Zuständen:
   - **Grün** = der Page-Code rendert dieses Objekt nachweislich aus dem CMS.
     Für CTA/FAQ aus der spezifischen Inventur, für alle anderen
     Bausteine nur, wenn die Page einen anerkannten DB-first-Body-Pfad
     hat (`body = ok`). Anerkannt sind: generischer `CmsBodyRenderer` /
     `useCmsBody`, `CmsOnlyShell`, `CmsProductSolutionShell`, oder
     Page-eigene Iteration über `cms.sections` zusammen mit
     `useCmsPageContent` / `useCmsI18n` / `usePersonaCms` (mit oder ohne
     `data-cms-section`-Marker), sowie generischer `RENDERERS`/
     `CMS_RENDERERS`-Dispatch in der Page. **`CmsPageLayout` allein zählt
     nicht** — das beweist nur Hero/Tail-CTA, nicht den Body.
   - **Gelb** = Page-Pfad unbekannt — kein anerkannter DB-first-Body-Pfad
     im Page-Code nachgewiesen. Lieber gelb als falsch grün.
   - **Rot** = `orphan` / `mixed` — Inhalte stehen in der DB, aber der
     Page-Code rendert sie nicht aus dem CMS.
2. seine **Vertragsbausteine** mit eigener Ampel:
   - **Grün** = Pflichtbaustein gepflegt, oder optionaler Baustein
     aktiviert und vollständig. Container-Köpfe sind optional.
   - **Gelb** = Pflege möglich, aber unvollständig (z. B. `show_phone=1`
     ohne `phone_label`; oder Kind-Sections vorhanden, aber leer).
   - **Rot** = Pflichtbaustein leer (bei Container: keine Kind-Section
     vom erwarteten Typ) oder Renderer/Whitelist gebrochen.
   - **Aus** = optionaler Baustein bewusst leer (zählt nicht, standardmäßig
     ausgeblendet — über Schalter „Alle Slots zeigen" einblendbar).

Kind-basierte Bausteine (`stats_v1`→`stat_v1`, `tabs_v1`→`tab_v1`,
`download_list_v1`→`download_item_v1`, `cards_v1`/`product_scroller_v1`/
`feature_grid_v1`→`card_v1`) werden über `childSectionType` im
Vertragskatalog geprüft — nicht mehr über `items.*` auf Eltern-Feldern.

**Außenampel = strenge UND-Verknüpfung.** Grün nur, wenn Page-Pfad grün
**und** alle aktiven Bausteine grün sind. Sonst die schlimmste Einzelampel.

### Harvester offline laufen lassen

```
node scripts/cms/faq-cta-toggle-inventar.mjs --snapshot scripts/sync/snapshot
```

Erwartet `scripts/sync/snapshot/tables/cms_pages.json` und
`cms_sections.json` als JSON-Arrays. Läuft ohne Supabase-Env, ohne
Netzwerk, plattformneutral (kein `find`, kein `globSync`). Schreibt
`docs/04-betrieb/faq-cta-toggle-inventar.md` und
`src/features/admin/lib/knownPageObjectContracts.ts` neu.

## Diagnose (Rohfelder)

Unter den Bausteinen liegt der einklappbare Block „Diagnose: alle Rohfelder
zeigen" — dort sind die vier Quellen (DB · Whitelist · Renderer · Code)
pro `field_key` weiterhin sichtbar, inklusive Felder, die zu keiner
Vertragsgruppe gehören („Diagnose-Restbestand").



## Sicht: pro Section, nicht pro Bild

Eine Section = eine Akkordeon-Zeile (z. B. `home · start · cta_v1`). Status
der Zeile = schlimmster Einzelstatus aller Felder dieser Section. Aufklappen
zeigt jedes Feld einzeln (Texte, Bilder, Toggles) inklusive der vier Quellen.

So lange Renderer und Whitelist mit dem `f(ctx, fieldKey)`-Helper arbeiten,
gilt: was im Whitelist-Eintrag steht, liest der Renderer. Eigene Text-Renderer-
Karten brauchen wir nicht.

## Die vier Wahrheitsquellen

| # | Quelle        | Was sie sagt                                                    | Wo sie lebt                                      |
|---|---------------|-----------------------------------------------------------------|--------------------------------------------------|
| 1 | **DB**        | Welcher Inhalt liegt aktiv in der Datenbank? Gibt es Dubletten? | `cms_assets` / `cms_section_fields`              |
| 2 | **Whitelist** | Darf der Admin diesen Slot überhaupt pflegen?                   | `cms_admin_editable_fields`                      |
| 3 | **Renderer**  | Liest die Website-Komponente genau diesen `field_key`? Für Karten containerbewusst (Raster, Scroller, Hub-Grid, Feature-Grid). | `src/features/admin/lib/rendererSlotMap.ts` + `src/features/cms/lib/cardVisibility.ts` |
| 4 | **Code**      | Steht für diesen Slot ein **bekannter** Code-Fallback in der manuell gepflegten Liste? | `src/features/admin/lib/truthSources.ts → KNOWN_UI_FALLBACKS` |

„Eine Wahrheit" ist erreicht, wenn 1 + 2 + 3 erfüllt sind, **kein** bekannter
Code-Fallback eingetragen ist **und** kein Dubletten-Konflikt vorliegt.

### Karten-Slots (Quelle 3, containerbewusst)

Für `card_v1` ist der erwartete Bild-Slot vom Eltern-Container abhängig:

| Container                                | erwarteter Slot | Pflicht? |
|-----------------------------------------|-----------------|----------|
| `cards_v1` (Raster)                      | `image`         | optional |
| `cards_v1` mit `section_key = products` (Scroller-Variante) · `product_scroller_v1` | `image`         | **Pflicht** |
| `card_grid_v1` · `catalog_filter_grid_v1` (Hub/Filter)| `thumbnail`     | **Pflicht** |
| `feature_grid_v1`                        | `icon_image`    | **Pflicht** |

## Navigationsbereich (Bereich-Chips)

Der Bereich einer Seite wird aus **allen** `nav_area`-Werten in
`cms_navigation_nodes` abgeleitet — nicht mehr nur aus `main`:

- **Hauptnavigation** (`main`) → ein eigener Chip je Top-Level-Eintrag
  (Eingangssysteme, Gebäudemanagement, …).
- **Footer / Footer (unten) / Meta / Persona / Startseite** → je ein
  Sammel-Chip pro `nav_area`.
- **Detail-/Sonstige Seiten** → Fallback für Seiten ohne Nav-Eintrag
  (Produkt-Detailseiten u. ä.).

Damit verschwindet die alte „ohne Navigationsbereich"-Halde.

## Status-Bedeutungen (Akkordeon-Badge)

| Status                                | Level | Was es heißt                                                                 |
|---------------------------------------|-------|------------------------------------------------------------------------------|
| Eine Wahrheit                         | grün  | DB hat Inhalt, Whitelist erlaubt Pflege, Renderer liest, kein Code-Fallback, keine Dubletten |
| Pflegbar, aber leer (optional)        | grün  | Whitelist + Renderer bereit, Slot ist optional und bewusst leer — technisch in Ordnung |
| Noch nicht eingerichtet (optional)    | grün  | Optionaler Slot, weder Inhalt noch Whitelist — Renderer würde lesen, sobald beides vorhanden |
| Whitelist fehlt                       | gelb  | DB hat Inhalt **und** Renderer liest — aber Admin sieht es nicht zum Pflegen |
| Section inaktiv                       | gelb  | Section ist `is_active=false`, wird nicht öffentlich gerendert               |
| Renderer ignoriert                    | rot   | DB hat Inhalt, Renderer liest diesen `field_key` (für diesen Container) nicht |
| Mehrere aktive DB-Bilder              | rot   | Mehrere `is_active=true`-Assets im selben Slot/Viewport — uneindeutig        |
| Bekannter Code-Fallback (manuell gepflegt) | rot | Slot steht in `KNOWN_UI_FALLBACKS` — Code zeigt ein eigenes Bild           |
| Unbekannter Section-Typ               | rot   | Kein Renderer kennt den `section_type`                                       |
| Section fehlt                         | rot   | DB-Asset ohne zugehörige Section                                             |

**Wichtig:** Optional-Slots ohne Inhalt sind seit 2026-06-02 **grün**, nicht
mehr gelb. Damit zeigt der Tab nur noch echte Diskrepanzen. Grün heißt
„technisch im Lot" — nicht automatisch „redaktionell fertig".

### DB-Quelle ist typgerecht

- **Bild-Slots** (`image`, `thumbnail`, `icon_image`, Hero) lesen aus `cms_assets`.
- **Text-/Toggle-Slots** (alles andere — Titel, Buttons, Telefon, `show_*`, …)
  lesen aus `cms_section_fields` (mind. eine Locale mit nicht-leerem Wert).

Der DB-Punkt im Akkordeon labelt sich entsprechend als **„DB (Text)"** oder
**„DB (Bild)"**.

## Bedienung

- **Status-Chips** (Probleme / Hinweise / Eine Wahrheit): ein-/ausblenden.
- **Bereich-Chips**: pro Navigationsbereich filtern.
- **Baustein-Chips**: nach `section_type` filtern (cta_v1, faq_v1, …).
- **Suche**: Volltext über `page_key`, `section_key`, `section_type`, Seitentitel.
- **Fortschritt je Bereich**: einklappbarer Block, jede Zeile ist Filter-Shortcut.
- **Klick auf eine Section**: Akkordeon öffnet, alle Felder mit Einzelstatus.

## Was die Seite **nicht** tut

- Keine Schreibwege, kein Auto-Fix.
- Keine Veränderung an Produktdatenbank, Navigation, Routen oder i18n.
- **Kein automatischer Code-Scan**: Code-Fallbacks sind nur dann sichtbar, wenn sie manuell in `KNOWN_UI_FALLBACKS` eingetragen wurden. Quelle/Pflegehilfe: `docs/04-betrieb/renderer-fallback-inventar-latest.md` (Spalte `local assets`).

## Pflege der vierten Quelle (Code-Fallbacks)

Wenn jemand ein hartcodiertes Bild in einer Page-Komponente entdeckt, wird
der Slot in `src/features/admin/lib/truthSources.ts` in `KNOWN_UI_FALLBACKS`
mit `${page_key}|${section_key}|${field_key}` ergänzt (oder `*` für alle Felder
der Section). Der Wahrheits-Check schlägt dann beim nächsten Laden Alarm.
Sobald der Hardcode entfernt ist, den Eintrag wieder löschen.
