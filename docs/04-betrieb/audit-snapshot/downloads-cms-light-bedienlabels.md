# /downloads — CMS-Light für Seitenhülle und Bedienbeschriftungen

Stand: 2026-08-25

## Was jetzt aus CMS-Light kommt (page_key `service.downloads`)

Section `dokumente` (neue Felder, DE + EN, im Admin freigegeben):

```text
label_bereich, label_produktkategorie, label_familie_serie, label_system,
label_asset_typ, label_dokument_quellentyp, label_sprache, label_verfuegbarkeit,
label_alle, label_suche, label_filter, label_filter_zuruecksetzen,
label_gruppieren_familie_serie, label_eintrag, label_eintraege,
btn_download, btn_open, badge_external_link,
empty_hint, choose_audience_hint, error_hint,
default_audience_slug (bestand bereits)
```

Section `quickLinks`: `items.<key>.href` (redaktionelle Linkziele der
Schnellzugriff-Karten). Keine Download-URLs, keine Produktdaten-Links.

Hüllentexte DB-first mit i18n-Fallback: `hero.*` (über `CmsPageLayout`),
`dokumente.headline/intro`, `rma.*`, `bestellung.*`, `akademie.*`,
`glossar.headline/intro`, `ansprechpartner.*`.

## Trennung der Datenquellen (Stand 2026-08-26)

- Fachliche Download-Inhalte ausschließlich read-only aus der
  Download-Contract-Datenbank (`ncvxzkwazdemivdolpzc`) über die Edge Function
  `download-center`:
  `api_v1_download_center_structure_contract` (Zielgruppen → Bereiche),
  `api_v1_download_center_public_contract` (Ergebnisliste),
  `api_v1_download_center_facets_v2(...)` (kaskadierende Filter + Zähler).
- Zielgruppen, Bereiche, Filterwerte, Dateien, Download-URLs, Artikelnummern und
  Produkt-/Serien-/Systemzuordnungen sind **nicht** in CMS-Light gespiegelt.
- CMS-Light-Client (`@/lib/cmsSupabase/client`), Produktkatalog-Client
  (`@/lib/supabase/client`, `VITE_PRODUCT_SUPABASE_*`) und Download-Client
  (`VITE_DOWNLOAD_SUPABASE_*`) bleiben getrennt.

## Bekannter Punkt in der Download-Datenbank

`api_v1_download_center_facets_v2` läuft bei großen Zielgruppen (z. B.
`installateure`) in das Statement-Timeout (SQL-Fehler 57014). Die Edge Function
zählt die Facetten in diesem Fall aus denselben Contract-Zeilen der
Ergebnisliste (nur Aggregation, keine im Code gepflegten Wertelisten). Ein
Index-/Performance-Fix gehört in die Download-Datenbank.


## Glossar — bewusst nicht überführt

`GLOSSARY_GROUPS` in `DownloadsPage.tsx` ist eine zweistufige Struktur
(Buchstabengruppe → Begriffe mit Begriff/Definition). Die Texte liegen bereits
in i18n bzw. teilweise in `cms_section_fields` unter `glossar.groups.*`, die
**Gruppen- und Begriffsschlüssel** selbst nicht. Eine redaktionelle Pflege der
Struktur (Gruppe anlegen, Begriff hinzufügen/sortieren) bräuchte ein eigenes
Listen-/Kind-Section-Modell (z. B. `glossar_group_v1` + `glossar_term_v1`).
Das ist ein eigener, beauftragungspflichtiger Ausbauschritt und wurde hier
bewusst nur dokumentiert, nicht improvisiert. Nur Überschrift und Einleitung
des Glossars sind CMS-gepflegt.

## Beobachtung (nicht CMS-Light, Contract-Daten)

Das Feld `description` der Ergebnis-Contract-View enthält teilweise interne
Import-/Qualitätstexte (z. B. „lokaler Import vorbereitet, Storage-Upload
folgt."). Die Ergebnisliste zeigt `description` daher nicht an; bereinigt werden
muss das Feld in der Download-Datenbank.

## Nachtrag: /downloads als reine Download-Seite (Batch 67)

Datenquellen unverändert getrennt:
- CMS-Light `uvkubrrljyzfvbvejepl` (`VITE_SUPABASE_*`) — nur Hülle, redaktionelle Texte, Bedienlabels, Sichtbarkeit.
- Produktkatalog `tkscpnwbkjmqopnddxle` (`VITE_PRODUCT_SUPABASE_*`) — nicht für `/downloads`.
- Download-Contract-Datenbank `ncvxzkwazdemivdolpzc` — ausschließlich serverseitig über die Edge Function `download-center`.

Verwendete Contracts: `api_v1_download_center_public_contract`,
`api_v1_download_center_structure_contract`, `api_v1_download_center_facets_v2(...)`.

Seitenstruktur (DB-first, `cms_sections` auf `service.downloads`):
- aktiv: `hero`, `dokumente` (Download-Center), `standard_cta`
- inaktiv (im Admin jederzeit wieder einschaltbar): `quickLinks`, `faq`, `rma`,
  `bestellung`, `akademie`, `glossar`, `ansprechpartner`

Bedienoberfläche:
- Suche steht oben und durchsucht bei leerer Zielgruppenauswahl alle Zielgruppen
  (Contract-Spalte `search_text`, Wörter UND-verknüpft).
- Zielgruppen und Bereiche (mit Zählern) kommen aus dem Struktur-Contract;
  Bereiche ohne Dateien werden nicht angezeigt.
- Prominente Filter: Produktkategorie, Familie/Serie, Dokument-/Quellentyp.
  System, Asset-Typ und Sprache liegen unter „Weitere Filter" (ausklappbar).
- Facettenoptionen ohne Treffer werden ausgeblendet (kaskadierend).
- `assigned_articles_text` wird nie roh gezeigt, nur als gezählte Angabe
  („Zugeordnete Artikel: n"). Interne Import-/Qualitätshinweise werden gefiltert.

Neue Bedienlabels (DE/EN, whitelisted): `label_weitere_filter`,
`label_zugeordnete_artikel`.

Zu melden: `api_v1_download_center_facets_v2` läuft in der Download-Datenbank bei
großen Zielgruppen ins Statement-Timeout (57014). Die Edge Function fängt das ab
(unsortierte Seitenabfragen, kleinere Seiten, Facettenzählung aus denselben
Contract-Zeilen). Ein Index-/Performance-Fix gehört in die Download-Datenbank.

## Nachtrag: Zwei gleichwertige Einstiege (Batch 67)

Neue redaktionelle Bedienlabels (DE/EN in `cms_section_fields`, whitelisted in
`cms_admin_editable_fields`, Abschnitt `service.downloads` / `dokumente`):

- `label_zielgruppen` — Überschrift des Einstiegs „Nach Zielgruppe"
- `label_unterlagentypen` — Überschrift des Einstiegs „Nach Unterlagentyp"

Fachliche Wahrheit bleibt die Download-Contract-Datenbank: Die Unterlagentypen
werden im Startzustand aus `api_v1_download_center_structure_contract` über alle
Zielgruppen zusammengefasst (gleicher `section_slug` = ein Einstieg, Zähler =
Summe der `current_file_count`). Es gibt keine Liste von Zielgruppen oder
Bereichen in CMS-Light oder im Code.

## Nachtrag: Finalisierung `/downloads` (Batch 68, 2026-08-26)

Gültiger Stand — ältere Aussagen zur Kapitelbildung („nur im Archiv") sind damit überholt.

Kapitel (Untergliederung der Trefferliste) kommen in **allen** Ansichten aus dem
Contract, in dieser Reihenfolge:
`display_group_slug`/`display_group_label` → `document_type`/`document_type_label`
→ `section_slug`/`section_label`. Keine Ableitung aus Dateinamen, keine Typliste
im Code oder in CMS-Light.

Neue Bedienlabels (DE+EN in `cms_section_fields`, DE+EN in
`cms_admin_editable_fields`, `service.downloads` / `dokumente`):
`btn_view`, `btn_new_tab`, `btn_close_preview`, `preview_unavailable_hint`.
`label_kapitel` lautet jetzt „Kapitel" (vorher „Kapitel in diesem Bereich"),
weil die Kapitel nicht mehr nur innerhalb eines Bereichs greifen.

Bedienung: `Ansicht` öffnet ein rechtes Vorschau-Panel (Mobile: bildschirmfüllend)
mit Titel, Quellenhinweis, `Neuer Tab`, `Download` und Schließen-Schalter;
PDF/HTML/Bild werden per sandboxed iframe eingebettet, sonst erscheint
`preview_unavailable_hint`. `Neuer Tab`/`Öffnen` und `Download` bleiben eigene
Aktionen. Kein `dangerouslySetInnerHTML`.

Filterspalte ist auf Mobile einklappbar. Datenquellen und Trennung der
Supabase-Projekte unverändert (CMS-Light nur Hülle/Labels/Sichtbarkeit,
Download-Inhalte nur über die Edge Function `download-center`).

Optionale Blöcke der früheren Sammelseite (`quickLinks`, `faq`, `rma`,
`bestellung`, `akademie`, `glossar`, `ansprechpartner`) sind in `cms_sections`
weiterhin `is_active=false` und wurden bewusst nicht gelöscht — im Admin
jederzeit wieder einschaltbar.
