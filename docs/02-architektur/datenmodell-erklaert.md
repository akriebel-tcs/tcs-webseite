# Datenmodell, einfach erklärt

Dieses Dokument erklärt, **warum unser CMS mit nur sechs Tabellen auskommt** und wie sie zusammenspielen. Zielgruppe: Mitarbeiter, neue Entwickler, Externe bei der Übergabe — kein Datenbank-Vorwissen nötig.

## Die InDesign-Analogie

Stell dir die Datenbank nicht als „sechs Ordner" vor, sondern als **sechs Bauteile, die ineinandergreifen** — ähnlich wie bei einem InDesign-Dokument:

| Tabelle | Was drin steht | InDesign-Analogie |
|---|---|---|
| `cms_pages` | Die Seite selbst (z. B. „Startseite", „Pflege") | Das Dokument |
| `cms_sections` | Die Blöcke einer Seite, in Reihenfolge (`sort_order`) | Die einzelnen Seiten/Frames |
| `cms_section_fields` | Die Texte in jedem Block, jeweils DE und EN | Die Textrahmen |
| `cms_assets` | Die Bilder, jedem Block zugeordnet | Das verknüpfte „Bilder"-Panel |
| `cms_navigation_nodes` | Die Menü- und Navigationsstruktur | Inhaltsverzeichnis |
| `cms_admin_editable_fields` | Whitelist (Liste der Felder, die im Admin geändert werden dürfen) | Sperr-/Freigabe-Layer |

Die Zuordnung **„Seite → Blöcke → Texte/Bilder"** existiert also bereits — sie ist nur nicht durch echte Ordner abgebildet, sondern durch **gemeinsame Schlüssel** (`page_key` + `section_key`).

## Seiten-Nummer (`page_no`) — kurze Adresse für Redaktion und Prompts

Jede Seite hat zusätzlich zum fachlichen `page_key` (z. B. `home.start`) eine **kurze, fortlaufende Nummer** `page_no` (z. B. `7`, `154`). Sie dient ausschließlich der **menschlichen Adressierung** — typischer Anwendungsfall: ein Redakteur sagt im Prompt „kopiere Seite 154 nach `personas.architekt`", ohne den langen `page_key` tippen zu müssen.

Regeln:

- **Eindeutig** und automatisch vergeben (Sequenz, vergeben durch `rpc_admin_upsert_page` und `rpc_admin_duplicate_page`).
- **Nie recycelt**: Wird eine Seite gelöscht oder archiviert, bleibt die Nummer „verbrannt". So zeigt ein alter Prompt/Ticket nicht plötzlich auf eine andere Seite.
- **Kein Ersatz für `page_key`**: `page_key` bleibt der langlebige, exportführende Schlüssel (siehe [`../archiv/strategie-historisch/cms-id-key-modell.md`](../archiv/strategie-historisch/cms-id-key-modell.md)). `page_no` ist eine zusätzliche, sekundäre Adresse für Menschen.
- **Auflösung im Admin** über `rpc_admin_resolve_page_no(p_page_no)` → liefert `page_key`. Die eigentliche Schreiboperation läuft danach wie immer über die bestehenden `rpc_admin_*`-Funktionen mit Whitelist-Prüfung.

Anzeige im Admin: oben im Editor-Header als kopierbares Badge `#154`, in der Seitenliste als eigene Spalte „Nr.".

## Beispiel: Wie ein Bild seinen Block findet

Auf der Startseite gibt es den Block „Türkommunikation". In der DB sieht das so aus:

```text
cms_pages
  page_key = "home.start"

cms_sections
  page_key = "home.start"
  section_key = "block_tuerkommunikation"
  sort_order = 4

cms_section_fields                    cms_assets
  page_key = "home.start"               page_key = "home.start"
  section_key = "block_..."             section_key = "block_..."
  field_key = "headline"                field_key = "image"
  locale = "de"                         public_url = "https://.../tk.jpg"
  value = "Türkommunikation"            is_active = true
```

Das Bild „weiß", zu welchem Block es gehört, weil **`page_key` + `section_key` + `field_key` übereinstimmen**. Tauschst du das Bild aus (neue Zeile mit `is_active = true`, alte auf `false`), erscheint es beim nächsten Seitenaufruf automatisch auf der Website. Das ist die [Spiegel-Regel](../01-strategie/cms-light-source-of-truth.md) auf Datenbankebene.

## Warum nicht „eine Tabelle pro Seite"?

Auf den ersten Blick wäre eine Tabelle `home_start`, eine `pflege`, eine `tuerkommunikation` usw. übersichtlicher. In der Praxis wird das schnell zum Albtraum:

- **Heute 1 Seite, morgen 80 Seiten** → 80 Tabellen wären unwartbar.
- **Neue Seite anlegen** soll im Admin ein Klick sein, kein Datenbankumbau plus Code-Deployment.
- **Zwei Sprachen (DE/EN)** brauchen so nur eine zusätzliche Zeile pro Feld, nicht eine zusätzliche Spalte.
- **Die Spiegel-Regel** funktioniert nur, weil alle Seiten dasselbe Schema teilen — sonst müsste der Renderer pro Seite anders gebaut werden.
- **Auswertungen** („zeig mir alle Texte, die noch keine EN-Übersetzung haben") sind über alle Seiten hinweg mit einer einzigen Abfrage möglich.

Dieses Vorgehen heißt „normalisiertes Datenmodell" und ist genau das, was professionelle CMS (Strapi, Contentful, Sanity) im Kern auch machen — oft sogar mit *weniger* Tabellen als wir.

## Die Whitelist: warum es `cms_admin_editable_fields` gibt

Nicht jedes Feld in `cms_section_fields` darf im Admin verändert werden — manche sind nur Anzeige (z. B. systeminterne Schlüssel). Die Tabelle `cms_admin_editable_fields` listet pro `page_key` + `section_key` + `field_key` + `locale` (Sprache), ob das Feld freigegeben ist (`is_enabled`).

Vor jedem Schreibvorgang prüft die RPC `rpc_admin_update_section_field`, ob der Eintrag in der Whitelist auf `true` steht. So kann **kein** Frontend-Code irgendein Feld überschreiben, das nicht ausdrücklich freigegeben ist.

## Sicherheits-Architektur in einem Satz

- **Lesen** (öffentliche Website): direkt aus den Tabellen, geschützt durch RLS-Regeln (z. B. „nur veröffentlichte Seiten sind sichtbar").
- **Schreiben** (Admin): **ausschließlich** über `rpc_admin_*`-Funktionen — kein direkter Tabellenschreibzugriff aus dem Frontend (siehe [Always-Follow](../../.lovable/always-follow.md)).

## Bilder direkt in der DB ändern → Website aktualisiert sich?

**Ja, funktioniert genau so.** Wenn du in `cms_assets` den `public_url` einer aktiven Zeile änderst (oder ein neues Bild hochlädst, das per RPC die alte Zeile auf `is_active = false` setzt und die neue auf `true`), zieht die Website es beim nächsten Laden automatisch — ohne Code-Änderung, ohne Deploy.

## Wenn neue Seiten dazukommen

Eine neue Seite (z. B. „Personas / Architekt") braucht **keine neue Tabelle**, sondern nur:

1. Einen Eintrag in `cms_pages` (`page_key = "personas.architekt"`).
2. Einträge in `cms_sections` für jeden Block (Hero, Intro, Stats, …) mit `sort_order`.
3. Einträge in `cms_section_fields` für die Texte (DE + EN).
4. Einträge in `cms_assets` für die Bilder.
5. Einträge in `cms_admin_editable_fields` für die freizugebenden Felder.

Der Renderer iteriert über `cms.sections` einer Seite — die Reihenfolge im Admin spiegelt sich automatisch auf der Website (Spiegel-Regel).

## Zusammenfassung in drei Sätzen

1. Sechs Tabellen reichen, weil **alle Seiten dasselbe Schema teilen** — neue Seiten brauchen keine Schemaänderung, nur neue Datensätze.
2. Die Zuordnung „Seite → Blöcke → Texte/Bilder" existiert über die Schlüssel `page_key` + `section_key` + `field_key` und entspricht im Prinzip dem Verknüpfungs-Panel in InDesign.
3. Schreiben geht **nur** über RPCs mit Whitelist — Lesen läuft direkt mit RLS-Schutz. Die Spiegel-Regel sorgt dafür, dass Admin und Website sich automatisch gegenseitig abbilden.

## ER-Diagramm

Eine visuelle Übersicht der sechs Tabellen und ihrer Schlüsselbeziehungen (`page_key`, `section_key`, `field_key`, `parent_id`) liegt unter:

- [cms-datenmodell-er.mmd](../../mnt/documents/cms-datenmodell-er.mmd) (Mermaid ER-Diagramm)

Kernbeziehungen auf einen Blick:

- `cms_pages.page_key` → `cms_sections.page_key` (1 Seite hat viele Blöcke)
- `cms_sections (page_key + section_key)` → `cms_section_fields (page_key + section_key)` (1 Block hat viele Textfelder)
- `cms_sections (page_key + section_key)` → `cms_assets (page_key + section_key + field_key)` (1 Block hat viele Bilder/Slots)
- `cms_navigation_nodes.parent_id` → `cms_navigation_nodes.id` (Menübaum, selbstreferenziell)
- `cms_navigation_nodes.page_key` → `cms_pages.page_key` (Menüpunkt zeigt auf eine Seite)
- `cms_admin_editable_fields (page_key + section_key + field_key + locale)` → Whitelist auf `cms_section_fields`

## Beispiel: Vom Admin-Klick zur veröffentlichten Webseite

Drei typische Szenarien, jeweils kompakt: was passiert in der DB, wer ruft welche RPC, und wie kommt es auf die Website.

### Szenario 1: Deutsche Headline ändern

Mitarbeiter ändert auf der Startseite den Hero-Titel von „Türkommunikation" auf „Türsprechanlagen".

```text
Admin-UI
  └─ EditableField (page_key=home.start, section_key=hero, field_key=headline, locale=de)
       └─ supabase.rpc('rpc_admin_update_section_field', {
            p_page_key:    'home.start',
            p_section_key: 'hero',
            p_field_key:   'headline',
            p_locale:      'de',
            p_value:       'Türsprechanlagen'
          })
            └─ RPC prüft Whitelist (cms_admin_editable_fields.is_enabled = true)
                 └─ UPDATE cms_section_fields SET value = 'Türsprechanlagen'
                    WHERE page_key='home.start' AND section_key='hero'
                      AND field_key='headline' AND locale='de'
                         └─ Public Website liest via cms_section_fields
                            (RLS: cms_page_is_public('home.start') = true)
                              └─ Hero zeigt neuen Titel beim nächsten Reload
```

### Szenario 2: Englische Übersetzung per KI nachziehen

Gleiches Feld, jetzt der Übersetzungs-Button neben dem EN-Feld.

```text
TranslateButton (DE → EN)
  └─ Edge Function 'translate-de-en' (Lovable AI Gateway, google/gemini-2.5-flash)
       └─ liefert Vorschlag „Door intercom systems"
            └─ EditableField setzt EN-Vorschlag in den Editor (noch nicht gespeichert)
                 └─ Mitarbeiter prüft, klickt „Speichern"
                      └─ supabase.rpc('rpc_admin_update_section_field', { …, locale: 'en' })
                           └─ UPDATE cms_section_fields … locale='en'
                                └─ Website (i18n=en) zeigt neue Übersetzung
```

Wichtig: KI liefert nur **Vorschläge**. Geschrieben wird erst nach explizitem Speichern — und auch dann nur über die RPC mit Whitelist-Check.

### Szenario 3: Bild im Hero austauschen

Mitarbeiter lädt im Asset-Manager ein neues Hero-Bild hoch.

```text
Admin-UI Asset-Upload
  └─ supabase.storage.from('cms-assets').upload(path, file)   ← einziger Direktzugriff
       └─ liefert public_url
            └─ supabase.rpc('rpc_admin_upsert_asset', {
                 p_page_key:    'home.start',
                 p_section_key: 'hero',
                 p_field_key:   'background',
                 p_storage_path: '…',
                 p_public_url:   '…',
                 p_file_name:    'hero-2026.jpg',
                 p_mime_type:    'image/jpeg'
               })
                 └─ RPC: setzt vorheriges aktives Asset im selben Slot
                         (page_key+section_key+field_key) auf is_active=false
                    und legt das neue Asset mit is_active=true an
                         └─ Website liest cms_assets
                            (RLS: is_active=true AND cms_page_is_public(page_key))
                              └─ Hero zeigt neues Bild, altes bleibt als Historie erhalten
```

### Was wäre ohne RPC passiert?

Ein direkter `UPDATE cms_section_fields …` aus dem Frontend würde an der RLS scheitern (kein INSERT/UPDATE/DELETE-Policy für `anon`/`authenticated`). Genau das ist gewollt: **Schreiben geht nur durch das Nadelöhr `rpc_admin_*` mit Whitelist-Prüfung** — und das schützt die Website auch dann, wenn jemand mit dem Anon-Key direkt gegen die DB spricht.
