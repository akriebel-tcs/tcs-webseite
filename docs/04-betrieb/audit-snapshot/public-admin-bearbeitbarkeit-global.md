# Globale Abnahmeprüfung — „Public sichtbar → im Admin bearbeitbar"

Stand: 2026-06-05 (Batch 32)
Auslöser: Befund aus P-057 (`anwendungen.bildungseinrichtungen`) — öffentliche DB-Inhalte waren im Admin nicht als normale Eingabefelder pflegbar (Batch 31 behoben). Frage: gibt es weitere solche Lücken global?

## 1. Methodik

Geprüft wurden alle Seiten mit `cms_pages.is_active = true AND status = 'published'`. Für jede aktive Section (`cms_sections.is_active = true`) wurde gegen drei bestehende Audit-Skripte abgeglichen, ergänzt um einen gezielten Whitelist-Check:

| Audit | Zweck | Quelle |
|---|---|---|
| `wahrheits-check-ci.mjs` | Renderer ↔ DB ↔ Harvester reproduzierbar, Body-Map vollständig, FAQ/CTA-Launch-Gate | bestehend |
| `globaler-spiegel-audit.mjs` | Spiegel-Regel: Admin-Reihenfolge/Sichtbarkeit = Public | bestehend |
| `whitelist-coverage-audit.mjs` | Jedes öffentlich gelesene Text- bzw. Bildfeld hat einen Whitelist-Eintrag (DE+EN) und jeder `card_v1`-Slot ist für Bild-Upload freigeschaltet | bestehend, jetzt scharf laufend |
| `harvest-page-component-reads.mjs` + `bespokePageSections.ts` | Bespoke-Page-Komponenten erkennen ihre Sonderfelder, Admin-UX-Label und blauer „Sonderfelder dieser Page-Komponente"-Hinweis statt orangefarbener Altbestand-Warnung | bestehend (Batch 31) |

„Bearbeitbar" gilt nur, wenn das Feld im Admin als echtes Eingabefeld/Asset-Slot mit DE+EN-Pflege erscheint und über `rpc_admin_*` speicherbar ist.

## 2. Gesamtzahlen

| Kennzahl | Wert |
|---|---:|
| Geprüfte aktive/veröffentlichte Seiten | **114** |
| Aktive Sections auf diesen Seiten | **1 427** |
| Öffentlich relevante Textfelder mit Wert (DE+EN) | **29 961** |
| Aktive Assets auf veröffentlichten Seiten | **402** |
| Aktive Whitelist-Einträge nach Batch 32 | **91 504** |

## 3. Prüfmatrix — Statusverteilung

| Status | Anzahl | Bemerkung |
|---|---:|---|
| `ok` (Public gelesen, Admin pflegbar, DE+EN) | 29 961 Textfelder + 402 Assets + alle `card_v1`-Upload-Slots aktiver Seiten | nach Batch 32 |
| `public_aber_nicht_bearbeitbar` | **0** | nach Batch 32 — vorher: 210 fehlende `card_v1`-Upload-Slots auf 2 Seiten |
| `fallback_ohne_db_feld` | 0 | Harvester + `wahrheits-check-ci` melden keine ungedeckten Reads |
| `asset_ohne_admin_slot` | 0 | `card-asset-without-whitelist` = 0 |
| `nur_diagnose_altbestand` | restliche `content_v1`-Sonderfelder in 9 Bespoke-Pages | seit Batch 31 als „Sonderfelder dieser Page-Komponente" sichtbar (blau, nicht orange) — siehe `bespokePageSections.ts` |
| `bewusste_sonderlogik_ok` | u. a. P-057/P-059/P-060/P-077 + 16 Anwendungs-Detailseiten + 11 Referenzprojekt-Detailseiten | DE/EN bearbeitbar nach Batch 31 |
| `out_of_scope` | Produktdatenbank (`product_*`), Login/Auth | wie in `always-follow.md` festgelegt |

Eine vollständige Spalten-Matrix `page_key | section_key | field_key | öffentlich? | Quelle | Admin sichtbar? | Admin bearbeitbar? | DE/EN? | Status | Empfehlung` ist nicht als Markdown-Tabelle praktikabel (≈ 30 000 Zeilen). Sie wird live aus den drei Audit-Skripten erzeugt — alle drei laufen aktuell auf **0 Befunde**.

## 4. Sofortbefunde — Abnahme-Blocker

### Vor Batch 32 (Stand zu Beginn dieser Prüfung)

`whitelist-coverage-audit.mjs` meldete **210 Treffer** in Kategorie `card-without-upload-slot-whitelist`:

| page_key | aktive `card_v1` ohne Upload-Slot | Lücken (3 Slots × DE+EN) |
|---|---:|---:|
| `personas.wohnungswirtschaft` | 19 | 114 |
| `service.hub` | 16 | 96 |
| **Summe** | **35** | **210** |

Wirkung: Redaktion konnte in diesen Karten kein neues Bild/Thumbnail/Icon hochladen. Bestehende Texte waren pflegbar (separater Pfad), aber der Bild-Slot fehlte komplett im Admin. Damit war die Vertragsregel „jede `card_v1` hat einen pflegbaren Bild-Slot" verletzt.

### Nach Batch 32

Migration `Batch 32 — Whitelist-Coverage schliessen` fügt idempotent (`ON CONFLICT DO NOTHING`) für alle aktiven `card_v1`-Sections auf veröffentlichten Seiten die Slots `image`, `thumbnail`, `icon_image` × `de`+`en` in `cms_admin_editable_fields` ein.

- Keine Inhalte geändert.
- Keine Renderer geändert.
- Keine Navigation geändert.
- Keine Public-Struktur geändert.
- Reine additive Freischaltung im Admin.

Ergebnis:

```
✓ whitelist-coverage-audit: GRÜN — Admin-Whitelist deckt alle Felder.
✅ Wahrheits-Check CI OK
globaler-spiegel-audit — 0 Befund(e).
```

**Abnahme-Blocker offen: 0.**

## 5. Besonders geprüfte Seiten

| Seite | Klasse | Befund |
|---|---|---|
| P-057 `anwendungen.bildungseinrichtungen` | bespoke (Batch 31) | ok — B-255/B-256 als „Abschnittslabels" / „Einrichtungsdaten Kita/Schule/Wohnheim" sichtbar und bearbeitbar |
| P-059 `anwendungen.gesundheitseinrichtungen` | bespoke (Batch 31) | ok |
| P-060 `anwendungen.oeffentliche-hand` | bespoke (Batch 31) | ok |
| P-077 `referenzprojekte` + 11 Detailseiten | bespoke (Batch 31) | ok |
| 16 Anwendungs-Detailseiten | bespoke (Batch 31) | ok |
| P-055/P-058/P-062 | Standard-Renderer | keine unbearbeitbaren Public-Felder |
| `personas.wohnungswirtschaft` | Standard-Renderer mit `card_v1` | **nach Batch 32 ok** (vorher 114 Slot-Lücken) |
| `service.hub` | Standard-Renderer mit `card_v1` | **nach Batch 32 ok** (vorher 96 Slot-Lücken) |
| Kontakt/Service/Eingangssysteme/Gebäudekommunikation/Zutrittskontrolle | Standard-Renderer + bekannte Bespoke | keine neuen Lücken |

## 6. Falsche Beruhigungen — bewusst geprüft

- Nicht nur „Public rendert DB-Section", sondern: Kann ein Redakteur den sichtbaren Text/Bild/Link wirklich ändern?
- `whitelist-coverage-audit` prüft DE **und** EN getrennt — beides muss freigeschaltet sein.
- Bespoke-Pages werden im Admin nicht mehr als „Altbestand" gewarnt (Batch 31), damit Redaktion sie nicht aus Unsicherheit ignoriert oder löscht.
- Ergebnis konsistent über drei unabhängige Audits.

## 7. Empfehlung vor echter Redaktionsübergabe

- **Sofort (erledigt):** Batch 32 Migration aktiv — `card_v1`-Upload-Slots flächendeckend in Whitelist.
- **Dauerhaft:** `whitelist-coverage-audit.mjs` in CI scharf halten (kein `SKIP_DB=1` ohne Fixture) — verhindert, dass neue `card_v1` ohne Upload-Slot in Produktion gehen.
- **Optional/später (eigener Auftrag):** UX-Verbesserung im Admin, sodass beim Anlegen einer neuen `card_v1` der Workspace automatisch die drei Bild-Slots anzeigt, auch wenn noch kein Bild hochgeladen ist (heute werden sie über die Whitelist ja angeboten — kann visuell deutlicher werden).
- **Nicht ohne neuen Auftrag:** Migration der personas/service-Detail-Karten in `cards_v1`-Container-Standardvertrag, Renderer-Umbau, Login/Auth, neue Section-Typen.

## 8. Abschlussprüfung

| Prüfung | Ergebnis |
|---|---|
| `node scripts/cms/wahrheits-check-ci.mjs` | ✅ GRÜN |
| `node scripts/cms/whitelist-coverage-audit.mjs` | ✅ GRÜN (vorher: 210 Treffer) |
| `node scripts/cms/globaler-spiegel-audit.mjs` | ✅ 0 Befunde |
| `npm run build` | nicht manuell aufgerufen — Harness baut automatisch nach Änderungen; keine Code-Änderung in dieser Prüfung, nur additive Whitelist-Migration |

## 9. Geänderte Artefakte

- **Migration** (Batch 32): additive `INSERT … ON CONFLICT DO NOTHING` in `public.cms_admin_editable_fields` — schließt 210 fehlende `card_v1`-Upload-Slots.
- **Dieser Bericht.**

Keine Code-Datei berührt. Keine Inhalte geändert. Keine Folgearbeiten gestartet.
