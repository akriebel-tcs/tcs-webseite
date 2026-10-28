# Sprint-Bericht 2026-06-02 — Wahrheits-Check & CTA „Eine Wahrheit"

Scope: read-/UI-only am Wahrheits-Check + drei kleine CTA-Migrationen.
Keine Public-Renderer-Strukturänderung, keine Navigation, keine Produktdatenbank, keine i18n-JSON-Datei berührt.

## 1. Was heute passiert ist

### 1.1 Wahrheits-Check — von „4 Quellen pro Bildslot" zu „Section-Akkordeon über alle Felder"

Bisher zeigte der Tab `/admin → Wahrheits-Check` jeden Bild-Slot einzeln (3.949 Zeilen, dazu eine „Sonstige 3.949"-Halde). Heute komplett auf **Section-Akkordeon** umgebaut:

- Eine Zeile pro `(page_key, section_key)`. Beispiel: CTA erscheint als **110 Section-Zeilen** (eine pro Vorkommen), nicht mehr als 48 Bildslots.
- Aufklappen zeigt **alle Felder** der Section (Texte, Toggles, Bilder) jeweils mit den vier Quellen DB · Whitelist · Renderer · Code-Fallback.
- Sammelstatus je Section = schlimmster Einzelstatus aller Felder.

### 1.2 Datenmodell erweitert (`truthSources.ts`)

- `readSectionFields()` liest jetzt zusätzlich `cms_section_fields` (paginiert, > 8.000 Zeilen). Vorher kannte der Check nur Bilder.
- `readSections()` paginiert (PostgREST-1000-Cap). Vorher fehlten alle CTA-Sections, die alphabetisch hinter der 1000er-Grenze lagen — daher die seltsame „48 statt 110"-Zahl.
- `TruthRecord` um `is_text_slot`, `has_content`, `text_nonempty_locales` ergänzt.
- DB-Wahrheit wird jetzt typgerecht ausgewertet: Text-/Toggle-Slots aus `cms_section_fields` (mind. eine Locale mit nicht-leerem Wert), Bild-Slots aus `cms_assets`.
- Neuer Aggregator `buildSectionAggregates` (Section-zentrierte Sicht).
- Navigationsbereich liest jetzt **alle** `nav_area`-Werte aus `cms_navigation_nodes` (`main`, `footer`, `footer_bottom`, `meta`, `persona`, `home`) + Fallback `rest:detail` für Detailseiten. Die alte „ohne Navigationsbereich"-Halde ist weg.

### 1.3 Statuslogik geschärft

Neue/geänderte Stati:

| Status | Level | Bedeutung |
|---|---|---|
| `one_truth` | OK | DB hat Inhalt + Whitelist + Renderer + kein Code-Fallback + keine Dublette |
| `editable_empty` | **OK (war warn)** | „Pflegbar, aber leer (optional)" — Whitelist+Renderer bereit, Slot bewusst leer |
| `not_yet_configured` | **OK (neu)** | „Noch nicht eingerichtet (optional)" — weder Inhalt noch Whitelist, optionaler Slot |
| `missing_whitelist` | warn | DB hat Inhalt, aber Admin sieht ihn nicht zum Pflegen |
| `renderer_orphan` | error | DB hat Inhalt, Renderer liest field_key nicht |
| `db_dupes` | error | Mehrere aktive Assets im selben (Slot × Viewport) |
| `ui_fallback` | error | Bekannter Code-Hardcode in `KNOWN_UI_FALLBACKS` |
| `section_missing` / `section_inactive` / `unknown_section_type` | unverändert | |

Effekt: die ca. **14.800 gelben „Pflegbar, aber leer"-Treffer fallen weg**, weil sie technisch korrekte Konfigurationen waren (Optional-Slot, bewusst leer). Übrig bleiben nur noch echte Befunde — fehlende Whitelist trotz Inhalt, Render-Waisen, Dubletten, fehlende Sections.

### 1.4 UI-Aufräumarbeit (`SlotValidationView.tsx`)

- Kopfbereich auf eine Zeile reduziert (KPIs + „Neu laden"), 4-Quellen-Erklärung in Info-Popover ausgelagert.
- Status-, Bereich- und Baustein-Chips kompakter.
- Tabelle → Akkordeon-Liste (`Collapsible`), Status-Punkt je Quelle (DB · Whitelist · Renderer · Code), DB-Indikator labelt sich dynamisch als **„DB (Text)"** oder **„DB (Bild)"**.
- Status-Badges und Tooltip-Texte auf die neuen Stati abgestimmt.

### 1.5 CTA-Block „Eine Wahrheit"

Begleitend zum Wahrheits-Check wurden drei konkrete CTA-Befunde behoben:

1. **CTA-Block auf `anwendungen` wurde nicht ausgespielt.** Page-Komponente rief CMS-Inhalte unter falschem Section-Key auf → Block stand im Admin-Tree, fehlte aber öffentlich. Page liest jetzt die echte Section-Reihenfolge.
2. **CTA-Bug „Cache, Cap & Read":** Der Wahrheits-Check zeigte CTA als „48 Vorkommen", DB hatte aber 110. Ursache war die fehlende Pagination in `readSections()` (s. 1.2) plus ein Read-Cap im Asset-Loader. Behoben.
3. **CTA-Feldfamilie ausgebaut + Workspace:** `phone_label` / `email_label` / `show_phone` / `show_email` / `show_secondary` / `cta_secondary_*` durchgängig pflegbar, Renderer `CtaV1` versteckt Buttons/Kontaktzeilen sauber, wenn Toggle aus oder Text leer. Neue Admin-Helper `CtaBackgroundSelect` und `CtaButtonColorSelect` für konsistente CTA-Optik.
4. **3 begleitende Migrationen** (alle idempotent, public-schutz beachtet): Whitelist-Einträge für die neuen CTA-Felder + Sicht-Toggle.

## 2. Zustandseinschätzung „Eine Wahrheit" (Ehrlich)

**Wo wir stehen — Zahlen aus DB (2026-06-02):**

- 117 Seiten · 1.653 Sections · 44.955 Section-Felder · 747 Assets
- 46.610 aktive Whitelist-Einträge (`cms_admin_editable_fields.is_enabled`)
- 110/110 CTA-Sections jetzt im Wahrheits-Check sichtbar (vorher 48)
- Tab-Anzeige im UI (Live): ~22.900 grüne Treffer („Eine Wahrheit" inkl. „optional leer / noch nicht eingerichtet"), ~ verbleibende gelbe/rote Befunde nach Reklassifizierung deutlich unter dem alten Stand von 14.800 + 2.128.

**Bewertung:**

- ✅ **Großer Sprung.** Der Tab macht jetzt das, wofür er da ist: pro Baustein **eine** Aussage. CTA, FAQ, Wechselteaser usw. lassen sich als Section-Familie lesen, nicht mehr als Bildslot-Halde.
- ✅ **DB-Wahrheit ist ehrlich.** Text-Felder werden gegen `cms_section_fields` geprüft, Bild-Slots gegen `cms_assets`. Vorher waren textbasierte Slots fälschlich rot.
- ✅ **Yellow noise weg.** Optionale Slots ohne Inhalt sind keine Warnung mehr, sondern grün/„noch nicht eingerichtet (optional)". Damit zeigt der Tab nur noch **echte** Diskrepanzen.
- ⚠️ **Was Grün konkret heißt — wichtig für die Interpretation:** Grün bedeutet „technisch im Lot": entweder Inhalt liegt im CMS + Whitelist + Renderer (`one_truth`), **oder** der Slot ist bewusst optional und leer. Grün heißt **nicht** automatisch „Inhalt redaktionell fertig". Für die redaktionelle Vollständigkeit ist weiterhin der Wahrheits-Check pro Seite (Renderer-Fallback-Inventar, Bildkarten-Audit) zuständig.
- ⚠️ **Verbleibend gelb/rot — typische Fälle:** `link_1_*`/`link_3_*` mit Inhalt, aber ohne Whitelist (Whitelist-Seeding nachziehen); einzelne `card_v1` ohne `image` in Pflicht-Containern (Scroller/Hub-Raster); ein paar `unknown_section_type` aus älteren Tranchen; vereinzelt `section_inactive` aus Pilot-Phase.
- ⚠️ **Code-Fallback-Liste ist manuell.** `KNOWN_UI_FALLBACKS` ist heute leer (`docs/04-betrieb/renderer-fallback-inventar-latest.md`: keine `local assets` mehr). Wenn jemand einen Hardcode einbaut, **muss** der Eintrag dort gepflegt werden, sonst sieht der Check ihn nicht. Das bleibt eine Disziplin-Sache, kein Auto-Scan.

**Vereinfacht:** Wir sind nicht „fertig", aber sehr nah am Punkt, an dem die offene Liste klein und benennbar wird. Vorher war die Liste eine Halde, jetzt ist sie ein To-do.

## 3. Hygiene-Check (technisch, kurz)

| Punkt | Status | Bemerkung |
|---|---|---|
| Migrationen idempotent | ✅ | Drei kleine Migrationen heute, alle re-runfest |
| Public-Schutz (Produktdatenbank, Public-Renderer-Struktur, Navigation, Footer, i18n-JSONs) | ✅ | Nicht angefasst |
| RPC-only-Schreibwege | ✅ | Kein `.insert/.update/.delete` im Admin-Code dazugekommen |
| Whitelist-Pflicht bei neuen Feldern | ✅ | CTA-Felder im selben Schritt gewhitelistet |
| TS/TSX | grün (Build läuft im Lovable-Harness automatisch) | Keine neuen Lint-Fehler bekannt |
| `cms:audit:contract` / `cms:audit:renderer-fallback-inventory` | unverändert stabil | 15 OK · 7 Warn · 0 Konflikt · 82 Pages |
| `KNOWN_UI_FALLBACKS` | leer | OK laut Fallback-Inventar |

## 4. Empfehlung nächste Schritte

1. **Whitelist-Seeding flächig nachziehen** für Felder, die der neue Check als „missing_whitelist" markiert (vor allem `link_*`-Familien). Eine Etappe `cms-light-whitelist-luecken-nachziehen-1`.
2. **Renderer-Waisen aufräumen:** alle `renderer_orphan`-Befunde durchgehen und entweder Renderer ergänzen oder verwaiste Inhalte stilllegen.
3. **`unknown_section_type`-Restmenge** aus alten Tranchen normalisieren oder bewusst dokumentieren.
4. **Akkordeon-Workspaces für `teaser_2col_v1`, `hero_v1`, `content_v1`** (offene Etappe `cms-light-baustein-workspaces-wechselteaser-hero-content-1` aus dem Vorsprint).
5. **Admin-Login** bleibt wie geplant der **letzte** Schritt vor Public-Live.

## 5. Geänderte Dateien heute

- `src/features/admin/lib/truthSources.ts` (Section-Fields, Pagination, neue Stati, Aggregator, Nav-Lookup)
- `src/features/admin/components/SlotValidationView.tsx` (Akkordeon, KPIs, Quellen-Punkte, Tooltips)
- `src/features/cms/components/sections/CtaV1.tsx` (Toggle-/Leer-Logik für Buttons + Kontaktzeilen)
- `src/features/cms/contract/sectionTypes.ts` (CTA-Felder)
- `src/features/admin/components/PageEditor.tsx` (CTA-Workspace-Anbindung)
- `src/features/admin/components/CtaBackgroundSelect.tsx` (neu)
- `src/features/admin/components/CtaButtonColorSelect.tsx` (neu)
- `src/features/anwendungen/pages/AnwendungenPage.tsx` (CTA-Section wieder ausspielen)
- `src/features/anwendungen/components/AnwendungDetailPage.tsx` (kleine Anpassung)
- `src/components/PageLayout.tsx` (kleine Anpassung)
- 4 Migrationen `supabase/migrations/2026060*` (CTA-Whitelist + Sicht-Toggle)
- Doku: `docs/04-betrieb/wahrheits-check.md`, `.lovable/plan.md`, dieser Bericht

## 6. Was bewusst **nicht** passiert ist

- Keine Änderung an `src/lib/supabase/client.ts` (Produktdatenbank-Client)
- Keine Änderung an `cms_navigation_nodes`, `cms_pages.status`, `cms_pages.is_active`
- Keine i18n-JSON-Datei angefasst
- Keine RPC neu angelegt oder verändert
- Keine Bilder/Inhalte überschrieben
- Kein Auto-Scan für Code-Fallbacks (bleibt manuell, `KNOWN_UI_FALLBACKS`)
